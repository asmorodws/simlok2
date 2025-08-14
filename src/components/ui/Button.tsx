import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "destructive";
  children: React.ReactNode;
}

export default function Button({ 
  size = "md", 
  variant = "primary", 
  className = "", 
  children, 
  ...props 
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-blue-600",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 border-gray-200",
    outline: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-red-600"
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        border border-transparent rounded-md font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
