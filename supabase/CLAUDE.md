# supabase/ — DB 관리 가이드

> 이 디렉토리 작업 시 루트 CLAUDE.md + 이 파일이 로드된다.

---

## 프로젝트 구성

| 환경 | Project Ref | 용도 |
|------|-------------|------|
| 테스트 | `ketjqhoeucxmxgnutlww` | 개발/테스트 (기본 연결) |
| 메인 | `kjxoszqhofahjorbufhh` | 프로덕션 (배포 시에만) |

## 테스트 DB 우선 정책 (Critical)

**모든 DB 변경은 반드시 테스트 DB 검증 후 메인 DB에 적용.**

```
[개발] 로컬 DB → [테스트] 테스트 DB → [배포] 메인 DB
```

- 메인 DB 직접 수정 금지
- 마이그레이션 파일 타임스탬프 형식: `YYYYMMDDHHMMSS_name.sql`

---

## 마이그레이션 워크플로우

```bash
# 1. 로컬에서 스키마 변경 후 diff
supabase db diff -f 014_feature_name

# 2. 테스트 DB에 적용
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push

# 3. 테스트 완료 후 메인 DB에 적용
supabase link --project-ref kjxoszqhofahjorbufhh
supabase db push

# 4. 커밋
git add supabase/migrations && git commit
```

## 로컬 개발 환경

```bash
supabase start              # 로컬 DB 시작
supabase stop               # 로컬 DB 종료
supabase db reset           # 로컬 DB 초기화 (마이그레이션 재적용)
supabase status             # 서비스 상태 확인
supabase db push --dry-run  # 적용 전 미리보기 (위험한 변경 확인)
supabase db pull            # 원격 스키마를 로컬로
supabase db diff            # 로컬 vs 원격 차이
```

> DROP/ALTER 등 위험한 변경은 반드시 `--dry-run` 먼저.

---

## docs/db/ 문서 업데이트

마이그레이션 후 `docs/db/` JSON 파일 업데이트:

```bash
node scripts/export-db-docs.mjs   # 6개 JSON 자동 갱신
```

- `schema.sql`만 수동 유지 (사람이 읽는 요약 문서)
- `grant.json`(120KB)은 **절대 전체 Read 금지** → Grep으로 위치 찾고 offset Read → Edit
- 독립 파일은 **병렬 Edit** 호출
- 대형 JSON: Grep → offset/limit Read → Edit 패턴

---

## 참고

- `docs/db/README.md` — DB/RLS 정책 SSOT
