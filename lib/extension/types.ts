export type ExtensionTokenRecord = {
  id: string;
  created_at: string;
  revoked_at: string | null;
};

export type GenerateExtensionTokenResult = {
  success: boolean;
  message: string;
  token?: string;
  record?: ExtensionTokenRecord;
};

export type RevokeExtensionTokenResult = {
  success: boolean;
  message: string;
  record?: ExtensionTokenRecord;
};
