// shared/price.ts

export type FormatOptions = {
  unknownLabel?: string; // 기본: "가격 정보 없음"
  eokSuffix?: string; // 기본: "억"
  cheonSuffix?: string; // 기본: "천"
};

type RequiredOptions = Required<FormatOptions>;

/**
 * 단일 가격 포맷팅 (원 단위 -> UI용 문자열)
 * - 1만 원 미만: "5,000원"
 * - 억/천 단위 끊어지면: "1억 5천", "8천"
 * - 나머지 있으면: "2,312만", "1억 8,500만"
 */
export function formatPrice(
  won: number | null | undefined,
  opts: FormatOptions = {}
): string {
  if (won == null) return "";

  // 1. 1만 원 미만 처리
  if (won < 10000) return `${won.toLocaleString()}원`;

  const options: RequiredOptions = {
    unknownLabel: opts.unknownLabel ?? "가격 정보 없음",
    eokSuffix: opts.eokSuffix ?? "억",
    cheonSuffix: opts.cheonSuffix ?? "천",
  };

  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000); // 만원 단위

  const eokStr = eok > 0 ? `${eok}${options.eokSuffix}` : "";
  let manStr = "";

  if (man > 0) {
    // 천만 단위로 딱 떨어지는 경우 (예: 2000만 -> 2천)
    if (man % 1000 === 0) {
      manStr = `${man / 1000}${options.cheonSuffix}`;
    } else {
      // 그 외: "2,312만"
      manStr = `${man.toLocaleString()}만`;
    }
  }

  return `${eokStr}${eokStr && manStr ? " " : ""}${manStr}`;
}

/**
 * 가격 범위를 문자열로 포맷합니다.
 * "min ~ max"
 */
export function formatPriceRange(
  minWon: number | null | undefined,
  maxWon: number | null | undefined,
  opts: FormatOptions = {}
): string {
  const options: RequiredOptions = {
    unknownLabel: opts.unknownLabel ?? "가격 정보 없음",
    eokSuffix: opts.eokSuffix ?? "억",
    cheonSuffix: opts.cheonSuffix ?? "천",
  };

  // 위에서 만든 formatPrice 재사용
  const minStr = formatPrice(minWon, opts);
  const maxStr = formatPrice(maxWon, opts);

  if (!minStr && !maxStr) return options.unknownLabel;
  if (minStr && !maxStr) return `${minStr} ~`;
  if (!minStr && maxStr) return `~ ${maxStr}`;

  if (minStr === maxStr) return minStr;
  return `${minStr} ~ ${maxStr}`;
}
