export const REQUIREMENT_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx", "dwg"] as const;
export const REQUIREMENT_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const REQUIREMENT_FILE_ACCEPT = REQUIREMENT_FILE_EXTENSIONS.map((e) => `.${e}`).join(",");

/** Devuelve un mensaje de error en español o null si el archivo es válido. */
export function validateRequirementFile(file: { name: string; size: number }): string | null {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!(REQUIREMENT_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Formato no permitido (${ext ? "." + ext : "sin extensión"}). Solo se aceptan PDF, JPG, PNG, DOCX, XLSX y DWG.`;
  }
  if (file.size > REQUIREMENT_FILE_MAX_BYTES) {
    return "El archivo supera el límite de 25 MB.";
  }
  return null;
}
