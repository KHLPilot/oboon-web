"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // chat 페이지에서는 푸터 숨김
  if (pathname?.startsWith("/chat")) return null;

  return (
    <footer className="lg:mt-10 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div className="mx-auto max-w-240 lg:max-w-300 px-4 sm:px-5 lg:px-8 py-8 sm:py-8">
        {/* Top grid */}
        <div className="grid gap-6 md:grid-cols-4">
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

          {/* Company */}
          <div className="space-y-3">
            <div className="ob-typo-h4 font-semibold text-(--oboon-text-title)">
              회사
            </div>
            <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
              <li>
                <Link
                  href="/about"
                  className="hover:text-(--oboon-text-default)"
                >
                  소개
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="hover:text-(--oboon-text-default)"
                >
                  채용
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-(--oboon-text-default)"
                >
                  제휴 문의
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <div className="ob-typo-h4 font-semibold text-(--oboon-text-title)">
              고객지원
            </div>
            <ul className="space-y-2 ob-typo-caption text-(--oboon-text-muted)">
              <li>
                <Link
                  href="/notice"
                  className="hover:text-(--oboon-text-default)"
                >
                  공지사항
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-(--oboon-text-default)">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link
                  href="/inquiry"
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
          © {year} OBOON Inc. All rights reserved. Generated based on OBOON
          Guidelines v1.0.
        </div>
      </div>
    </footer>
  );
}
