import { Suspense } from "react";
import SignupProfileClient from "./SignupProfileClient";

export default function SignupProfilePage() {
  return (
    <Suspense fallback={null}>
      <SignupProfileClient />
    </Suspense>
  );
}
