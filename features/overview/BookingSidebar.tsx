"use client";

import { useState } from "react";
import { Heart, Share2 } from "lucide-react";
import BookingModal from "./BookingModal"; // 방금 만든 모달 불러오기

export default function BookingSidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 관리

  return (
    <>
      <aside className="sticky top-24 h-fit">
        {/* 1. 메인 정보 카드 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-teal-50 text-teal-600 text-xs font-bold px-2 py-1 rounded">
              청약 접수중
            </span>
            <div className="flex gap-2 text-slate-400">
              <button className="hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button className="hover:text-slate-900 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-1">
            11.5억 ~ 14.2억
          </h2>
          <p className="text-sm text-slate-400 mb-6">84㎡ 기준</p>

          {/* 일정 리스트 */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">특별공급</span>
              <span className="font-bold text-slate-800">12.04 (월)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-bold text-teal-600">
                1순위
              </span>
              <span className="font-bold text-slate-800">12.05 (화)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">당첨자발표</span>
              <span className="font-bold text-slate-800">12.12 (화)</span>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-3">
            {/* 상담 예약하기 버튼 클릭 시 모달 열기 */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              상담 예약하기 <span className="text-teal-400">→</span>
            </button>
            <button className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-lg hover:bg-slate-50 transition-colors">
              모집공고문 보기
            </button>
          </div>
        </div>

        {/* 2. 담당자 프로필 카드 */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100"
                alt="Agent"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">
                담당 전문 상담사
              </p>
              <p className="font-bold text-slate-800">김민정 실장</p>
            </div>
          </div>
          <button className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">
            문의
          </button>
        </div>
      </aside>

      {/* 모달 컴포넌트 렌더링 (isOpen 상태에 따라 표시) */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
