// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __oboonSupabaseBrowserClient: SupabaseClient | undefined;
}

const runWithoutBrowserLock = async <T>(
  _name: string,
  _timeout: number,
  fn: () => Promise<T>,
) => fn();

export function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("aborted"))
  );
}

export function createSupabaseClient() {
  if (globalThis.__oboonSupabaseBrowserClient) {
    return globalThis.__oboonSupabaseBrowserClient;
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Avoid browser LockManager contention/timeout in multi-mount situations.
        lock: runWithoutBrowserLock,
      },
    },
  );

  globalThis.__oboonSupabaseBrowserClient = client;
  return client;
}
