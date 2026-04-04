# app/api/ — API 라우트 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 핵심 원칙

**이 디렉토리의 모든 코드는 서버 전용이다.**

- 민감 키/권한 로직/DB 쓰기는 여기서만 수행
- Service Role Key는 이 디렉토리에서만 사용 가능 (클라이언트 번들 노출 금지)
- `cookies()` / `headers()` 사용 시 Next.js 빌드 충돌 가능성 항상 고려
- 응답에 민감 정보(토큰, 개인정보, 서비스 키) 포함 금지

---

## API 라우트 목록

| 경로 | 용도 |
|------|------|
| `auth/google`, `auth/naver` | OAuth 인증 |
| `auth/email-*` | 이메일 검증·정리·토큰 |
| `profile/**` | 닉네임 체크, 탈퇴 |
| `consultations/**` | 상담 생성/조회/상태 변경 |
| `visits/token` | 방문 토큰 발급 |
| `visits/verify` | 방문 QR 검증 |
| `visits/manual-approve` | 방문 수동 승인 |
| `visits/request-manual` | 수동 승인 요청 |
| `agent/notifications` | 상담사 알림 |
| `agent/slots` | 상담사 슬롯 관리 |
| `agent/working-hours` | 상담사 근무시간 |
| `customer/notifications` | 고객 알림 |
| `admin/**` | 관리자 승인/관리 |
| `cron/**` | 정기 정리 작업 |
| `r2/upload` | 파일 업로드 |
| `geo/**`, `map/**` | 지도/지오코딩 |
| `property-requests/**` | 매물 요청 |
| `property-agents/**` | 매물-상담사 연결 |
| `reco-pois/**` | 추천 POI |
| `condition-validation/**` | 조건 검증 |

---

## 패턴

```typescript
// Service Role Key — 서버에서만
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // 절대 클라에 노출 금지
)

// 인증 확인 패턴
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
