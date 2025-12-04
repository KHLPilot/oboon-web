"use client";

import { useState } from "react";
import { X, Calendar, Star } from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState("12.01 (금)");
  const [selectedTime, setSelectedTime] = useState("13:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  const DATES = ["12.01 (금)", "12.02 (토)", "12.03 (일)"];
  const TIMES = ["10:00", "13:00", "15:00", "17:00"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 배경 오버레이 (클릭 시 닫힘) */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 모달 본문 */}
      <div className="relative bg-white w-full max-w-[480px] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* 헤더 */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Calendar className="w-5 h-5" />
            상담 예약
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 상담사 프로필 카드 */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
                alt="Agent"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">
                OBOON 추천 상담사
              </p>
              <h4 className="font-bold text-slate-900">김민정 실장</h4>
              <p className="text-xs text-teal-600 font-medium flex items-center gap-1 mt-0.5">
                응답률 98%{" "}
                <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" /> 평점
                4.9
              </p>
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 mb-2">
              날짜 및 시간 선택
            </label>
            <div className="flex gap-2 mb-3">
              {DATES.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    selectedDate === date
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
            {/* 시간 선택 */}
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedTime === time
                      ? "bg-teal-50 border border-teal-500 text-teal-700"
                      : "bg-white border border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 입력 폼 */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                성함
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                연락처
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <button className="w-full bg-teal-500 text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20">
            예약 확정하기
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-3">
            예약 확정 시 카카오톡으로 알림이 발송됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
