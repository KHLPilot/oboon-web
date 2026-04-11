import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const BANK_ACCOUNT_PREFIX = "oboon-bank:v1:";
const IV_LENGTH_BYTES = 12;

export type ProfileBankAccount = {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

type BankAccountInput = Partial<ProfileBankAccount>;

function getEncryptionKey(): Buffer {
  const secret = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("BANK_ACCOUNT_ENCRYPTION_KEY is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEncryptedValue(value: string): boolean {
  return value.startsWith(BANK_ACCOUNT_PREFIX);
}

function encryptValue(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${BANK_ACCOUNT_PREFIX}${[
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")}`;
}

function decryptValue(value: string): string {
  const encoded = value.slice(BANK_ACCOUNT_PREFIX.length);
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = encoded.split(".");

  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error("Invalid encrypted bank account value");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

function readStoredValue(value: unknown): {
  value: string | null;
  encrypted: boolean;
} {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return { value: null, encrypted: true };
  }

  if (isEncryptedValue(normalized)) {
    return { value: decryptValue(normalized), encrypted: true };
  }

  return { value: normalized, encrypted: false };
}

export function normalizeProfileBankAccountInput(
  input: BankAccountInput,
): ProfileBankAccount {
  return {
    bank_name: normalizeValue(input.bank_name),
    bank_account_number: normalizeValue(input.bank_account_number),
    bank_account_holder: normalizeValue(input.bank_account_holder),
  };
}

export function encryptProfileBankAccountInput(
  input: BankAccountInput,
): ProfileBankAccount {
  const normalized = normalizeProfileBankAccountInput(input);

  return {
    bank_name: normalized.bank_name ? encryptValue(normalized.bank_name) : null,
    bank_account_number: normalized.bank_account_number
      ? encryptValue(normalized.bank_account_number)
      : null,
    bank_account_holder: normalized.bank_account_holder
      ? encryptValue(normalized.bank_account_holder)
      : null,
  };
}

export function decryptStoredProfileBankAccount(
  record: BankAccountInput,
): {
  data: ProfileBankAccount;
  needsMigration: boolean;
} {
  const bankName = readStoredValue(record.bank_name);
  const bankAccountNumber = readStoredValue(record.bank_account_number);
  const bankAccountHolder = readStoredValue(record.bank_account_holder);

  return {
    data: {
      bank_name: bankName.value,
      bank_account_number: bankAccountNumber.value,
      bank_account_holder: bankAccountHolder.value,
    },
    needsMigration:
      !bankName.encrypted || !bankAccountNumber.encrypted || !bankAccountHolder.encrypted,
  };
}

export async function normalizeStoredProfileBankAccount(
  profileId: string,
  record: BankAccountInput,
  supabase = createSupabaseAdminClient(),
): Promise<ProfileBankAccount> {
  const normalized = decryptStoredProfileBankAccount(record);

  if (normalized.needsMigration) {
    const { error } = await supabase
      .from("profiles")
      .update(encryptProfileBankAccountInput(normalized.data))
      .eq("id", profileId);

    if (error) {
      throw error;
    }
  }

  return normalized.data;
}
