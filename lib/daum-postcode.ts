type DaumPostcodeResult = {
  roadAddress: string;
  jibunAddress: string;
};

type DaumPostcodeConstructor = new (opts: {
  oncomplete: (data: DaumPostcodeResult) => void;
}) => { open: () => void };

type DaumPostcodeGlobal = {
  Postcode: DaumPostcodeConstructor;
};

declare global {
  interface Window {
    daum?: DaumPostcodeGlobal;
  }
}

const DAUM_POSTCODE_SCRIPT_ID = "daum-postcode-script";
const DAUM_POSTCODE_SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodeLoadPromise: Promise<void> | null = null;

export async function ensureDaumPostcodeLoaded(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.daum?.Postcode) return true;

  if (!postcodeLoadPromise) {
    postcodeLoadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(
        DAUM_POSTCODE_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Daum postcode script.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = DAUM_POSTCODE_SCRIPT_ID;
      script.src = DAUM_POSTCODE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Daum postcode script."));
      document.head.appendChild(script);
    });
  }

  try {
    await postcodeLoadPromise;
  } catch {
    postcodeLoadPromise = null;
    return false;
  }

  return Boolean(window.daum?.Postcode);
}

export type { DaumPostcodeResult, DaumPostcodeConstructor };
