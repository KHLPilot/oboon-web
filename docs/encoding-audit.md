# Encoding Audit Report

## 탐지 규칙 요약
- replacement-char: `�`(U+FFFD) 포함
- double-question: 문자열/주석 내 `??` 패턴
- sr-only-corrupt: sr-only 주변에 `?` 또는 `�` 포함
- question-heuristic: `?` 다량(>=3) 또는 비율 0.08 초과
- mojibake-pattern: 흔한 모지바케 시퀀스 탐지

총 매칭 수: 27
총 파일 수: 6

## 카테고리별 Top 파일
### replacement-char
- features\offerings\detail\BookingModal.tsx (5)
- features\map\route.ts (1)
### double-question
- components\company\units\UnitTypeCard.tsx (7)
- app\login\page.tsx (5)
- features\offerings\detail\BookingModal.tsx (3)
- app\company\properties\[id]\units\utils.ts (1)
- shared\uxCopy.ts (1)
### sr-only-corrupt
- (no matches)
### question-heuristic
- components\company\units\UnitTypeCard.tsx (8)
- app\company\properties\[id]\units\utils.ts (6)
- app\login\page.tsx (2)
- features\map\route.ts (1)
- features\offerings\detail\BookingModal.tsx (1)
### mojibake-pattern
- (no matches)

## 상세 매칭
- app\company\properties\[id]\units\utils.ts:21
  - rule: question-heuristic, double-question
  - risk: Low
  - line:   // 肄ㅻ쭏 ?쒓굅 ?? "?뺤닔" 臾몄옄?대쭔 ?덉슜
- app\company\properties\[id]\units\utils.ts:68
  - rule: question-heuristic
  - risk: Low
  - line:  * ?곹깭 洹쒖튃
- app\company\properties\[id]\units\utils.ts:69
  - rule: question-heuristic
  - risk: Low
  - line:  * - 誘몄엯?? 二쇱슂 ?꾨뱶 梨꾩? <= 2
- app\company\properties\[id]\units\utils.ts:70
  - rule: question-heuristic
  - risk: Low
  - line:  * - ?낅젰 以? ?쇰?留?梨꾩?
- app\company\properties\[id]\units\utils.ts:71
  - rule: question-heuristic
  - risk: Low
  - line:  * - ?꾨즺: 二쇱슂 ?꾨뱶 紐⑤몢 梨꾩?
- app\company\properties\[id]\units\utils.ts:73
  - rule: question-heuristic
  - risk: Low
  - line:  * 二쇱슂 ?꾨뱶:
- app\login\page.tsx:44
  - rule: question-heuristic, double-question
  - risk: Med
  - line:         else setMessage("?뺤씤 ?대찓?쇱씠 諛쒖넚?섏뿀?듬땲?? ?대찓?쇱쓣 ?뺤씤?댁＜?몄슂.");
- app\login\page.tsx:113
  - rule: double-question
  - risk: Med
  - line:             {/* 紐⑤뱶 ??*/}
- app\login\page.tsx:148
  - rule: double-question
  - risk: Med
  - line:             {/* ??*/}
- app\login\page.tsx:174
  - rule: question-heuristic, double-question
  - risk: Med
  - line:                   placeholder="6???댁긽"
- app\login\page.tsx:204
  - rule: double-question
  - risk: Med
  - line:             {/* ?뚯뀥 濡쒓렇??*/}
- components\company\units\UnitTypeCard.tsx:152
  - rule: double-question
  - risk: Med
  - line:             {/* ??align/end + sideOffset?쇰줈 ?꾩튂 ?덉젙??*/}
- components\company\units\UnitTypeCard.tsx:187
  - rule: question-heuristic, double-question
  - risk: Med
  - line:             <FormField label="?됰㈃ ????대쫫">
- components\company\units\UnitTypeCard.tsx:195
  - rule: question-heuristic, double-question
  - risk: Med
  - line:             <FormField label="?꾩슜 硫댁쟻 (??">
- components\company\units\UnitTypeCard.tsx:206
  - rule: question-heuristic, double-question
  - risk: Med
  - line:             <FormField label="怨듦툒 硫댁쟻 (??">
- components\company\units\UnitTypeCard.tsx:228
  - rule: question-heuristic
  - risk: Med
  - line:               <FormField label="?뺤떎">
