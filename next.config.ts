import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL('https://www.w3schools.com/howto/**')],
  }
};

export default nextConfig;
