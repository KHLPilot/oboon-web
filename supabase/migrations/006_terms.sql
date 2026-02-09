-- 006_terms.sql
-- 약관 테이블 생성 (고객 예약금 안내, 상담사 방문성과비 약관)

CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL UNIQUE,  -- 'customer_reservation', 'agent_visit_fee'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성 약관 조회 가능
DROP POLICY IF EXISTS "anyone_read_active_terms" ON terms;
CREATE POLICY "anyone_read_active_terms" ON terms
  FOR SELECT USING (is_active = true);

-- 서버에서 service key로 관리 (admin 권한 체크는 API에서)
DROP POLICY IF EXISTS "service_manage_terms" ON terms;
CREATE POLICY "service_manage_terms" ON terms
  FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(type);

-- 초기 데이터 삽입
INSERT INTO terms (type, title, content) VALUES
('customer_reservation', '예약금 안내 및 동의', '고객 예약 전 필수 동의 약관 (베타운영)

분양 상담 예약 시, 상담사에게 지급하는 예약금에 대한 안내 (베타 운영 중)

1. 예약금은 실제 결제 금액이 아니며, 상담사의 상담 서비스 이용을 위한 예치금의 개념입니다.
2. 예약금은 추후 베타 운영 후 서비스 이용 정책 확립 시 정산 또는 환불 절차가 진행될 수 있습니다.
3. 예약 일정이 확정된 후 분양 상담에 방문하지 않을 경우, 예약금의 전액 또는 일부가 공제될 수 있습니다.
4. 당사는 베타 운영 기간 동안 예약금 제도를 수정하거나 폐지할 권리를 가지며, 이 경우 사전에 공지합니다.
5. 예약금 관련 문의는 고객센터를 통해 안내받으실 수 있습니다.'),
('agent_visit_fee', '방문성과비 이용약관', '상담사 방문성과비 이용약관 (베타 운영)

방문성과비에 대한 설명 (베타 운영 중)

1. 방문성과비는 고객이 예약한 분양 상담에 방문하였을 경우, 상담사에게 지급되는 성과보수입니다.
2. 방문 인증은 GPS 위치 확인 또는 관리자 승인을 통해 이루어지며, 인증 실패 시 방문성과비는 지급되지 않습니다.
3. 방문성과비는 각 현장 및 상담 조건에 따라 상이할 수 있으며, 세부 금액은 별도로 안내됩니다.
4. 허위 방문 인증 또는 부정 행위가 확인될 경우, 해당 금액은 지급되지 않으며 서비스 이용에 제한이 생길 수 있습니다.
5. 방문성과비의 정산 주기 및 방법은 베타 운영 기간 동안 변경될 수 있으며, 별도 공지를 통해 안내됩니다.
6. 관련 문의는 상담사 지원센터를 통해 안내받으실 수 있습니다.')
ON CONFLICT (type) DO NOTHING;
