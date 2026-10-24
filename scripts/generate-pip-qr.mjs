import { mkdir, writeFile } from "node:fs/promises";
import QRCode from "qrcode";
import { getPipContact } from "../lib/pip.ts";

const contact = getPipContact();
if (contact) {
  const directory = new URL("../public/qr/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const svg = await QRCode.toString(contact.telegramUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    width: 240,
  });
  await writeFile(new URL(`../public${contact.qrUrl}`, import.meta.url), svg);
}
