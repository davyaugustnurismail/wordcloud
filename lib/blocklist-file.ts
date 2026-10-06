import type { SheetData } from "read-excel-file/universal";
import { dropFirstLine, withoutBom } from "./blocklist-import";

export const IMPORT_ACCEPT = ".txt,.csv,.xlsx,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export class ImportFileError extends Error {}

async function readWorkbookText(file: File, skipHeader: boolean): Promise<string> {
  const { readSheet } = await import("read-excel-file/universal");
  let rows: SheetData;
  try {
    rows = await readSheet(file);
  } catch {
    throw new ImportFileError("File Excel tidak bisa dibaca. Pastikan formatnya .xlsx yang valid.");
  }
  const body = skipHeader ? rows.slice(1) : rows;
  return body
    .map((row) =>
      row
        .filter((cell): cell is string | number => typeof cell === "string" || typeof cell === "number")
        .map(String)
        .join("\n"),
    )
    .join("\n");
}

export async function readImportFile(file: File, skipHeader: boolean): Promise<string> {
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new ImportFileError("File terlalu besar. Maksimal 2 MB.");

  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return readWorkbookText(file, skipHeader);
  if (name.endsWith(".xls")) {
    throw new ImportFileError("Format .xls lama belum didukung. Simpan ulang sebagai .xlsx atau .csv.");
  }
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.startsWith("text/")) {
    const text = withoutBom(await file.text());
    return skipHeader ? dropFirstLine(text) : text;
  }
  throw new ImportFileError("Format file tidak didukung. Pakai .xlsx, .csv, atau .txt.");
}
