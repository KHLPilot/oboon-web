-- 009_support_qna_faq.sql
-- QnA 및 FAQ 기능을 위한 테이블 생성

-- =====================================================
-- 1. FAQ CATEGORIES (FAQ 카테고리)
-- =====================================================
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_categories_select" ON faq_categories;
DROP POLICY IF EXISTS "faq_categories_admin_all" ON faq_categories;

CREATE POLICY "faq_categories_select" ON faq_categories
    FOR SELECT USING (is_active = true OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "faq_categories_admin_all" ON faq_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 초기 카테고리 데이터
INSERT INTO faq_categories (key, name, description, sort_order) VALUES
    ('service', '서비스 이용', 'OBOON 서비스 이용 관련 자주 묻는 질문', 1),
    ('reservation', '예약/방문', '분양 상담 예약 및 방문 관련 질문', 2),
    ('cost', '비용', '서비스 비용 및 결제 관련 질문', 3),
    ('privacy', '개인정보', '개인정보 보호 및 회원 관련 질문', 4)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. FAQ ITEMS (FAQ 항목)
-- =====================================================
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    author_profile_id UUID NOT NULL REFERENCES profiles(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_items_select" ON faq_items;
DROP POLICY IF EXISTS "faq_items_admin_all" ON faq_items;

CREATE POLICY "faq_items_select" ON faq_items
    FOR SELECT USING (is_active = true OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "faq_items_admin_all" ON faq_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_faq_items_category_id ON faq_items(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_sort ON faq_items(category_id, sort_order);

-- =====================================================
-- 3. QNA QUESTIONS (QnA 질문)
-- =====================================================
CREATE TABLE IF NOT EXISTS qna_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_profile_id UUID NOT NULL REFERENCES profiles(id),

    -- 기본 정보
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,

    -- 비밀글 옵션
    is_secret BOOLEAN NOT NULL DEFAULT false,
    secret_password_hash TEXT,

    -- 익명 옵션
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    anonymous_nickname VARCHAR(50),

    -- 상태 관리
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),

    -- 소프트 삭제
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE qna_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qna_questions_select" ON qna_questions;
DROP POLICY IF EXISTS "qna_questions_insert" ON qna_questions;
DROP POLICY IF EXISTS "qna_questions_update" ON qna_questions;
DROP POLICY IF EXISTS "qna_questions_delete" ON qna_questions;

-- SELECT: 삭제되지 않은 글 중, 공개글은 모두 / 비밀글은 작성자 또는 관리자만
CREATE POLICY "qna_questions_select" ON qna_questions
    FOR SELECT USING (
        deleted_at IS NULL AND (
            is_secret = false OR
            author_profile_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        )
    );

-- INSERT: 로그인 유저만 (본인 ID로만)
CREATE POLICY "qna_questions_insert" ON qna_questions
    FOR INSERT WITH CHECK (
        author_profile_id = auth.uid()
    );

-- UPDATE: 본인 또는 관리자
CREATE POLICY "qna_questions_update" ON qna_questions
    FOR UPDATE USING (
        author_profile_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- DELETE: 관리자만 (실제로는 소프트 삭제 사용)
CREATE POLICY "qna_questions_delete" ON qna_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_qna_questions_created_at ON qna_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qna_questions_status ON qna_questions(status);
CREATE INDEX IF NOT EXISTS idx_qna_questions_author ON qna_questions(author_profile_id);

-- =====================================================
-- 4. QNA ANSWERS (QnA 답변 - 관리자만 작성)
-- =====================================================
CREATE TABLE IF NOT EXISTS qna_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES qna_questions(id) ON DELETE CASCADE,
    author_profile_id UUID NOT NULL REFERENCES profiles(id),

    body TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE qna_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qna_answers_select" ON qna_answers;
DROP POLICY IF EXISTS "qna_answers_insert" ON qna_answers;
DROP POLICY IF EXISTS "qna_answers_update" ON qna_answers;
DROP POLICY IF EXISTS "qna_answers_delete" ON qna_answers;

-- SELECT: 질문 접근 가능자만 (비밀글 연계)
CREATE POLICY "qna_answers_select" ON qna_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qna_questions q
            WHERE q.id = qna_answers.question_id
            AND q.deleted_at IS NULL
            AND (
                q.is_secret = false OR
                q.author_profile_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            )
        )
    );

-- INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "qna_answers_insert" ON qna_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "qna_answers_update" ON qna_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "qna_answers_delete" ON qna_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_qna_answers_question_id ON qna_answers(question_id);
