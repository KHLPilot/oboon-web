"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
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
  CommunityUserRole,
} from "../../domain/community";
import { createCommunityPost, repostCommunityPost } from "../../services/community.posts";
import {
  canWriteVisitedCommunityPost,
  getCommunityPropertyOptions,
  getVisitedCommunityPropertyOptions,
} from "../../services/community.meta";

type WriteTypeKey = CommunityPostStatus | "property_qna";

const WRITE_TYPE_OPTIONS: Array<{
  key: WriteTypeKey;
  label: string;
}> = [
  { key: "thinking", label: "지금 고민 올리기" },
  { key: "visited", label: "다녀온 현장 남기기" },
  { key: "property_qna", label: "현장 Q&A 질문하기" },
  { key: "agent_only", label: "상담사 전용 기록 남기기" },
];

export default function CommunityWriteModal({
  open,
  onClose,
  isLoggedIn = false,
  userRole = null,
  repostOf = null,
}: {
  open: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  userRole?: CommunityUserRole | null;
  repostOf?: { id: string; title: string; body: string; authorName: string } | null;
}) {
  const [writeType, setWriteType] = useState<WriteTypeKey>("thinking");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<
    CommunityPropertyOption[]
  >([]);
  const [visitedPropertyOptions, setVisitedPropertyOptions] = useState<
    CommunityPropertyOption[]
  >([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<CommunityPropertyOption | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousNickname, setAnonymousNickname] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingVisitedEligibility, setLoadingVisitedEligibility] =
    useState(false);
  const [canWriteVisited, setCanWriteVisited] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const writeTypeOptions = useMemo(
    () =>
      WRITE_TYPE_OPTIONS.filter(
        (option) => option.key !== "agent_only" || userRole === "agent",
      ),
    [userRole],
  );

  const isPropertyQnaMode = writeType === "property_qna";

  useEffect(() => {
    const hasCurrentType = writeTypeOptions.some((option) => option.key === writeType);
    if (!hasCurrentType) {
      setWriteType("thinking");
    }
  }, [writeType, writeTypeOptions]);

  const selectedVisitedDateLabel = useMemo(() => {
    if (writeType !== "visited" || !selectedProperty?.visitedOn) return null;
    const date = new Date(`${selectedProperty.visitedOn}T00:00:00`);
    if (Number.isNaN(date.getTime())) return selectedProperty.visitedOn;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }, [writeType, selectedProperty]);

  const availablePropertyOptions = useMemo(
    () => (writeType === "visited" ? visitedPropertyOptions : propertyOptions),
    [propertyOptions, visitedPropertyOptions, writeType],
  );


  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim();
    if (!query) return availablePropertyOptions;
    const lowered = query.toLowerCase();
    return availablePropertyOptions.filter((option) =>
      option.name.toLowerCase().includes(lowered),
    );
  }, [availablePropertyOptions, propertySearch]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let isMounted = true;
    setLoadingProperties(true);
    setLoadingVisitedEligibility(true);

    Promise.all([
      getCommunityPropertyOptions(),
      getVisitedCommunityPropertyOptions(),
      canWriteVisitedCommunityPost(),
    ])
      .then(([options, visitedOptions, canWriteVisitedPost]) => {
        if (!isMounted) return;
        setPropertyOptions(options);
        setVisitedPropertyOptions(visitedOptions);
        setCanWriteVisited(canWriteVisitedPost);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingProperties(false);
        setLoadingVisitedEligibility(false);
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
    setIsAnonymous(false);
    setAnonymousNickname("");
    setCanWriteVisited(true);
    setShowSuggestions(false);
  }, [open]);

  useEffect(() => {
    if (writeType !== "visited" || !selectedProperty) return;
    const canKeepSelected = visitedPropertyOptions.some(
      (option) => option.id === selectedProperty.id,
    );
    if (!canKeepSelected) {
      setSelectedProperty(null);
      setPropertySearch("");
      setShowSuggestions(false);
    }
  }, [writeType, selectedProperty, visitedPropertyOptions]);

  const shouldBlockVisitedWrite =
    writeType === "visited" &&
    !loadingVisitedEligibility &&
    !canWriteVisited;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 리포스트 모드
    if (repostOf) {
      setIsSubmitting(true);
      try {
        const result = await repostCommunityPost(repostOf.id, body.trim() || undefined);
        if (!result.ok) {
          showAlert(result.message);
          return;
        }
        showAlert("리포스트가 등록되었습니다.");
        onClose();
      } catch (error) {
        console.error("repost submit error:", error);
        showAlert("리포스트 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!title.trim()) {
      showAlert("제목을 입력해주세요.");
      return;
    }
    if (!body.trim()) {
      showAlert("내용을 입력해주세요.");
      return;
    }
    if ((writeType === "visited" || isPropertyQnaMode) && !selectedProperty) {
      showAlert("현장을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const actualStatus: CommunityPostStatus =
        writeType === "property_qna" ? "thinking" : writeType;
      const result = await createCommunityPost({
        status: actualStatus,
        title: title.trim(),
        body: body.trim(),
        propertyId: selectedProperty?.id ?? null,
        visitedOn:
          writeType === "visited" ? (selectedProperty?.visitedOn ?? null) : null,
        isAnonymous,
        anonymousNickname: isAnonymous ? anonymousNickname : null,
        isPropertyQna: isPropertyQnaMode,
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
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              {repostOf ? "리포스트" : "기록 남기기"}
            </div>
            {!isLoggedIn ? (
              <div className="mt-2 ob-typo-body text-(--oboon-text-muted)">
                {repostOf ? "리포스트는 로그인 후에 할 수 있어요" : "기록은 로그인 후에 남길 수 있어요"}
              </div>
            ) : null}
          </div>
        </div>

        {/* 리포스트 모드 */}
        {repostOf && isLoggedIn ? (
          <div className="space-y-4">
            {/* 원본 글 인용 */}
            <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 space-y-1">
              <div className="ob-typo-caption text-(--oboon-text-muted)">
                {repostOf.authorName}님의 글
              </div>
              <p className="ob-typo-body2 text-(--oboon-text-title) font-medium line-clamp-2">
                {repostOf.title}
              </p>
              {repostOf.body ? (
                <p className="ob-typo-caption text-(--oboon-text-body) line-clamp-2">
                  {repostOf.body}
                </p>
              ) : null}
            </div>

            <Textarea
              className="min-h-24 resize-none"
              placeholder="한마디 추가하기 (선택)"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />

            <Button
              variant="primary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              리포스트하기
            </Button>
          </div>
        ) : !isLoggedIn ? (
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
              onClick={() => {}}
            >
              로그인하고 기록 남기기
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 타입 선택: 세그먼트 버튼 */}
            <div className="flex flex-wrap gap-2">
              {writeTypeOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={writeType === option.key ? "primary" : "secondary"}
                  size="sm"
                  shape="pill"
                  onClick={() => setWriteType(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {shouldBlockVisitedWrite ? (
              <Card className="p-4 border-(--oboon-danger-border) bg-(--oboon-danger-bg)">
                <p className="ob-typo-body text-(--oboon-danger)">
                  방문 기록이 있는 사용자만
                  &nbsp;&apos;다녀온 현장 남기기&apos;를 작성할 수 있어요.
                </p>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(event) => setIsAnonymous(event.target.checked)}
                      className="h-4 w-4 rounded border-(--oboon-border-default)"
                    />
                    <span className="ob-typo-body text-(--oboon-text-title)">
                      익명으로 작성
                    </span>
                  </label>

                  {isAnonymous ? (
                    <div>
                      <Input
                        className="ob-typo-body"
                        value={anonymousNickname}
                        onChange={(event) =>
                          setAnonymousNickname(event.target.value)
                        }
                        placeholder="표시할 닉네임 (선택)"
                        maxLength={20}
                      />
                    </div>
                  ) : null}
                </div>

                {isPropertyQnaMode ? (
                  <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-2.5 ob-typo-caption text-(--oboon-text-muted)">
                    현장 Q&A에 올린 질문은 공개 피드에 노출되며 상담사가 댓글로 답변합니다.
                  </div>
                ) : null}

                <Input
                  className="ob-typo-body"
                  placeholder={
                    writeType === "agent_only"
                      ? "상담사 전용으로 공유할 핵심 포인트를 적어주세요"
                      : isPropertyQnaMode
                      ? "현장에 대해 궁금한 점을 질문으로 적어주세요"
                      : writeType === "thinking"
                      ? "가장 헷갈리는 한 가지를 질문으로 적어주세요"
                      : "다녀와서 가장 먼저 든 생각을 한 문장으로 적어주세요"
                  }
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />

                <Textarea
                  className="min-h-30 resize-none"
                  placeholder={
                    writeType === "agent_only"
                      ? "상담사끼리 공유할 실무 메모나 이슈를 자유롭게 작성해주세요"
                      : isPropertyQnaMode
                      ? "질문 배경이나 구체적인 상황을 적어주세요"
                      : writeType === "thinking"
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
                  {writeType === "visited" ? (
                    <div className="flex-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 ob-typo-body text-(--oboon-text-title)"
                          >
                            <span className="truncate">
                              {selectedProperty?.name ?? "현장 선택하기"}
                            </span>
                            <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" matchTriggerWidth>
                          {loadingProperties ? (
                            <div className="px-3 py-2 ob-typo-caption text-(--oboon-text-muted)">
                              현장 목록을 불러오는 중...
                            </div>
                          ) : availablePropertyOptions.length === 0 ? (
                            <div className="px-3 py-2 ob-typo-caption text-(--oboon-text-muted)">
                              선택 가능한 현장이 없습니다.
                            </div>
                          ) : (
                            availablePropertyOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.id}
                                onClick={() => setSelectedProperty(option)}
                              >
                                {option.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
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
                              {!loadingProperties &&
                                filteredProperties.length > 0 && (
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
                                        <span className="truncate">
                                          {option.name}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)/80"
                        onClick={() => {
                          setShowSuggestions(propertySearch.trim().length > 0);
                        }}
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {writeType === "visited" ? (
                  <div className="space-y-2">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      방문일자
                    </div>
                    <div className="flex h-11 w-full items-center rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 ob-typo-body text-(--oboon-text-title)">
                      {selectedVisitedDateLabel ??
                        "현장을 선택하면 방문일자가 자동으로 표시됩니다."}
                    </div>
                  </div>
                ) : null}

                <Button
                  variant="primary"
                  size="md"
                  shape="pill"
                  className="w-full justify-center"
                  disabled={(writeType === "visited" || isPropertyQnaMode) && !selectedProperty}
                  loading={isSubmitting}
                  onClick={handleSubmit}
                >
                  {writeType === "thinking"
                    ? "고민 올리기"
                    : writeType === "visited"
                      ? "다녀온 현장 기록하기"
                      : isPropertyQnaMode
                        ? "Q&A 질문하기"
                        : "상담사 전용 기록하기"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
