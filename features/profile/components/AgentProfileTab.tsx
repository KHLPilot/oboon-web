"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import {
  oboonFieldBaseClass,
  oboonTextareaBaseClass,
} from "@/lib/ui/formFieldStyles";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

type ProfileErrors = {
  name?: string;
  nickname?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
};

type GalleryImage = {
  id: string;
  user_id: string;
  image_url: string;
  sort_order: number;
};

const AGENT_PROFILE_GUIDE_EXAMPLES = [
  {
    id: "trust",
    label: "신뢰형",
    summary: "정확한 정보와 책임감 있는 후속 관리 중심",
    text: `서울 서북권(마포·은평·서대문) 아파트/오피스텔 분양 상담을 전문으로 하고 있습니다.
신규 분양 현장 상담 경력 7년, 청약·대출·계약 절차를 실제 사례 중심으로 정확히 안내드립니다.
고객 상황에 맞는 단지 비교표와 리스크 포인트를 먼저 정리해 드리며, 상담 후에도 일정·서류·자금 계획까지 책임 있게 관리하겠습니다.`,
  },
  {
    id: "sales",
    label: "영업형",
    summary: "속도감 있게 비교·추천하고 빠른 의사결정을 유도",
    text: `요즘 가장 문의 많은 서울 핵심 분양 단지, 빠르게 비교해 드립니다.
청약 가능성 진단부터 대출 시뮬레이션, 계약 타이밍까지 한 번에 정리해 드려 상담 시간이 짧고 명확합니다.
방문 전 체크리스트와 맞춤 추천 타입을 먼저 전달해 드리니, 처음 상담하셔도 바로 의사결정이 가능합니다.`,
  },
  {
    id: "calm",
    label: "차분형",
    summary: "초보 고객도 편하게 이해하도록 단계별 안내",
    text: `분양 상담이 처음이신 분도 이해하기 쉽도록 단계별로 차근차근 안내해 드립니다.
과한 권유 없이 고객님의 예산과 일정에 맞는 선택지를 함께 검토하고, 필요한 정보만 명확하게 정리해 드립니다.
상담 후에도 궁금한 점은 편하게 다시 문의하실 수 있도록 끝까지 도와드리겠습니다.`,
  },
  {
    id: "expert",
    label: "전문가형",
    summary: "데이터 기반 분석과 리스크 점검 중심 제안",
    text: `분양가·옵션·중도금 조건·세금 이슈까지 계약 전 의사결정에 필요한 핵심 데이터를 구조적으로 제공합니다.
청약 경쟁률 흐름, 지역 공급 일정, 타입별 수요를 기반으로 우선순위를 제안드리며, 리스크 항목도 함께 안내드립니다.
단순 소개를 넘어 고객 상황에 맞춘 실행 가능한 전략 상담을 목표로 합니다.`,
  },
] as const;

type AgentProfileTabProps = {
  active: boolean;
  name: string;
  phone: string;
  nickname: string;
  originalNickname: string;
  email: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  agentSummary: string;
  agentEtc: string;
  avatarUrl: string | null;
  isEditing: boolean;
  nicknameChecking: boolean;
  nicknameAvailable: boolean | null;
  avatarUploading: boolean;
  galleryImages: GalleryImage[];
  galleryUploading: boolean;
  galleryDeletingId: string | null;
  galleryReordering: boolean;
  draggingGalleryImageId: string | null;
  dragOverGalleryImageId: string | null;
  errors: ProfileErrors;
  fileInputRef: { current: HTMLInputElement | null };
  galleryInputRef: { current: HTMLInputElement | null };
  onNameChange: (value: string, isComposing?: boolean) => void;
  onPhoneChange: (value: string, isComposing?: boolean) => void;
  onNicknameChange: (value: string, isComposing?: boolean) => void;
  onBankNameChange: (value: string, isComposing?: boolean) => void;
  onBankAccountChange: (value: string) => void;
  onBankAccountHolderChange: (value: string, isComposing?: boolean) => void;
  onAgentSummaryChange: (value: string) => void;
  onAgentEtcChange: (value: string) => void;
  onCheckNickname: () => void;
  onAvatarSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onGallerySelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onGalleryDelete: (imageId: string) => void;
  onGalleryDragStart: (event: DragEvent<HTMLDivElement>, imageId: string) => void;
  onGalleryDragOver: (event: DragEvent<HTMLDivElement>, imageId: string) => void;
  onGalleryDrop: (event: DragEvent<HTMLDivElement>, imageId: string) => void;
  onGalleryDragEnd: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRequestDeleteAccount: () => void;
};

