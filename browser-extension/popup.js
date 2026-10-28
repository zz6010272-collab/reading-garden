"use strict";

const DEFAULT_ORIGIN = "http://localhost:3000";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_CONTENT_LENGTH = 100000;
const LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const elements = {
  pairingView: document.querySelector("#pairing-view"),
  clipView: document.querySelector("#clip-view"),
  appOrigin: document.querySelector("#app-origin"),
  pairingToken: document.querySelector("#pairing-token"),
  savePairing: document.querySelector("#save-pairing"),
  pairingStatus: document.querySelector("#pairing-status"),
  unpair: document.querySelector("#unpair"),
  captureSelection: document.querySelector("#capture-selection"),
  selectionStatus: document.querySelector("#selection-status"),
  clipTitle: document.querySelector("#clip-title"),
  clipContent: document.querySelector("#clip-content"),
  clipReflection: document.querySelector("#clip-reflection"),
  submitClip: document.querySelector("#submit-clip"),
  submitStatus: document.querySelector("#submit-status"),
  openNote: document.querySelector("#open-note"),
};

let pairingToken = "";
let appOrigin = DEFAULT_ORIGIN;
let capturedClip = null;

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  elements.savePairing.addEventListener("click", savePairing);
  elements.unpair.addEventListener("click", unpair);
  elements.captureSelection.addEventListener("click", captureSelection);
  elements.submitClip.addEventListener("click", submitClip);

  const stored = await chrome.storage.local.get(["pairingToken", "appOrigin"]);
  const storedOrigin = normalizeOrigin(stored.appOrigin);
  const storedToken =
    typeof stored.pairingToken === "string" ? stored.pairingToken.trim() : "";

  appOrigin = storedOrigin || DEFAULT_ORIGIN;
  elements.appOrigin.value = appOrigin;

  if (storedToken && TOKEN_PATTERN.test(storedToken)) {
    pairingToken = storedToken;
    showClipView();
  } else {
    showPairingView();
  }
}

function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("error", "success");

  if (type) {
    element.classList.add(type);
  }
}

function showPairingView() {
  elements.clipView.hidden = true;
  elements.pairingView.hidden = false;
  elements.pairingToken.focus();
}

function showClipView() {
  elements.pairingView.hidden = true;
  elements.clipView.hidden = false;
  setStatus(
    elements.selectionStatus,
    "仅在你点击按钮后读取当前标签页，不会自动抓取页面。",
  );
}

async function savePairing() {
  const origin = normalizeOrigin(elements.appOrigin.value);
  const token = elements.pairingToken.value.trim();

  if (!origin) {
    setStatus(elements.pairingStatus, "请输入有效的 http(s) 服务地址。", "error");
    return;
  }

  if (!TOKEN_PATTERN.test(token)) {
    setStatus(
      elements.pairingStatus,
      "配对码应为 64 位十六进制字符串，请重新复制。",
      "error",
    );
    return;
  }

  try {
    await chrome.storage.local.set({
      pairingToken: token,
      appOrigin: origin,
    });
    pairingToken = token;
    appOrigin = origin;
    elements.pairingToken.value = "";
    showClipView();
  } catch {
    setStatus(elements.pairingStatus, "保存配对码失败，请重试。", "error");
  }
}

async function unpair() {
  await chrome.storage.local.remove("pairingToken");
  pairingToken = "";
  capturedClip = null;
  elements.clipContent.value = "";
  elements.clipReflection.value = "";
  elements.clipTitle.value = "";
  elements.submitClip.disabled = true;
  elements.openNote.hidden = true;
  setStatus(elements.submitStatus, "");
  showPairingView();
}

