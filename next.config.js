/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // 예: Cloudflare R2 (필요한 것만 남기세요)
      {
        protocol: "https",
        hostname: "pub-56f7c3092c7c48db80f9ca5633923e68.r2.dev",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      // 기존 유지
      {
        source: "/briefing",
        has: [{ type: "query", key: "view" }],
        destination: "/briefing/feed?view=:view",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
