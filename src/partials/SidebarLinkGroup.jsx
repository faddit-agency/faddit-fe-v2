import React, { useState, useEffect } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

function SidebarLinkGroup({ children, activecondition, id }) {
  const [open, setOpen] = useState(activecondition);

  const { isOver, setNodeRef } = useDroppable({
    id: id || 'sidebar-link-group',
    data: {
      type: 'folder',
      id: id,
    },
  });

  const handleClick = () => {
    setOpen(!open);
  };

  const [autoOpened, setAutoOpened] = useState(false);

  useDndMonitor({
    onDragOver(event) {
      const { over } = event;
      if (over?.id === id) {
        if (!open) {
          setOpen(true);
          setAutoOpened(true);
        }
      } else {
        // If we moved away from this folder, and it was auto-opened, close it
        if (open && autoOpened) {
          setOpen(false);
          setAutoOpened(false);
        }
      }
    },
    onDragEnd() {
      // Reset auto-open state on drop
      setAutoOpened(false);
    },
  });

  return (
    <li
      ref={setNodeRef}
      className={`mb-0.5 rounded-lg bg-linear-to-r py-2 pr-3 pl-4 last:mb-0 ${
        activecondition
          ? 'from-violet-500/[0.12] to-violet-500/[0.04] dark:from-violet-500/[0.24]'
          : isOver
            ? 'bg-gray-100 ring-2 ring-violet-400 dark:bg-gray-700/50' // Visual cue when hovering
            : ''
      }`}
    >
      {children(handleClick, open)}
    </li>
  );
}

export default SidebarLinkGroup;
