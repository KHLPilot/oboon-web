"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

type DeleteAction = () => void | Promise<void>;

export default function AdminPostActions({
  editHref,
  deleteAction,
  postTitle,
}: {
  editHref: string;
  deleteAction: DeleteAction;
  postTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={editHref}>
          <Button variant="secondary" size="sm" shape="pill">
            수정
          </Button>
        </Link>

        {/* 서버 액션은 form action으로 연결 */}
        <form ref={formRef} action={deleteAction}>
          <Button
            variant="danger"
            size="sm"
            shape="pill"
            type="button"
            onClick={() => setOpen(true)}
          >
            삭제
          </Button>
        </form>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="ob-typo-h2 font-semibold text-(--oboon-text-title)">
          글을 삭제할까요?
        </div>

        <div className="mt-5 ob-typo-caption leading-5 text-(--oboon-text-muted)">
          <span className="ob-typo-h4 text-(--oboon-text-title)">
            {postTitle}
          </span>
          <br />
          삭제 후에는 복구할 수 없습니다.
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            className="w-full"
          >
            취소
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              setOpen(false);
              formRef.current?.requestSubmit();
            }}
            className="w-full"
          >
            삭제하기
          </Button>
        </div>
      </Modal>
    </>
  );
}
