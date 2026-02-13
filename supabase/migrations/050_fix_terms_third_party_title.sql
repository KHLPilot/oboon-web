-- 050_fix_terms_third_party_title.sql
-- 개인정보 제3자 제공 동의 약관 title이 영어로 표시되는 문제 수정

UPDATE terms
SET title = '개인정보 제3자 제공 동의'
WHERE type = 'signup_privacy_third_party';
