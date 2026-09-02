const allowedDevOrigins = [
  "127.0.0.1",
  ...(process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins,
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "export",
  images: { unoptimized: true },
  ...(process.env.NEXT_DISABLE_WEBPACK_CACHE === "1" ? {
    webpack(config) {
      config.cache = false;
      return config;
    },
  } : {}),
};

export default nextConfig;
