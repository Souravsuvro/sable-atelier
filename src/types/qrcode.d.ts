declare module "qrcode" {
  export interface QrOptions {
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }

  export function toDataURL(text: string, options?: QrOptions): Promise<string>;
}
