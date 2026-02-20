import React from 'react';
import DropdownButton from '../../../components/atoms/DropdownButton';
import WorksheetDndContainer from './WorksheetDndContainer';

const SIDEBAR_WIDTH = 300;

const GENDER_OPTIONS = [
  { id: 1, period: '남자' },
  { id: 2, period: '여자' },
];

function BasicInfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-x-[10px]'>
      <p className='w-[80px] shrink-0 font-medium text-[#8A8A8A]'>{label}</p>
      <div className='h-6 w-px shrink-0 bg-gray-200' />
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  );
}

interface WorksheetLeftSidebarProps {
  open: boolean;
}

export default function WorksheetLeftSidebar({ open }: WorksheetLeftSidebarProps) {
  return (
    <div
      className='flex h-full shrink-0 flex-col overflow-hidden rounded-md bg-white text-[14px] transition-[width] duration-300 ease-in-out'
      style={{ width: open ? SIDEBAR_WIDTH : 0 }}
    >
      <div
        className='flex min-w-[300px] flex-1 flex-col transition-opacity duration-300 ease-in-out'
        style={{ minWidth: SIDEBAR_WIDTH, opacity: open ? 1 : 0 }}
      >
        <p className='px-3 py-3 font-bold'>기본정보</p>
        <div className='h-px w-full bg-gray-200' />

        <div className='flex flex-col p-3'>
          <div className='flex flex-col gap-y-3'>
            <input
              id='product_name'
              className='form-input w-full'
              type='text'
              placeholder='제품명'
            />
            <BasicInfoRow label='브랜드'>
              <input id='brand_name' className='form-input w-full' type='text' />
            </BasicInfoRow>
            <BasicInfoRow label='아이템'>
              <input id='item_name' className='form-input w-full' type='text' />
            </BasicInfoRow>
            <BasicInfoRow label='성별'>
              <DropdownButton options={GENDER_OPTIONS} value='남자' onChange={() => {}} />
            </BasicInfoRow>
            <BasicInfoRow label='카테고리'>
              <DropdownButton options={GENDER_OPTIONS} value='상의' onChange={() => {}} />
            </BasicInfoRow>
            <BasicInfoRow label='의류'>
              <DropdownButton options={GENDER_OPTIONS} value='셔츠' onChange={() => {}} />
            </BasicInfoRow>
            <BasicInfoRow label='시즌'>
              <div className='grid grid-cols-2 gap-x-2'>
                <input id='season_name' className='form-input w-full' type='text' />
                <DropdownButton options={GENDER_OPTIONS} value='S/S' onChange={() => {}} />
              </div>
            </BasicInfoRow>
          </div>
        </div>

        <div className='flex flex-col gap-y-2'>
          <p className='px-3 py-3 font-bold'>추가정보</p>
        </div>
        <WorksheetDndContainer />
      </div>
    </div>
  );
}
