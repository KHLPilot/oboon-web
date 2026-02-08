/**
 * 비밀번호 해싱 및 검증 유틸리티
 * 서버 사이드에서만 사용 (bcryptjs)
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * 비밀번호를 bcrypt로 해싱
 * @param password 평문 비밀번호
 * @returns 해시된 비밀번호
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 비밀번호 검증
 * @param password 평문 비밀번호
 * @param hash 저장된 해시
 * @returns 일치 여부
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