async function ensureHostPermission(origin) {
  if (LOCAL_ORIGINS.has(origin)) {
    return true;
  }

  return chrome.permissions.request({
    origins: [`${origin}/*`],
  });
}
async function captureSelection() {
  elements.captureSelection.disabled = true;
  elements.submitClip.disabled = true;
  elements.openNote.hidden = true;
  setStatus(elements.selectionStatus, "正在读取当前标签页选区…");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || typeof tab.id !== "number") {
      throw new Error("active-tab-unavailable");
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selected = (window.getSelection()?.toString() ?? "").trim();
        return {
          title: (document.title || "").trim().slice(0, 200),
          url: location.href,
          content: selected.length > 100000 ? "" : selected,
          selectionLength: selected.length,
        };
      },
    });

    const result = injection?.result;

    if (!result) {
      throw new Error("selection-unavailable");
    }

    if (result.selectionLength > MAX_CONTENT_LENGTH) {
      throw new Error("selection-too-long");
    }

    if (!result.content) {
      throw new Error("selection-empty");
    }

    if (!normalizeOrigin(result.url)) {
      throw new Error("unsupported-page");
    }

    capturedClip = {
      title: result.title,
      url: result.url,
      content: result.content,
    };

    elements.clipTitle.value = result.title;
    elements.clipContent.value = result.content;
    elements.submitClip.disabled = false;
    setStatus(
      elements.selectionStatus,
      `已读取 ${result.content.length} 个字符。请检查内容并填写感想。`,
      "success",
    );
  } catch (error) {
    capturedClip = null;
    elements.clipContent.value = "";
    elements.submitClip.disabled = true;

    const message =
      error instanceof Error && error.message === "selection-empty"
        ? "当前页面没有选中文字。请先在网页中选择一段内容。"
        : error instanceof Error && error.message === "selection-too-long"
          ? "选中的文字超过 100000 个字符，请缩小选择范围。"
          : error instanceof Error && error.message === "unsupported-page"
            ? "当前页面不是可保存的 http(s) 网页。"
            : "无法读取当前页面选区，请确认页面允许扩展运行后重试。";

    setStatus(elements.selectionStatus, message, "error");
  } finally {
    elements.captureSelection.disabled = false;
  }
}

async function submitClip() {
  if (!pairingToken || !TOKEN_PATTERN.test(pairingToken)) {
    setStatus(elements.submitStatus, "配对已失效，请重新配对。", "error");
    showPairingView();
    return;
  }

  if (!capturedClip) {
    setStatus(elements.submitStatus, "请先读取当前页面的选中文字。", "error");
    return;
  }

  const title = elements.clipTitle.value.trim();
  const reflection = elements.clipReflection.value.trim();

  if (!title) {
    setStatus(elements.submitStatus, "笔记标题不能为空。", "error");
    return;
  }

  elements.submitClip.disabled = true;
  elements.openNote.hidden = true;
  setStatus(elements.submitStatus, "正在保存为私密笔记…");

  try {
    const permitted = await ensureHostPermission(appOrigin);

    if (!permitted) {
      throw new Error("permission-denied");
    }

    const response = await fetch(`${appOrigin}/api/extension/imports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pairingToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        url: capturedClip.url,
        content: capturedClip.content,
        reflection,
      }),
    });

    const payload = await response.json().catch(() => null);
    const noteId =
      payload &&
      typeof payload === "object" &&
      payload.data &&
      typeof payload.data.noteId === "string"
        ? payload.data.noteId
        : null;

    if (!response.ok || !payload || payload.success !== true || !noteId) {
      const message =
        payload && typeof payload.message === "string"
          ? payload.message
          : "保存失败，请稍后重试。";
      throw new Error(message);
    }

    setStatus(elements.submitStatus, "已保存为私密笔记。", "success");
    elements.openNote.href = `${appOrigin}/notes/${encodeURIComponent(noteId)}`;
    elements.openNote.hidden = false;
    elements.submitClip.disabled = true;
  } catch (error) {
    const message =
      error instanceof Error && error.message === "permission-denied"
        ? "未获得访问拾页服务地址的权限，请重试并允许该域名。"
        : error instanceof Error && error.message
          ? error.message
          : "保存失败，请稍后重试。";
    setStatus(elements.submitStatus, message, "error");
    elements.submitClip.disabled = false;
  }
}
