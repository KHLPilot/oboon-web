# HANDOFF — 2026-02-17

## 현재 목표
PDF 이미지 추출 → AI 분류 → 스마트 필터링(건물 5장 + 타입별 평면도 1장)을 안정적으로 동작시키기

## 완료된 작업

### 1. unpdf 마이그레이션 (완료)
- pdfjs-dist 제거 → unpdf 설치 (`pnpm add unpdf`)
- `lib/pdf-utils.ts` 전면 재작성 (unpdf의 `getDocumentProxy` + `extractImages` 사용)
- `@napi-rs/canvas`로 raw pixel data → JPEG 변환 + 리사이즈(max 1280px)
- 휴리스틱 필터: 300x200px 이상, 비율 0.2~5, 면적 120k+ 만 추출
- MAX_IMAGES = 20, JPEG 출력 (PNG 대비 ~80% 크기 감소)

### 2. Gemini 2단계 분리 (코드 적용 완료, 테스트 필요)
- `lib/schema/property-schema.ts` 수정:
  - `propertyExtractionSchema`에서 `imageClassifications` 제거 (Phase 1용)
  - `imageClassificationResultSchema` 별도 export (Phase 2용, `.max(15)` 제한)
- `app/api/extract-pdf/route.ts` 수정:
  - **Phase 1**: 텍스트 + 이미지 3장 → 속성 데이터 추출 (분류 없음)
  - **Phase 2**: 이미지 N장 → 분류만 (간단한 스키마, ~200 토큰 출력)
  - 스마트 필터링: 건물 5장 + 타입별 평면도 1장만 반환
  - `maxDuration`: 60초 → 120초
  - systemPrompt에서 이미지 분류 규칙 섹션 제거

### 3. UI (이전 세션에서 완료)
- `app/test-upload/page.tsx`: aiType 기반 자동 배정, 경과 시간 표시 등 완료

### 4. 빌드 검증
- `pnpm lint` ✓
- `pnpm build` ✓

---

## 미완료 작업 (우선순위)

### 🔴 최우선: 2단계 분리 테스트
- `pnpm dev` → PDF 업로드 → 500 에러 없이 완료되는지 확인
- 건물 이미지 최대 5장 + 평면도 타입별 1장 반환되는지 확인
- 응답 시간 120초 이내인지 확인

### 🟡 500 에러 발생 시 디버깅 포인트
이전 500 에러 원인들 (모두 수정 완료):
1. ~~대형 이미지 풀사이즈 PNG 변환~~ → JPEG + 1280px 리사이즈로 해결
2. ~~Gemini 출력 65K 토큰 초과 (finishReason: 'length')~~ → 2단계 분리로 해결
3. ~~imageIndex 할루시네이션 (10개 보냈는데 105개 분류)~~ → 별도 호출 + 명시적 갯수 안내로 해결

만약 또 에러가 나면:
- 터미널에서 `AI Extraction Error:` 뒤의 에러 메시지 확인
- Phase 1 에러면: 텍스트가 너무 긴지 확인 (MAX_TEXT_LENGTH = 30000)
- Phase 2 에러면: 이미지 수 줄이기 (현재 최대 10개)

---

## 수정된 파일

| 파일 | 상태 | 설명 |
|------|------|------|
| `lib/pdf-utils.ts` | ✓ 완료 | unpdf + 리사이즈 + JPEG + MAX 20개 |
| `lib/schema/property-schema.ts` | ✓ 완료 | 스키마 2개로 분리 |
| `app/api/extract-pdf/route.ts` | ✓ 코드 완료 | 2단계 Gemini 호출, 테스트 필요 |
| `app/test-upload/page.tsx` | ✓ 완료 | 변경 불필요 |
| `next.config.js` | ✓ 완료 | pdf-parse + @napi-rs/canvas externals |
| `package.json` | ✓ 완료 | unpdf 추가, pdfjs-dist 제거 |

---

## 주의사항

### 건드리면 안 되는 것
- 지오코딩 로직 (`resolveLocationAddresses`, `geocodeAddress`)
- UI 컴포넌트 (`app/test-upload/page.tsx` — 이미 완성됨)
- `lib/pdf-utils.ts`의 휴리스틱 필터 로직

### 아키텍처
```
[PDF 파싱: 텍스트 + 이미지 추출 (unpdf)]
         ↓
[Phase 1: Gemini (텍스트 + 이미지 3장)] → 속성 데이터
         ↓
[Phase 2: Gemini (이미지 N장)] → 이미지 분류
         ↓
[스마트 필터: 건물 5장 + 평면도 타입별 1장]
         ↓
[카카오 지오코딩 + 응답 반환]
```

---

## 다음 세션 시작 시
1. 이 파일 읽기
2. `pnpm dev`로 개발 서버 시작
3. PDF 업로드 테스트 (http://localhost:3000/test-upload)
4. 500 에러 없으면 완료, 에러 있으면 터미널 로그 확인 후 디버깅
