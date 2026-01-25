"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import OboonDatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { showAlert } from "@/shared/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import type {
  CommunityPostStatus,
  CommunityPropertyOption,
} from "../../domain/community";
import { createCommunityPost } from "../../services/community.posts";
import { getCommunityPropertyOptions } from "../../services/community.meta";

const WRITE_TYPE_OPTIONS: Array<{
  key: CommunityPostStatus;
  label: string;
}> = [
  { key: "thinking", label: "지금 고민 올리기" },
  { key: "visited", label: "다녀온 현장 남기기" },
];

export default function CommunityWriteModal({
  open,
  onClose,
  isLoggedIn = false,
}: {
  open: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
}) {
  const [writeType, setWriteType] = useState<CommunityPostStatus>("thinking");
  const [consulted, setConsulted] = useState<null | "yes" | "no">(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<
    CommunityPropertyOption[]
  >([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<CommunityPropertyOption | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const currentLabel = useMemo(
    () => WRITE_TYPE_OPTIONS.find((opt) => opt.key === writeType)?.label ?? "",
    [writeType],
  );

  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim();
    if (!query) return propertyOptions;
    const lowered = query.toLowerCase();
    return propertyOptions.filter((option) =>
      option.name.toLowerCase().includes(lowered),
    );
  }, [propertyOptions, propertySearch]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let isMounted = true;
    setLoadingProperties(true);

    getCommunityPropertyOptions()
      .then((options) => {
        if (!isMounted) return;
        setPropertyOptions(options);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingProperties(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, isLoggedIn]);

  useEffect(() => {
    if (!open) return;
    setPropertySearch("");
    setSelectedProperty(null);
    setTitle("");
    setBody("");
    setVisitDate(null);
    setConsulted(null);
    setShowSuggestions(false);
  }, [open]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!title.trim()) {
      showAlert("제목을 입력해주세요.");
      return;
    }
    if (!body.trim()) {
      showAlert("내용을 입력해주세요.");
      return;
    }
    if (writeType === "visited" && !selectedProperty) {
      showAlert("현장을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCommunityPost({
        status: writeType,
        title: title.trim(),
        body: body.trim(),
        propertyId: selectedProperty?.id ?? null,
        visitedOn: visitDate ? visitDate.toISOString().slice(0, 10) : null,
        hasConsulted: consulted === null ? null : consulted === "yes",
      });

      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      showAlert("기록이 등록되었습니다.");
      onClose();
    } catch (error) {
      console.error("community submit error:", error);
      showAlert("기록 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ob-typo-h2 text-(--oboon-text-title)">기록 남기기</div>
            {!isLoggedIn ? (
              <div className="mt-2 ob-typo-body text-(--oboon-text-muted)">
                기록은 로그인 후에 남길 수 있어요
              </div>
            ) : null}
          </div>
        </div>

        {!isLoggedIn ? (
          <Card className="p-4">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              한 번 남긴 기록은 나중에 다시 볼 수 있고, 비슷한 고민을 가진
              분들에게도 도움이 됩니다.
            </p>
            <Button
              variant="primary"
              size="md"
              shape="pill"
              className="mt-4 w-full justify-center"
              onClick={() => console.log("community:login")}
            >
              로그인하고 기록 남기기
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 ob-typo-body text-(--oboon-text-title)"
                >
                  <span>{currentLabel}</span>
                  <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(520px,90vw)]">
                {WRITE_TYPE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => setWriteType(option.key)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              className="ob-typo-body"
              placeholder={
                writeType === "thinking"
                  ? "가장 헷갈리는 한 가지를 질문으로 적어주세요"
                  : "다녀와서 가장 먼저 든 생각을 한 문장으로 적어주세요"
              }
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />

            <textarea
              className="w-full min-h-30 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 ob-typo-body text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/20"
              placeholder={
                writeType === "thinking"
                  ? "왜 고민되는지 배경을 조금만 적어주세요"
                  : "어떤 점이 고민되었는지 자유롭게 적어주세요\n괜찮았던 점과 아쉬운 점을 함께 써도 괜찮아요"
              }
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />

            <div className="space-y-2">
              <div className="ob-typo-body text-(--oboon-text-title)">
                {writeType === "thinking" ? "관련 현장 선택" : "현장 선택 *"}
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Input
                      className="ob-typo-body"
                      placeholder="현장 선택하기"
                      value={propertySearch}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setPropertySearch(nextValue);
                        if (selectedProperty) {
                          setSelectedProperty(null);
                        }
                        setShowSuggestions(nextValue.trim().length > 0);
                      }}
                    />
                    {showSuggestions && propertySearch.trim().length > 0 ? (
                      <div className="absolute left-0 right-0 top-full z-10 mt-2 space-y-2 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3 shadow-(--oboon-shadow-card)">
                        {loadingProperties && (
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            현장 목록을 불러오는 중...
                          </div>
                        )}
                        {!loadingProperties &&
                          filteredProperties.length === 0 && (
                            <div className="ob-typo-caption text-(--oboon-text-muted)">
                              검색 결과가 없습니다.
                            </div>
                          )}
                        {!loadingProperties && filteredProperties.length > 0 && (
                          <div className="max-h-36 space-y-1 overflow-y-auto">
                            {filteredProperties.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ob-typo-body text-(--oboon-text-title) hover:bg-(--oboon-bg-subtle)"
                                onClick={() => {
                                  setSelectedProperty(option);
                                  setPropertySearch(option.name);
                                  setShowSuggestions(false);
                                }}
                              >
                                <span className="truncate">{option.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                {selectedProperty ? (
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)/80"
                    onClick={() => {
                      setSelectedProperty(null);
                      setPropertySearch("");
                      setShowSuggestions(false);
                    }}
                    aria-label="선택 변경"
                    title="변경"
                  >
                    변경
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)/80"
                    onClick={() => {
                      setShowSuggestions(propertySearch.trim().length > 0);
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {writeType === "visited" ? (
              <>
                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">
                    방문일자 선택
                  </div>
                  <OboonDatePicker
                    selected={visitDate}
                    onChange={(date) => setVisitDate(date)}
                    placeholder="방문일자 선택하기"
                    inputClassName="ob-typo-body w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">
                    상담을 받으셨나요?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={consulted === "yes" ? "primary" : "secondary"}
                      size="sm"
                      shape="pill"
                      onClick={() => setConsulted("yes")}
                    >
                      상담을 받았어요
                    </Button>
                    <Button
                      variant={consulted === "no" ? "primary" : "secondary"}
                      size="sm"
                      shape="pill"
                      onClick={() => setConsulted("no")}
                    >
                      방문만 했어요
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            <Button
              variant="primary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              disabled={writeType === "visited" && !selectedProperty}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              {writeType === "thinking" ? "고민 올리기" : "다녀온 현장 기록하기"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
