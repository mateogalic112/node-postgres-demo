const RESTRICTED_FIELDS = new Set(["password"]);

export const restrictFieldsReplacer = (key: string, value: unknown) =>
  RESTRICTED_FIELDS.has(key) ? "RESTRICTED" : value;
