-- =====================================================
-- OBOON Database Views and Additional Indexes
-- 기존 뷰/인덱스가 있으면 재생성
-- =====================================================

-- =====================================================
-- VIEWS
-- =====================================================

-- active_profiles: 삭제되지 않은 활성 프로필 뷰
DROP VIEW IF EXISTS active_profiles;
CREATE VIEW active_profiles AS
SELECT *
FROM profiles
WHERE deleted_at IS NULL;

-- 상담사 목록 뷰 (승인된 상담사만)
DROP VIEW IF EXISTS approved_agents;
CREATE VIEW approved_agents AS
SELECT
    p.id,
    p.name,
    p.email,
    p.phone_number,
    pa.property_id,
    pr.name as property_name
FROM profiles p
JOIN property_agents pa ON p.id = pa.agent_id
JOIN properties pr ON pa.property_id = pr.id
WHERE p.role = 'agent'
  AND pa.status = 'approved'
  AND p.deleted_at IS NULL;

-- =====================================================
-- ADDITIONAL INDEXES (성능 최적화)
-- =====================================================

-- profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- properties 인덱스
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);

-- property_locations 인덱스
CREATE INDEX IF NOT EXISTS idx_property_locations_properties_id ON property_locations(properties_id);
CREATE INDEX IF NOT EXISTS idx_property_locations_region ON property_locations(region_1depth, region_2depth);

-- property_agents 인덱스
CREATE INDEX IF NOT EXISTS idx_property_agents_agent_id ON property_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_agents_property_id ON property_agents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_agents_status ON property_agents(status);

-- consultations 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_cancelled_at ON consultations(cancelled_at) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_consultations_hidden ON consultations(hidden_by_customer, hidden_by_agent);

-- verification_tokens 인덱스
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);

-- visit_confirm_requests 인덱스
CREATE INDEX IF NOT EXISTS idx_visit_confirm_requests_agent_id ON visit_confirm_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_confirm_requests_status ON visit_confirm_requests(status);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- 만료된 토큰 자동 삭제 함수 (Cron Job에서 호출)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 만료된 visit_tokens 삭제 (사용되지 않은 것)
    DELETE FROM visit_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day'
      AND used_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 만료된 verification_tokens 삭제
    DELETE FROM verification_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 취소된 예약 자동 정리 함수 (3일 후)
CREATE OR REPLACE FUNCTION cleanup_cancelled_consultations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    old_ids UUID[];
BEGIN
    -- 3일이 지난 취소된 예약 ID 수집
    SELECT ARRAY_AGG(id) INTO old_ids
    FROM consultations
    WHERE status = 'cancelled'
      AND cancelled_at < NOW() - INTERVAL '3 days';

    IF old_ids IS NOT NULL THEN
        -- 관련 채팅방 삭제
        DELETE FROM chat_rooms
        WHERE consultation_id = ANY(old_ids);

        -- 예약 삭제
        DELETE FROM consultations
        WHERE id = ANY(old_ids);

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    ELSE
        deleted_count := 0;
    END IF;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
