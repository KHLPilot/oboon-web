"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/types/index";

export default function Footer() {
  const pathname = usePathname();

  // auth, chat 페이지에서는 푸터 숨김
  if (pathname?.startsWith("/auth/")) return null;
  if (pathname?.startsWith("/chat")) return null;

  const hideOnMobile = pathname?.startsWith("/recommendations/conditions/step/");

  const year = new Date().getFullYear();

  return (
    <footer
      className={[
        "lg:mt-10 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        hideOnMobile ? "hidden sm:block" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-240 lg:max-w-300 px-4 sm:px-5 lg:px-8 py-8 sm:py-8">
        {/* Top grid */}
        <div className="space-y-6 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
          {/* Brand */}
          <div className="space-y-3">
            <div className="ob-typo-h2 tracking-tight text-(--oboon-text-default)">
              OBOON
            </div>
            <p className="max-w-xs ob-typo-caption leading-6 text-(--oboon-text-muted)">
              투명한 분양 시장의 시작.
              <br />
              데이터기반의 의사결정을 돕습니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:contents">
            {/* Service */}
            <div className="space-y-3">
              <div className="ob-typo-h4 font-semibold text-(--oboon-text-title)">
                서비스
              </div>
              <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
                <li>
                  <Link
                    href={ROUTES.recommendations}
                    className="hover:text-(--oboon-text-default)"
                  >
                    맞춤현장
                  </Link>
                </li>
                <li>
                  <Link
                    href={ROUTES.offerings.list}
                    className="hover:text-(--oboon-text-default)"
                  >
                    분양 리스트
                  </Link>
                </li>
                <li>
                  <Link
                    href={ROUTES.offerings.compare}
                    className="hover:text-(--oboon-text-default)"
                  >
                    비교하기
                  </Link>
                </li>
                <li>
                  <Link
                    href="/community"
                    className="hover:text-(--oboon-text-default)"
                  >
                    커뮤니티
                  </Link>
                </li>
                <li>
                  <Link
                    href="/briefing"
                    className="hover:text-(--oboon-text-default)"
                  >
                    브리핑
                  </Link>
                </li>
              </ul>
            </div>

          {/* Company
          <div className="space-y-3">
            <div className="ob-typo-h4 font-semibold text-(--oboon-text-title)">
              회사
            </div>
            <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
              <li>
                <span className="cursor-not-allowed opacity-60">
                  소개
                </span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">
                  채용
                </span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">
                  제휴 문의
                </span>
              </li>
            </ul>
          </div>
          */}

            {/* Support */}
            <div className="space-y-3">
              <div className="ob-typo-h4 font-semibold text-(--oboon-text-title)">
                고객센터
              </div>
              <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
                <li>
                  <Link href="/notice" className="hover:text-(--oboon-text-default)">
                    공지사항
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-(--oboon-text-default)">
                    자주 묻는 질문
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support/qna"
                    className="hover:text-(--oboon-text-default)"
                  >
                    1:1 문의
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-(--oboon-border-default)" />

        {/* Bottom */}
        <div className="pt-6 text-center ob-typo-caption leading-5 text-(--oboon-text-muted)">
          <span suppressHydrationWarning>
            © {year} OBOON Inc. All rights reserved. Generated based on OBOON
            Guidelines v1.0.
          </span>
        </div>
      </div>
    </footer>
  );
}
