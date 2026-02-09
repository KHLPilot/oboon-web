-- =====================================================
-- 004: Chat Realtime 및 누락된 컬럼 추가
-- 프로덕션 DB와 테스트 DB 스키마 동기화
-- =====================================================

-- 1. chat_messages 테이블을 Realtime Publication에 추가
-- 이 명령어로 실시간 채팅이 작동합니다
-- 이미 추가된 경우 무시 (DO 블록 사용)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- 이미 추가된 경우 무시
END $$;

-- 2. chat_messages 누락 컬럼 추가
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- 3. visit_confirm_requests 누락 컬럼 추가
ALTER TABLE visit_confirm_requests
ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE visit_confirm_requests
ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);
CREATE INDEX IF NOT EXISTS idx_visit_confirm_requests_property_id ON visit_confirm_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_confirm_requests_consultation_id ON visit_confirm_requests(consultation_id);
