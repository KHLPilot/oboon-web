type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string; // ✅ 추가
};

export function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm text-gray-400">{label}</label>
      {children}
    </div>
  );
}
