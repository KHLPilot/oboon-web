/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'unpdf'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@napi-rs/canvas');
    }
    return config;
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
      // Cloudflare R2 Public Bucket (*.pub.r2.dev 또는 커스텀 도메인)
      { protocol: "https", hostname: "*.pub.r2.dev", pathname: "/**" },
      // Google OAuth 프로필 이미지
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
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

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
