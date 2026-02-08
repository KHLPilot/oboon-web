/**
 * Support 도메인 타입 및 상수
 * QnA + FAQ 공통 정의
 */

// =====================================================
// FAQ 관련
// =====================================================

export const FAQ_CATEGORIES = [
  { key: "service", label: "서비스 이용" },
  { key: "reservation", label: "예약/방문" },
  { key: "cost", label: "비용" },
  { key: "privacy", label: "개인정보" },
] as const;

export type FAQCategoryKey = (typeof FAQ_CATEGORIES)[number]["key"];

export type FAQCategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type FAQItemRow = {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type FAQItemViewModel = {
  id: string;
  categoryKey: string;
  categoryName: string;
  question: string;
  answer: string;
};

// =====================================================
// QnA 관련
// =====================================================

export const QNA_STATUS = {
  pending: "답변 대기",
  answered: "답변 완료",
} as const;

export type QnAStatusKey = keyof typeof QNA_STATUS;

export type QnAQuestionRow = {
  id: string;
  author_profile_id: string;
  title: string;
  body: string;
  is_secret: boolean;
  secret_password_hash: string | null;
  is_anonymous: boolean;
  anonymous_nickname: string | null;
  status: QnAStatusKey;
  created_at: string;
  updated_at: string;
  // joined fields
  author_name?: string | null;
};

export type QnAAnswerRow = {
  id: string;
  question_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  // joined fields
  author_name?: string | null;
};

export type QnAListItemViewModel = {
  id: string;
  title: string;
  displayAuthor: string; // 익명 시 anonymous_nickname, 아니면 author_name
  isSecret: boolean;
  statusKey: QnAStatusKey;
  statusLabel: string;
  createdAt: string;
  formattedDate: string;
};

export type QnADetailViewModel = {
  id: string;
  title: string;
  body: string;
  displayAuthor: string;
  isSecret: boolean;
  isAnonymous: boolean;
  statusKey: QnAStatusKey;
  statusLabel: string;
  createdAt: string;
  formattedDate: string;
  isOwner: boolean;
  answer: QnAAnswerViewModel | null;
};

export type QnAAnswerViewModel = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  formattedDate: string;
};

// =====================================================
// 공통 탭 정의
// =====================================================

export const SUPPORT_TABS = [
  { key: "faq", label: "자주 묻는 질문" },
  { key: "qna", label: "1:1 문의" },
] as const;

export type SupportTabKey = (typeof SUPPORT_TABS)[number]["key"];

// =====================================================
// 헬퍼 함수
// =====================================================

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷
 */
export function formatSupportDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * QnA 상세 페이지 URL 생성
 */
export function getQnADetailHref(id: string): string {
  return `/support/qna/${id}`;
}
