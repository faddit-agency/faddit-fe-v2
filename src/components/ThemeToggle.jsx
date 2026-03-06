import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useThemeProvider } from '../utils/ThemeContext';

export default function ThemeToggle({ variant = 'default' }) {
  const { currentTheme, changeCurrentTheme } = useThemeProvider();
  const switchId = useId();
  const darkMode = currentTheme === 'dark';
  const sidebarVariant = variant === 'sidebar';
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });

  const tooltipTitle = darkMode ? '라이트 모드' : '다크 모드';

  const updateTooltipPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.top - 6,
    });
  }, []);

  useEffect(() => {
    if (!sidebarVariant || !tooltipOpen) return;

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [sidebarVariant, tooltipOpen, updateTooltipPosition]);

  const toggleControl = (
    <label
      className={`group relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden transition-all duration-200 ease-out active:scale-95 focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300/80 focus-within:ring-offset-1 ${
        sidebarVariant
          ? darkMode
            ? 'rounded-md border border-violet-500 bg-faddit text-white shadow-[0_4px_10px_rgba(118,59,255,0.24)] hover:bg-violet-600'
            : 'rounded-md border border-violet-200 bg-violet-50 text-violet-700 shadow-[0_2px_6px_rgba(118,59,255,0.12)] hover:border-violet-300 hover:bg-violet-100'
          : 'rounded-full text-gray-500/80 hover:bg-gray-100 lg:hover:bg-gray-200 dark:text-gray-400/80 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800'
      }`}
      htmlFor={switchId}
    >
      <svg
        className={`absolute fill-current transition-all duration-250 ease-out ${
          darkMode
            ? '-translate-y-0.5 -rotate-45 scale-75 opacity-0'
            : 'translate-y-0 rotate-0 scale-100 opacity-100'
        }`}
        width={16}
        height={16}
        viewBox='0 0 16 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M8 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1Z' />
        <path d='M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' />
        <path d='M13.657 3.757a1 1 0 0 0-1.414-1.414l-.354.354a1 1 0 0 0 1.414 1.414l.354-.354ZM13.5 8a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1ZM13.303 11.889a1 1 0 0 0-1.414 1.414l.354.354a1 1 0 0 0 1.414-1.414l-.354-.354ZM8 13.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1ZM4.111 13.303a1 1 0 1 0-1.414-1.414l-.354.354a1 1 0 1 0 1.414 1.414l.354-.354ZM0 8a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2H1a1 1 0 0 1-1-1ZM3.757 2.343a1 1 0 1 0-1.414 1.414l.354.354A1 1 0 1 0 4.11 2.697l-.354-.354Z' />
      </svg>
      <svg
        className={`absolute fill-current transition-all duration-250 ease-out ${
          darkMode
            ? 'translate-y-0 rotate-0 scale-100 opacity-100'
            : 'translate-y-0.5 rotate-45 scale-75 opacity-0'
        }`}
        width={16}
        height={16}
        viewBox='0 0 16 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M11.875 4.375a.625.625 0 1 0 1.25 0c.001-.69.56-1.249 1.25-1.25a.625.625 0 1 0 0-1.25 1.252 1.252 0 0 1-1.25-1.25.625.625 0 1 0-1.25 0 1.252 1.252 0 0 1-1.25 1.25.625.625 0 1 0 0 1.25c.69.001 1.249.56 1.25 1.25Z' />
        <path d='M7.019 1.985a1.55 1.55 0 0 0-.483-1.36 1.44 1.44 0 0 0-1.53-.277C2.056 1.553 0 4.5 0 7.9 0 12.352 3.648 16 8.1 16c3.407 0 6.246-2.058 7.51-4.963a1.446 1.446 0 0 0-.25-1.55 1.554 1.554 0 0 0-1.372-.502c-4.01.552-7.539-2.987-6.97-7ZM2 7.9C2 5.64 3.193 3.664 4.961 2.6 4.82 7.245 8.72 11.158 13.36 11.04 12.265 12.822 10.341 14 8.1 14 4.752 14 2 11.248 2 7.9Z' />
      </svg>
      <span className='sr-only'>Switch to light / dark version</span>
    </label>
  );

  return (
    <div>
      <input
        type='checkbox'
        name='light-switch'
        id={switchId}
        className='light-switch sr-only'
        checked={!darkMode}
        onChange={() => changeCurrentTheme(darkMode ? 'light' : 'dark')}
      />
      {sidebarVariant ? (
        <span
          ref={triggerRef}
          className='inline-flex'
          onMouseEnter={() => {
            updateTooltipPosition();
            setTooltipOpen(true);
          }}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocusCapture={() => {
            updateTooltipPosition();
            setTooltipOpen(true);
          }}
          onBlurCapture={() => setTooltipOpen(false)}
        >
          {toggleControl}
          {createPortal(
            <span
              role='tooltip'
              className='pointer-events-none fixed z-[500]'
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span
                className={`block rounded-md bg-gray-900 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-sm transition-all duration-150 ease-out ${
                  tooltipOpen ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                }`}
              >
                {tooltipTitle}
              </span>
            </span>,
            document.body,
          )}
        </span>
      ) : (
        toggleControl
      )}
    </div>
  );
}
