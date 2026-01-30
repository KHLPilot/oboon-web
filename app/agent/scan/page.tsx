import { Suspense } from "react";
import AgentScanClient from "./AgentScanClient";

export default function AgentScanPage() {
  return (
    <Suspense fallback={null}>
      <AgentScanClient />
    </Suspense>
  );
}
