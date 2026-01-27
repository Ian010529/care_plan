import { InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function FormInput({
  label,
  required,
  error,
  hint,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && (
          <span className="text-gray-400 font-normal ml-1">({hint})</span>
        )}
      </label>
      <input
        className={`w-full border rounded px-3 py-2 ${
          error ? "border-red-500 bg-red-50" : "border-gray-300"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
