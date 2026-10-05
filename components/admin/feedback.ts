import type { AdminAck } from "@/lib/realtime/events";

export function failureMessage(ack: AdminAck): string | null {
  if (ack.ok) return null;
  switch (ack.reason) {
    case "forbidden":
      return "Sesi admin berakhir. Masuk lagi.";
    case "not_found":
      return "Kata tidak ditemukan atau sudah diproses.";
    case "blocked":
      return "Kata ini ada di blocklist.";
    case "invalid":
      return "Kata tidak valid.";
    case "conflict":
      return "Perubahan bentrok dengan data terbaru. Coba lagi.";
    default:
      return "Aksi gagal. Periksa koneksi lalu coba lagi.";
  }
}
