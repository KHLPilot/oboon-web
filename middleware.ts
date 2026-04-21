import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDevelopment = process.env.NODE_ENV === "development";
const isReactGrabEnabled = isDevelopment;

function dedupe(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function getSupabaseConnectSources() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }

  try {
    const { origin, host } = new URL(supabaseUrl);
    return [origin, `wss://${host}`];
  } catch {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
}

function getR2ConnectSources() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  return accountId
    ? [`https://${accountId}.r2.cloudflarestorage.com`]
    : [];
}

function buildContentSecurityPolicy(nonce: string) {
  const scriptSources = dedupe([
    "'self'",
    isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`,
    isDevelopment ? null : "'strict-dynamic'",
    isDevelopment ? "'unsafe-eval'" : null,
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.clarity.ms",
    "https://oapi.map.naver.com",
    "https://*.map.naver.net",
    isDevelopment ? "http://oapi.map.naver.com" : null,
    isDevelopment ? "http://*.map.naver.net" : null,
    "https://t1.daumcdn.net",
    isReactGrabEnabled ? "https://unpkg.com" : null,
  ]);

  const styleSources = dedupe([
    "'self'",
    "'unsafe-inline'",
    isReactGrabEnabled ? "https://fonts.googleapis.com" : null,
  ]);

  const connectSources = dedupe([
    "'self'",
    ...getSupabaseConnectSources(),
    "https://openapi.naver.com",
    "https://naveropenapi.apigw.ntruss.com",
    "https://kr-col-ext.nelo.navercorp.com",
    "https://dapi.kakao.com",
    ...getR2ConnectSources(),
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://stats.g.doubleclick.net",
    "https://*.clarity.ms",
    isReactGrabEnabled ? "https://www.react-grab.com" : null,
    isDevelopment ? "http://localhost:*" : null,
    isDevelopment ? "ws://localhost:*" : null,
    isDevelopment ? "http://127.0.0.1:*" : null,
    isDevelopment ? "ws://127.0.0.1:*" : null,
  ]);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `img-src ${dedupe([
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://static.naver.net",
      isDevelopment ? "http://static.naver.net" : null,
      isDevelopment ? "http://*.map.naver.net" : null,
    ]).join(" ")}`,
    "font-src 'self' https://fonts.gstatic.com",
    `style-src ${styleSources.join(" ")}`,
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' https://*.daumcdn.net https://*.daum.net",
    "worker-src 'self' blob:",
    "media-src 'self' blob: data: https:",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ]
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  contentSecurityPolicy: string,
) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (isDevelopment) {
    response.headers.delete("x-nonce");
  } else {
    response.headers.set("x-nonce", nonce);
  }
  return response;
}

function isAuthBypassPath(pathname: string): boolean {
  return pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");
}

function buildDeletedAccountResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/auth/login?error=deleted", request.url));
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  if (isDevelopment) {
    requestHeaders.delete("x-nonce");
  } else {
    requestHeaders.set("x-nonce", nonce);
  }
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  let response = applySecurityHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }), nonce, contentSecurityPolicy);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          applySecurityHeaders(response, nonce, contentSecurityPolicy);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isAuthBypassPath(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[middleware] deleted account lookup failed", {
        status: 500,
        message: "profile lookup failed",
      });
    } else if (profile?.deleted_at) {
      await supabase.auth.signOut();
      const signOutResponse = response;
      const deletedAccountResponse = buildDeletedAccountResponse(request);

      signOutResponse.cookies.getAll().forEach((cookie) => {
        const { name, value, ...cookieOptions } = cookie;
        deletedAccountResponse.cookies.set({ name, value, ...cookieOptions });
      });

      return applySecurityHeaders(
        deletedAccountResponse,
        nonce,
        contentSecurityPolicy,
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
