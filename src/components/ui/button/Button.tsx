import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "sm" | "md" | "lg"; // Button size
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: ((e?: any) => void) | (() => void); // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Additional classes
  type?: "button" | "submit" | "reset"; // Button type
  title?: string; // Tooltip text
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  title,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  // Variant Classes - sesuai referensi warna yang diberikan
  const variantClasses = {
    primary:
      "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300",
    secondary:
      "bg-gray-500 text-white shadow-sm hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:bg-gray-300",
    outline:
      "bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400",
    ghost:
      "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:text-gray-400",
    destructive:
      "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300",
    success:
      "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:bg-emerald-300",
    warning:
      "bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:bg-amber-300",
    info:
      "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300",
  };

  return (
    <button
      type={type}
      title={title}
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-md transition-colors duration-200 focus:outline-none ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
