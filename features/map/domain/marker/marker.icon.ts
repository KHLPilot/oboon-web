// features/map/marker/marker.icon.ts
import type { MarkerType } from "./marker.type";
import { markerVars } from "./marker.theme";

export type MarkerState = "default" | "hover" | "focus";
export type MarkerViewType = "compact" | "rich" | "hero";
export type MarkerHeroTone =
  | "green"
  | "lime"
  | "yellow"
  | "orange"
  | "red"
  | "neutral";

export type MarkerHeroBadge = {
  label: string;
  tone?: MarkerHeroTone;
};

export type MarkerHeroMeta = {
  highlights?: MarkerHeroStat[];
  badges?: MarkerHeroBadge[];
  finalBadgeLabel?: string | null;
  finalBadgeTone?: MarkerHeroTone | null;
  scoreLabel?: string | null;
  scoreValue?: number | null;
  scoreSuffix?: string | null;
};

export type MarkerHeroStat = {
  label: string;
  value?: string | null;
  tone?: MarkerHeroTone;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type RenderedHeroBadge = {
  label: string;
  tone: MarkerHeroTone;
};

type RenderedHeroStat = {
  label: string;
  value: string;
  tone: MarkerHeroTone;
};

export function iconFor(args: {
  type: MarkerType;
  state: MarkerState;
  viewType: MarkerViewType;
  label?: string | null;
  topLabel?: string | null;
  mainLabel?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  propertyType?: string | null;
  ctaLabel?: string | null;
  canConsult?: boolean;
  heroMeta?: MarkerHeroMeta | null;
}) {
  const { type, state, viewType } = args;

  const dotHtml =
    viewType === "compact"
      ? dotIcon({
          type,
          state,
          label: args.label ?? args.topLabel ?? args.mainLabel ?? "",
        })
      : "";
  // richOverlay에도 args 전체를 넘겨줍니다.
  const overlayHtml =
    viewType === "rich"
      ? richOverlay(args)
      : viewType === "hero"
        ? heroOverlay(args)
        : "";

  return `
    <div style="position: absolute; left: 0; top: 0; width: 0; height: 0; overflow: visible;">
      ${overlayHtml}
      ${dotHtml}
    </div>
  `;
}

function dotIcon({
  type,
  state,
  label,
}: {
  type: MarkerType;
  state: MarkerState;
  label?: string;
}) {
  const size = state === "focus" ? 42 : state === "hover" ? 40 : 38;
  const pinColor = markerVars(type).dot;
  const safeLabel = escapeHtml((label ?? "").trim());

  const shadow =
    state === "focus"
      ? "drop-shadow(0 0 0 4px var(--oboon-focus-ring)) drop-shadow(0 4px 10px var(--oboon-map-shadow-strong))"
      : state === "hover"
      ? "drop-shadow(0 4px 9px var(--oboon-map-shadow-strong))"
      : "drop-shadow(0 3px 7px var(--oboon-map-shadow-default))";

  return `
    <div style="
      position: absolute;
      left: 0; top: 0;
      transform: translate(-50%, -100%);
      width: ${size}px;
      height: ${size}px;
      pointer-events: auto;
      z-index: 10;
      overflow: visible;
    ">
      <div style="
        width: ${size}px;
        height: ${size}px;
        filter: ${shadow};
      ">
        <svg
          width="${size}"
          height="${size}"
          viewBox="0 0 42 42"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="${escapeHtml(type)} marker"
        >
          <path
            d="M21 1C12.2 1 5 8.2 5 17c0 11.6 16 24 16 24s16-12.4 16-24C37 8.2 29.8 1 21 1z"
            fill="${pinColor}"
          />
          <circle cx="21" cy="14" r="5.2" fill="var(--oboon-on-primary)" />
        </svg>
      </div>
      ${
        safeLabel
          ? `<div style="
              position: absolute;
              left: 50%;
              top: calc(100% + 6px);
              transform: translateX(-50%);
              max-width: 180px;
              min-width: 64px;
              padding: 4px 10px;
              border-radius: 12px;
              border: 1px solid var(--oboon-border-default);
              background: var(--oboon-bg-surface);
              color: var(--oboon-text-title);
              font-size: 13px;
              font-weight: 700;
              line-height: 1.25;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              box-shadow: 0 2px 6px var(--oboon-map-shadow-default);
            ">${safeLabel}</div>`
          : ""
      }
    </div>
  `;
}

function richOverlay({
  type,
  topLabel,
  mainLabel,
  imageUrl,
  address,
  ctaLabel,
  canConsult,
}: {
  type: MarkerType;
  topLabel?: string | null;
  mainLabel?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  ctaLabel?: string | null;
  canConsult?: boolean;
}) {
  if (type === "modelhouse") {
    const safeTop = escapeHtml(topLabel ?? "모델하우스");
    const safeMain = escapeHtml(mainLabel ?? address ?? "주소 정보 없음");
    const safeCta = escapeHtml(ctaLabel ?? "상담하기");
    const consultEnabled = canConsult !== false;
    const safeImageUrl = escapeHtml(imageUrl ?? "");
    const hasImage = safeImageUrl.length > 0;
    const imageBlock = hasImage
      ? `<div style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden;">
            <img src="${safeImageUrl}" alt="${safeTop}" style="width:100%;height:100%;object-fit:cover;" />
         </div>`
      : "";

    return `
      <div style="
        position:absolute;
        left:0; top:0;
        transform:translate(-50%, calc(-100% - 18px));
        z-index:20;
        pointer-events:none;
        filter: drop-shadow(0 8px 18px var(--oboon-map-shadow-strong));
      ">
        <div style="
          width:240px;
          background:var(--oboon-bg-surface);
          border:1px solid var(--oboon-border-default);
          border-radius:14px;
          overflow:visible;
          pointer-events:auto;
          position:relative;
          z-index:1;
        ">
          <div style="
            position:absolute;
            inset:0;
            border:1px solid var(--oboon-border-default);
            border-radius:14px;
            pointer-events:none;
            z-index:2;
          "></div>
          ${imageBlock}
          <div style="position:relative; z-index:1; padding:10px 12px;">
            <div style="font-size:11px; font-weight:700; color:var(--oboon-text-muted);">${safeTop}</div>
            <div style="margin-top:2px; font-size:14px; font-weight:800; color:var(--oboon-text-title);">${safeMain}</div>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button
                type="button"
                data-map-action="copy-address"
                style="
                  flex:1;
                  height:30px;
                  border-radius:999px;
                  border:1px solid var(--oboon-border-default);
                  background:var(--oboon-bg-subtle);
                  color:var(--oboon-text-title);
                  font-size:12px;
                  font-weight:700;
                  cursor:pointer;
                "
              >
                주소 복사
              </button>
              <button
                type="button"
                data-map-action="consult"
                data-map-disabled="${consultEnabled ? "0" : "1"}"
                ${consultEnabled ? "" : "disabled"}
                style="
                  flex:1;
                  height:30px;
                  border-radius:999px;
                  border:1px solid var(--oboon-primary);
                  background:var(--oboon-primary);
                  color:var(--oboon-on-primary);
                  font-size:12px;
                  font-weight:700;
                  cursor:${consultEnabled ? "pointer" : "not-allowed"};
                  opacity:${consultEnabled ? "1" : "0.45"};
                "
              >
                ${safeCta}
              </button>
            </div>
          </div>
        </div>
        ${speechBubbleTailHtml({
          borderColor: "var(--oboon-border-default)",
          fillColor: "var(--oboon-bg-surface)",
        })}
      </div>
    `;
  }

  const v = markerVars(type);
  const top = escapeHtml(topLabel ?? "");
  const main = escapeHtml(mainLabel ?? "");

  // Dot(점)의 반지름(약 7~9px) + 여유 공간(4~5px) = 약 12px 정도 위로 띄움
  return `
      <div style="
        position: absolute;
        left: 0; top: 0;
        transform: translate(-50%, calc(-100% - 18px));
        z-index: 20;
        pointer-events: none;
        filter: drop-shadow(0 2px 4px var(--oboon-map-shadow-default));
        /* flex 등 레이아웃 영향 제거를 위해 너비 자동 설정 */
        white-space: nowrap; 
      ">
        <div style="
          background: ${v.bg};
          border: 1px solid ${v.border};
          border-radius: 14px;
          padding: 8px 12px;
          min-width: 92px;
          max-width: 240px;
          pointer-events: auto;
          position: relative; /* 내부 absolute 요소 기준점 */
          z-index: 1;
          cursor: pointer;
        " data-map-marker-surface="1">
      <div style="
        display:flex; align-items:center; gap:6px;
        font-size: 11px; font-weight: 800;
        color: ${v.subText};
        margin-bottom: 4px;
        overflow:hidden; text-overflow:ellipsis;
      ">
        <span style="width:8px;height:8px;border-radius:9999px;background:${v.dot};flex:0 0 auto;"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;">${top}</span>
      </div>
      <div style="
        font-size: 14px;
        font-weight: 900;
        letter-spacing: -0.02em;
        color: ${v.text};
        overflow:hidden; text-overflow:ellipsis;
      ">
        ${main}
      </div>
    </div>
    ${speechBubbleTailHtml({
      borderColor: v.border,
      fillColor: v.bg,
    })}
  </div>
  `;
}

function heroOverlay({
  type,
  state,
  label,
  topLabel,
  mainLabel,
  imageUrl,
  address,
  propertyType,
  ctaLabel,
  canConsult,
  heroMeta,
}: {
  type: MarkerType;
  state: MarkerState;
  label?: string | null;
  topLabel?: string | null;
  mainLabel?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  propertyType?: string | null;
  ctaLabel?: string | null;
  canConsult?: boolean;
  heroMeta?: MarkerHeroMeta | null;
}) {
  if (type === "modelhouse") {
    return richOverlay({
      type,
      topLabel,
      mainLabel,
      imageUrl,
      address,
      ctaLabel,
      canConsult,
    });
  }

  const v = markerVars(type);
  const safeTitle = escapeHtml(
    (label ?? topLabel ?? mainLabel ?? address ?? "현장").trim() || "현장",
  );
  const safeMainLabel = escapeHtml((mainLabel ?? "").trim());
  const heroMetaLine = [topLabel ?? address ?? "", propertyType ?? "", ctaLabel ?? ""]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .map((part) => escapeHtml(part))
    .join(" · ");
  const safeImageUrl = escapeHtml((imageUrl ?? "").trim());
  const hasHeroImage = safeImageUrl.length > 0;
  const heroHighlights = (heroMeta?.highlights ?? [])
    .map((item) => {
      const labelText = (item.label ?? "").trim();
      if (!labelText) return null;
      const valueText = (item.value ?? "").trim();
      if (!valueText) return null;
      const renderedStat: RenderedHeroStat = {
        label: escapeHtml(labelText),
        value: escapeHtml(valueText),
        tone: item.tone ?? "neutral",
      };
      return renderedStat;
    })
    .filter((item): item is RenderedHeroStat => item !== null)
    .slice(0, 6);
  const safeFallbackMain = safeMainLabel;
  const safeFallbackStatus = escapeHtml((ctaLabel ?? "").trim());
  const safeConsultFallback =
    heroMeta?.badges?.length || safeFallbackMain.length || safeFallbackStatus.length
      ? ""
      : typeof canConsult === "boolean"
        ? canConsult
          ? "상담 가능"
          : "상담 준비"
        : "";
  const heroBadges = (heroMeta?.badges ?? [])
    .map((badge) => {
      const labelText = (badge.label ?? "").trim();
      if (!labelText) return null;
      const renderedBadge: RenderedHeroBadge = {
        label: escapeHtml(labelText),
        tone: badge.tone ?? "neutral",
      };
      return renderedBadge;
    })
    .filter((badge): badge is RenderedHeroBadge => badge !== null)
    .slice(0, 6);
  const safeFinalBadgeLabel = escapeHtml((heroMeta?.finalBadgeLabel ?? "").trim());
  const finalBadgeTone = heroMeta?.finalBadgeTone ?? "neutral";
  const finalBadgeStyles = heroBadgeToneStyles(finalBadgeTone);
  const showFinalBadge = safeFinalBadgeLabel.length > 0;
  const fallbackBadges: RenderedHeroBadge[] = [];
  if (heroBadges.length === 0 && heroHighlights.length === 0) {
    if (safeFallbackMain) {
      fallbackBadges.push({ label: safeFallbackMain, tone: "neutral" });
    }
    if (safeFallbackStatus) {
      fallbackBadges.push({ label: safeFallbackStatus, tone: "neutral" });
    }
    if (safeConsultFallback) {
      fallbackBadges.push({
        label: escapeHtml(safeConsultFallback),
        tone: "neutral",
      });
    }
  }
  const rawScoreLabel = (heroMeta?.scoreLabel ?? "").trim();
  const scoreLabel = rawScoreLabel || "매칭률";
  const hasScoreLabel = rawScoreLabel.length > 0;
  const rawScoreValue = heroMeta?.scoreValue;
  const scoreValue =
    typeof rawScoreValue === "number" && Number.isFinite(rawScoreValue)
      ? Math.max(0, Math.min(100, rawScoreValue))
      : null;
  const scoreSuffix =
    (heroMeta?.scoreSuffix ?? "%").trim() || "%";
  const scoreText =
    scoreValue === null
      ? "비공개"
      : `${Math.round(scoreValue).toLocaleString("ko-KR")}${scoreSuffix}`;
  const scoreWidth = `${scoreValue ?? 0}%`;
  const showScore = hasScoreLabel || scoreValue !== null;

  return `
    <div style="
      position: absolute;
      left: 0; top: 0;
      transform: translate(-50%, calc(-100% - 18px)) scale(${state === "focus" ? 1.02 : state === "hover" ? 1.01 : 1});
      z-index: 20;
      pointer-events: none;
      filter: drop-shadow(0 12px 26px var(--oboon-map-shadow-strong));
      white-space: normal;
    ">
      <div style="
        position: relative;
        width: clamp(326px, 40vw, 392px);
        max-width: 90vw;
        overflow: visible;
        border-radius: 20px;
        border: 1px solid ${v.dot};
        background: var(--oboon-bg-surface);
        pointer-events: auto;
        z-index: 1;
        cursor: pointer;
      " data-map-marker-surface="1">
        <div style="
          position: absolute;
          inset: 0;
          background: none;
          pointer-events: none;
        "></div>
        <div style="
          position: absolute;
          inset: 0;
          border: 1px solid ${v.dot};
          border-radius: 20px;
          pointer-events: none;
          z-index: 2;
        "></div>

        <div style="
          position: relative;
          z-index: 1;
          padding: 12px 14px 13px;
        ">
          <div style="
            display: grid;
            grid-template-columns: 68px minmax(0, 1fr);
            gap: 11px;
            align-items: stretch;
          ">
            <div style="
              position: relative;
              overflow: hidden;
              border-radius: 16px;
              background:
                radial-gradient(circle at 20% 20%, color-mix(in srgb, ${v.dot} 18%, transparent) 0%, transparent 48%),
                linear-gradient(135deg, color-mix(in srgb, ${v.dot} 18%, var(--oboon-bg-subtle)) 0%, var(--oboon-bg-surface) 62%, color-mix(in srgb, ${v.dot} 8%, var(--oboon-bg-subtle)) 100%);
              border: 1px solid color-mix(in srgb, ${v.dot} 18%, var(--oboon-border-default));
              min-height: 68px;
            ">
              ${
                hasHeroImage
                  ? `<img
                      src="${safeImageUrl}"
                      alt="${safeTitle}"
                      style="
                        display: block;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                      "
                    />`
                  : `<div style="
                      position: absolute;
                      inset: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: ${v.subText};
                      font-size: 10px;
                      font-weight: 900;
                      letter-spacing: 0.18em;
                      text-transform: uppercase;
                    ">IMG</div>`
              }
            </div>

            <div style="
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 4px;
            ">
              <div style="
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
              ">
                <div style="
                  min-width: 0;
                  flex: 1 1 auto;
                ">
                  <div style="
                    color: ${v.text};
                    font-size: 15px;
                    font-weight: 800;
                    line-height: 1.2;
                    letter-spacing: -0.03em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  ">
                    ${safeTitle}
                  </div>
                  ${
                    heroMetaLine
                      ? `<div style="
                          margin-top: 4px;
                          color: ${v.subText};
                          font-size: 12px;
                          font-weight: 600;
                          line-height: 1.35;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                    ">${heroMetaLine}</div>`
                      : ""
                  }
                </div>

                ${
                  showFinalBadge
                    ? `<span style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 30px;
                        border-radius: 999px;
                        border: 1px solid ${finalBadgeStyles.border};
                        background: ${finalBadgeStyles.bg};
                        color: ${finalBadgeStyles.text};
                        padding: 0 11px;
                        font-size: 12px;
                        font-weight: 900;
                        line-height: 1;
                        white-space: nowrap;
                        box-shadow: 0 1px 0 color-mix(in srgb, ${v.dot} 10%, transparent);
                      ">${safeFinalBadgeLabel}</span>`
                    : ""
                }
              </div>

              ${
                safeMainLabel
                  ? `<div style="
                      color: ${v.text};
                      font-size: 18px;
                      font-weight: 800;
                      line-height: 1.15;
                      letter-spacing: -0.03em;
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    ">${safeMainLabel}</div>`
                  : ""
              }
            </div>
          </div>

          ${
            heroBadges.length > 0
              ? `<div style="
                  margin-top: 10px;
                  display: flex;
                  flex-wrap: wrap;
                  gap: 6px;
                ">
                  ${heroBadges
                    .map((badge) => {
                      const styles = heroBadgeToneStyles(badge.tone);
                      return `
                        <span style="
                          display: inline-flex;
                          align-items: center;
                          min-height: 24px;
                          border-radius: 999px;
                          border: 1px solid ${styles.border};
                          background: ${styles.bg};
                          color: ${styles.text};
                          padding: 0 9px;
                          font-size: 11px;
                          font-weight: 800;
                          line-height: 1;
                          white-space: nowrap;
                        ">${badge.label}</span>
                      `;
                    })
                    .join("")}
                </div>`
              : ""
          }

          ${
            heroHighlights.length > 0
              ? `<div style="
                  margin-top: 10px;
                  display: flex;
                  gap: 8px;
                  align-items: center;
                ">
                  ${heroHighlights
                    .map((stat) => {
                      const styles = heroToneStyles(stat.tone);
                      return `
                        <span style="
                          display: flex;
                          align-items: center;
                          gap: 6px;
                          min-height: 22px;
                          min-width: 0;
                          flex: 1 1 0;
                          width: 0;
                          white-space: nowrap;
                          font-size: 11px;
                          font-weight: 800;
                          line-height: 1;
                          overflow: visible;
                          padding: 2px 0;
                        ">
                          <span style="
                            width: 8px;
                            height: 8px;
                            flex: 0 0 auto;
                            border-radius: 999px;
                            background: ${styles.dot};
                            box-shadow: 0 0 0 4px color-mix(in srgb, ${styles.dot} 14%, transparent);
                          "></span>
                          <span style="
                            min-width: 0;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            color: ${v.text};
                          ">${stat.label}</span>
                          <span style="color: ${styles.text};">${stat.value}</span>
                        </span>
                      `;
                    })
                    .join("")}
                </div>`
              : ""
          }

          ${
            showScore
              ? `<div style="margin-top: 11px;">
                  <div style="
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 10px;
                  ">
                    <span style="
                      color: ${v.subText};
                      font-size: 11px;
                      font-weight: 800;
                      line-height: 1;
                    ">${escapeHtml(scoreLabel)}</span>
                    <span style="
                      color: ${v.text};
                      font-size: 18px;
                      font-weight: 900;
                      line-height: 1;
                      letter-spacing: -0.03em;
                    ">${escapeHtml(scoreText)}</span>
                  </div>
                  <div style="
                    margin-top: 8px;
                    height: 5px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: color-mix(in srgb, ${v.dot} 12%, var(--oboon-bg-subtle));
                  ">
                    <span style="
                      display: block;
                      width: ${scoreWidth};
                      height: 100%;
                      border-radius: inherit;
                      background: linear-gradient(
                        90deg,
                        ${v.dot} 0%,
                        color-mix(in srgb, ${v.dot} 58%, var(--oboon-on-primary)) 100%
                      );
                    "></span>
                  </div>
                </div>`
              : ""
          }
        </div>

        ${speechBubbleTailHtml({
          borderColor: v.dot,
          fillColor: "var(--oboon-bg-surface)",
        })}
      </div>
    </div>
  `;
}

function speechBubbleTailHtml(args: {
  borderColor: string;
  fillColor: string;
}) {
  const borderColor = escapeHtml(args.borderColor);
  const fillColor = escapeHtml(args.fillColor);

  return `
    <div style="
      position:absolute;
      left:50%;
      bottom:-18px;
      width:28px;
      height:18px;
      transform:translateX(-50%);
      pointer-events:none;
      z-index:0;
    ">
      <svg
        width="28"
        height="18"
        viewBox="0 0 28 18"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M14 18L0 0H28L14 18Z" fill="${borderColor}" />
        <path d="M14 16L3.75 2H24.25L14 16Z" fill="${fillColor}" />
      </svg>
    </div>
  `;
}

function heroToneStyles(tone: MarkerHeroTone): {
  dot: string;
  text: string;
} {
  switch (tone) {
    case "green":
      return {
        dot: "var(--oboon-grade-green)",
        text: "var(--oboon-grade-green-text)",
      };
    case "lime":
      return {
        dot: "var(--oboon-grade-lime)",
        text: "var(--oboon-grade-lime-text)",
      };
    case "yellow":
      return {
        dot: "var(--oboon-grade-yellow)",
        text: "var(--oboon-grade-yellow-text)",
      };
    case "orange":
      return {
        dot: "var(--oboon-grade-orange)",
        text: "var(--oboon-grade-orange-text)",
      };
    case "red":
      return {
        dot: "var(--oboon-grade-red)",
        text: "var(--oboon-grade-red-text)",
      };
    default:
      return {
        dot: "var(--oboon-text-muted)",
        text: "var(--oboon-text-title)",
      };
  }
}

function heroBadgeToneStyles(tone: MarkerHeroTone): {
  bg: string;
  border: string;
  text: string;
} {
  switch (tone) {
    case "green":
      return {
        bg: "var(--oboon-grade-green-bg)",
        border: "var(--oboon-grade-green-border)",
        text: "var(--oboon-grade-green-text)",
      };
    case "lime":
      return {
        bg: "var(--oboon-grade-lime-bg)",
        border: "var(--oboon-grade-lime-border)",
        text: "var(--oboon-grade-lime-text)",
      };
    case "yellow":
      return {
        bg: "var(--oboon-grade-yellow-bg)",
        border: "var(--oboon-grade-yellow-border)",
        text: "var(--oboon-grade-yellow-text)",
      };
    case "orange":
      return {
        bg: "var(--oboon-grade-orange-bg)",
        border: "var(--oboon-grade-orange-border)",
        text: "var(--oboon-grade-orange-text)",
      };
    case "red":
      return {
        bg: "var(--oboon-grade-red-bg)",
        border: "var(--oboon-grade-red-border)",
        text: "var(--oboon-grade-red-text)",
      };
    default:
      return {
        bg: "var(--oboon-bg-subtle)",
        border: "var(--oboon-border-default)",
        text: "var(--oboon-text-title)",
      };
  }
}
