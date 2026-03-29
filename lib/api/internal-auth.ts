import "server-only";
import { timingSafeEqual } from "crypto";

function toPaddedBuffer(value: string, length: number): Buffer {
  const source = Buffer.from(value);
  const target = Buffer.alloc(length);
  source.copy(target);
  return target;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(
    Buffer.byteLength(a),
    Buffer.byteLength(b),
    1,
  );

  const aBuffer = toPaddedBuffer(a, maxLength);
  const bBuffer = toPaddedBuffer(b, maxLength);

  return (
    timingSafeEqual(aBuffer, bBuffer) &&
    Buffer.byteLength(a) === Buffer.byteLength(b)
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
