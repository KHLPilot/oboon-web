-- =====================================================
-- RLS 활성화 및 정책 설정 (UNRESTRICTED 테이블들)
-- 테스트 DB에서 먼저 실행 후 본 서버에 적용
-- =====================================================

-- =====================================================
-- 1. PROFILES (active_profiles는 뷰이므로 profiles만 설정)
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- 새 정책 생성
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. CHAT_ROOMS
-- =====================================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;

-- 참여자만 조회 가능
CREATE POLICY "chat_rooms_select" ON chat_rooms
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 시스템에서 생성 (service role 사용)
CREATE POLICY "chat_rooms_insert" ON chat_rooms
    FOR INSERT WITH CHECK (true);

-- 참여자만 업데이트 가능
CREATE POLICY "chat_rooms_update" ON chat_rooms
    FOR UPDATE USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid()
    );

-- =====================================================
-- 3. CHAT_MESSAGES
-- =====================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;

-- 참여자만 조회 가능
CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.customer_id = auth.uid() OR chat_rooms.agent_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 참여자만 메시지 전송 가능
CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.customer_id = auth.uid() OR chat_rooms.agent_id = auth.uid())
        )
    );

-- 참여자만 업데이트 가능 (soft delete용)
CREATE POLICY "chat_messages_update" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.customer_id = auth.uid() OR chat_rooms.agent_id = auth.uid())
        )
    );

-- 관리자만 실제 삭제 가능
CREATE POLICY "chat_messages_delete" ON chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. CONSULTATIONS
-- =====================================================
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultations_select" ON consultations;
DROP POLICY IF EXISTS "consultations_insert" ON consultations;
DROP POLICY IF EXISTS "consultations_update" ON consultations;
DROP POLICY IF EXISTS "consultations_delete" ON consultations;

-- 본인 예약만 조회 가능
CREATE POLICY "consultations_select" ON consultations
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 고객만 예약 생성 가능
CREATE POLICY "consultations_insert" ON consultations
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- 참여자만 업데이트 가능
CREATE POLICY "consultations_update" ON consultations
    FOR UPDATE USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 관리자만 삭제 가능 (일반 사용자는 soft delete)
CREATE POLICY "consultations_delete" ON consultations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 5. CONTRACTS
-- =====================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_select" ON contracts;
DROP POLICY IF EXISTS "contracts_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_update" ON contracts;

-- 참여자만 조회 가능
CREATE POLICY "contracts_select" ON contracts
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 상담사/관리자만 생성 가능
CREATE POLICY "contracts_insert" ON contracts
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 상담사/관리자만 업데이트 가능
CREATE POLICY "contracts_update" ON contracts
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 6. PROPERTY_AGENTS
-- =====================================================
ALTER TABLE property_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_agents_select" ON property_agents;
DROP POLICY IF EXISTS "property_agents_insert" ON property_agents;
DROP POLICY IF EXISTS "property_agents_update" ON property_agents;
DROP POLICY IF EXISTS "property_agents_delete" ON property_agents;

-- 승인된 것은 누구나, 본인 신청은 본인이, 관리자는 전체 조회
CREATE POLICY "property_agents_select" ON property_agents
    FOR SELECT USING (
        status = 'approved' OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 상담사만 신청 가능
CREATE POLICY "property_agents_insert" ON property_agents
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('agent', 'admin')
        )
    );

-- 관리자만 업데이트 가능 (승인/거절)
CREATE POLICY "property_agents_update" ON property_agents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 관리자만 삭제 가능
CREATE POLICY "property_agents_delete" ON property_agents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 7. BRIEFING_SLUG_COUNTERS
-- =====================================================
ALTER TABLE briefing_slug_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_slug_counters_select" ON briefing_slug_counters;
DROP POLICY IF EXISTS "briefing_slug_counters_insert" ON briefing_slug_counters;
DROP POLICY IF EXISTS "briefing_slug_counters_update" ON briefing_slug_counters;

-- 누구나 조회 가능
CREATE POLICY "briefing_slug_counters_select" ON briefing_slug_counters
    FOR SELECT USING (true);

-- 관리자만 생성/업데이트 가능
CREATE POLICY "briefing_slug_counters_insert" ON briefing_slug_counters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "briefing_slug_counters_update" ON briefing_slug_counters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 8. VERIFICATION_TOKENS (추가)
-- =====================================================
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_tokens_select" ON verification_tokens;
DROP POLICY IF EXISTS "verification_tokens_insert" ON verification_tokens;
DROP POLICY IF EXISTS "verification_tokens_update" ON verification_tokens;

-- 본인 토큰만 조회 가능
CREATE POLICY "verification_tokens_select" ON verification_tokens
    FOR SELECT USING (user_id = auth.uid());

-- 시스템에서 생성 (service role)
CREATE POLICY "verification_tokens_insert" ON verification_tokens
    FOR INSERT WITH CHECK (true);

-- 시스템에서 업데이트 (service role)
CREATE POLICY "verification_tokens_update" ON verification_tokens
    FOR UPDATE USING (true);

-- =====================================================
-- 9. VISIT_TOKENS
-- =====================================================
ALTER TABLE visit_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_tokens_select" ON visit_tokens;
DROP POLICY IF EXISTS "visit_tokens_insert" ON visit_tokens;
DROP POLICY IF EXISTS "visit_tokens_update" ON visit_tokens;

-- 토큰 조회는 누구나 (QR 스캔용)
CREATE POLICY "visit_tokens_select" ON visit_tokens
    FOR SELECT USING (true);

-- 상담사만 생성 가능
CREATE POLICY "visit_tokens_insert" ON visit_tokens
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('agent', 'admin')
        )
    );

-- 상담사/관리자만 업데이트 가능
CREATE POLICY "visit_tokens_update" ON visit_tokens
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 10. VISIT_LOGS
-- =====================================================
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_logs_select" ON visit_logs;
DROP POLICY IF EXISTS "visit_logs_insert" ON visit_logs;

-- 관련자만 조회 가능
CREATE POLICY "visit_logs_select" ON visit_logs
    FOR SELECT USING (
        agent_id = auth.uid() OR
        customer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 시스템에서 생성 (service role)
CREATE POLICY "visit_logs_insert" ON visit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 11. VISIT_CONFIRM_REQUESTS
-- =====================================================
ALTER TABLE visit_confirm_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_confirm_requests_select" ON visit_confirm_requests;
DROP POLICY IF EXISTS "visit_confirm_requests_insert" ON visit_confirm_requests;
DROP POLICY IF EXISTS "visit_confirm_requests_update" ON visit_confirm_requests;

-- 관련자만 조회 가능
CREATE POLICY "visit_confirm_requests_select" ON visit_confirm_requests
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 고객만 요청 생성 가능
CREATE POLICY "visit_confirm_requests_insert" ON visit_confirm_requests
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- 상담사/관리자만 업데이트 가능 (승인/거절)
CREATE POLICY "visit_confirm_requests_update" ON visit_confirm_requests
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 확인: RLS 상태 조회 쿼리
-- =====================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
