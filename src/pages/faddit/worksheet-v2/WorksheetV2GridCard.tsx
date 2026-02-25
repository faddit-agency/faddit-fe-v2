import React from 'react';
import { X } from 'lucide-react';

interface WorksheetV2GridCardProps {
  cardId: string;
  title: string;
  headerExtra?: React.ReactNode;
  headerActions?: React.ReactNode;
  onClose?: () => void;
  isActive?: boolean;
  onActivate?: (cardId: string) => void;
  children: React.ReactNode;
}

const WorksheetV2GridCard: React.FC<WorksheetV2GridCardProps> = ({
  cardId,
  title,
  headerExtra,
  headerActions,
  onClose,
  isActive = false,
  onActivate,
  children,
}) => {
  return (
    <section
      data-card-id={cardId}
      onMouseDownCapture={() => onActivate?.(cardId)}
      className={`worksheet-v2-grid-card-root flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow] duration-200 ${
        isActive ? 'border-faddit' : 'border-transparent'
      }`}
      style={
        isActive
          ? {
              boxShadow: '0 0 0 1px rgba(118, 59, 255, 0.18)',
            }
          : undefined
      }
    >
      <header
        className={`worksheet-v2-drag-handle flex shrink-0 cursor-grab items-center justify-between px-3 py-2 active:cursor-grabbing`}
      >
        <div className='flex min-w-0 items-center gap-2'>
          <h3 className='text-[13px] font-semibold text-gray-700'>{title}</h3>
          {headerExtra}
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          {headerActions}
          {onClose ? (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className='worksheet-v2-no-drag rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'
            >
              <X size={13} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </header>
      <div className='min-h-0 flex-1 overflow-hidden'>{children}</div>
    </section>
  );
};

export default React.memo(WorksheetV2GridCard);
