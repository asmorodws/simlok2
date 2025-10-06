import React, { ChangeEvent, useState, useRef, useEffect } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  error?: string;
  validationMode?: "numbers" | "letters" | "email" | "free";
}

export default function Input({
  className = "",
  error,
  value,
  onChange,
  validationMode = "free",
  ...props
}: InputProps) {
  // Internal state for managing the input value
  const [internalValue, setInternalValue] = useState(() => {
    // Initialize with value prop if provided, otherwise empty string
    return typeof value === 'string' ? value : value?.toString() || "";
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;

  // Update internal value when value prop changes (controlled mode)
  useEffect(() => {
    if (isControlled) {
      const newValue = typeof value === 'string' ? value : value?.toString() || "";
      setInternalValue(newValue);
    }
  }, [value, isControlled]);

  // Simple input filtering function
  const filterInput = (inputValue: string): string => {
    if (typeof inputValue !== 'string') return "";
    
    switch (validationMode) {
      case "numbers":
        return inputValue.replace(/[^0-9]/g, "");
      
      case "letters":
        return inputValue.replace(/[^A-Za-z\s.\-']/g, "");
      
      case "email":
        return inputValue.replace(/[^A-Za-z0-9@.\-_]/g, "");
      
      case "free":
      default:
        return inputValue;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const originalValue = e.target.value;
    
    // For free mode, no filtering needed
    if (validationMode === "free") {
      if (!isControlled) {
        setInternalValue(originalValue);
      }
      onChange?.(e);
      return;
    }
    
    // Filter the input value
    const filteredValue = filterInput(originalValue);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalValue(filteredValue);
    }

    // If filtering changed the value, we need to update the DOM and create synthetic event
    if (originalValue !== filteredValue) {
      // Update the DOM value directly
      if (inputRef.current) {
        inputRef.current.value = filteredValue;
      }
      
      // Create synthetic event with filtered value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: filteredValue,
        },
      } as ChangeEvent<HTMLInputElement>;
      
      onChange?.(syntheticEvent);
    } else {
      // No filtering needed, use original event
      onChange?.(e);
    }
  };

  // Determine which value to display
  const displayValue = isControlled ? (typeof value === 'string' ? value : value?.toString() || "") : internalValue;

  return (
    <div className="w-full">
      <input
        {...props}
        ref={inputRef}
        value={displayValue}
        onChange={handleChange}
        className={`w-full px-3 py-2 border ${
          error ? "border-red-500" : "border-gray-300"
        } rounded-md focus:outline-none focus:ring-1 ${
          error
            ? "focus:ring-red-500 focus:border-red-500"
            : "focus:ring-blue-500 focus:border-blue-500"
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
