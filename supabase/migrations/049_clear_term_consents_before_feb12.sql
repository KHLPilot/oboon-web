-- 049_clear_term_consents_before_feb12.sql
-- 2월 12일 이전 동의 내역 삭제 (새 약관 체계 적용 전 동의)
-- 삭제된 유저는 로그인 시 약관 동의 모달을 통해 재동의 받음

DELETE FROM term_consents
WHERE consented_at < '2025-02-12 00:00:00+09';
