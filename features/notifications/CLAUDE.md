# features/notifications/ — 알림 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

상담사·고객 알림 집계 및 표시를 담당한다.

- 상담사: 새 상담 요청, 예약 변경, 방문 인증 알림
- 고객: 상담 수락/거절, 예약 확정, 방문 승인 알림
- 읽음 처리 / 알림 목록

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| notification | 알림 단위 |
| notification_type | 알림 유형 (consultation_accepted, visit_approved 등) |
| is_read | 읽음 여부 |

---

## 레이어 구조

```
features/notifications/
  ├─ domain/       → NotificationType, 알림 정책
  ├─ services/     → 알림 조회/읽음 처리 (Supabase)
  ├─ mappers/      → DB row → view model
  └─ components/   → 알림 목록, 뱃지 UI
```

---

## 관련 경로

- API (상담사): `app/api/agent/notifications`
- API (고객): `app/api/customer/notifications`
- DB SSOT: `docs/db/README.md` (notifications 테이블)

---

## 주의사항

- 알림은 Supabase Realtime 또는 폴링으로 실시간 갱신 — 구독 해제 누락 주의
- 알림 생성은 서버 사이드(API route)에서만 수행 (클라이언트 직접 insert 금지)
- RLS: 상담사는 자신의 알림만, 고객은 자신의 알림만 접근
