// shared/price.ts

type FormatOptions = {
  unknownLabel?: string; // 기본: "가격 정보 없음"
  eokSuffix?: string; // 기본: "억"
  cheonSuffix?: string; // 기본: "천"
};

type RequiredOptions = Required<FormatOptions>;

/**
 * 원(won) 단위 가격을 "00억 0천" 형식으로 변환
 * - 억: 100,000,000원
 * - 천(천만): 10,000,000원
 */
function formatWonToEokCheon(won: number, opts: RequiredOptions): string {
  const eok = Math.floor(won / 100_000_000);
  const cheon = Math.floor((won % 100_000_000) / 10_000_000);

  if (eok > 0 && cheon > 0)
    return `${eok}${opts.eokSuffix} ${cheon}${opts.cheonSuffix}`;
  if (eok > 0) return `${eok}${opts.eokSuffix}`;
  return `${cheon}${opts.cheonSuffix}`;
}

/**
 * 가격 범위를 문자열로 포맷합니다.
 * - DB 단위: 원(won)
 * - UI 출력: "00억 0천"
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

  const minStr: string | undefined =
    minWon == null ? undefined : formatWonToEokCheon(minWon, options);
  const maxStr: string | undefined =
    maxWon == null ? undefined : formatWonToEokCheon(maxWon, options);

  // ✅ 여기서부터는 null/undefined 케이스를 완전히 제거
  if (!minStr && !maxStr) return options.unknownLabel;
  if (minStr && !maxStr) return `${minStr} ~`;
  if (!minStr && maxStr) return `~ ${maxStr}`;

  // ✅ 이 시점에는 둘 다 string임을 TS가 확실히 앎
  const a = minStr as string;
  const b = maxStr as string;

  if (a === b) return a;
  return `${a} ~ ${b}`;
}
