import React, { forwardRef } from "react";
import InputWrapper, { getTextareaClasses } from "./InputWrapper";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  error?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <InputWrapper error={error}>
        <textarea
          className={getTextareaClasses(error, className)}
          ref={ref}
          {...props}
        />
      </InputWrapper>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;