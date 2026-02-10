// features/map/naver.loader.ts
let loadPromise: Promise<NaverGlobal> | null = null;

export function loadNaverMaps(clientId: string): Promise<NaverGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Naver Maps can only be loaded in browser")
    );
  }

  if (window.naver?.maps) return Promise.resolve(window.naver);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-oboon="naver-maps"]'
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.naver?.maps) resolve(window.naver);
        else reject(new Error("Naver maps is not available after load"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Naver maps load failed"))
      );
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-oboon", "naver-maps");
    script.async = true;
    script.defer = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
      clientId
    )}`;

    script.onload = () => {
      if (!window.naver?.maps) {
        if (process.env.NODE_ENV !== "production") {
          // 인증 실패/오리진 오류 등은 여기서 흔히 발생
          // (네이버 SDK 자체 에러 로그 + 이 로그로 원인 추적)
           
          console.error(
            "[NaverMap] SDK loaded but window.naver.maps is missing. Check NCP client key and allowed origins."
          );
        }
        reject(new Error("Naver maps is not available after load"));
        return;
      }
      resolve(window.naver);
    };

    script.onerror = () => {
      if (process.env.NODE_ENV !== "production") {
         
        console.error(
          "[NaverMap] SDK script load failed. Check network/CSP and NCP key."
        );
      }
      reject(new Error("Naver maps load failed"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
