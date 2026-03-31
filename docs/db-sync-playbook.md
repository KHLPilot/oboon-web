# Supabase Main/Test Sync Playbook

이 문서는 `main DB`와 `test DB`가 왜 달라지는지, 그리고 `test`를 `main`과 최대한 같게 유지하려면 어떻게 운영해야 하는지 정리한다.

## 현재 프로젝트

| 환경 | Project Ref | 용도 |
|---|---|---|
| test | `ketjqhoeucxmxgnutlww` | 개발/테스트 기본 대상 |
| main | `kjxoszqhofahjorbufhh` | 프로덕션 |

## 왜 drift가 생기나

가장 흔한 원인은 아래다.

- Dashboard SQL Editor에서 한쪽 DB에만 직접 SQL을 실행했다.
- 함수, 정책, 트리거를 마이그레이션 파일이 아니라 DB에서 수동으로 만들었다.
- Auth 설정, Email provider 설정, Password security 같은 비DB 설정이 다르다.
- 레포의 `supabase/migrations`는 같지만 한 DB에는 일부 마이그레이션이 누락됐다.
- `test` DB가 오래 살아남으면서 예전 실험용 객체를 계속 들고 있다.

핵심은 간단하다.

- DB 구조의 진실 원천은 `supabase/migrations`
- 프로젝트 설정의 진실 원천은 Dashboard 수동 설정 체크리스트

## 원칙

- 모든 DB 변경은 먼저 로컬과 `test`에 적용한다.
- Dashboard SQL Editor 직접 수정은 금지한다.
- 부득이하게 원격 DB에서 직접 수정했다면 반드시 같은 내용을 마이그레이션 파일로 역수입한다.
- `main`과 `test`가 다르다면 먼저 `main`에만 있는 수동 객체를 레포로 회수한 뒤 `test`를 맞춘다.

## 권장 운영 흐름

### 1. 새 DB 변경을 만들 때

```bash
supabase db diff -f 20260331120000_some_change
```

생성된 SQL을 검토한 뒤:

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push --dry-run
supabase db push
```

테스트 검증 후:

```bash
supabase link --project-ref kjxoszqhofahjorbufhh
supabase db push --dry-run
supabase db push
```

## drift를 발견했을 때

### A. 레포에는 없는데 main DB에만 객체가 있는 경우

이 경우 `main`이 수동 변경을 들고 있는 상태다.

처리 순서:

1. `main`에서 누락 객체를 확인한다.
2. 같은 객체를 생성/수정하는 마이그레이션 파일을 만든다.
3. 그 마이그레이션을 `test`에 먼저 적용한다.
4. 검증 후 `main`에도 같은 마이그레이션을 적용한다.

이 방식이 맞는 이유:

- `main`의 현재 상태를 레포가 재현할 수 있어야 한다.
- 그래야 다음에 `test`를 새로 만들거나 로컬 DB를 reset해도 동일 상태가 된다.

### B. test DB를 main과 최대한 똑같이 다시 맞추고 싶은 경우

가장 안전한 순서는 아래다.

1. 먼저 `main`에만 있는 수동 객체를 전부 마이그레이션으로 회수한다.
2. `test`에 레포 마이그레이션을 전부 적용한다.
3. 필요하면 `test`를 재생성하거나 초기화한 뒤 다시 마이그레이션을 적용한다.
4. Auth/Provider/SMTP/Password security 설정을 Dashboard에서 `main`과 같은 값으로 맞춘다.

## 무엇을 SQL 마이그레이션으로 관리하고, 무엇을 Dashboard에서 맞춰야 하나

### 마이그레이션으로 관리

- table
- index
- view
- function
- trigger
- RLS policy
- grant
- enum

### Dashboard 수동 동기화 필요

- Auth provider on/off
- Email confirmation 관련 옵션
- Password security 옵션
- leaked password protection
- SMTP 설정
- OAuth provider secret
- Storage bucket 정책 일부 운영 설정

## 추천 점검 절차

### 1. 레포 기준 스키마가 test에 다 적용됐는지 확인

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push --dry-run
```

### 2. main에도 같은 마이그레이션 세트가 적용됐는지 확인

```bash
supabase link --project-ref kjxoszqhofahjorbufhh
supabase db push --dry-run
```

`--dry-run` 결과가 예상과 다르면 drift를 의심한다.

### 3. linter 차이를 비교

- 같은 linter 항목이 두 DB에 동시에 떠야 정상이다.
- 한쪽에만 함수/정책 경고가 뜨면 대체로 수동 객체 차이다.

## test를 새로 맞출 때 실무 체크리스트

- 레포에 없는 원격 객체가 없는지 확인
- 새 마이그레이션 파일 생성 및 커밋
- `test`에 `db push --dry-run`
- `test`에 `db push`
- Security Linter 재실행
- Dashboard Auth 설정 수동 비교
- 이상 없으면 `main`에 동일 마이그레이션 적용

## 지금 이 프로젝트에서 특히 주의할 점

- `exec_sql`, `delete_user_account` 같은 함수는 레포에 정의가 없으면 수동 생성 함수일 가능성이 높다.
- 이런 객체가 보이면 SQL Editor에서만 고치지 말고 반드시 `supabase/migrations`에 후속 마이그레이션으로 반영한다.
- `auth_leaked_password_protection` 경고는 DB drift가 아니라 플랜/설정 차이일 수 있다.

## 한 줄 기준

`main`과 `test`를 같게 유지하려면, 원격 DB를 직접 고치지 말고 레포 마이그레이션을 유일한 기준으로 써야 한다. Dashboard 설정은 별도 체크리스트로 수동 동기화해야 한다.
