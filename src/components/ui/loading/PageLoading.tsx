"use client";

import LoadingSpinner from "./LoadingSpinner";

interface PageLoadingProps {
  message?: string;
}

export default function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  );
}
