"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // auth, chat 페이지에서는 푸터 숨김
  if (pathname?.startsWith("/auth/")) return null;
  if (pathname?.startsWith("/chat")) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="lg:mt-10 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div className="mx-auto max-w-240 lg:max-w-300 px-4 sm:px-5 lg:px-8 py-8 sm:py-8">
        {/* Top grid */}
        <div className="grid gap-6 md:grid-cols-3">
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

          {/* Service */}
          <div className="space-y-3">
            <div className="ob-typo-h4 text-(--oboon-text-title)">서비스</div>
            <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
              <li>
                <Link
                  href="/offerings"
                  className="hover:text-(--oboon-text-default)"
                >
                  분양 리스트
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-(--oboon-text-default)">
                  지도로 검색하기
                </Link>
              </li>
              {/* <li>
                <Link
                  href="/briefing"
                  className="hover:text-(--oboon-text-default)"
                >
                  브리핑
                </Link>
              </li> */}
              <li>
                <Link
                  href="/community"
                  className="hover:text-(--oboon-text-default)"
                >
                  커뮤니티
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
                <span className="cursor-not-allowed opacity-60">
                  공지사항
                </span>
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
