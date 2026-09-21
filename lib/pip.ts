// Pip's public Telegram bot username, supplied by Lu. No leading @ required.
// Rebuild the static site after changing it. Never put credentials here.
export const PIP_TELEGRAM_HANDLE = "PIPSOFTWARE_BOT";

export function getPipContact(value: string = PIP_TELEGRAM_HANDLE) {
  const username = value.trim().replace(/^@/, "");

  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) return null;

  const telegramUrl = `https://t.me/${username}`;
  const qrParams = new URLSearchParams({
    data: telegramUrl,
    size: "240x240",
    qzone: "4",
    format: "png",
  });

  return {
    handle: `@${username}`,
    telegramUrl,
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?${qrParams}`,
  };
}
