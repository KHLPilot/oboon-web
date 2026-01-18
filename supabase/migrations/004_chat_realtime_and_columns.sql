-- =====================================================
-- 004: Chat Realtime 및 추가 컬럼
-- chat_messages 테이블 Realtime 활성화 및 누락된 컬럼 추가
-- =====================================================

-- 1. chat_messages 테이블을 Realtime Publication에 추가
-- 이 명령어로 실시간 채팅이 작동합니다
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 2. read_at 컬럼 추가 (읽음 표시 기능용, 선택사항)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 3. message_type 컬럼 추가 (메시지 유형 구분용, 선택사항)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);
