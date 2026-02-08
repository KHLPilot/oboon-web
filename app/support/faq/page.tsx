import { redirect } from "next/navigation";

// /support/faq는 /support로 리다이렉트
export default function FAQRedirectPage() {
  redirect("/support");
}
