-- =====================================================
-- OBOON Database Schema
-- 본 서버 DB에 적용할 스키마 (데이터 제외, 구조/정책/외래키 포함)
-- 기존 정책이 있으면 삭제 후 재생성
-- =====================================================

-- =====================================================
-- 1. PROFILES (사용자 프로필)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'agent', 'agent_pending', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. PROPERTIES (분양 물건)
-- =====================================================
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    property_type VARCHAR(50),
    image_url TEXT,
    description TEXT,
    phone_number VARCHAR(20),
    confirmed_comment TEXT,
    estimated_comment TEXT,
    pending_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
DROP POLICY IF EXISTS "Admins can manage properties" ON properties;
DROP POLICY IF EXISTS "properties_select_all" ON properties;
DROP POLICY IF EXISTS "properties_admin_all" ON properties;

CREATE POLICY "properties_select_all" ON properties
    FOR SELECT USING (true);

CREATE POLICY "properties_admin_all" ON properties
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 3. PROPERTY_LOCATIONS (분양 위치)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_locations (
    id SERIAL PRIMARY KEY,
    properties_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    road_address TEXT,
    jibun_address TEXT,
    region_1depth VARCHAR(50),
    region_2depth VARCHAR(50),
    region_3depth VARCHAR(50),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE property_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view property_locations" ON property_locations;
DROP POLICY IF EXISTS "Admins can manage property_locations" ON property_locations;
DROP POLICY IF EXISTS "property_locations_select_all" ON property_locations;
DROP POLICY IF EXISTS "property_locations_admin_all" ON property_locations;

CREATE POLICY "property_locations_select_all" ON property_locations
    FOR SELECT USING (true);

CREATE POLICY "property_locations_admin_all" ON property_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. PROPERTY_SPECS (분양 스펙)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_specs (
    id SERIAL PRIMARY KEY,
    properties_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    sale_type VARCHAR(50),
    trust_company VARCHAR(100),
    site_area DECIMAL(10, 2),
    building_area DECIMAL(10, 2),
    building_coverage_ratio DECIMAL(5, 2),
    floor_ground INTEGER,
    floor_underground INTEGER,
    building_count INTEGER,
    household_total INTEGER,
    parking_total INTEGER,
    parking_per_household DECIMAL(5, 2),
    heating_type VARCHAR(50),
    amenities TEXT[],
    builder VARCHAR(100),
    developer VARCHAR(100),
    floor_area_ratio DECIMAL(6, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE property_specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view property_specs" ON property_specs;
DROP POLICY IF EXISTS "Admins can manage property_specs" ON property_specs;
DROP POLICY IF EXISTS "property_specs_select_all" ON property_specs;
DROP POLICY IF EXISTS "property_specs_admin_all" ON property_specs;

CREATE POLICY "property_specs_select_all" ON property_specs
    FOR SELECT USING (true);

CREATE POLICY "property_specs_admin_all" ON property_specs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 5. PROPERTY_TIMELINE (분양 일정)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_timeline (
    id SERIAL PRIMARY KEY,
    properties_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    announcement_date DATE,
    application_start DATE,
    application_end DATE,
    winner_announce DATE,
    contract_start DATE,
    contract_end DATE,
    move_in_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE property_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view property_timeline" ON property_timeline;
DROP POLICY IF EXISTS "Admins can manage property_timeline" ON property_timeline;
DROP POLICY IF EXISTS "property_timeline_select_all" ON property_timeline;
DROP POLICY IF EXISTS "property_timeline_admin_all" ON property_timeline;

CREATE POLICY "property_timeline_select_all" ON property_timeline
    FOR SELECT USING (true);

CREATE POLICY "property_timeline_admin_all" ON property_timeline
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 6. PROPERTY_UNIT_TYPES (평형 정보)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_unit_types (
    id SERIAL PRIMARY KEY,
    properties_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    type_name VARCHAR(50),
    exclusive_area DECIMAL(8, 2),
    supply_area DECIMAL(8, 2),
    rooms INTEGER,
    bathrooms INTEGER,
    building_layout VARCHAR(50),
    orientation VARCHAR(20),
    price_min BIGINT,
    price_max BIGINT,
    unit_count INTEGER,
    supply_count INTEGER,
    image_url TEXT,
    floor_plan_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE property_unit_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view property_unit_types" ON property_unit_types;
DROP POLICY IF EXISTS "Admins can manage property_unit_types" ON property_unit_types;
DROP POLICY IF EXISTS "property_unit_types_select_all" ON property_unit_types;
DROP POLICY IF EXISTS "property_unit_types_admin_all" ON property_unit_types;

CREATE POLICY "property_unit_types_select_all" ON property_unit_types
    FOR SELECT USING (true);

CREATE POLICY "property_unit_types_admin_all" ON property_unit_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 7. PROPERTY_FACILITIES (시설 정보)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_facilities (
    id SERIAL PRIMARY KEY,
    properties_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100),
    category VARCHAR(50),
    distance INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE property_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view property_facilities" ON property_facilities;
DROP POLICY IF EXISTS "Admins can manage property_facilities" ON property_facilities;
DROP POLICY IF EXISTS "property_facilities_select_all" ON property_facilities;
DROP POLICY IF EXISTS "property_facilities_admin_all" ON property_facilities;

CREATE POLICY "property_facilities_select_all" ON property_facilities
    FOR SELECT USING (true);

CREATE POLICY "property_facilities_admin_all" ON property_facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 8. PROPERTY_AGENTS (상담사 현장 소속)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_id, agent_id)
);

-- RLS 정책
ALTER TABLE property_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved property_agents" ON property_agents;
DROP POLICY IF EXISTS "Agents can insert own property_agent" ON property_agents;
DROP POLICY IF EXISTS "Admins can manage property_agents" ON property_agents;
DROP POLICY IF EXISTS "property_agents_select" ON property_agents;
DROP POLICY IF EXISTS "property_agents_insert" ON property_agents;
DROP POLICY IF EXISTS "property_agents_update" ON property_agents;
DROP POLICY IF EXISTS "property_agents_delete" ON property_agents;

CREATE POLICY "property_agents_select" ON property_agents
    FOR SELECT USING (
        status = 'approved' OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "property_agents_insert" ON property_agents
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('agent', 'admin')
        )
    );

CREATE POLICY "property_agents_update" ON property_agents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "property_agents_delete" ON property_agents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 9. CONSULTATIONS (상담 예약)
-- =====================================================
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    qr_code VARCHAR(100) UNIQUE,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'visited', 'contracted', 'cancelled')),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    visited_at TIMESTAMP WITH TIME ZONE,
    hidden_by_customer BOOLEAN DEFAULT FALSE,
    hidden_by_agent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_customer_id ON consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_agent_id ON consultations(agent_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);

