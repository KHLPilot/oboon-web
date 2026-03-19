# HANDOFF — 2026-03-19

## 현재 목표
커뮤니티 추가 기능 5개 구현 완료.

## 완료된 작업

### 내 활동 피드 — 북마크 탭
- [x] `COMMUNITY_PROFILE_TABS`에 `{ key: "bookmarks", label: "북마크" }` 추가 (domain/community.ts)
- [x] `CommunityProfilePage.tsx`: bookmarks 탭 → `getCommunityBookmarkedPosts(profile.id, 50)` 호출

### 댓글 수정/삭제
- [x] API: `app/api/community/comments/[commentId]/route.ts` 신규 (PATCH/DELETE)
- [x] 서비스: `updateCommunityComment`, `deleteCommunityComment` (community.posts.ts)
- [x] UI: `CommunityFeed.tsx` — 내 댓글에 수정/삭제 버튼 (userId 상태 추가)

### 현장 Q&A 탭
- [x] DB 마이그레이션: `072_community_posts_property_qna.sql` — `is_property_qna boolean` 컬럼
- [x] `COMMUNITY_TABS`에 `{ key: "property_qna", label: "현장 Q&A" }` 추가
- [x] 도메인 타입: `CommunityPostRow`, `CommunityPostViewModel`에 `isPropertyQna: boolean` 추가
- [x] 서비스: `getCommunityFeed`에서 `property_qna` 탭 필터 처리
- [x] 서비스: `createCommunityPost`에 `isPropertyQna?: boolean` 파라미터 추가
- [x] UI: `CommunityWriteModal` — "현장 Q&A 질문하기" 옵션 추가, 현장 선택 필수

### 현장별 커뮤니티 위젯
- [x] 서비스: `getCommunityPostsByPropertyId(propertyId, limit)` 추가
- [x] 신규 컴포넌트: `features/community/components/PropertyCommunityWidget.tsx`
- [x] `OfferingDetailPage.tsx` 우측 사이드바에 위젯 삽입

### 커뮤니티 알림
- [x] 댓글 POST API: 글 작성자(자신 제외)에게 `community_comment` 알림 insert
- [x] 좋아요 POST API: 글 작성자(자신 제외)에게 `community_like` 알림 insert
- [x] 기존 `notifications` 테이블 활용, 마이그레이션 불필요

## 미완료 작업

### DB 마이그레이션 적용
- 테스트 DB(`ketjqhoeucxmxgnutlww`)에 `072_community_posts_property_qna.sql` 아직 미적용
- `supabase link --project-ref ketjqhoeucxmxgnutlww && supabase db push` 필요

## 수정된 파일
- `features/community/domain/community.ts` — 탭 + 타입 추가
- `features/community/mappers/community.mapper.ts` — isPropertyQna, propertyId 매핑
- `features/community/services/community.posts.ts` — Q&A 필터, 댓글 CRUD, 위젯 서비스
- `features/community/components/Profile/CommunityProfilePage.tsx` — 북마크 탭
- `features/community/components/CommunityFeed/CommunityFeed.tsx` — 댓글 수정/삭제 UI
- `features/community/components/CommunityFeed/CommunityWriteModal.tsx` — Q&A 옵션
- `features/community/components/PropertyCommunityWidget.tsx` — 신규
- `features/offerings/components/detail/OfferingDetailPage.tsx` — 위젯 삽입
- `app/api/community/comments/[commentId]/route.ts` — 신규 (PATCH/DELETE)
- `app/api/community/posts/[postId]/comments/route.ts` — 알림 추가
- `app/api/community/posts/[postId]/like/route.ts` — 알림 추가
- `supabase/migrations/072_community_posts_property_qna.sql` — 신규

## 주의사항
- `is_property_qna` 컬럼이 DB에 없으면 Q&A 탭 쿼리가 실패함 → 마이그레이션 먼저 적용
- 현장 Q&A 글은 `status = "thinking"`, `is_property_qna = true`로 저장됨 (전체/고민중 탭에도 노출됨)
- 알림은 service role key 필요 (API route에서만 insert, 클라이언트 노출 없음)

## 다음 세션 시작 시
1. 이 파일 읽기
2. `supabase link --project-ref ketjqhoeucxmxgnutlww && supabase db push`로 마이그레이션 적용
3. 테스트 후 메인 DB에도 적용
