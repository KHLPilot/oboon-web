# 오분(OBOON) 카피라이팅 가이드

> 서비스 내 모든 텍스트의 단일 출처(SSOT)는 `shared/copy.ts`다.
> 새 문구를 추가하거나 기존 문구를 수정할 때 **반드시 이 파일을 먼저 업데이트**한다.

---

## 파일 구조

| 파일 | 역할 | 포함 내용 |
|------|------|-----------|
| `shared/copy.ts` | **카피 SSOT** | 마케팅·브랜드·UI 텍스트 전체 |
| `shared/uxCopy.ts` | UX 상태 문구 | 로딩·확인중·등록전 등 시스템 상태 |
| `shared/errorMessage.ts` | 오류 메시지 | DB/API 오류 → 한국어 변환 로직 |
| `features/notifications/domain/notification.constants.ts` | 알림 라벨 | 알림 타입별 표시 텍스트 |
| `features/offerings/domain/offering.constants.ts` | 분양 상태 라벨 | 분양예정·분양중·분양종료 |

---

## 사용 방법

```typescript
import { Copy } from "@/shared/copy";

// 히어로 슬라이드 제목
<h1>{Copy.hero.agentMatch.title}</h1>

// 동적 문구 (함수형)
<span>{Copy.hero.agentMatch.agentWaiting(agentCount)}</span>

// 조건 4대 요소
Copy.home.customMatch.conditions.traffic.label  // "교통 접근성"
Copy.home.customMatch.conditions.school.label   // "학군 정보"
```

---

## 카피 목록

### 1. 브랜드 (`Copy.brand`)

| 키 | 문구 |
|----|------|
| `name` | 오분 |
| `fullName` | 오늘의 분양 |
| `slogan` | 좋은 현장은 좋은 상담사로부터. |
| `description` | 전문 상담사와 AI 조건 검증으로 내 분양을 찾는 플랫폼 |

---

### 2. 히어로 섹션 (`Copy.hero`)

#### 슬라이드 1 — 1:1 상담사 매칭

| 키 | 문구 |
|----|------|
| `badge` | 1:1 상담사 매칭 시스템 |
| `title` | 좋은 현장은 좋은 상담사로부터. |
| `subtitle` | 전문성과 경험을 공개하고 선택의 기준을 제공합니다. |
| `cta.primary` | 분양 리스트 보기 |
| `cta.secondary` | 지도로 현장 찾기 |
| `agentWaiting(n)` | `{n}명+의 상담사 대기 중` |
| `hint` | 상담 스타일과 전문 분야를 확인하고 선택해 보세요. |

#### 슬라이드 2 — AI 맞춤 현장 추천

| 키 | 문구 |
|----|------|
| `badge` | AI 맞춤 현장 추천 |
| `title` | 내 조건에 딱 맞는 현장을 찾아드려요. |
| `subtitle` | 교통, 학군, 개발호재, 반려동물 조건까지 한 번에 검증해 즉시 비교할 수 있어요. |
| `cta.primary` | 맞춤 현장 보기 |
| `cta.secondary` | 조건 상세 설정 |
| `stat` | 평균 3.2개 현장 매칭 |
| `preview.title` | 맞춤 현장 미리보기 |
| `preview.subtitle` | 광고 매물 말고, 조건이 맞는 현장만 |

---

### 3. 홈 페이지 섹션 (`Copy.home`)

#### 상담 신청 가능 현장

| 키 | 문구 |
|----|------|
| `title` | 상담 신청 가능 현장 |
| `subtitle` | 상담사 연결이 완료되어 바로 상담 예약이 가능한 현장입니다. |
| `empty.title` | 상담 신청 가능한 현장이 없어요 |
| `empty.subtitle` | 곧 새로운 현장이 등록될 예정이에요. |

#### 지역별 인기 분양

| 키 | 문구 |
|----|------|
| `title` | 지역별 인기 분양 |
| `subtitle` | 지역별로 인기있는 분양 현장을 확인해보세요. |
| `empty.title` | 선택한 지역에 분양이 없어요 |
| `empty.subtitle` | 다른 지역을 선택하거나 전체를 확인해보세요. |

#### 맞춤 현장 (`Copy.home.customMatch`)

