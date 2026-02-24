import React from 'react';
import { X } from 'lucide-react';

interface WorksheetV2GridCardProps {
  title: string;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
}

const WorksheetV2GridCard: React.FC<WorksheetV2GridCardProps> = ({
  title,
  headerExtra,
  onClose,
  children,
}) => {
  return (
    <section className='flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white'>
      <header className='worksheet-v2-drag-handle flex shrink-0 cursor-grab items-center justify-between border-b border-gray-200 px-3 py-2 active:cursor-grabbing'>
        <div className='flex min-w-0 items-center gap-2'>
          <h3 className='text-[13px] font-semibold text-gray-700'>{title}</h3>
          {headerExtra}
        </div>
        {onClose ? (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className='worksheet-v2-no-drag shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'
          >
            <X size={13} strokeWidth={2} />
          </button>
        ) : null}
      </header>
      <div className='min-h-0 flex-1 overflow-hidden'>{children}</div>
    </section>
  );
};

export default React.memo(WorksheetV2GridCard);
