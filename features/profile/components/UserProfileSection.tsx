"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";
import { Copy } from "@/shared/copy";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

import ConsultationsShortcutCard from "./ConsultationsShortcutCard";

type ProfileErrors = {
  name?: string;
  nickname?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
};

type UserProfileSectionProps = {
  showConsultationsShortcut: boolean;
  onOpenConsultations: () => void;
  name: string;
  nickname: string;
  originalNickname: string;
  phone: string;
  email: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  accountStatusLabel: string;
  avatarUrl: string | null;
  isEditing: boolean;
  nicknameChecking: boolean;
  nicknameAvailable: boolean | null;
  avatarUploading: boolean;
  errors: ProfileErrors;
  fileInputRef: { current: HTMLInputElement | null };
  onNameChange: (value: string, isComposing?: boolean) => void;
  onNicknameChange: (value: string, isComposing?: boolean) => void;
  onPhoneChange: (value: string, isComposing?: boolean) => void;
  onBankNameChange: (value: string, isComposing?: boolean) => void;
  onBankAccountChange: (value: string) => void;
  onBankAccountHolderChange: (value: string, isComposing?: boolean) => void;
  onCheckNickname: () => void;
  onAvatarSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRequestDeleteAccount: () => void;
};

export default function UserProfileSection({
  showConsultationsShortcut,
  onOpenConsultations,
  name,
  nickname,
  originalNickname,
  phone,
  email,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  accountStatusLabel,
  avatarUrl,
  isEditing,
  nicknameChecking,
  nicknameAvailable,
  avatarUploading,
  errors,
  fileInputRef,
  onNameChange,
  onNicknameChange,
  onPhoneChange,
  onBankNameChange,
  onBankAccountChange,
  onBankAccountHolderChange,
  onCheckNickname,
  onAvatarSelect,
  onStartEdit,
  onSave,
  onCancel,
  onRequestDeleteAccount,
}: UserProfileSectionProps) {
  return (
    <div className="space-y-4">
      {showConsultationsShortcut ? (
        <ConsultationsShortcutCard onOpen={onOpenConsultations} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={name}
                disabled={!isEditing}
                onChange={(e) =>
                  onNameChange(
                    e.target.value,
                    (e.nativeEvent as InputEvent).isComposing ?? false,
                  )
                }
                placeholder={Copy.auth.placeholder.name}
                maxLength={20}
                className={[
                  oboonFieldBaseClass,
                  errors.name ? "border-(--oboon-danger-border)" : "",
                ].join(" ")}
              />
              {errors.name ? (
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>연락처 *</Label>
              <Input
                value={phone}
                disabled={!isEditing}
                onChange={(e) =>
                  onPhoneChange(
                    e.target.value,
                    (e.nativeEvent as InputEvent).isComposing ?? false,
                  )
                }
                placeholder={Copy.auth.placeholder.phone}
                maxLength={13}
                className={[
                  oboonFieldBaseClass,
                  errors.phone ? "border-(--oboon-danger-border)" : "",
                ].join(" ")}
              />
              {errors.phone ? (
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                  {errors.phone}
                </p>
              ) : null}
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
                  placeholder={Copy.auth.placeholder.nickname}
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
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                  {errors.nickname}
                </p>
              ) : null}
              {nicknameAvailable === true && nickname !== originalNickname ? (
                <p className="ob-typo-caption text-(--oboon-safe) mt-1">
                  사용 가능한 닉네임입니다.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>이메일</Label>
              <Input value={email} disabled className={oboonFieldBaseClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                placeholder={Copy.booking.account.bankPlaceholder}
                maxLength={30}
                className={[
                  oboonFieldBaseClass,
                  errors.bankName ? "border-(--oboon-danger-border)" : "",
                ].join(" ")}
              />
              {errors.bankName ? (
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                  {errors.bankName}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>계좌번호 *</Label>
              <Input
                value={bankAccountNumber}
                disabled={!isEditing}
                onChange={(e) => onBankAccountChange(e.target.value)}
                placeholder={Copy.booking.account.numberPlaceholder}
                maxLength={40}
                className={[
                  oboonFieldBaseClass,
                  errors.bankAccountNumber ? "border-(--oboon-danger-border)" : "",
                ].join(" ")}
              />
              {errors.bankAccountNumber ? (
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
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
                placeholder={Copy.booking.account.holderPlaceholder}
                maxLength={50}
                className={[
                  oboonFieldBaseClass,
                  errors.bankAccountHolder ? "border-(--oboon-danger-border)" : "",
                ].join(" ")}
              />
              {errors.bankAccountHolder ? (
                <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                  {errors.bankAccountHolder}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-3">
              <Label>계정 유형</Label>
              <Input value={accountStatusLabel} disabled className={oboonFieldBaseClass} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
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
              className="!h-8 !w-8 !p-0 absolute -bottom-1 -right-1 z-20 shadow-md"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              loading={avatarUploading}
            >
              {!avatarUploading && <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-(--oboon-border-default) pt-10">
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
      </div>
    </div>
  );
}
