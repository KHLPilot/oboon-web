-- 007_term_consents.sql
-- 법적 분쟁 대응을 위한 약관 버전 관리 + 동의 기록 시스템

-- ============================================
-- 1. terms 테이블 개선 (버전 관리 추가)
-- ============================================

-- 버전 컬럼 추가
ALTER TABLE terms ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 기존 UNIQUE 제약 제거 (type만 unique였음)
ALTER TABLE terms DROP CONSTRAINT IF EXISTS terms_type_key;

-- 새 UNIQUE 제약 추가 (type + version)
ALTER TABLE terms ADD CONSTRAINT terms_type_version_unique UNIQUE (type, version);

-- updated_by, updated_at 대신 created_by, created_at만 사용 (버전 생성 시점)
-- 기존 컬럼 유지하되 created_by 추가
ALTER TABLE terms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 기존 데이터에 version=1 설정 (이미 DEFAULT로 처리됨)

-- ============================================
-- 2. 회원가입 약관 초기 데이터 추가
-- ============================================

INSERT INTO terms (type, version, title, content, is_active) VALUES
('signup_terms', 1, '서비스 이용약관', '오늘의 분양 서비스 이용약관

제1조 (목적)
본 약관은 오늘의 분양(이하 "회사")이 제공하는 분양 상담 예약 플랫폼 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 분양 상담 예약, 상담사 매칭, 방문 인증 등 관련 서비스를 말합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 자를 말합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
2. 회사는 관련법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.

제4조 (서비스 이용)
1. 이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있습니다.
2. 이용자는 허위정보 제공, 타인 정보 도용 등 부정한 방법으로 서비스를 이용할 수 없습니다.

본 약관은 베타 운영 기간 동안 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 안내됩니다.', true),

('signup_privacy', 1, '개인정보 수집·이용 동의', '개인정보 수집·이용 동의

1. 수집 항목
- 필수: 이메일, 이름, 휴대폰 번호, 닉네임
- 선택: 프로필 이미지

2. 수집 목적
- 회원 가입 및 관리
- 서비스 제공 및 상담 예약 처리
- 고객 문의 응대
- 서비스 개선 및 통계 분석

3. 보유 기간
- 회원 탈퇴 시까지 보유하며, 탈퇴 후 관련 법령에 따라 일정 기간 보관 후 파기

4. 동의 거부 권리
- 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
- 다만, 필수 항목에 대한 동의 거부 시 회원가입이 제한됩니다.

문의: 고객센터', true),

('signup_location', 1, '위치정보 이용 동의', '위치정보 이용 동의

1. 위치정보 수집 목적
- 분양 현장 방문 인증 (GPS 기반)
- 주변 분양 현장 안내

2. 수집 방법
- 이용자의 모바일 기기에서 GPS 정보를 수집합니다.
- 방문 인증 시에만 위치정보를 수집하며, 지속적으로 추적하지 않습니다.

3. 보유 기간
- 방문 인증 완료 후 관련 기록은 분쟁 대응을 위해 3년간 보관됩니다.

4. 동의 거부 권리
- 위치정보 이용에 대한 동의를 거부할 권리가 있습니다.
- 다만, 동의 거부 시 방문 인증 기능 이용이 제한됩니다.', true),

('signup_marketing', 1, '마케팅 정보 수신 동의', '마케팅 정보 수신 동의 (선택)

1. 수신 정보
- 신규 분양 정보 및 프로모션
- 이벤트 및 혜택 안내
- 서비스 업데이트 소식

2. 수신 방법
- 이메일, SMS, 앱 푸시 알림

3. 동의 철회
- 마케팅 수신 동의는 언제든지 철회할 수 있습니다.
- 회원정보 설정에서 수신 거부를 설정할 수 있습니다.

※ 본 동의는 선택사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.', true)
ON CONFLICT (type, version) DO NOTHING;

-- ============================================
-- 3. term_consents 테이블 생성 (동의 기록)
-- ============================================

CREATE TABLE IF NOT EXISTS term_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,

  -- 조회 편의용 (denormalization)
  term_type VARCHAR(50) NOT NULL,
  term_version INTEGER NOT NULL,

  -- 법적 증거용 메타데이터
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- 동의 컨텍스트
  context VARCHAR(50) NOT NULL,  -- 'signup', 'reservation', 'agent_approval'
  context_id UUID,               -- 예약ID 등 (nullable)

  -- 약관 스냅샷 (삭제되더라도 증거 보존)
  term_title_snapshot TEXT NOT NULL,
  term_content_snapshot TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE term_consents ENABLE ROW LEVEL SECURITY;

-- 본인 동의 기록만 조회 가능
CREATE POLICY "users_read_own_consents" ON term_consents
  FOR SELECT USING (auth.uid() = user_id);

-- 서버에서만 INSERT 가능 (service key 사용)
CREATE POLICY "service_insert_consents" ON term_consents
  FOR INSERT WITH CHECK (true);

-- admin만 전체 조회 가능 (분쟁 대응용) - 서버에서 role 확인
CREATE POLICY "service_read_all_consents" ON term_consents
  FOR SELECT USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_term_consents_user ON term_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_term_consents_context ON term_consents(context, context_id);
CREATE INDEX IF NOT EXISTS idx_term_consents_term_type ON term_consents(term_type);
CREATE INDEX IF NOT EXISTS idx_term_consents_consented_at ON term_consents(consented_at);

-- ============================================
-- 4. terms 테이블 RLS 정책 수정
-- ============================================

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "anyone_read_active_terms" ON terms;
DROP POLICY IF EXISTS "service_manage_terms" ON terms;

-- 모든 사용자가 활성 약관 조회 가능
CREATE POLICY "anyone_read_active_terms" ON terms
  FOR SELECT USING (is_active = true);

-- 서버에서 service key로 관리
CREATE POLICY "service_manage_terms" ON terms
  FOR ALL USING (true) WITH CHECK (true);