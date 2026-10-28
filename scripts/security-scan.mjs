import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();

function parseEnvFile(path) {
  const absolutePath = resolve(root, path);

  if (!existsSync(absolutePath)) {
    return {};
  }

  const result = {};

  for (const rawLine of readFileSync(absolutePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[name] = value;
  }

  return result;
}

const env = {
  ...parseEnvFile(".env.local"),
  ...parseEnvFile(".env.security.local"),
  ...process.env,
};

function collectFiles(path) {
  const absolutePath = resolve(root, path);

  if (!existsSync(absolutePath)) {
    return [];
  }

  const files = [];
  const stack = [absolutePath];

  while (stack.length > 0) {
    const current = stack.pop();
    const stats = statSync(current);

    if (stats.isDirectory()) {
      for (const entry of readdirSync(current)) {
        stack.push(join(current, entry));
      }
      continue;
    }

    if (stats.isFile()) {
      files.push(current);
    }
  }

  return files;
}

function report(name, passed, detail) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);

  if (!passed) {
    process.exitCode = 1;
  }
}

const secretNames = [
  "WEREAD_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SECURITY_TEST_PASSWORD_A",
  "SECURITY_TEST_PASSWORD_B",
];

const secretValues = secretNames
  .map((name) => env[name]?.trim())
  .filter((value) => typeof value === "string" && value.length >= 8);

const clientFiles = collectFiles(".next/static");
const publicFiles = collectFiles("public");
const extensionFiles = collectFiles("browser-extension").filter(
  (file) => !file.endsWith("README.md"),
);
const scannedClientFiles = [...clientFiles, ...publicFiles];

if (clientFiles.length === 0) {
  report("client build artifacts", false, "请先运行生产构建");
} else {
  const leaked = [];

  for (const file of scannedClientFiles) {
    const content = readFileSync(file);
    const matched = secretValues.some((value) => content.includes(value));

    if (matched) {
      leaked.push(relative(root, file));
    }
  }

  report(
    "server secret values absent from client artifacts",
    leaked.length === 0,
    leaked.length === 0
      ? `${scannedClientFiles.length} files scanned`
      : `${leaked.length} file(s) contained a secret value`,
  );
}

const extensionLeaks = [];
for (const file of extensionFiles) {
  const content = readFileSync(file);
  if (secretValues.some((value) => content.includes(value))) {
    extensionLeaks.push(relative(root, file));
  }
}
report(
  "server secret values absent from extension source",
  extensionLeaks.length === 0,
  `${extensionFiles.length} files scanned`,
);

const forbiddenPublicEnv = Object.keys(env).filter((name) =>
  /^NEXT_PUBLIC_.*(?:SERVICE_ROLE|WEREAD|SECRET|PASSWORD)/i.test(name),
);
report(
  "no server secret exposed through NEXT_PUBLIC_",
  forbiddenPublicEnv.length === 0,
  forbiddenPublicEnv.length === 0
    ? `${Object.keys(env).filter((name) => name.startsWith("NEXT_PUBLIC_")).length} public variables checked`
    : forbiddenPublicEnv.join(", "),
);

const clientText = scannedClientFiles
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const serviceRoleMarker =
  /SUPABASE_SERVICE_ROLE_KEY|service_role\s*[:=]/i.test(clientText);
report(
  "service-role credentials absent from client bundles",
  !serviceRoleMarker,
);

const sourceFiles = collectFiles("app")
  .concat(collectFiles("components"))
  .concat(collectFiles("lib"))
  .concat(collectFiles("scripts"))
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file));

const unsafeLogging = [];
for (const file of sourceFiles) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (
      /console\.(?:log|error|warn|debug)/.test(line) &&
      /\b(?:password|passwordA|passwordB|pairingToken|tokenHash|authorization|apiKey|secret)\b/i.test(
        line,
      )
    ) {
      unsafeLogging.push(relative(root, file));
      break;
    }
  }
}
report(
  "no obvious credential logging patterns",
  unsafeLogging.length === 0,
  unsafeLogging.length === 0
    ? `${sourceFiles.length} source files scanned`
    : unsafeLogging.join(", "),
);

let envIgnored = false;
try {
  execFileSync("git", ["check-ignore", "-q", ".env.local"], {
    cwd: root,
    stdio: "ignore",
  });
  envIgnored = true;
} catch {
  envIgnored = false;
}
report(".env.local ignored by git", envIgnored);

const envTracked = execFileSync("git", ["ls-files", "--", ".env.local"], {
  cwd: root,
  encoding: "utf8",
}).trim();
report(".env.local untracked by git", !envTracked);
