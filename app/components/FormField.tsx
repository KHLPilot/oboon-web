type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
