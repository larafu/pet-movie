/**
 * 通用下拉菜单组件
 * 用于模型选择、宽高比、分辨率等下拉选项
 */

'use client';

import { useEffect, useRef } from 'react';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export function DropdownMenu({
  isOpen,
  onClose,
  children,
  align = 'left',
  width = 'min-w-48',
}: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const alignClass =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-2 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl ${width} z-[200] max-h-80 overflow-y-auto ${alignClass}`}
      style={{
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
      }}
    >
      {children}
    </div>
  );
}
