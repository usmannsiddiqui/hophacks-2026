import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev opens as localhost, 127.0.0.1, or the LAN IP. Without these, Next
  // blocks /_next chunks and the Analyze button never hydrates.
  allowedDevOrigins: ["127.0.0.1", "192.168.56.1", "localhost"],
};

export default nextConfig;
