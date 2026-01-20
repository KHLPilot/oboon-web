# Engineering Rules

이 문서는 이 코드베이스에서 반드시 지켜야 할 최소 규칙을 정의합니다.

## Scope
- 모든 app 및 feature 코드에 적용합니다.
- UI, 데이터 접근, 인증, 빌드 관행을 포함합니다.

## Must
- UI는 공통 빌딩 블록(`components/ui`, `components/shared`)을 우선 사용합니다.
- UI 패턴 중복을 금지하며, 기존 컴포넌트를 확장/조합해 사용합니다.
- 모든 페이지는 `PageContainer`를 사용합니다. 풀스크린 페이지는 `variant="full"`을 사용합니다.
- `useSearchParams` 같은 클라이언트 전용 훅은 클라이언트 컴포넌트로 분리하고 페이지 엔트리에서 `Suspense`로 감쌉니다.
- Supabase 접근은 SSOT 기준(domain/services/mappers 분리)으로 하며, 페이지에서 직접 쿼리하지 않습니다.
- 서비스 키는 클라이언트에 노출하지 않습니다. 비밀키는 서버에만 둡니다.
- 패키지 매니저는 `pnpm`만 사용하며, `package.json`의 `packageManager`를 유지합니다.
- 빌드 통과가 필수입니다: `pnpm build`, `pnpm typecheck`, `pnpm lint`.
- 사용자 액션 실패 시 오류를 반드시 노출합니다(토스트/모달).

## Should
- 재사용 가능한 UI는 `components/shared`로 승격합니다.
- 데이터 로드는 services에, 변환은 mappers에 둡니다.
- 디자인 토큰/시맨틱 클래스 사용을 우선하며, 하드코딩 색상은 지양합니다.
- 컴포넌트는 작고 단일 책임을 지향합니다.

## Exceptions
- 예외는 프론트엔드 오너 승인 후 PR에 기록합니다.

## PR Checklist
- `pnpm build` 통과.
- `pnpm typecheck` 통과.
- `pnpm lint` 통과.
- UI는 `components/ui` 또는 `components/shared` 사용.
- 페이지 레이아웃은 `PageContainer` 사용.
- 클라이언트 훅 분리 + `Suspense` 적용.
- 오류가 사용자에게 노출됨.
