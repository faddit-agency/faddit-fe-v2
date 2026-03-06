import React, { CSSProperties, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Transition from '../../utils/Transition';

interface LegacyOption {
  id: number;
  period: string;
}

interface DropdownOption {
  id?: number | string;
  value: string;
  label: string;
  disabled?: boolean;
}

type OptionLike = LegacyOption | DropdownOption | string;

const DROPDOWN_VIEWPORT_MARGIN = 8;
const DROPDOWN_OFFSET = 4;
const DROPDOWN_MAX_HEIGHT = 320;
const DROPDOWN_MIN_HEIGHT = 96;

const toDropdownOption = (option: OptionLike, index: number): DropdownOption => {
  if (typeof option === 'string') {
    return {
      id: `${option}-${index}`,
      value: option,
      label: option,
    };
  }

  if ('period' in option) {
    return {
      id: option.id,
      value: option.period,
      label: option.period,
    };
  }

  return {
    id: option.id ?? `${option.value}-${index}`,
    value: option.value,
    label: option.label,
    disabled: option.disabled,
  };
};

export default function DropdownButton({
  options,
  value,
  onChange,
  size = 'default',
  className = '',
  disabled = false,
  placeholder = '선택',
  align = 'left',
}: {
  options: OptionLike[];
  value: string;
  onChange: (value: string) => void;
  size?: 'default' | 'compact' | 'form';
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  align?: 'left' | 'right';
}) {
  const normalizedOptions = useMemo(() => options.map(toDropdownOption), [options]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const [openUpward, setOpenUpward] = useState(false);
  const current = normalizedOptions.find((option) => option.value === value) ?? null;
  const displayText = current?.label ?? (value || placeholder);

  const trigger = useRef<HTMLButtonElement | null>(null);
  const dropdown = useRef<HTMLDivElement | null>(null);
  const openFrameRef = useRef<number | null>(null);

  const updateDropdownPosition = useCallback(() => {
    if (!trigger.current) {
      return;
    }

    const rect = trigger.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const itemHeight = size === 'compact' ? 24 : 32;
    const estimatedHeight = Math.min(
      DROPDOWN_MAX_HEIGHT,
      Math.max(DROPDOWN_MIN_HEIGHT, normalizedOptions.length * itemHeight + 16),
    );

    const spaceAbove = rect.top - DROPDOWN_VIEWPORT_MARGIN - DROPDOWN_OFFSET;
    const spaceBelow = viewportHeight - rect.bottom - DROPDOWN_VIEWPORT_MARGIN - DROPDOWN_OFFSET;
    const shouldOpenUpward =
      rect.bottom + estimatedHeight > viewportHeight - DROPDOWN_VIEWPORT_MARGIN && spaceAbove > 0;

    const availableHeight = shouldOpenUpward ? spaceAbove : spaceBelow;
    const resolvedMaxHeight = Math.max(
      DROPDOWN_MIN_HEIGHT,
      Math.min(DROPDOWN_MAX_HEIGHT, availableHeight),
    );
    const resolvedHeight = Math.min(estimatedHeight, resolvedMaxHeight);
    const resolvedWidth = Math.max(120, rect.width);

    let left = align === 'right' ? rect.right - resolvedWidth : rect.left;
    left = Math.max(
      DROPDOWN_VIEWPORT_MARGIN,
      Math.min(left, viewportWidth - resolvedWidth - DROPDOWN_VIEWPORT_MARGIN),
    );

    const downwardTop = rect.bottom + DROPDOWN_OFFSET;
    const upwardTop = rect.top - resolvedHeight - DROPDOWN_OFFSET;
    const top = shouldOpenUpward
      ? Math.max(DROPDOWN_VIEWPORT_MARGIN, upwardTop)
      : Math.max(
          DROPDOWN_VIEWPORT_MARGIN,
          Math.min(downwardTop, viewportHeight - resolvedHeight - DROPDOWN_VIEWPORT_MARGIN),
        );

    setOpenUpward(shouldOpenUpward);
    setDropdownStyle({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(resolvedWidth),
      maxHeight: Math.round(resolvedMaxHeight),
      zIndex: 5000,
    });
  }, [align, normalizedOptions.length, size]);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [dropdownOpen, updateDropdownPosition]);

  useEffect(() => {
    return () => {
      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  const closeDropdown = useCallback(() => {
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }
    setDropdownOpen(false);
  }, []);

  const openDropdown = useCallback(() => {
    updateDropdownPosition();
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
    }
    // Open one frame later so Transition gets a stable "false -> true" change.
    openFrameRef.current = window.requestAnimationFrame(() => {
      setDropdownOpen(true);
      openFrameRef.current = null;
    });
  }, [updateDropdownPosition]);

  // close on click outside (use mousedown so it runs before button's click - then item click won't "double-close")
  useEffect(() => {
    const handler = ({ target }: MouseEvent) => {
      if (!dropdown.current || !trigger.current) return;
      if (!dropdownOpen) return;
      if (dropdown.current.contains(target as Node) || trigger.current.contains(target as Node))
        return;
      closeDropdown();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeDropdown, dropdownOpen]);

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!dropdownOpen || e.key !== 'Escape') return;
      closeDropdown();
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [closeDropdown, dropdownOpen]);

  return (
    <div className='relative w-full'>
      <button
        type='button'
        ref={trigger}
        className={`${
          size === 'compact'
            ? 'flex h-6 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-700 transition-colors hover:border-gray-300'
            : size === 'form'
              ? 'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm leading-5 text-gray-800 shadow-xs transition-colors hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-900/30 dark:text-gray-100 dark:hover:border-gray-600'
            : 'btn w-full justify-between border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
        aria-label='Select option'
        aria-haspopup='true'
        onClick={() => {
          if (disabled) return;
          if (dropdownOpen) {
            closeDropdown();
            return;
          }
          openDropdown();
        }}
        aria-expanded={dropdownOpen}
        disabled={disabled}
      >
        <span className='flex min-w-0 items-center'>
          <span className='truncate'>{displayText}</span>
        </span>
        <svg
          className={`ml-1 shrink-0 fill-current text-gray-400 transition-transform duration-200 ease-out dark:text-gray-500 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
          width='11'
          height='7'
          viewBox='0 0 11 7'
        >
          <path d='M5.4 6.8L0 1.4 1.4 0l4 4 4-4 1.4 1.4z' />
        </svg>
      </button>
      {typeof document !== 'undefined' && dropdownStyle
        ? createPortal(
            <Transition
              appear={false}
              show={dropdownOpen}
              tag='div'
              className={`min-w-0 overflow-y-auto rounded-lg border border-gray-200 bg-white ${size === 'compact' ? 'py-1' : 'py-1.5'} shadow-lg dark:border-gray-700/60 dark:bg-gray-800`}
              style={dropdownStyle}
              enter='transition ease-out duration-100 transform'
              enterStart={openUpward ? 'opacity-0 translate-y-2' : 'opacity-0 -translate-y-2'}
              enterEnd='opacity-100 translate-y-0'
              leave='transition ease-out duration-100 transform'
              leaveStart='opacity-100 translate-y-0'
              leaveEnd={openUpward ? 'opacity-0 translate-y-2' : 'opacity-0 -translate-y-2'}
            >
              <div
                ref={dropdown}
                className={`${size === 'compact' ? 'text-[11px]' : 'text-sm'} font-medium text-gray-700 dark:text-gray-200`}
              >
                {normalizedOptions.map((option) => {
                  return (
                    <button
                      type='button'
                      key={option.id}
                      tabIndex={0}
                      className={`flex w-full min-w-0 items-center ${size === 'compact' ? 'px-2 py-0.5' : 'px-3 py-1'} ${
                        option.disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20'
                      } ${option.value === value && 'text-violet-500'}`}
                      disabled={option.disabled}
                      onClick={(e) => {
                        if (option.disabled) {
                          e.preventDefault();
                          return;
                        }
                        e.stopPropagation();
                        const nextValue = option.value;
                        closeDropdown();
                        onChange(nextValue);
                      }}
                    >
                      <svg
                        className={`mr-2 shrink-0 fill-current text-violet-500 ${option.value !== value && 'invisible'}`}
                        width='12'
                        height='9'
                        viewBox='0 0 12 9'
                      >
                        <path d='M10.28.28L3.989 6.575 1.695 4.28A1 1 0 00.28 5.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28.28z' />
                      </svg>
                      <span className='truncate'>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </Transition>,
            document.body,
          )
        : null}
    </div>
  );
}
