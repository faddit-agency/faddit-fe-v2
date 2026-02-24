import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useWorksheetV2Store } from './useWorksheetV2Store';
import { CARD_DEFINITIONS } from './worksheetV2Constants';

export default function WorksheetV2ScreenEditor() {
  const [open, setOpen] = useState(false);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const cardVisibility = useWorksheetV2Store((s) => s.cardVisibility);
  const toggleCardVisibility = useWorksheetV2Store((s) => s.toggleCardVisibility);
  const restoreCard = useWorksheetV2Store((s) => s.restoreCard);
  const addCustomCard = useWorksheetV2Store((s) => s.addCustomCard);
  const deleteCustomCard = useWorksheetV2Store((s) => s.deleteCustomCard);
  const customCards = useWorksheetV2Store((s) => s.customCards);

  const cards = [...CARD_DEFINITIONS[activeTab], ...customCards[activeTab]];
  const visMap = cardVisibility[activeTab];

  const addCustomModule = () => {
    addCustomCard(activeTab, customTitle);
    setCustomTitle('');
  };

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
        <div className='absolute top-full right-0 z-[320] mt-1 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white py-2 shadow-lg'>
          <div className='px-3'>
            <p className='pb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
              모듈 라이브러리
            </p>

            <div className='mb-2 flex items-center gap-2'>
              <input
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder='새 메모장 제목'
                className='form-input h-8 flex-1 text-xs'
              />
              <button
                type='button'
                onClick={addCustomModule}
                className='inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50'
                aria-label='커스텀 모듈 추가'
              >
                <Plus size={14} />
              </button>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => {
                if (!dragCardId) return;
                restoreCard(activeTab, dragCardId);
                setDragCardId(null);
              }}
              className='mb-2 rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500'
            >
              숨김 모듈을 여기로 드래그하면 화면에 표시됩니다.
            </div>
          </div>

          {cards.map((card) => {
            const visible = visMap[card.id] ?? true;
            const custom = !card.isDefault;

            return (
              <div
                key={card.id}
                draggable={!visible}
                onDragStart={() => setDragCardId(card.id)}
                onDragEnd={() => setDragCardId(null)}
                className='flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50'
              >
                <button
                  type='button'
                  onClick={() => toggleCardVisibility(activeTab, card.id)}
                  className='inline-flex items-center'
                  aria-label={`${card.title} 표시 토글`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      visible ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {visible && <Check size={10} strokeWidth={3} />}
                  </span>
                </button>

                {!visible ? <GripVertical size={13} className='text-gray-400' /> : null}

                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm'>{card.title}</p>
                  <p className={`text-[10px] ${visible ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {visible ? '표시 중' : '숨김'}
                  </p>
                </div>

                {custom ? (
                  <button
                    type='button'
                    onClick={() => deleteCustomCard(activeTab, card.id)}
                    className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500'
                    aria-label='커스텀 모듈 삭제'
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}

                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    custom ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {custom ? '커스텀' : '기본'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
