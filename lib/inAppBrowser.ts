/**
 * 인앱 브라우저 감지 유틸리티
 * Instagram, Facebook, KakaoTalk, Naver, Line 등의 인앱 브라우저 감지
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  browser: string | null;
  isIOS: boolean;
  isAndroid: boolean;
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === "undefined") {
    return { isInApp: false, browser: null, isIOS: false, isAndroid: false };
  }

  const ua = navigator.userAgent || navigator.vendor || "";
  const uaLower = ua.toLowerCase();

  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  // 인앱 브라우저 패턴
  const inAppPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /KAKAOTALK/i, name: "카카오톡" },
    { pattern: /FBAN|FBAV|FB_IAB/i, name: "Facebook" },
    { pattern: /Instagram/i, name: "Instagram" },
    { pattern: /NAVER/i, name: "네이버" },
    { pattern: /Line\//i, name: "Line" },
    { pattern: /Twitter/i, name: "Twitter" },
    { pattern: /Snapchat/i, name: "Snapchat" },
    { pattern: /everytimeApp/i, name: "에브리타임" },
  ];

  for (const { pattern, name } of inAppPatterns) {
    if (pattern.test(ua)) {
      return { isInApp: true, browser: name, isIOS, isAndroid };
    }
  }

  // WebView 감지 (일반적인 패턴)
  const isWebView =
    (isIOS && !/Safari/i.test(ua) && /AppleWebKit/i.test(ua)) ||
    (isAndroid && /wv/i.test(ua));

  if (isWebView) {
    return { isInApp: true, browser: "WebView", isIOS, isAndroid };
  }

  return { isInApp: false, browser: null, isIOS, isAndroid };
}

/**
 * 외부 브라우저로 열기 위한 URL 생성
 */
export function getExternalBrowserUrl(url: string, info: InAppBrowserInfo): string {
  if (info.isIOS) {
    // iOS: Safari로 열기
    return url;
  } else if (info.isAndroid) {
    // Android: intent URL로 Chrome 열기
    return `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return url;
}
