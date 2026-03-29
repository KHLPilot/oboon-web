import "server-only";
import { timingSafeEqual } from "crypto";

const encoder = new TextEncoder();

function toPaddedBytes(value: string, length: number): Uint8Array {
  const source = encoder.encode(value);
  const target = new Uint8Array(length);
  target.set(source.subarray(0, length));
  return target;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length, 1);
  const aBuffer = toPaddedBytes(a, maxLength);
  const bBuffer = toPaddedBytes(b, maxLength);

  return (
    timingSafeEqual(aBuffer, bBuffer) &&
    aBytes.length === bBytes.length
  );
}

export function verifyBearerToken(
  authHeader: string | null,
  secret: string | null | undefined,
): boolean {
  if (!secret) {
    return false;
  }

  // Pad both inputs to the same length before comparing to avoid early exits.
  return constantTimeEqual(authHeader ?? "", `Bearer ${secret}`);
}
