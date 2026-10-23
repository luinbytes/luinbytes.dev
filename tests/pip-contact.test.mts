import assert from "node:assert/strict";
import test from "node:test";

import { getPipContact, PIP_TELEGRAM_HANDLE } from "../lib/pip.ts";

test("normalizes an optional @ prefix and returns Pip's Telegram target", () => {
  const contact = getPipContact("  PIPSOFTWARE_BOT  ");
  assert.ok(contact);
  assert.equal(contact.handle, "@PIPSOFTWARE_BOT");
  assert.equal(contact.telegramUrl, "https://t.me/PIPSOFTWARE_BOT");
  assert.equal(contact.qrUrl, "/qr/PIPSOFTWARE_BOT.svg");

  const alreadyPrefixed = getPipContact("@PIPSOFTWARE_BOT");
  assert.deepEqual(alreadyPrefixed, contact);
});

test("keeps QR images on the site and keyed to the configured handle", () => {
  for (const username of ["PIPSOFTWARE_BOT", "another_bot"]) {
    const contact = getPipContact(username);
    assert.ok(contact);
    const qr = new URL(contact.qrUrl, "https://luinbytes.dev");
    assert.equal(qr.origin, "https://luinbytes.dev");
    assert.equal(qr.pathname, `/qr/${username}.svg`);
    assert.equal(contact.telegramUrl, `https://t.me/${username}`);
  }
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