| 키 | 문구 |
|----|------|
| `title` | 교통·학군·개발호재 반려동물 여부까지 |
| `subtitle` | 관심 현장의 모든 조건을 한눈에 검증합니다. 기존 조건 검증 기준으로 자동 추천해 드려요. |
| `cta` | 현장 조건 검증하기 |
| `listTitle` | 맞춤 현장 리스트 |
| `listSubtitle` | 조건 검증과 함께 확인하기 좋은 현장을 모아봤어요. |

#### 4대 조건

| 조건 | 라벨 | 설명 |
|------|------|------|
| `traffic` | 교통 접근성 | 지하철·버스 접근성과 이동 편의 기준을 확인합니다. |
| `school` | 학군 정보 | 학군 배정·통학 생활권 관련 기준을 반영합니다. |
| `development` | 개발 호재 | 주요 개발 계획과 생활 인프라 변화 요소를 반영합니다. |
| `pets` | 반려동물 | 반려동물 생활 적합성 관련 조건을 함께 검토합니다. |

---

### 4. 분양/현장 (`Copy.offerings`)

#### 검색·필터

| 키 | 문구 |
|----|------|
| `search.placeholder` | 지역, 단지명으로 검색 |
| `filter.status` | 분양 상태 |
| `filter.agent` | 상담사 |

#### 지도

| 키 | 문구 |
|----|------|
| `map.title` | 분양 지도 |
| `map.empty` | 지도에 표시할 좌표 정보가 있는 현장이 아직 없어요. |

#### 목록 빈 상태

| 상황 | 제목 | 부제목 |
|------|------|--------|
| 맞춤 추천 (없을 때) | 조건에 맞는 현장이 없어요 | 필터를 조정하거나 전체 현장을 확인해보세요. |
| 일반 목록 (없을 때) | 아직 등록된 분양이 없어요 | 곧 새로운 분양 현장이 등록될 예정이에요. |

#### 상세 페이지 섹션

| 섹션 | 제목 | 설명 |
|------|------|------|
| `type` | 분양 유형 | — |
| `location` | 현장 위치 | — |
| `priceRange` | 분양가 범위 | — |
| `priceTable` | 분양가표 | — |
| `infra` | 주변 인프라 | 현장 기준 주요 생활 인프라를 확인합니다. 인프라 거리는 직선거리 기준 참고값입니다. |
| `schedule` | 분양 일정 | 분양 일정 아래에서 위치를 바로 확인할 수 있습니다. |
| `mapLocation` | 현장/모델하우스 위치 | — |
| `basicInfo` | 기본 정보 | 판단에 필요한 현장 정보를 한 화면에서 확인합니다. |
| `appraisalMemo` | 감정평가사 메모 | 등록된 항목만 노출합니다. |

#### 조건 확인 카드

| 키 | 문구 |
|----|------|
| `title` | 조건 확인 |
| `cta` | 조건 확인 |
| `applied` | 맞춤 정보가 적용되었습니다. 바로 조건 확인을 진행할 수 있어요. |
| `loginRequired.cash` | 로그인 후 자금 분석을 확인할 수 있어요. |
| `loginRequired.monthly` | 로그인 후 월부담 분석을 확인할 수 있어요. |
| `loginRequired.risk` | 로그인 후 리스크 분석을 확인할 수 있어요. |
| `disclaimer` | 조건 검증 결과는 참고용이며, 최종 진행 가능 여부는 실제 상담에서 재확인됩니다. |

---

### 5. 예약/상담 (`Copy.booking`)

#### 모달·CTA

| 키 | 문구 |
|----|------|
| `title.selectAgent` | 상담 예약 |
| `title.confirm` | 예약금 안내 및 동의 |
| `cta.save` | 저장하고 예약 |
| `cta.book` | 상담 예약 |
| `cta.connect` | 상담하기 |
| `cta.loginRequired` | 로그인 후 상담 연결 |

#### 상담사 정보

| 키 | 문구 |
|----|------|
| `agent.noIntro` | 등록된 상담사 소개가 없습니다. |
| `agent.recommended` | 상담 권장 |
| `agent.responseTime.within10min` | 보통 10분 이내 응답 |
| `agent.responseTime.within30min` | 보통 30분 이내 응답 |
| `agent.responseTime.within1hr` | 보통 1시간 이내 응답 |
| `agent.responseTime.within2hr` | 보통 2시간 이내 응답 |
| `agent.responseTime.within1day` | 보통 하루 이내 응답 |
| `agent.responseTime.over1day` | 보통 하루 이상 소요 |

