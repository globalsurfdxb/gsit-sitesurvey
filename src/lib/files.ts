// Allowed upload types, keyed by extension. The server derives the content type from the
// extension instead of trusting what the client sends, and never serves SVG/HTML inline.
export const FILE_TYPES: Record<string, { mime: string; inline: boolean }> = {
  jpg: { mime: "image/jpeg", inline: true },
  jpeg: { mime: "image/jpeg", inline: true },
  png: { mime: "image/png", inline: true },
  webp: { mime: "image/webp", inline: true },
  heic: { mime: "image/heic", inline: false },
  pdf: { mime: "application/pdf", inline: true },
  dwg: { mime: "application/octet-stream", inline: false },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", inline: false },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", inline: false },
};

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

export const ACCEPT_ATTACHMENTS = Object.keys(FILE_TYPES)
  .map((e) => "." + e)
  .join(",");

export const formatBytes = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
