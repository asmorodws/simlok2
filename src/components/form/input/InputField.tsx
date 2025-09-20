"use client";
import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ error, ...props }) => {
  return (
    <div className="relative">
      <input
        {...props}
        className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-gray-900 ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-gray-300"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default InputField;