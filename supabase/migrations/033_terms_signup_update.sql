-- 033_terms_signup_update.sql
-- 회원가입 약관 시스템 개선: 순서/필수여부 컬럼 추가 + 신규 약관

-- ============================================
-- 1. terms 테이블에 컬럼 추가
-- ============================================

-- display_order: 표시 순서 (1부터 시작)
ALTER TABLE terms ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- is_required: 필수 약관 여부 (기본값 true)
ALTER TABLE terms ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;

-- ============================================
-- 2. 신규 약관 추가
-- ============================================

-- 만14세 이상 확인 (필수, 전문 없음)
INSERT INTO terms (type, version, title, content, is_active, is_required, display_order)
VALUES (
  'signup_age_check',
  1,
  '만 14세 이상 확인',
  '본인은 만 14세 이상입니다.',
  true,
  true,
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- 개인정보 제3자 제공 동의 (필수)
INSERT INTO terms (type, version, title, content, is_active, is_required, display_order)
VALUES (
  'signup_privacy_third_party',
  1,
  '개인정보 제3자 제공 동의',
  '개인정보 제3자 제공 동의

1. 제공받는 자
- 분양 현장 시행사/시공사
- 분양 상담사

2. 제공 목적
- 분양 상담 예약 및 방문 확인
- 상담 서비스 제공
- 고객 문의 응대

3. 제공 항목
- 이름, 연락처, 상담 예약 정보

4. 보유 및 이용 기간
- 제공 목적 달성 시까지 또는 동의 철회 시까지

5. 동의 거부 권리
- 개인정보 제3자 제공에 대한 동의를 거부할 권리가 있습니다.
- 다만, 동의 거부 시 분양 상담 예약 서비스 이용이 제한됩니다.',
  true,
  true,
  4
)
ON CONFLICT (type, version) DO NOTHING;

-- ============================================
-- 3. 기존 약관 순서/필수여부 업데이트
-- ============================================

-- 서비스 이용약관: 순서 2, 필수
UPDATE terms
SET display_order = 2, is_required = true
WHERE type = 'signup_terms' AND is_active = true;

-- 개인정보 수집·이용 동의: 순서 3, 필수
UPDATE terms
SET display_order = 3, is_required = true
WHERE type = 'signup_privacy' AND is_active = true;

-- 위치정보 이용 동의: 순서 5, 필수
UPDATE terms
SET display_order = 5, is_required = true
WHERE type = 'signup_location' AND is_active = true;

-- 마케팅 정보 수신 동의: 순서 6, 선택
UPDATE terms
SET display_order = 6, is_required = false
WHERE type = 'signup_marketing' AND is_active = true;

-- 예약/상담사 약관은 순서 0 유지 (회원가입과 별개)
UPDATE terms
SET display_order = 0
WHERE type IN ('customer_reservation', 'agent_visit_fee') AND is_active = true;

-- ============================================
-- 4. 인덱스 추가
-- ============================================

CREATE INDEX IF NOT EXISTS idx_terms_display_order ON terms(display_order);
CREATE INDEX IF NOT EXISTS idx_terms_is_required ON terms(is_required);
