import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createHash, randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BANK_ACCOUNT_ENCRYPTION_KEY = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

if (!BANK_ACCOUNT_ENCRYPTION_KEY) {
  throw new Error("Missing BANK_ACCOUNT_ENCRYPTION_KEY");
}

const PREFIX = "oboon-bank:v1:";
const IV_LENGTH_BYTES = 12;
const KEY = createHash("sha256").update(BANK_ACCOUNT_ENCRYPTION_KEY).digest();

function normalizeValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEncryptedValue(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encryptValue(value) {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${[
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")}`;
}

function normalizeRecord(record) {
  const bankName = normalizeValue(record.bank_name);
  const bankAccountNumber = normalizeValue(record.bank_account_number);
  const bankAccountHolder = normalizeValue(record.bank_account_holder);

  return {
    data: {
      bank_name: bankName && !isEncryptedValue(bankName) ? encryptValue(bankName) : bankName,
      bank_account_number:
        bankAccountNumber && !isEncryptedValue(bankAccountNumber)
          ? encryptValue(bankAccountNumber)
          : bankAccountNumber,
      bank_account_holder:
        bankAccountHolder && !isEncryptedValue(bankAccountHolder)
          ? encryptValue(bankAccountHolder)
          : bankAccountHolder,
    },
    needsUpdate:
      (bankName && !isEncryptedValue(bankName)) ||
      (bankAccountNumber && !isEncryptedValue(bankAccountNumber)) ||
      (bankAccountHolder && !isEncryptedValue(bankAccountHolder)),
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const pageSize = 500;
let offset = 0;
let updatedCount = 0;

while (true) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .or("bank_name.not.is.null,bank_account_number.not.is.null,bank_account_holder.not.is.null")
    .order("id", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    break;
  }

  for (const row of data) {
    const normalized = normalizeRecord(row);
    if (!normalized.needsUpdate) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(normalized.data)
      .eq("id", row.id);

    if (updateError) {
      throw updateError;
    }

    updatedCount += 1;
  }

  if (data.length < pageSize) {
    break;
  }

  offset += pageSize;
}

console.log(`Backfilled bank encryption for ${updatedCount} profile row(s).`);
