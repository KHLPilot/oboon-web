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
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
      // Cloudflare R2 Public Bucket (*.pub.r2.dev 또는 커스텀 도메인)
      { protocol: "https", hostname: "*.pub.r2.dev", pathname: "/**" },
      // R2 커스텀 도메인 사용 시 아래에 추가:
      // { protocol: "https", hostname: "your-custom-domain.com", pathname: "/**" },
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
