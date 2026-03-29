# HANDOFF — 2026-03-30

## 현재 목표
브리핑 페이지 및 글 작성/수정 에디터 개선 완료.

## 완료된 작업
- [x] 브리핑 메인 페이지 구조 확인 — 이미 오리지널 히어로 → 카테고리 카드 → 일반 브리핑 순서 구현됨 (app/briefing/page.tsx)
- [x] Tiptap WYSIWYG 에디터 + content_html 컬럼 — 이미 구현됨 (migration 081~083)
- [x] 커버 이미지 파일 업로드 — `/api/r2/upload` (mode=briefing_cover) 연동 (PostEditor.client.tsx)
- [x] 글 수정 서비스 함수 추가 — `fetchBriefingPostForEdit`, `updateBriefingPost` (briefing.admin.ts)
- [x] 글 수정 페이지 신규 생성 — `/briefing/admin/posts/[id]/edit`
- [x] PostEditorClient create/edit 모드 통합 — mode/postId/initialValues/onUpdate prop 추가

## 수정된 파일
- `features/briefing/services/briefing.admin.ts` — fetchBriefingPostForEdit, updateBriefingPost 추가
- `app/briefing/admin/posts/new/PostEditor.client.tsx` — 파일 업로드 + edit 모드 지원
- `app/briefing/admin/posts/[id]/edit/page.tsx` — 신규 생성

## 주의사항
- `briefing_categories`에 `cover_image_url` 컬럼 없음 → 카테고리 카드 이미지는 미구현 (추후 마이그레이션 필요)
- edit 모드에서 보드/카테고리 변경 비활성화 (슬러그 고정)
- R2 커버 업로드 신규 글: temp UUID 경로 사용 (postId와 다른 경로, 정상 동작)
- DB: 테스트 DB(`ketjqhoeucxmxgnutlww`) migrations 081~083 적용 완료

## 다음 세션 시작 시
1. 이 파일 읽기
2. `pnpm build`로 상태 확인
3. 필요 시 카테고리 카드 커버 이미지 기능 추가 (briefing_categories에 cover_image_url 컬럼 마이그레이션)
