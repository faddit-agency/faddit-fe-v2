import React, { useState, useRef, useEffect } from 'react';
import Transition from '../../utils/Transition';

interface Option {
  id: number;
  period: string;
}

export default function DropdownButton({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(
    () => options.find((o) => o.period === value)?.id ?? null,
  );
  const current = selectedId !== null ? options.find((o) => o.id === selectedId) : null;
  const displayText = current?.period ?? value;

  useEffect(() => {
    const match = options.find((o) => o.period === value);
    setSelectedId(match?.id ?? null);
  }, [value]);

  const trigger = useRef(null);
  const dropdown = useRef(null);

  // close on click outside (use mousedown so it runs before button's click - then item click won't "double-close")
  useEffect(() => {
    const handler = ({ target }: MouseEvent) => {
      if (!dropdown.current || !trigger.current) return;
      if (!dropdownOpen) return;
      if (dropdown.current.contains(target as Node) || trigger.current.contains(target as Node))
        return;
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!dropdownOpen || e.key !== 'Escape') return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [dropdownOpen]);

  return (
    <div className='relative w-full'>
      <button
        ref={trigger}
        className='btn w-full justify-between border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100'
        aria-label='Select date range'
        aria-haspopup='true'
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className='flex items-center'>
          <span>{displayText}</span>
        </span>
        <svg
          className='ml-1 shrink-0 fill-current text-gray-400 dark:text-gray-500'
          width='11'
          height='7'
          viewBox='0 0 11 7'
        >
          <path d='M5.4 6.8L0 1.4 1.4 0l4 4 4-4 1.4 1.4z' />
        </svg>
      </button>
      <Transition
        appear={false}
        show={dropdownOpen}
        tag='div'
        className='absolute top-full left-0 z-10 mt-1 w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
        enter='transition ease-out duration-100 transform'
        enterStart='opacity-0 -translate-y-2'
        enterEnd='opacity-100 translate-y-0'
        leave='transition ease-out duration-100'
        leaveStart='opacity-100'
        leaveEnd='opacity-0'
      >
        <div ref={dropdown} className='text-sm font-medium text-gray-600 dark:text-gray-300'>
          {options.map((option) => {
            return (
              <button
                key={option.id}
                tabIndex={0}
                className={`flex w-full cursor-pointer items-center px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/20 ${option.id === selectedId && 'text-violet-500'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextId = option.id;
                  const nextPeriod = option.period;
                  setDropdownOpen(false);
                  const leaveDuration = 100;
                  setTimeout(() => {
                    setSelectedId(nextId);
                    onChange(nextPeriod);
                  }, leaveDuration);
                }}
              >
                <svg
                  className={`mr-2 shrink-0 fill-current text-violet-500 ${option.id !== selectedId && 'invisible'}`}
                  width='12'
                  height='9'
                  viewBox='0 0 12 9'
                >
                  <path d='M10.28.28L3.989 6.575 1.695 4.28A1 1 0 00.28 5.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28.28z' />
                </svg>
                <span>{option.period}</span>
              </button>
            );
          })}
        </div>
      </Transition>
    </div>
  );
}
