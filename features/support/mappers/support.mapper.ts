import {
  QNA_STATUS,
  formatSupportDate,
  type FAQItemViewModel,
  type QnAListItemViewModel,
  type QnAStatusKey,
} from "../domain/support";

type FAQCategoryJoin =
  | { key: string; name: string }
  | Array<{ key: string; name: string }>
  | null;

type FAQItemWithCategoryRow = {
  id: string;
  question: string;
  answer: string;
  faq_categories: FAQCategoryJoin;
};

type QnAProfileJoin =
  | { name: string | null }
  | Array<{ name: string | null }>
  | null;

type QnAListRow = {
  id: string;
  author_profile_id: string;
  title: string;
  is_secret: boolean;
  is_anonymous: boolean;
  anonymous_nickname: string | null;
  status: string;
  created_at: string;
  profiles: QnAProfileJoin;
};

function pickSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function toQnAStatusKey(value: string): QnAStatusKey {
  return value === "answered" ? "answered" : "pending";
}

export function mapFAQItemViewModel(
  row: FAQItemWithCategoryRow,
): FAQItemViewModel {
  const category = pickSingle(row.faq_categories);

  return {
    id: row.id,
    categoryKey: category?.key ?? "",
    categoryName: category?.name ?? "",
    question: row.question,
    answer: row.answer,
  };
}

export function mapQnAListItemViewModel(
  row: QnAListRow,
  options?: {
    viewerId?: string | null;
    isAdmin?: boolean;
  },
): QnAListItemViewModel {
  const profile = pickSingle(row.profiles);
  const authorName = profile?.name ?? "알 수 없음";
  const statusKey = toQnAStatusKey(row.status);
  const canViewSecretTitle =
    !row.is_secret ||
    row.author_profile_id === options?.viewerId ||
    options?.isAdmin === true;

  return {
    id: row.id,
    title: canViewSecretTitle ? row.title : "비밀글입니다",
    displayAuthor: row.is_anonymous
      ? row.anonymous_nickname || "익명"
      : authorName,
    isSecret: row.is_secret,
    statusKey,
    statusLabel: QNA_STATUS[statusKey],
    createdAt: row.created_at,
    formattedDate: formatSupportDate(row.created_at),
  };
}
