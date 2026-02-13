"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

type Term = {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  is_required: boolean;
  display_order: number;
};

type TermsConsentModalProps = {
  open: boolean;
  onClose: () => void;
  onConsent: () => void;
  missingTermTypes: string[];
};

export default function TermsConsentModal({
  open,
  onClose,
  onConsent,
  missingTermTypes,
}: TermsConsentModalProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 각 약관 동의 상태
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});

  // 약관 전문 보기 모달
  const [termDetailModal, setTermDetailModal] = useState<{
    open: boolean;
    title: string;
    content: string;
  }>({ open: false, title: "", content: "" });

  // 약관 목록 조회
  useEffect(() => {
    if (!open || missingTermTypes.length === 0) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/terms");
        const data = await res.json();
        if (res.ok && data.terms) {
          // 미동의 약관만 필터링하고 display_order로 정렬
          const filteredTerms = data.terms
            .filter((t: Term) => missingTermTypes.includes(t.type))
            .sort((a: Term, b: Term) => a.display_order - b.display_order);
          setTerms(filteredTerms);

          // 동의 상태 초기화
          const initialAgreements: Record<string, boolean> = {};
          filteredTerms.forEach((t: Term) => {
            initialAgreements[t.type] = false;
          });
          setAgreements(initialAgreements);
        }
      } catch (err) {
        console.error("약관 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, missingTermTypes]);

  // 전체 동의 여부
  const allAgreed = terms.length > 0 && terms.every((t) => agreements[t.type]);

  // 필수 약관 전체 동의 여부
  const requiredAgreed = terms
    .filter((t) => t.is_required)
    .every((t) => agreements[t.type]);

  const handleToggle = (type: string) => {
    setAgreements((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleToggleAll = () => {
    const next = !allAgreed;
    const newAgreements: Record<string, boolean> = {};
    terms.forEach((t) => {
      newAgreements[t.type] = next;
    });
    setAgreements(newAgreements);
  };

  const openTermDetail = (term: Term) => {
    setTermDetailModal({
      open: true,
      title: term.title,
      content: term.content,
    });
  };

  const handleSubmit = async () => {
    if (!requiredAgreed) return;

    setSubmitting(true);
    try {
      // 동의한 약관만 전송
      const agreedTypes = Object.entries(agreements)
        .filter(([, agreed]) => agreed)
        .map(([type]) => type);

      const res = await fetch("/api/term-consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termTypes: agreedTypes,
          context: "signup",
        }),
      });

      if (res.ok) {
        onConsent();
        onClose();
      }
    } catch (err) {
      console.error("약관 동의 저장 오류:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getTermLabel = (type: string): string => {
    const labels: Record<string, string> = {
      signup_age_check: "만 14세 이상입니다",
      signup_terms: "서비스 이용약관",
      signup_privacy: "개인정보 수집 및 이용 동의",
      signup_privacy_third_party: "개인정보 제3자 제공 동의",
      signup_location: "위치정보 이용약관",
      signup_marketing: "마케팅 수신 동의",
    };
    return labels[type] || type;
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => {}}
        showCloseIcon={false}
      >
        <div className="space-y-4">
          <h2 className="ob-typo-h3 text-(--oboon-text-title)">약관 동의</h2>
          <p className="ob-typo-body text-(--oboon-text-body)">
            서비스 이용을 위해 아래 약관에 동의해 주세요.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-(--oboon-primary)" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* 전체 동의 */}
              <label className="flex items-center gap-3 p-3 rounded-lg bg-(--oboon-bg-subtle) cursor-pointer">
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={handleToggleAll}
                  className="h-5 w-5 accent-(--oboon-primary)"
                />
                <span className="ob-typo-body-bold text-(--oboon-text-title)">
                  전체 동의
                </span>
              </label>

              <div className="border-t border-(--oboon-border-default) my-2" />

              {/* 개별 약관 */}
              {terms.map((term) => (
                <div
                  key={term.id}
                  className="flex items-center justify-between py-2"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={agreements[term.type] || false}
                      onChange={() => handleToggle(term.type)}
                      className="h-4 w-4 accent-(--oboon-primary)"
                    />
                    <span className="ob-typo-body text-(--oboon-text-body)">
                      {getTermLabel(term.type)}
                      {term.is_required ? (
                        <span className="text-(--oboon-error) ml-1">(필수)</span>
                      ) : (
                        <span className="text-(--oboon-text-muted) ml-1">(선택)</span>
                      )}
                    </span>
                  </label>
                  {/* 만14세 약관은 전문 보기 버튼 없음 */}
                  {term.type !== "signup_age_check" && (
                    <button
                      type="button"
                      onClick={() => openTermDetail(term)}
                      className="ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary) underline"
                    >
                      보기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              className="flex-1"
              disabled={!requiredAgreed || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "동의하고 계속하기"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 약관 전문 모달 */}
      <Modal
        open={termDetailModal.open}
        onClose={() => setTermDetailModal({ open: false, title: "", content: "" })}
      >
        <h2 className="ob-typo-h3 text-(--oboon-text-title) mb-4">{termDetailModal.title}</h2>
        <div className="max-h-[60vh] overflow-y-auto">
          <div
            className="ob-typo-body text-(--oboon-text-body) whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: termDetailModal.content }}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button
            variant="secondary"
            onClick={() => setTermDetailModal({ open: false, title: "", content: "" })}
          >
            닫기
          </Button>
        </div>
      </Modal>
    </>
  );
}
