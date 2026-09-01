/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