-- RLS 정책
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can insert consultations" ON consultations;
DROP POLICY IF EXISTS "Participants can update consultations" ON consultations;
DROP POLICY IF EXISTS "Admins can delete consultations" ON consultations;
DROP POLICY IF EXISTS "consultations_select" ON consultations;
DROP POLICY IF EXISTS "consultations_insert" ON consultations;
DROP POLICY IF EXISTS "consultations_update" ON consultations;
DROP POLICY IF EXISTS "consultations_delete" ON consultations;

CREATE POLICY "consultations_select" ON consultations
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "consultations_insert" ON consultations
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "consultations_update" ON consultations
    FOR UPDATE USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "consultations_delete" ON consultations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 10. CHAT_ROOMS (채팅방)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(consultation_id)
);

-- RLS 정책
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "System can insert chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Participants can update chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;

CREATE POLICY "chat_rooms_select" ON chat_rooms
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "chat_rooms_insert" ON chat_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "chat_rooms_update" ON chat_rooms
    FOR UPDATE USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid()
    );

-- =====================================================
-- 11. CHAT_MESSAGES (채팅 메시지)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    deleted_by_customer BOOLEAN DEFAULT FALSE,
    deleted_by_agent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS 정책
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can insert chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can update chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can delete chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;

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

CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.customer_id = auth.uid() OR chat_rooms.agent_id = auth.uid())
        )
    );

CREATE POLICY "chat_messages_update" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.customer_id = auth.uid() OR chat_rooms.agent_id = auth.uid())
        )
    );

CREATE POLICY "chat_messages_delete" ON chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 12. VISIT_TOKENS (방문 인증 토큰)
-- =====================================================
CREATE TABLE IF NOT EXISTS visit_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(100) UNIQUE NOT NULL,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visit_tokens_token ON visit_tokens(token);
CREATE INDEX IF NOT EXISTS idx_visit_tokens_expires_at ON visit_tokens(expires_at);

-- RLS 정책
ALTER TABLE visit_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view visit_tokens by token" ON visit_tokens;
DROP POLICY IF EXISTS "Agents can insert visit_tokens" ON visit_tokens;
DROP POLICY IF EXISTS "Agents can update own visit_tokens" ON visit_tokens;
DROP POLICY IF EXISTS "visit_tokens_select" ON visit_tokens;
DROP POLICY IF EXISTS "visit_tokens_insert" ON visit_tokens;
DROP POLICY IF EXISTS "visit_tokens_update" ON visit_tokens;

CREATE POLICY "visit_tokens_select" ON visit_tokens
    FOR SELECT USING (true);

CREATE POLICY "visit_tokens_insert" ON visit_tokens
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('agent', 'admin')
        )
    );

