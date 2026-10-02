import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is opened at 127.0.0.1 while Next advertises localhost.
  // Without this, script requests are blocked and clicks never hydrate.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
