"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Star } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const DATES = useMemo(() => ["12.01 (월)", "12.02 (화)", "12.03 (수)"], []);
  const TIMES = useMemo(() => ["10:00", "13:00", "15:00", "17:00"], []);

  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [selectedTime, setSelectedTime] = useState(TIMES[1] ?? TIMES[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Modal open={isOpen} onClose={onClose}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-subtle)">
            <CalendarDays className="h-4 w-4 text-(--oboon-text-title)" />
          </div>
          <div>
            <div className="text-base font-semibold text-(--oboon-text-title)">
              상담 예약
            </div>
            <div className="text-xs text-(--oboon-text-muted)">
              날짜/시간을 선택하고 연락처를 남겨주세요
            </div>
          </div>
        </div>

        {/* 오른쪽 닫기 버튼은 Modal 기본 닫기 버튼이 있으므로 중복 방지 차원에서 생략 */}
      </div>

      {/* Counselor card */}
      <div className="mt-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-(--oboon-bg-subtle) shrink-0">
              {/* 실제 데이터 연결 전까지는 placeholder */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
                alt="Agent"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="status">OBOON 추천 담당자</Badge>
                <div className="inline-flex items-center gap-1 text-xs text-(--oboon-text-muted)">
                  <Star className="h-3.5 w-3.5" />
                  <span className="font-medium text-(--oboon-text-title)">
                    4.9
                  </span>
                  <span className="text-(--oboon-text-muted)">응답률 98%</span>
                </div>
              </div>
              <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                김민정 팀장
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Date/Time */}
      <div className="mt-5">
        <Label className="text-xs text-(--oboon-text-muted)">날짜 선택</Label>

        <div className="mt-2 flex gap-2">
          {DATES.map((d) => {
            const active = selectedDate === d;
            return (
              <Button
                key={d}
                size="sm"
                shape="pill"
                variant={active ? "primary" : "secondary"}
                className="flex-1"
                onClick={() => setSelectedDate(d)}
              >
                {d}
              </Button>
            );
          })}
        </div>

        <div className="mt-4">
          <Label className="text-xs text-(--oboon-text-muted)">시간 선택</Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {TIMES.map((t) => {
              const active = selectedTime === t;
              return (
                <Button
                  key={t}
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="w-full"
                  onClick={() => setSelectedTime(t)}
                >
                  {t}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-4">
        <div>
          <Label
            htmlFor="booking-name"
            className="text-xs text-(--oboon-text-muted)"
          >
            연락함
          </Label>
          <div className="mt-2">
            <Input
              id="booking-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="booking-phone"
            className="text-xs text-(--oboon-text-muted)"
          >
            연락처
          </Label>
          <div className="mt-2">
            <Input
              id="booking-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div className="mt-2 text-xs text-(--oboon-text-muted)">
            예약 확정 알림을 발송합니다.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6">
        <Button
          className="w-full"
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          onClick={() => {
            // TODO: 실제 예약 처리(서버 액션/콜백)로 교체
            // 현재 사용자 UX를 반영
            onClose();
          }}
        >
          예약 확정하기
        </Button>
      </div>

      {/* 선택 예약 */}
      <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 text-xs text-(--oboon-text-muted)">
        선택:{" "}
        <span className="font-medium text-(--oboon-text-title)">
          {selectedDate} {selectedTime}
        </span>
      </div>
    </Modal>
  );
}
