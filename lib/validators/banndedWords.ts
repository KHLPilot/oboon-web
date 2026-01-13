// lib/validators/bannedWords.ts

/**
 * 닉네임 금지어 목록
 * 카테고리별로 관리하여 유지보수 용이
 */

// 1. 시스템/관리자 관련
export const systemWords = [
    "관리자",
    "admin",
    "administrator",
    "운영자",
    "매니저",
    "manager",
    "시스템",
    "system",
    "관리",
    "root",
    "superuser",
    "moderator",
    "모더레이터",
];

// 2. 서비스명 관련 (혼동 방지)
export const serviceWords = [
    "oboon",
    "공식",
    "official",
];

// 3. 욕설/비속어 (예시 - 실제로는 더 많음)
export const profanityWords = [
    // 실제 욕설은 여기 추가
    // 예: "shit", "fuck" 등
];

// 4. 사기/스팸 관련
export const spamWords = [
    "홍보",
    "광고",
    "마케팅",
    "상담원",
    "고객센터",
    "문의",
    "대출",
    "알바",
];

// 5. 정치/종교 관련 (민감한 주제)
export const sensitiveWords = [
    // 필요시 추가
    // 예: 정치인 이름, 종교 용어 등
];

// 전체 금지어 통합
export const bannedWords = [
    ...systemWords,
    ...serviceWords,
    ...profanityWords,
    ...spamWords,
    ...sensitiveWords,
];

// 부분 매칭 금지어 (포함만 해도 차단)
export const bannedSubstrings = [
    "admin",
    "관리자",
    "운영자",
];

// 정확히 일치해야 차단 (전체 매칭)
export const bannedExactWords = [
    "오분",
    "oboon",
];