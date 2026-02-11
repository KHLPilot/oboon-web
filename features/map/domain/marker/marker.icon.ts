// features/map/marker/marker.icon.ts
import type { MarkerType } from "./marker.type";
import { markerVars } from "./marker.theme";

export type MarkerState = "default" | "hover" | "focus";
export type MarkerViewType = "compact" | "rich";
export function iconFor(args: {
  type: MarkerType;
  state: MarkerState;
  viewType: MarkerViewType;
  label?: string | null;
  topLabel?: string | null;
  mainLabel?: string | null;
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
  const overlayHtml = viewType === "rich" ? richOverlay(args) : "";

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
  const pinColor = `var(--oboon-marker-${type})`;
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
}: {
  type: MarkerType;
  topLabel?: string | null;
  mainLabel?: string | null;
}) {
  const v = markerVars(type);
  const top = escapeHtml(topLabel ?? "");
  const main = escapeHtml(mainLabel ?? "");

  // Dot(점)의 반지름(약 7~9px) + 여유 공간(4~5px) = 약 12px 정도 위로 띄움
  return `
  <div style="
    position: absolute;
    left: 0; top: 0;
    transform: translate(-50%, calc(-100% - 12px));
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
    ">
      <div style="
        position: absolute;
        left: 50%;
        bottom: -6px;
        width: 12px;
        height: 12px;
        background: ${v.bg};
        border-left: 1px solid ${v.border};
        border-bottom: 1px solid ${v.border};
        transform: translateX(-50%) rotate(-45deg);
      "></div>

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
  </div>
  `;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
