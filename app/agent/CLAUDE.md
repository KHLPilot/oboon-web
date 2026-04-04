# app/agent/ — 상담사 페이지 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 역할 범위

상담사(Agent)는 고객 상담·방문 인증·스케줄을 관리한다.

### 라우트 구조

| 경로 | 기능 |
|------|------|
| `agent/consultations/**` | 상담 목록/상세/채팅 |
| `agent/properties/**` | 담당 분양 현장 |
| `agent/scan` | QR 방문 인증 스캔 |
| `agent/schedule/**` | 스케줄/슬롯 관리 |

---

## 관련 도메인 & API

- **상담**: `features/consultations/` + `app/api/consultations/**`
- **슬롯/근무시간**: `app/api/agent/slots`, `app/api/agent/working-hours`
- **알림**: `features/notifications/` + `app/api/agent/notifications`
- **방문 스캔**: `app/api/visits/verify`

---

## 도메인 용어

- **slots**: 상담사가 설정한 예약 가능 시간 단위
- **working-hours**: 상담사 근무 가능 요일/시간대
- **scan**: QR 코드 스캔으로 고객 방문 인증

---

## 주의사항

- 상담사 페이지는 **인증 + 역할 검증** 필수 (`role === 'agent'`)
- 슬롯/근무시간 변경은 서버 API를 통해서만 수행
- QR 스캔 결과 처리는 `app/api/visits/verify`에서만