#### 예약금 안내

| 키 | 문구 |
|----|------|
| `deposit.title` | 예약금 입금 안내 |
| `deposit.description` | 예약 후 실제 방문이 확인되면, 프로필에 등록된 계좌로 방문 환급됩니다. |
| `deposit.pointNote` | 포인트로 예약하면 관리자 승인 없이 즉시 예약이 진행됩니다. |
| `deposit.cancelPolicy` | 고객 사유 취소 시 결제된 예약금 1,000원은 1,000P로 전환됩니다. |
| `deposit.agree` | 위 내용을 확인하였으며 동의합니다 |

#### 오류

| 키 | 문구 |
|----|------|
| `errors.noAgent` | 상담사를 선택해주세요 |
| `errors.noSlot` | 선택한 날짜에 예약 가능한 시간이 없습니다 |
| `errors.loadFail` | 상담사 목록을 불러오는데 실패했습니다 |

---

### 6. 인증 (`Copy.auth`)

#### 플레이스홀더

| 필드 | 키 | 문구 |
|------|----|------|
| 로그인 이메일 | `placeholder.email` | name@example.com |
| 회원가입 이메일 | `placeholder.emailSignup` | example@email.com |
| 비밀번호 | `placeholder.password` | 대소문자 + 숫자 + 특수문자 포함 8자 이상 |
| 비밀번호 확인 | `placeholder.passwordConfirm` | •••••••• |
| 이름 | `placeholder.name` | 김오분 |
| 닉네임 | `placeholder.nickname` | 오분이 |
| 전화번호 | `placeholder.phone` | 01012345678 |
| 탈퇴 계정 복구 | `placeholder.recoveryEmail` | 탈퇴한 계정의 이메일 |

#### 오류

| 키 | 문구 |
|----|------|
| `error.deactivated` | 계정이 비활성화되었습니다. 관리자에게 문의하세요. |

---

### 7. 공통 UI (`Copy.common`)

| 키 | 문구 |
|----|------|
| `cta.viewAll` | 전체보기 |
| `cta.confirm` | 확인 |
| `cta.cancel` | 취소 |
| `cta.save` | 저장 |
| `cta.close` | 닫기 |
| `cta.back` | 뒤로 |
| `cta.next` | 다음 |
| `cta.submit` | 제출 |
| `cta.retry` | 다시 시도 |
| `status.reserved` | 예약됨 |

---

## 문구 작성 원칙

### 톤 & 매너

- **반말 아닌 존댓말**, 딱딱하지 않게 — `"확인해보세요."` `"찾아드려요."`
- 부정형보다 **긍정형** 우선 — `"없어요"` 보다는 `"곧 등록될 예정이에요."`
- **구어체** 허용 — `"딱 맞는"` `"한눈에"`
- 마침표 통일 — 본문 문장은 마침표(`.`), 짧은 라벨·배지·버튼은 생략

### 빈 상태(Empty State) 작성법

```
제목: 상황 설명 (왜 비어있는가)
부제목: 행동 유도 또는 기대감 부여 (다음 단계 안내)
```

예)
- ❌ `"데이터가 없습니다."`
- ✅ `"아직 등록된 분양이 없어요"` + `"곧 새로운 분양 현장이 등록될 예정이에요."`

### 오류 메시지 작성법

- 기술적 오류 메시지 노출 금지
- 한국어로, 사용자 관점에서 무엇을 해야 하는지 안내
- `shared/errorMessage.ts`의 `toKoreanErrorMessage()` 함수를 통해 자동 변환

### 면책 문구

조건 검증·분석 결과가 표시되는 모든 화면에 반드시 포함:

> `조건 검증 결과는 참고용이며, 최종 진행 가능 여부는 실제 상담에서 재확인됩니다.`

---

## 새 카피 추가 방법

1. `shared/copy.ts`에 적절한 섹션에 키 추가
2. 이 문서(`docs/COPYWRITING.md`)의 해당 섹션 표에 행 추가
3. 컴포넌트에서 `import { Copy } from "@/shared/copy"` 후 사용

> 컴포넌트 파일에 문자열 리터럴로 직접 작성하지 않는다.
