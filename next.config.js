/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'unpdf'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@napi-rs/canvas');
    }
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // 운영 안정 우선: HTTPS 전체 도메인 허용
      { protocol: "https", hostname: "**", pathname: "/**" },
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
