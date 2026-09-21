import assert from "node:assert/strict";
import test from "node:test";

import { getPipContact, PIP_TELEGRAM_HANDLE } from "../lib/pip.ts";

const QR_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/";

test("normalizes an optional @ prefix and returns Pip's Telegram target", () => {
  const contact = getPipContact("  PIPSOFTWARE_BOT  ");
  assert.ok(contact);
  assert.equal(contact.handle, "@PIPSOFTWARE_BOT");
  assert.equal(contact.telegramUrl, "https://t.me/PIPSOFTWARE_BOT");
  assert.ok(contact.qrUrl.startsWith(QR_ENDPOINT));

  const alreadyPrefixed = getPipContact("@PIPSOFTWARE_BOT");
  assert.deepEqual(alreadyPrefixed, contact);
});

test("encodes the exact Telegram target in the remote QR URL", () => {
  const contact = getPipContact();
  assert.ok(contact);
  assert.equal(contact.handle, "@PIPSOFTWARE_BOT");

  const qr = new URL(contact.qrUrl);
  assert.equal(qr.origin, "https://api.qrserver.com");
  assert.equal(qr.pathname, "/v1/create-qr-code/");
  assert.equal(qr.searchParams.get("data"), contact.telegramUrl);
});

test("returns null for blank and invalid Telegram handles", () => {
  for (const candidate of [
    "",
    "   ",
    "@",
    "@bad handle",
    "bad-handle",
    "https://t.me/PIPSOFTWARE_BOT",
    "PIPSOFTWARE_BOT/other",
  ]) {
    assert.equal(getPipContact(candidate), null, `expected ${candidate} to be rejected`);
  }

  assert.notEqual(PIP_TELEGRAM_HANDLE, "");
  assert.ok(getPipContact(PIP_TELEGRAM_HANDLE));
});
