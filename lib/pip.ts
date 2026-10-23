// Pip's public Telegram bot username, supplied by Lu. No leading @ required.
// Rebuild the static site after changing it. Never put credentials here.
export const PIP_TELEGRAM_HANDLE = "PIPSOFTWARE_BOT";

export function getPipContact(value: string = PIP_TELEGRAM_HANDLE) {
  const username = value.trim().replace(/^@/, "");

  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) return null;

  const telegramUrl = `https://t.me/${username}`;
  return {
    handle: `@${username}`,
    telegramUrl,
    qrUrl: `/qr/${username}.svg`,
  };
}
