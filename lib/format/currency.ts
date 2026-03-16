export function formatManwon(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("ko-KR")}만원`;
}

function splitManwonUnits(value: number) {
  const manwon = Math.round(value);
  const jo = Math.floor(manwon / 100_000_000);
  const remainderAfterJo = manwon % 100_000_000;
  const eok = Math.floor(remainderAfterJo / 10_000);
  const restManwon = remainderAfterJo % 10_000;

  return { manwon, jo, eok, restManwon };
}

function formatManwonUnitParts(value: number, options?: { compact?: boolean }): string {
  const { compact = false } = options ?? {};
  const { manwon, jo, eok, restManwon } = splitManwonUnits(value);

  if (manwon < 10_000) {
    return formatManwon(manwon);
  }

  const parts: string[] = [];

  if (jo > 0) {
    parts.push(`${jo.toLocaleString("ko-KR")}조`);
  }

  if (eok > 0) {
    parts.push(`${eok.toLocaleString("ko-KR")}억`);
  }

  if (restManwon > 0) {
    if (compact && restManwon % 1000 === 0) {
      parts.push(`${restManwon / 1000}천만원`);
    } else {
      parts.push(`${restManwon.toLocaleString("ko-KR")}만원`);
    }
  }

  return parts.join(" ");
}

export function formatEok(value: number): string {
  if (value >= 10_000) {
    return formatSingleEokPreview(value);
  }

  const normalized = Number.isInteger(value)
    ? value.toLocaleString("ko-KR")
    : value.toLocaleString("ko-KR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
  return `${normalized}억`;
}

export function formatManwonWithEok(value: number): string {
  return formatManwonUnitParts(value);
}

function formatSingleEokPreview(value: number): string {
  const normalized = Math.max(0, Math.floor(value * 10) / 10);
  const jo = Math.floor(normalized / 10_000);
  const remainderEok = normalized - jo * 10_000;
  const eok = Math.floor(remainderEok);

  let cheon = Math.round((remainderEok - eok) * 10);
  let eokCarry = eok;
  let joCarry = jo;

  if (cheon >= 10) {
    eokCarry += 1;
    cheon = 0;
  }
  if (eokCarry >= 10_000) {
    joCarry += 1;
    eokCarry -= 10_000;
  }

  if (joCarry > 0 && eokCarry > 0) {
    return `${joCarry.toLocaleString("ko-KR")}조 ${eokCarry.toLocaleString("ko-KR")}억`;
  }
  if (joCarry > 0) return `${joCarry.toLocaleString("ko-KR")}조`;
  if (eokCarry > 0 && cheon > 0) return `${eokCarry.toLocaleString("ko-KR")}억 ${cheon}천`;
  if (eokCarry > 0) return `${eokCarry.toLocaleString("ko-KR")}억`;
  if (cheon > 0) return `${cheon}천`;
  return "0";
}

export function formatEokPreview(min: number, max: number = min): string {
  if (min === max) {
    return formatSingleEokPreview(min);
  }

  return `${formatSingleEokPreview(min)} ~ ${formatSingleEokPreview(max)}`;
}

export function formatManwonPreview(value: number): string {
  return formatManwonUnitParts(value, { compact: true });
}

export function formatPercent(value: number, digits: number = 1): string {
  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function parseEok(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed * 10) / 10;
}
