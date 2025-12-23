export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Top grid */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="text-sm font-semibold tracking-tight text-(--oboon-text-default)">
              OBOON
            </div>
            <p className="max-w-xs text-xs leading-5 text-(--oboon-text-muted)">
              투명한 분양 시장의 시작.
              <br />
              데이터 기반의 의사결정을 돕습니다.
            </p>
          </div>

          {/* Service */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-(--oboon-text-default)">
              서비스
            </div>
            <ul className="space-y-2 text-xs text-(--oboon-text-muted)">
              <li>
                <a
                  href="/offerings"
                  className="hover:text-(--oboon-text-default)"
                >
                  분양 리스트
                </a>
              </li>
              <li>
                <a href="/map" className="hover:text-(--oboon-text-default)">
                  지도 검색
                </a>
              </li>
              <li>
                <a
                  href="/briefing"
                  className="hover:text-(--oboon-text-default)"
                >
                  브리핑
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-(--oboon-text-default)">
              회사
            </div>
            <ul className="space-y-2 text-xs text-(--oboon-text-muted)">
              <li>
                <a href="/about" className="hover:text-(--oboon-text-default)">
                  소개
                </a>
              </li>
              <li>
                <a
                  href="/careers"
                  className="hover:text-(--oboon-text-default)"
                >
                  채용
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="hover:text-(--oboon-text-default)"
                >
                  제휴 문의
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-(--oboon-text-default)">
              고객지원
            </div>
            <ul className="space-y-2 text-xs text-(--oboon-text-muted)">
              <li>
                <a href="/notice" className="hover:text-(--oboon-text-default)">
                  공지사항
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-(--oboon-text-default)">
                  자주 묻는 질문
                </a>
              </li>
              <li>
                <a
                  href="/inquiry"
                  className="hover:text-(--oboon-text-default)"
                >
                  1:1 문의
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-(--oboon-border-default)" />

        {/* Bottom */}
        <div className="pt-6 text-center text-[11px] leading-5 text-(--oboon-text-muted)">
          © {year} OBOON Inc. All rights reserved. Generated based on OBOON
          Guidelines v1.0.
        </div>
      </div>
    </footer>
  );
}
