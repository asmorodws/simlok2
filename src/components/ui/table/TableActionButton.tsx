'use client';

import Button from '@/components/ui/button/Button';

type TableActionButtonProps = {
  label: string;
  onClick: () => void;
  /**
   * Kalau true, tombol berlabel "Review" akan tetap pakai style yang sama
   * (outline biru) supaya konsisten visual di semua tabel.
   */
  pending?: boolean;
  className?: string;
};

export default function TableActionButton({
  label,
  onClick,
  pending: _pending = false,
  className = '',
}: TableActionButtonProps) {
  // SENGAJA konsisten: outline biru + hover biru muda
  return (
    <Button
      onClick={onClick}
      size="sm"
      variant={label == "Review" ? "outline" : "info"}
      className={`text-blue-600 border-blue-600 hover:bg-blue-50 ${className}`}
    >
      {label}
    </Button>
  );
}
