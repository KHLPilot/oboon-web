// lib/validators/profileValidation.ts

import { bannedWords, bannedSubstrings, bannedExactWords } from "./banndedWords";

export interface ProfileValidationResult {
    isValid: boolean;
    errors: {
        name?: string;
        nickname?: string;
        phone?: string;
        password?: string;
    };
}

/**
 * 이름 검증
 */
export function validateName(name: string): string | null {
    // 1. 필수 입력
    if (!name || name.trim() === "") {
        return "이름을 입력해주세요.";
    }

    // 2. 길이 체크 (2~20자)
    if (name.length < 2 || name.length > 20) {
        return "이름은 2~20자 사이로 입력해주세요.";
    }

    // 3. 특수문자 금지 (한글, 영문, 공백만 허용)
    const nameRegex = /^[가-힣a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
        return "이름은 한글, 영문, 공백만 사용 가능합니다.";
    }

    // 4. SQL Injection 방지 키워드 체크
    const dangerousKeywords = [
        "null", "undefined", "drop", "delete", "insert",
        "update", "select", "exec", "script", "--", "/*", "*/"
    ];
    const lowerName = name.toLowerCase();
    for (const keyword of dangerousKeywords) {
        if (lowerName.includes(keyword)) {
            return "사용할 수 없는 문자가 포함되어 있습니다.";
        }
    }

    return null; // 검증 통과
}

/**
 * 닉네임 검증 (금지어 체크 강화)
 */
export function validateNickname(nickname: string): string | null {
    // 1. 선택 입력 (비어있어도 OK)
    if (!nickname || nickname.trim() === "") {
        return null;
    }

    // 2. 길이 체크 (2~15자)
    if (nickname.length < 2 || nickname.length > 15) {
        return "닉네임은 2~15자 사이로 입력해주세요.";
    }

    // 3. 한글, 영문, 숫자, 언더스코어만 허용
    const nicknameRegex = /^[가-힣a-zA-Z0-9_]+$/;
    if (!nicknameRegex.test(nickname)) {
        return "닉네임은 한글, 영문, 숫자, _만 사용 가능합니다.";
    }

    // 4. SQL Injection 방지
    const dangerousKeywords = [
        "null", "undefined", "drop", "delete", "insert",
        "update", "select", "exec", "script", "--", "/*", "*/"
    ];
    const lowerNickname = nickname.toLowerCase();
    for (const keyword of dangerousKeywords) {
        if (lowerNickname.includes(keyword)) {
            return "사용할 수 없는 문자가 포함되어 있습니다.";
        }
    }

    // 5. ✅ 정확히 일치하는 금지어 체크 (대소문자 무시)
    for (const word of bannedExactWords) {
        if (lowerNickname === word.toLowerCase()) {
            return "사용할 수 없는 닉네임입니다.";
        }
    }

    // 6. ✅ 부분 매칭 금지어 체크 (포함 여부)
    for (const word of bannedSubstrings) {
        if (lowerNickname.includes(word.toLowerCase())) {
            return "사용할 수 없는 닉네임입니다.";
        }
    }

    // 7. ✅ 일반 금지어 체크 (기본)
    for (const word of bannedWords) {
        if (lowerNickname.includes(word.toLowerCase())) {
            return "사용할 수 없는 닉네임입니다.";
        }
    }

    return null; // 검증 통과
}

/**
 * 휴대폰 번호 검증
 */
export function validatePhone(phone: string): string | null {
    // 1. 필수 입력
    if (!phone || phone.trim() === "") {
        return "휴대폰 번호를 입력해주세요.";
    }

    // 2. 하이픈 제거
    const cleanPhone = phone.replace(/-/g, "");

    // 3. 숫자만 허용
    if (!/^\d+$/.test(cleanPhone)) {
        return "휴대폰 번호는 숫자만 입력 가능합니다.";
    }

    // 4. 길이 체크 (10~11자)
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return "올바른 휴대폰 번호를 입력해주세요.";
    }

    // 5. 한국 휴대폰 형식 (010, 011, 016, 017, 018, 019)
    if (!cleanPhone.startsWith("01")) {
        return "010, 011 등으로 시작하는 번호를 입력해주세요.";
    }

    return null; // 검증 통과
}

/**
 * 비밀번호 검증 (회원가입용)
 */
export function validatePassword(password: string): string | null {
    // 1. 필수 입력
    if (!password || password.trim() === "") {
        return "비밀번호를 입력해주세요.";
    }

    // 2. 길이 체크 (8~20자)
    if (password.length < 8 || password.length > 20) {
        return "비밀번호는 8~20자 사이로 입력해주세요.";
    }

    // 3. 영문 대문자 포함
    if (!/[A-Z]/.test(password)) {
        return "비밀번호에 영문 대문자를 포함해주세요.";
    }

    // 4. 영문 소문자 포함
    if (!/[a-z]/.test(password)) {
        return "비밀번호에 영문 소문자를 포함해주세요.";
    }

    // 5. 숫자 포함
    if (!/\d/.test(password)) {
        return "비밀번호에 숫자를 포함해주세요.";
    }

    // 6. 특수문자 포함
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return "비밀번호에 특수문자를 포함해주세요.";
    }

    // 7. 공백 금지
    if (/\s/.test(password)) {
        return "비밀번호에 공백을 사용할 수 없습니다.";
    }

    return null; // 검증 통과
}

/**
 * 전체 프로필 검증
 */
export function validateProfile(data: {
    name: string;
    nickname?: string;
    phone: string;
}): ProfileValidationResult {
    const errors: ProfileValidationResult["errors"] = {};

    const nameError = validateName(data.name);
    if (nameError) errors.name = nameError;

    if (data.nickname) {
        const nicknameError = validateNickname(data.nickname);
        if (nicknameError) errors.nickname = nicknameError;
    }

    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * 실시간 입력 제한 (허용된 문자만)
 * 한글 조합 중에는 제한하지 않음 (IME 입력 고려)
 */
export function sanitizeInput(value: string, type: "name" | "nickname" | "phone"): string {
    switch (type) {
        case "name":
            // 한글(완성형+조합중), 영문, 공백만
            // \u1100-\u11FF: 한글 자음
            // \u3130-\u318F: 한글 호환 자모
            // \uAC00-\uD7AF: 한글 완성형
            return value.replace(/[^\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AFa-zA-Z\s]/g, "");

        case "nickname":
            // 한글(완성형+조합중), 영문, 숫자, 언더스코어만
            return value.replace(/[^\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AFa-zA-Z0-9_]/g, "");

        case "phone":
            // 숫자, 하이픈만
            return value.replace(/[^0-9-]/g, "");

        default:
            return value;
    }
}