import QRCode from "qrcode";

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#FFFFFF" },
  });
}
