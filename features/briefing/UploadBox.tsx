"use client";

import { useState } from "react";
import { UploadCloud, FileText, BarChart3, ArrowRight } from "lucide-react";

export default function UploadBox() {
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // 드래그 앤 드롭 시각 효과 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // 실제 파일 처리 로직은 여기에 들어갑니다 (지금은 UI만 구현)
    console.log("Files dropped:", e.dataTransfer.files);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 1. 파일 업로드 영역 (드래그 앤 드롭) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative bg-white border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group ${
          isDragging
            ? "border-teal-500 bg-teal-50"
            : "border-slate-200 hover:border-teal-400 hover:bg-slate-50"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-4 rounded-full transition-colors ${
              isDragging ? "bg-teal-100" : "bg-slate-100 group-hover:bg-white"
            }`}
          >
            <UploadCloud
              className={`w-8 h-8 ${
                isDragging
                  ? "text-teal-600"
                  : "text-slate-400 group-hover:text-teal-500"
              }`}
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              공고문 파일 끌어놓기 또는 클릭하여 업로드
            </h3>
            <p className="text-sm text-slate-400">
              PDF, HWP, JPG 지원 (최대 50MB)
            </p>
          </div>
        </div>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-4 my-8">
        <div className="h-px bg-slate-200 flex-1"></div>
        <span className="text-sm text-slate-400 font-medium">
          또는 URL 입력
        </span>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* 2. URL 입력 영역 */}
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400">
          <FileText className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full pl-12 pr-32 py-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-300 text-slate-800"
        />
        <button className="absolute right-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
          분석하기
        </button>
      </div>
    </div>
  );
}