- components\company\units\UnitTypeCard.tsx:259
  - rule: question-heuristic, double-question
  - risk: Med
  - line:                 <FormField label="媛寃??섑븳 (??">
- components\company\units\UnitTypeCard.tsx:273
  - rule: question-heuristic, double-question
  - risk: Med
  - line:                 <FormField label="媛寃??곹븳 (??">
- components\company\units\UnitTypeCard.tsx:307
  - rule: question-heuristic, double-question
  - risk: Med
  - line:             <FormField label="?됰㈃??URL" className="md:col-span-2">
- components\company\units\UnitTypeCard.tsx:316
  - rule: question-heuristic
  - risk: Med
  - line:             <FormField label="?대?吏 URL" className="md:col-span-2">
- features\map\route.ts:77
  - rule: replacement-char, question-heuristic
  - risk: Med
  - line:           title: p.name ?? "?�목 ?�음",
- features\offerings\detail\BookingModal.tsx:19
  - rule: replacement-char, question-heuristic, double-question
  - risk: Med
  - line:   const DATES = useMemo(() => ["12.01 (�?", "12.02 (??", "12.03 (??"], []);
- features\offerings\detail\BookingModal.tsx:39
  - rule: replacement-char
  - risk: Med
  - line:               ?�담 ?�약
- features\offerings\detail\BookingModal.tsx:42
  - rule: replacement-char
  - risk: Med
  - line:               ?�짜/?�간???�택?�고 ?�락처�? ?�겨주세??
- features\offerings\detail\BookingModal.tsx:47
  - rule: replacement-char, double-question
  - risk: Med
  - line:         {/* ?�른�??�기 버튼?� Modal 기본 ?�닫기�?버튼???�으므�?중복 방�? 차원?�서 ?�략 */}
- features\offerings\detail\BookingModal.tsx:55
  - rule: replacement-char, double-question
  - risk: Med
  - line:               {/* ?�제 ?�이???�결 ?�까지??placeholder */}
- shared\uxCopy.ts:24
  - rule: question-heuristic, double-question
  - risk: Low
  - line:   // ì§€??

## 사람이 확인해야 할 Top 10 후보
- features\offerings\detail\BookingModal.tsx:19 (Med)
  - rule: replacement-char, question-heuristic, double-question
  - line:   const DATES = useMemo(() => ["12.01 (�?", "12.02 (??", "12.03 (??"], []);
- app\login\page.tsx:44 (Med)
  - rule: question-heuristic, double-question
  - line:         else setMessage("?뺤씤 ?대찓?쇱씠 諛쒖넚?섏뿀?듬땲?? ?대찓?쇱쓣 ?뺤씤?댁＜?몄슂.");
- app\login\page.tsx:174 (Med)
  - rule: question-heuristic, double-question
  - line:                   placeholder="6???댁긽"
- components\company\units\UnitTypeCard.tsx:187 (Med)
  - rule: question-heuristic, double-question
  - line:             <FormField label="?됰㈃ ????대쫫">
- components\company\units\UnitTypeCard.tsx:195 (Med)
  - rule: question-heuristic, double-question
  - line:             <FormField label="?꾩슜 硫댁쟻 (??">
- components\company\units\UnitTypeCard.tsx:206 (Med)
  - rule: question-heuristic, double-question
  - line:             <FormField label="怨듦툒 硫댁쟻 (??">
- components\company\units\UnitTypeCard.tsx:259 (Med)
  - rule: question-heuristic, double-question
  - line:                 <FormField label="媛寃??섑븳 (??">
- components\company\units\UnitTypeCard.tsx:273 (Med)
  - rule: question-heuristic, double-question
  - line:                 <FormField label="媛寃??곹븳 (??">
- components\company\units\UnitTypeCard.tsx:307 (Med)
  - rule: question-heuristic, double-question
  - line:             <FormField label="?됰㈃??URL" className="md:col-span-2">
- features\map\route.ts:77 (Med)
  - rule: replacement-char, question-heuristic
  - line:           title: p.name ?? "?�목 ?�음",

## 빠른 CLI 검색 명령
- `rg -n "�" .`
- `rg -n "\\?\\?+" .`
- `rg -n "sr-only" .`
- `rg -n "(Ã.|Â.|â€|â€™|â€œ|ê¸°|ë…|ì…)" .`