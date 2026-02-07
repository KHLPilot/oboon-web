-- 008_qr_code_nullable.sql
-- QR 코드 기능 제거에 따른 qr 관련 컬럼 nullable 변경

ALTER TABLE consultations ALTER COLUMN qr_code DROP NOT NULL;
ALTER TABLE consultations ALTER COLUMN qr_expires_at DROP NOT NULL;