export default function AgentProfileTab({
  active,
  name,
  phone,
  nickname,
  originalNickname,
  email,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  agentSummary,
  agentEtc,
  avatarUrl,
  isEditing,
  nicknameChecking,
  nicknameAvailable,
  avatarUploading,
  galleryImages,
  galleryUploading,
  galleryDeletingId,
  galleryReordering,
  draggingGalleryImageId,
  dragOverGalleryImageId,
  errors,
  fileInputRef,
  galleryInputRef,
  onNameChange,
  onPhoneChange,
  onNicknameChange,
  onBankNameChange,
  onBankAccountChange,
  onBankAccountHolderChange,
  onAgentSummaryChange,
  onAgentEtcChange,
  onCheckNickname,
  onAvatarSelect,
  onGallerySelect,
  onGalleryDelete,
  onGalleryDragStart,
  onGalleryDragOver,
  onGalleryDrop,
  onGalleryDragEnd,
  onStartEdit,
  onSave,
  onCancel,
  onRequestDeleteAccount,
}: AgentProfileTabProps) {
  const [showProfileGuide, setShowProfileGuide] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [openGuideExampleIds, setOpenGuideExampleIds] = useState<string[]>(["trust"]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  const agentPreviewName = useMemo(() => {
    const trimmedName = name.trim();
    return trimmedName || "상담사";
  }, [name]);

  return (
    <>
      <section className={["space-y-6", active ? "" : "hidden"].join(" ")}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="order-2 space-y-3 lg:order-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  value={name}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onNameChange(
                      e.target.value,
                      (e.nativeEvent as InputEvent).isComposing ?? false,
                    )
                  }
                  placeholder="이름"
                  maxLength={20}
                  className={[
                    oboonFieldBaseClass,
                    errors.name ? "border-(--oboon-danger-border)" : "",
                  ].join(" ")}
                />
              </div>
              <div className="space-y-2">
                <Label>연락처</Label>
                <Input
                  value={phone}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onPhoneChange(
                      e.target.value,
                      (e.nativeEvent as InputEvent).isComposing ?? false,
                    )
                  }
                  placeholder="연락처"
                  maxLength={13}
                  className={[
                    oboonFieldBaseClass,
                    errors.phone ? "border-(--oboon-danger-border)" : "",
                  ].join(" ")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>닉네임</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={nickname}
                    disabled={!isEditing}
                    onChange={(e) =>
                      onNicknameChange(
                        e.target.value,
                        (e.nativeEvent as InputEvent).isComposing ?? false,
                      )
                    }
                    placeholder="오분이 (선택, 2-15자)"
                    maxLength={15}
                    className={[
                      "flex-1",
                      oboonFieldBaseClass,
                      errors.nickname ? "border-(--oboon-danger-border)" : "",
                    ].join(" ")}
                  />
                  {isEditing && nickname && nickname !== originalNickname ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={onCheckNickname}
                      disabled={nicknameChecking}
                    >
                      {nicknameChecking ? "확인중..." : "중복확인"}
                    </Button>
                  ) : null}
                </div>
                {errors.nickname ? (
                  <p className="ob-typo-caption mt-1 text-(--oboon-danger)">{errors.nickname}</p>
                ) : null}
                {nicknameAvailable === true && nickname !== originalNickname ? (
                  <p className="ob-typo-caption mt-1 text-(--oboon-safe)">
                    사용 가능한 닉네임입니다.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input value={email} disabled className={oboonFieldBaseClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>은행 *</Label>
                <Input
                  value={bankName}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onBankNameChange(
                      e.target.value,
                      (e.nativeEvent as InputEvent).isComposing ?? false,
                    )
                  }
                  placeholder="예: 토스뱅크"
                  maxLength={30}
                  className={[
                    oboonFieldBaseClass,
                    errors.bankName ? "border-(--oboon-danger-border)" : "",
                  ].join(" ")}
                />
                {errors.bankName ? (
                  <p className="ob-typo-caption mt-1 text-(--oboon-danger)">{errors.bankName}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>계좌번호 *</Label>
                <Input
                  value={bankAccountNumber}
                  disabled={!isEditing}
                  onChange={(e) => onBankAccountChange(e.target.value)}
                  placeholder="숫자와 -만 입력"
                  maxLength={40}
                  className={[
                    oboonFieldBaseClass,
                    errors.bankAccountNumber ? "border-(--oboon-danger-border)" : "",
                  ].join(" ")}
                />
                {errors.bankAccountNumber ? (
                  <p className="ob-typo-caption mt-1 text-(--oboon-danger)">
                    {errors.bankAccountNumber}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>입금자명 *</Label>
                <Input
                  value={bankAccountHolder}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onBankAccountHolderChange(
                      e.target.value,
                      (e.nativeEvent as InputEvent).isComposing ?? false,
                    )
                  }
                  placeholder="예금주 이름"
                  maxLength={50}
                  className={[
                    oboonFieldBaseClass,
                    errors.bankAccountHolder ? "border-(--oboon-danger-border)" : "",
                  ].join(" ")}
                />
                {errors.bankAccountHolder ? (
                  <p className="ob-typo-caption mt-1 text-(--oboon-danger)">
                    {errors.bankAccountHolder}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>한 줄 소개</Label>
              <Input
                value={agentSummary}
                disabled={!isEditing}
                onChange={(e) => onAgentSummaryChange(e.target.value)}
                placeholder="예: 청약·대출·계약까지 한 번에 정리해 드리는 실전형 상담사"
                className={oboonFieldBaseClass}
                maxLength={120}
              />
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                고객이 상담사를 빠르게 이해할 수 있는 문장을 적어주세요. (최대 120자)
              </p>
            </div>

            <div className="space-y-2">
              <Label>기타</Label>
              <Textarea
                value={agentEtc}
                disabled={!isEditing}
                onChange={(e) => onAgentEtcChange(e.target.value)}
                placeholder="자격증, 경력 등 홍보를 위한 기타 정보를 적어주세요"
                className={oboonTextareaBaseClass}
                maxLength={500}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProfileGuide(true)}
                aria-label="상담사 프로필 작성 예시 보기"
              >
                ⓘ
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProfilePreview(true)}
              >
                미리보기
              </Button>
              {!isEditing ? (
                <Button variant="secondary" size="sm" onClick={onStartEdit}>
                  정보 수정
                </Button>
              ) : (
                <>
                  <Button variant="primary" size="sm" onClick={onSave}>
                    저장
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onCancel}>
                    취소
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="order-1 space-y-2 lg:order-2">
            <Label>프로필 이미지</Label>
            <div className="relative mx-auto h-48 w-48 sm:h-60 sm:w-60 lg:h-75 lg:w-75">
              <div className="h-48 w-48 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) sm:h-60 sm:w-60 lg:h-75 lg:w-75">
                <Image
                  src={getAvatarUrlOrDefault(avatarUrl)}
                  alt="프로필 이미지"
                  width={300}
                  height={300}
                  className="h-full w-full object-cover"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarSelect}
              />
              <Button
                variant="primary"
                shape="pill"
                size="sm"
                className="absolute -bottom-1 -right-1 z-20 !h-8 !w-8 !p-0 shadow-md"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                loading={avatarUploading}
              >
                {!avatarUploading ? <Pencil className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>추가 사진 (선택)</Label>
            <span className="ob-typo-caption text-(--oboon-text-muted)">{galleryImages.length}/5</span>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onGallerySelect}
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading || galleryImages.length >= 5}
            loading={galleryUploading}
          >
            이미지 업로드
          </Button>
          <p className="ob-typo-caption text-(--oboon-text-muted)">
            jpg/png/webp, 파일당 5MB, 최대 5장까지 등록할 수 있습니다.
          </p>

          {galleryImages.length === 0 ? (
            <div className="ob-typo-caption rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center text-(--oboon-text-muted)">
              등록된 추가 사진이 없습니다.
            </div>
          ) : (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
              {galleryImages.map((image, index) => (
                <div
                  key={image.id}
                  draggable={!galleryReordering}
                  onDragStart={(event) => onGalleryDragStart(event, image.id)}
                  onDragOver={(event) => onGalleryDragOver(event, image.id)}
                  onDrop={(event) => onGalleryDrop(event, image.id)}
                  onDragEnd={onGalleryDragEnd}
                  className={[
                    "relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border bg-(--oboon-bg-surface) transition md:w-auto",
                    draggingGalleryImageId === image.id
                      ? "border-(--oboon-primary) opacity-50"
                      : "border-(--oboon-border-default)",
                    dragOverGalleryImageId === image.id
                      ? "ring-2 ring-(--oboon-primary)/50"
                      : "",
                  ].join(" ")}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-(--oboon-bg-subtle)">
                    <Image
                      src={image.image_url}
                      alt={`추가 사진 ${index + 1}`}
                      width={320}
                      height={320}
                      className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ob-typo-caption font-medium text-white">
                      {index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-white hover:!bg-transparent hover:text-white"
                      disabled={galleryDeletingId === image.id}
                      onClick={() => onGalleryDelete(image.id)}
                    >
                      <X className="h-4 w-4 text-(--oboon-danger)" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className={[
          "border-t border-(--oboon-border-default) pt-6",
          active ? "" : "hidden",
        ].join(" ")}
      >
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="ob-typo-h2 text-(--oboon-danger)">계정 삭제</div>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                계정을 삭제하면 모든 개인정보가 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={onRequestDeleteAccount}>
              계정 삭제
            </Button>
          </div>
        </Card>
      </section>

      <Modal open={showProfileGuide} onClose={() => setShowProfileGuide(false)} size="lg">
        <div className="ob-typo-h2 text-(--oboon-text-title)">예시 프로필 작성법</div>

        <div className="mt-4 space-y-3">
          <p className="ob-typo-body text-(--oboon-text-muted)">
            고객이 빠르게 신뢰할 수 있도록 핵심 정보부터 짧고 구체적으로 작성해 주세요.
          </p>
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
            <p className="ob-typo-caption text-(--oboon-text-muted)">권장 구성</p>
            <p className="mt-2 ob-typo-body text-(--oboon-text-title)">
              1) 전문 지역/상품군 2) 경력/실적 3) 상담 방식 4) 고객 약속
            </p>
          </div>
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <p className="ob-typo-caption text-(--oboon-text-muted)">예시 문구</p>
            <div className="mt-2 space-y-2">
              {AGENT_PROFILE_GUIDE_EXAMPLES.map((example) => {
                const isOpen = openGuideExampleIds.includes(example.id);
                return (
                  <div
                    key={example.id}
                    className="overflow-hidden rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)"
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left"
                      onClick={() =>
                        setOpenGuideExampleIds((prev) =>
                          prev.includes(example.id)
                            ? prev.filter((id) => id !== example.id)
                            : [...prev, example.id],
                        )
                      }
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="ob-typo-caption text-(--oboon-text-muted)">
                            {example.label}
                          </p>
                          <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                            {example.summary}
                          </p>
                        </div>
                        <span className="ob-typo-caption shrink-0 text-(--oboon-text-muted)">
                          {isOpen ? "접기" : "펼치기"}
                        </span>
                      </div>
                    </button>
                    {isOpen ? (
                      <p className="ob-typo-body whitespace-pre-line border-t border-(--oboon-border-default) px-3 py-3 text-(--oboon-text-title)">
                        {example.text}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={showProfilePreview} onClose={() => setShowProfilePreview(false)}>
        <>
          <div className="ob-typo-h2 text-(--oboon-text-title)">상담사 프로필</div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) ob-typo-subtitle text-(--oboon-text-title)">
              <Image
                src={getAvatarUrlOrDefault(avatarUrl)}
                alt={`${agentPreviewName} 아바타`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="ob-typo-caption text-(--oboon-text-muted)">분양상담사</div>
              <div className="ob-typo-subtitle text-(--oboon-text-title)">{agentPreviewName}</div>
            </div>
          </div>

          {agentSummary.trim() ? (
            <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <div className="ob-typo-body text-(--oboon-text-title)">{agentSummary.trim()}</div>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
            <div className="ob-typo-caption text-(--oboon-text-muted)">상담사 소개</div>
            <div className="mt-2 whitespace-pre-line ob-typo-body text-(--oboon-text-title)">
              {agentEtc.trim() || "등록된 상담사 소개가 없습니다."}
            </div>
          </div>

          {galleryImages.length > 0 ? (
            <div className="mt-6">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">추가 사진</div>
              <div className="-mx-1 mt-3 overflow-x-auto pb-1">
                <div className="flex gap-2 px-1">
                  {galleryImages.slice(0, 10).map((image, index) => (
                    <button
                      key={`${image.user_id}-${image.sort_order}-${index}`}
                      type="button"
                      className="h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)"
                      onClick={() => {
                        const urls = galleryImages.slice(0, 10).map((item) => item.image_url);
                        setPreviewImages(urls);
                        setPreviewImageIndex(index);
                      }}
                      aria-label={`${agentPreviewName} 상담사 추가 사진 ${index + 1} 확대 보기`}
                    >
                      <Image
                        src={image.image_url}
                        alt={`${agentPreviewName} 상담사 추가 사진 ${index + 1}`}
                        width={144}
                        height={144}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      </Modal>

      <Modal
        open={previewImageIndex !== null}
        onClose={() => {
          setPreviewImageIndex(null);
          setPreviewImages([]);
        }}
        showCloseIcon={false}
        panelClassName="!p-0 !border-0 !bg-transparent !shadow-none w-[min(100%-2rem,920px)] !overflow-visible"
      >
        {previewImageIndex !== null && previewImages[previewImageIndex] ? (
          <div className="flex items-center justify-center">
            <div className="relative inline-block">
              <Image
                src={previewImages[previewImageIndex]}
                alt="상담사 추가 사진 확대 보기"
                width={920}
                height={720}
                className="h-auto max-h-[80vh] w-auto max-w-[min(100%,920px)] rounded-xl"
              />
              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() => {
                  setPreviewImageIndex(null);
                  setPreviewImages([]);
                }}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() =>
                  setPreviewImageIndex((prev) => {
                    if (prev == null || previewImages.length === 0) return prev;
                    return (prev - 1 + previewImages.length) % previewImages.length;
                  })
                }
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() =>
                  setPreviewImageIndex((prev) => {
                    if (prev == null || previewImages.length === 0) return prev;
                    return (prev + 1) % previewImages.length;
                  })
                }
                aria-label="다음 사진"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
