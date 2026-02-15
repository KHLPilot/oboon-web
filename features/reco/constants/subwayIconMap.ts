const normalizeLine = (line: string) => line.toLowerCase().replace(/\s+/g, "");

const SUBWAY_ICON_MAPPINGS: Array<{ keywords: string[]; path: string }> = [
  {
    keywords: ["부산김해", "김해경전철", "busangimhae", "busan-gimhae"],
    path: "/icons/subway/Busan-Gimhae-LRT.svg",
  },
  {
    keywords: ["부산1호선", "busan-line-1", "busan1"],
    path: "/icons/subway/Busan-line-1.svg",
  },
  {
    keywords: ["부산2호선", "busan-line-2", "busan2"],
    path: "/icons/subway/Busan-line-2.svg",
  },
  {
    keywords: ["부산3호선", "busan-line-3", "busan3"],
    path: "/icons/subway/Busan-line-3.svg",
  },
  {
    keywords: ["부산4호선", "busan-line-4", "busan4"],
    path: "/icons/subway/Busan-line-4.svg",
  },
  {
    keywords: ["대구산업선", "daegusaneop"],
    path: "/icons/subway/Daegusaneop-Line.svg",
  },
  {
    keywords: ["대경선", "daegyeong"],
    path: "/icons/subway/Daegyeong-Line.svg",
  },
  {
    keywords: ["대구1호선", "daegu-line-1", "daegu1"],
    path: "/icons/subway/Daegu-line-1.svg",
  },
  {
    keywords: ["대구2호선", "daegu-line-2", "daegu2"],
    path: "/icons/subway/Daegu-line-2.svg",
  },
  {
    keywords: ["대구3호선", "daegu-line-3", "daegu3"],
    path: "/icons/subway/Daegu-line-3.svg",
  },
  {
    keywords: ["대구4호선", "daegu-line-4", "daegu4"],
    path: "/icons/subway/Daegu-line-4.svg",
  },
  {
    keywords: ["대장홍대선", "daejang-hongdae"],
    path: "/icons/subway/Daejang-Hongdae-Line.svg",
  },
  {
    keywords: ["대전1호선", "daejeon-line-1", "daejeon1"],
    path: "/icons/subway/Daejeon-line-1.svg",
  },
  {
    keywords: ["대전2호선", "daejeon-line-2", "daejeon2"],
    path: "/icons/subway/Daejeon-line-2.svg",
  },
  { keywords: ["동북선", "dongbuk"], path: "/icons/subway/Dongbuk-Line.svg" },
  { keywords: ["동해선", "donghae"], path: "/icons/subway/Donghae-Line.svg" },
  {
    keywords: ["동탄인덕원선", "dongtan-indeogwon"],
    path: "/icons/subway/Dongtan-Indeogwon-Line.svg",
  },
  {
    keywords: ["gtx-a", "gtxa", "수도권광역급행a"],
    path: "/icons/subway/GTX-Line-A.svg",
  },
  {
    keywords: ["gtx-b", "gtxb", "수도권광역급행b"],
    path: "/icons/subway/GTX-Line-B.svg",
  },
  {
    keywords: ["gtx-c", "gtxc", "수도권광역급행c"],
    path: "/icons/subway/GTX-Line-C.svg",
  },
  {
    keywords: ["gtx-d", "gtxd", "수도권광역급행d"],
    path: "/icons/subway/GTX-Line-D.svg",
  },
  {
    keywords: ["김포골드", "김포골드라인", "gimpo-goldline"],
    path: "/icons/subway/Gimpo-Goldline.svg",
  },
  {
    keywords: ["광주1호선", "gwangju-line-1", "gwangju1"],
    path: "/icons/subway/Gwangju-line-1.svg",
  },
  {
    keywords: ["광주2호선", "gwangju-line-2", "gwangju2"],
    path: "/icons/subway/Gwangju-line-2.svg",
  },
  {
    keywords: ["경춘선", "gyeongchun"],
    path: "/icons/subway/Gyeongchun-Line.svg",
  },
  {
    keywords: ["경강선", "gyeonggang"],
    path: "/icons/subway/Gyeonggang-Line.svg",
  },
  {
    keywords: ["경의중앙선", "경의중앙", "gyeongui-jungang"],
    path: "/icons/subway/Gyeongui-Jungang-Line.svg",
  },
  {
    keywords: ["인천1호선", "incheon-line-1", "incheon1"],
    path: "/icons/subway/Incheon-line-1.svg",
  },
  {
    keywords: ["인천2호선", "incheon-line-2", "incheon2"],
    path: "/icons/subway/Incheon-line-2.svg",
  },
  { keywords: ["서해선", "seohae"], path: "/icons/subway/Seohae-Line.svg" },
  {
    keywords: ["서울1호선", "수도권1호선", "seoul-line-1", "seoul1"],
    path: "/icons/subway/Seoul-line-1.svg",
  },
  {
    keywords: ["서울2호선", "수도권2호선", "seoul-line-2", "seoul2"],
    path: "/icons/subway/Seoul-line-2.svg",
  },
  {
    keywords: ["서울3호선", "수도권3호선", "seoul-line-3", "seoul3"],
    path: "/icons/subway/Seoul-line-3.svg",
  },
  {
    keywords: ["서울4호선", "수도권4호선", "seoul-line-4", "seoul4"],
    path: "/icons/subway/Seoul-line-4.svg",
  },
  {
    keywords: ["서울5호선", "수도권5호선", "seoul-line-5", "seoul5"],
    path: "/icons/subway/Seoul-line-5.svg",
  },
  {
    keywords: ["서울6호선", "수도권6호선", "seoul-line-6", "seoul6"],
    path: "/icons/subway/Seoul-line-6.svg",
  },
  {
    keywords: ["서울7호선", "수도권7호선", "seoul-line-7", "seoul7"],
    path: "/icons/subway/Seoul-line-7.svg",
  },
  {
    keywords: ["서울8호선", "수도권8호선", "seoul-line-8", "seoul8"],
    path: "/icons/subway/Seoul-line-8.svg",
  },
  {
    keywords: ["서울9호선", "수도권9호선", "seoul-line-9", "seoul9"],
    path: "/icons/subway/Seoul-line-9.svg",
  },
  {
    keywords: ["신분당선", "신분당", "shinbundang"],
    path: "/icons/subway/Shinbundang-Line.svg",
  },
  {
    keywords: ["신림선", "신림", "sillim"],
    path: "/icons/subway/Sillim-Line.svg",
  },
  {
    keywords: ["신안산선", "신안산", "sinansan"],
    path: "/icons/subway/Sinansan-Line.svg",
  },
  {
    keywords: ["수인분당선", "수인분당", "suin-bundang"],
    path: "/icons/subway/Suin-Bundang-Line.svg",
  },
  {
    keywords: ["의정부경전철", "u-line", "uline"],
    path: "/icons/subway/U-Line.svg",
  },
  {
    keywords: ["우이신설선", "우이신설", "ui-sinseol"],
    path: "/icons/subway/Ui-Sinseol-Line.svg",
  },
  {
    keywords: ["위례선", "위례", "wirye"],
    path: "/icons/subway/Wirye-Line.svg",
  },
  {
    keywords: ["양산선", "양산", "yangsan"],
    path: "/icons/subway/Yangsan-Line.svg",
  },
  {
    keywords: ["용인에버라인", "에버라인", "yongin-everline"],
    path: "/icons/subway/Yongin-EverLine.svg",
  },
  {
    keywords: ["공항철도", "arex", "airport-railroad"],
    path: "/icons/subway/Airport-Railroad-Express.svg",
  },
];

export function getSubwayIconPath(line: string): string | null {
  const normalized = normalizeLine(line);
  const hit = SUBWAY_ICON_MAPPINGS.find((m) =>
    m.keywords.some((k) => normalized.includes(normalizeLine(k))),
  );
  if (hit) return hit.path;

  const n = line.match(/([0-9]+)호선/);
  if (n?.[1]) return `/icons/subway/Seoul-line-${n[1]}.svg`;

  return null;
}
