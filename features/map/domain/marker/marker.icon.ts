// features/map/marker/marker.icon.ts
import type { MarkerType } from "./marker.type";
import { markerVars } from "./marker.theme";

export type MarkerState = "default" | "hover" | "focus";
export type MarkerViewType = "compact" | "rich";
export function iconFor(args: {
  type: MarkerType;
  state: MarkerState;
  viewType: MarkerViewType;
  topLabel?: string | null;
  mainLabel?: string | null;
}) {
  const { type, state, viewType } = args;

  const dotHtml = dotIcon({ type, state });
  // richOverlay에도 args 전체를 넘겨줍니다.
  const overlayHtml = viewType === "rich" ? richOverlay(args) : "";

  return `
    <div style="position: absolute; left: 0; top: 0; width: 0; height: 0; overflow: visible;">
      ${overlayHtml}
      ${dotHtml}
    </div>
  `;
}

function dotIcon({ type, state }: { type: MarkerType; state: MarkerState }) {
  const size = state === "focus" ? 18 : state === "hover" ? 16 : 14;

  const halo =
    state === "focus"
      ? `box-shadow: 0 0 0 4px var(--oboon-focus-ring), 0 0 10px var(--oboon-map-shadow-strong);`
      : state === "hover"
      ? `box-shadow: 0 0 8px var(--oboon-map-shadow-strong);`
      : `box-shadow: 0 0 6px var(--oboon-map-shadow-default);`;

  return `
    <div style="
      position: absolute;
      left: 0; top: 0;
      transform: translate(-50%, -50%);
      width: ${size}px;
      height: ${size}px;
      background: #ffffff;
      border: 3px solid var(--oboon-marker-${type});
      border-radius: 9999px;
      ${halo}
      z-index: 10;
    "></div>
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
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
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
