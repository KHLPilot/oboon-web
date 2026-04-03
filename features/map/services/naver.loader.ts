// features/map/naver.loader.ts
let loadPromise: Promise<NaverGlobal> | null = null;

function resetLoadPromise() {
  loadPromise = null;
}

export function loadNaverMaps(clientId: string): Promise<NaverGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Naver Maps can only be loaded in browser")
    );
  }

  if (window.naver?.maps) return Promise.resolve(window.naver);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const rejectWithReset = (message: string, script?: HTMLScriptElement) => {
      script?.remove();
      resetLoadPromise();
      reject(new Error(message));
    };
    const resolveIfReady = () => {
      if (!window.naver?.maps) {
        rejectWithReset("Naver maps is not available after load");
        return false;
      }
      resolve(window.naver);
      return true;
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-oboon="naver-maps"]'
    );
    if (existing) {
      const state = existing.dataset.oboonState;

      if (state === "loaded") {
        if (window.naver?.maps) {
          resolve(window.naver);
          return;
        }
        existing.remove();
      } else if (state === "loading") {
        const onLoad = () => {
          existing.removeEventListener("error", onError);
          resolveIfReady();
        };
        const onError = () => {
          existing.removeEventListener("load", onLoad);
          rejectWithReset("Naver maps load failed", existing);
        };
        existing.addEventListener("load", onLoad, { once: true });
        existing.addEventListener("error", onError, { once: true });
        return;
      } else {
        existing.remove();
      }
    }

    const script = document.createElement("script");
    script.setAttribute("data-oboon", "naver-maps");
    script.dataset.oboonState = "loading";
    script.async = true;
    script.defer = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
      clientId
    )}`;

    script.onload = () => {
      if (!window.naver?.maps) {
        script.dataset.oboonState = "error";
        if (process.env.NODE_ENV !== "production") {
          // 인증 실패/오리진 오류 등은 여기서 흔히 발생
          // (네이버 SDK 자체 에러 로그 + 이 로그로 원인 추적)
          console.error(
            "[NaverMap] SDK loaded but window.naver.maps is missing. Check NCP client key and allowed origins."
          );
        }
        rejectWithReset("Naver maps is not available after load", script);
        return;
      }
      script.dataset.oboonState = "loaded";
      resolve(window.naver);
    };

    script.onerror = () => {
      script.dataset.oboonState = "error";
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[NaverMap] SDK script load failed. Check network/CSP and NCP key."
        );
      }
      rejectWithReset("Naver maps load failed", script);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
