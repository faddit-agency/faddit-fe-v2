import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useWorksheetV2Store } from './useWorksheetV2Store';
import { CARD_DEFINITIONS } from './worksheetV2Constants';

export default function WorksheetV2ScreenEditor() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const cardVisibility = useWorksheetV2Store((s) => s.cardVisibility);
  const toggleCardVisibility = useWorksheetV2Store((s) => s.toggleCardVisibility);

  const cards = CARD_DEFINITIONS[activeTab];
  const visMap = cardVisibility[activeTab];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  return (
    <div ref={menuRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex cursor-pointer items-center justify-center gap-x-1 rounded-lg bg-[#f9f9f9] px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:text-gray-900'
      >
        화면 편집
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className='absolute top-full right-0 z-[320] mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
          <p className='px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
            카드 표시/숨기기
          </p>
          {cards.map((card) => {
            const visible = visMap[card.id] ?? true;
            return (
              <button
                key={card.id}
                type='button'
                onClick={() => toggleCardVisibility(activeTab, card.id)}
                className='flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50'
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    visible ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  {visible && <Check size={10} strokeWidth={3} />}
                </span>
                {card.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
