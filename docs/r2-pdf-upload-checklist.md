# R2 PDF Upload Checklist

## 1) R2 CORS 점검 체크리스트

대상 버킷: `CLOUDFLARE_R2_BUCKET_NAME`

Cloudflare R2 버킷 CORS Rules에 아래 항목이 포함되어야 합니다.

- Allowed origins
  - `https://oboon.co.kr`
  - `https://www.oboon.co.kr`
  - (프리뷰 사용 시) `https://*.vercel.app`
  - (로컬 개발 시) `http://localhost:3000`
- Allowed methods
  - `PUT`
  - `GET`
  - `HEAD`
- Allowed headers
  - `content-type`
  - `x-amz-content-sha256`
  - `x-amz-date`
  - `authorization`
  - `x-amz-security-token`
  - `x-amz-user-agent`
- Expose headers
  - `etag`
  - `x-amz-request-id`
- Max age
  - `3600`

권장 확인 포인트:

1. 브라우저 콘솔에 CORS 에러(`Access-Control-Allow-Origin`)가 없어야 함.
2. `OPTIONS` preflight가 2xx로 응답해야 함.
3. `PUT` 업로드 응답이 200/204로 돌아와야 함.
4. 업로드 후 `/api/extract-pdf` 호출 시 413이 발생하지 않아야 함.

참고: 현재 구현은 브라우저가 presigned URL로 R2에 직접 `PUT`하고, 서버에는 `fileKeys`만 전달합니다.

## 2) 배포 후 E2E 점검 시나리오

테스트 대상 경로:

- `/admin` -> `새 현장 등록`
- `/company/properties/new`

사전 조건:

- 운영 환경변수 세팅 확인
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_R2_PUBLIC_URL`
  - `GOOGLE_GENERATIVE_AI_API_KEY`

### 시나리오 A: 기본 추출

1. `/company/properties/new` 접속
2. PDF 1개(5MB 이상 권장) 선택
3. `데이터 추출 시작` 클릭
4. 기대 결과
   - 업로드 단계 문구가 잠깐 보임 (`PDF 업로드 중...`)
   - 추출 완료 후 결과 섹션 렌더
   - 네트워크 탭에서 `/api/extract-pdf` 요청 payload가 JSON(`fileKeys`)임
   - 413 없음

### 시나리오 B: 텍스트만 재추출

1. 시나리오 A 완료 상태에서 `텍스트만 재추출` 클릭
2. 기대 결과
   - 텍스트 필드 갱신
   - 기존 추출 이미지 유지
   - 오류 없이 상태 문구 성공

### 시나리오 C: 추가 PDF 병합

1. 시나리오 A 완료 상태에서 `추가 PDF 선택`
2. 추가 PDF 1개 이상 선택
3. 기대 결과
   - 기존 데이터 + 신규 데이터가 병합됨
   - unit/facility/메타 집계값이 증가
   - 413 없음

### 시나리오 D: 실패/예외

1. PDF가 아닌 파일 업로드
   - 기대: 클라이언트에서 즉시 에러 표시
2. 150MB 초과 업로드 시도
   - 기대: 용량 제한 에러 표시
3. 만료된 presigned URL 강제 재사용
   - 기대: 업로드 실패 메시지

### 시나리오 E: 임시 파일 정리

1. 추출 성공 직후 동일 `fileKey`로 재요청 시도
2. 기대 결과
   - 서버에서 이미 삭제된 파일로 처리 실패 (정상)
   - 즉, cleanup 동작이 수행됨

## 장애 대응 빠른 체크

1. 413 발생
   - `/api/extract-pdf` 요청이 `multipart/form-data`인지 확인
   - JSON `fileKeys` 전송으로 호출되는지 확인
2. 업로드 실패(CORS)
   - R2 CORS Allowed origin/method/header 재확인
3. 분석 실패(서버 500)
   - Vercel Function 로그에서 `extract-pdf` 에러 확인
4. 권한 오류(401/403)
   - 로그인 세션 유효성 및 `pdf-temp/{userId}/...` key prefix 확인

