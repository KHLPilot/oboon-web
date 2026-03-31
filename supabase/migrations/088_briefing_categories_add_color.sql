ALTER TABLE briefing_categories ADD COLUMN color text;
-- hex 값 저장 (예: "#6366f1", "#f59e0b", "#10b981")
-- null이면 컴포넌트에서 --oboon-bg-inverse로 폴백
