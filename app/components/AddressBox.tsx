"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

type Props = {
  roadAddress: string;
  jibunAddress?: string;
};

export default function AddressBox({ roadAddress, jibunAddress }: Props) {
  // 어떤 주소가 복사됐는지 저장
  const [copied, setCopied] = useState<"road" | "jibun" | null>(null);

  const copy = async (type: "road" | "jibun", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="rounded-lg p-3 space-y-3
      bg-(--oboon-bg-subtle)
      border border-(--oboon-border-default)"
    >
      {/* 도로명주소 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--oboon-text-muted)">
            도로명주소
          </span>
          <button
            onClick={() => copy("road", roadAddress)}
            className="text-xs flex items-center gap-1
            text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
          >
            {copied === "road" ? (
              <>
                <Check size={14} /> 복사됨
              </>
            ) : (
              <>
                <Clipboard size={14} /> 복사
              </>
            )}
          </button>
        </div>

        <div className="font-semibold text-(--oboon-text-title)">
          {roadAddress}
        </div>
      </div>

      {/* 지번주소 */}
      {jibunAddress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-(--oboon-text-muted)">
              지번주소
            </span>
            <button
              onClick={() => copy("jibun", jibunAddress)}
              className="text-xs flex items-center gap-1
              text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
            >
              {copied === "jibun" ? (
                <>
                  <Check size={14} /> 복사됨
                </>
              ) : (
                <>
                  <Clipboard size={14} /> 복사
                </>
              )}
            </button>
          </div>

          <div className="font-semibold text-(--oboon-text-title)">
            {jibunAddress}
          </div>
        </div>
      )}

    </div>
  );
}
