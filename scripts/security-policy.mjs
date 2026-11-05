export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'sha256-XXzJ9xh3VBfDOBs4xq6e95Qx0+wbOVlUtlAAzATRa34='",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
].join("; ");
