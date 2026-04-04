# features/consultations/ — 상담 도메인 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 도메인 개요

고객-상담사 간 상담 흐름 전체를 담당한다.

- 상담 요청/수락/거절/완료 상태 관리
- 채팅 메시지 (Realtime)
- 예약 일정
- 방문 연계

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| consultation | 고객-상담사 1:1 상담 세션 |
| consultation_status | pending / accepted / rejected / completed |
| chat_message | 상담 내 채팅 메시지 |
| reservation | 상담 예약 일정 |

---

## 레이어 구조

```
features/consultations/
  ├─ domain/       → ConsultationStatus, ConsultationPolicy 등 타입/규칙
  ├─ services/     → DB 조회/변경 (Supabase)
  ├─ mappers/      → DB row → view model
  └─ components/   → 상담 카드, 채팅 UI 등
```

---

## 관련 경로

- 상담사 페이지: `app/agent/consultations/**`
- 고객 페이지: `app/my/**` (상담 관련)
- API: `app/api/consultations/**`
- DB SSOT: `docs/db/README.md` (consultations 테이블)

---

## 주의사항

- 채팅은 Supabase Realtime 구독 사용 — 구독 해제 누락 주의
- 상담 상태 전환 규칙은 `domain/` 레이어에서 정의 (서비스 레이어에서 임의 변경 금지)
- RLS: 상담사는 자신의 consultations만, 고객은 자신이 요청한 consultations만 접근
