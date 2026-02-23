import React from 'react';
import { ChevronDown, Redo2, Undo2 } from 'lucide-react';
import ToggleButton from '../../../components/atoms/ToggleButton';
import logo from '../../../images/icons/faddit-logo-only.svg';
const ICON_BUTTON_CLASS =
  'flex aspect-square cursor-pointer items-center justify-center rounded-md p-2 transition-all duration-300 hover:bg-gray-100';

interface WorksheetTopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function WorksheetTopBar({ sidebarOpen, onToggleSidebar }: WorksheetTopBarProps) {
  return (
    <header className='flex h-14 items-center justify-between rounded-md bg-white p-2'>
      <div className='flex h-full gap-x-3'>
        {/* <ToggleButton label='기본정보' checked={sidebarOpen} onChange={onToggleSidebar} /> */}
        <img src={logo} alt='logo' className='w-6 object-contain ml-1' />
        <div className='h-full w-px bg-gray-200' />
        <button type='button' className={ICON_BUTTON_CLASS} aria-label='실행 취소'>
          <Undo2 size={22} color='black' />
        </button>
        <button type='button' className={ICON_BUTTON_CLASS} aria-label='다시 실행'>
          <Redo2 size={22} color='black' />
        </button>
      </div>
      <div className='flex h-full gap-x-3'>
        <button
          type='button'
          className='flex h-full cursor-pointer items-center justify-center gap-x-1 rounded-lg bg-[#f9f9f9] px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:text-gray-900'
        >
          화면 편집
          <ChevronDown size={16} />
        </button>
        <button
          type='button'
          className='flex h-full cursor-pointer items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-gray-600'
        >
          Share
        </button>
      </div>
    </header>
  );
}
