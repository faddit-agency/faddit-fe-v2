import React, { useState } from 'react';

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

interface GlobalTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  position?: TooltipPosition;
}

const getPositionClass = (position: TooltipPosition) => {
  switch (position) {
    case 'right':
      return 'left-full top-1/2 ml-2 -translate-y-1/2';
    case 'left':
      return 'right-full top-1/2 mr-2 -translate-y-1/2';
    case 'bottom':
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    default:
      return 'bottom-full left-1/2 mb-2 -translate-x-1/2';
  }
};

const GlobalTooltip: React.FC<GlobalTooltipProps> = ({
  content,
  children,
  className = '',
  contentClassName = '',
  position = 'top',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role='tooltip'
        className={`pointer-events-none absolute z-50 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs whitespace-nowrap text-gray-700 shadow-lg transition-all duration-150 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-100 ${getPositionClass(
          position,
        )} ${open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'} ${contentClassName}`}
      >
        {content}
      </span>
    </span>
  );
};

export default GlobalTooltip;