CREATE POLICY "visit_tokens_update" ON visit_tokens
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 13. VISIT_LOGS (방문 기록)
-- =====================================================
CREATE TABLE IF NOT EXISTS visit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES visit_tokens(id) ON DELETE SET NULL,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    accuracy DECIMAL(10, 2),
    method VARCHAR(20) DEFAULT 'gps' CHECK (method IN ('gps', 'manual')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visit_logs_property_id ON visit_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_agent_id ON visit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_verified_at ON visit_logs(verified_at);

-- RLS 정책
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own visit_logs" ON visit_logs;
DROP POLICY IF EXISTS "System can insert visit_logs" ON visit_logs;
DROP POLICY IF EXISTS "visit_logs_select" ON visit_logs;
DROP POLICY IF EXISTS "visit_logs_insert" ON visit_logs;

CREATE POLICY "visit_logs_select" ON visit_logs
    FOR SELECT USING (
        agent_id = auth.uid() OR
        customer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "visit_logs_insert" ON visit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 14. VISIT_CONFIRM_REQUESTS (수동 확인 요청)
-- =====================================================
CREATE TABLE IF NOT EXISTS visit_confirm_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES visit_tokens(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE visit_confirm_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view visit_confirm_requests" ON visit_confirm_requests;
DROP POLICY IF EXISTS "Users can insert visit_confirm_requests" ON visit_confirm_requests;
DROP POLICY IF EXISTS "Agents can update visit_confirm_requests" ON visit_confirm_requests;
DROP POLICY IF EXISTS "visit_confirm_requests_select" ON visit_confirm_requests;
DROP POLICY IF EXISTS "visit_confirm_requests_insert" ON visit_confirm_requests;
DROP POLICY IF EXISTS "visit_confirm_requests_update" ON visit_confirm_requests;

CREATE POLICY "visit_confirm_requests_select" ON visit_confirm_requests
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "visit_confirm_requests_insert" ON visit_confirm_requests
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "visit_confirm_requests_update" ON visit_confirm_requests
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 15. VERIFICATION_TOKENS (이메일 인증 토큰)
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification_tokens" ON verification_tokens;
DROP POLICY IF EXISTS "System can insert verification_tokens" ON verification_tokens;
DROP POLICY IF EXISTS "System can update verification_tokens" ON verification_tokens;
DROP POLICY IF EXISTS "verification_tokens_select" ON verification_tokens;
DROP POLICY IF EXISTS "verification_tokens_insert" ON verification_tokens;
DROP POLICY IF EXISTS "verification_tokens_update" ON verification_tokens;

CREATE POLICY "verification_tokens_select" ON verification_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "verification_tokens_insert" ON verification_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "verification_tokens_update" ON verification_tokens
    FOR UPDATE USING (true);

-- =====================================================
-- 16. CONTRACTS (계약)
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    contract_date DATE,
    contract_amount BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can update contracts" ON contracts;
DROP POLICY IF EXISTS "contracts_select" ON contracts;
DROP POLICY IF EXISTS "contracts_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_update" ON contracts;

CREATE POLICY "contracts_select" ON contracts
    FOR SELECT USING (
        customer_id = auth.uid() OR
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "contracts_insert" ON contracts
    FOR INSERT WITH CHECK (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "contracts_update" ON contracts
    FOR UPDATE USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 17. BRIEFING TABLES (브리핑 관련)
-- =====================================================

-- briefing_categories
CREATE TABLE IF NOT EXISTS briefing_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE briefing_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_categories_select" ON briefing_categories;
DROP POLICY IF EXISTS "briefing_categories_admin" ON briefing_categories;

CREATE POLICY "briefing_categories_select" ON briefing_categories
    FOR SELECT USING (true);

CREATE POLICY "briefing_categories_admin" ON briefing_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- briefing_tags
CREATE TABLE IF NOT EXISTS briefing_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE briefing_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_tags_select" ON briefing_tags;
DROP POLICY IF EXISTS "briefing_tags_admin" ON briefing_tags;

CREATE POLICY "briefing_tags_select" ON briefing_tags
    FOR SELECT USING (true);

CREATE POLICY "briefing_tags_admin" ON briefing_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- briefing_boards
CREATE TABLE IF NOT EXISTS briefing_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES briefing_categories(id),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE briefing_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_boards_select" ON briefing_boards;
DROP POLICY IF EXISTS "briefing_boards_admin" ON briefing_boards;

CREATE POLICY "briefing_boards_select" ON briefing_boards
    FOR SELECT USING (true);

CREATE POLICY "briefing_boards_admin" ON briefing_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- briefing_posts
CREATE TABLE IF NOT EXISTS briefing_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES briefing_boards(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id UUID REFERENCES profiles(id),
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE briefing_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_posts_select" ON briefing_posts;
DROP POLICY IF EXISTS "briefing_posts_admin" ON briefing_posts;

CREATE POLICY "briefing_posts_select" ON briefing_posts
    FOR SELECT USING (true);

CREATE POLICY "briefing_posts_admin" ON briefing_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- briefing_post_tags (다대다 관계)
CREATE TABLE IF NOT EXISTS briefing_post_tags (
    post_id UUID REFERENCES briefing_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES briefing_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE briefing_post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_post_tags_select" ON briefing_post_tags;
DROP POLICY IF EXISTS "briefing_post_tags_admin" ON briefing_post_tags;

CREATE POLICY "briefing_post_tags_select" ON briefing_post_tags
    FOR SELECT USING (true);

CREATE POLICY "briefing_post_tags_admin" ON briefing_post_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- briefing_slug_counters
CREATE TABLE IF NOT EXISTS briefing_slug_counters (
    id SERIAL PRIMARY KEY,
    base_slug VARCHAR(255) NOT NULL,
    counter INTEGER DEFAULT 0,
    UNIQUE(base_slug)
);

ALTER TABLE briefing_slug_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefing_slug_counters_select" ON briefing_slug_counters;
DROP POLICY IF EXISTS "briefing_slug_counters_insert" ON briefing_slug_counters;
DROP POLICY IF EXISTS "briefing_slug_counters_update" ON briefing_slug_counters;

CREATE POLICY "briefing_slug_counters_select" ON briefing_slug_counters
    FOR SELECT USING (true);

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
-- FUNCTIONS (트리거 함수들)
-- =====================================================

-- 프로필 자동 생성 함수 (auth.users 연동)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- chat_rooms updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_chat_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_rooms
    SET updated_at = NOW()
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_chat_room_on_message ON chat_messages;
CREATE TRIGGER update_chat_room_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_room_updated_at();
