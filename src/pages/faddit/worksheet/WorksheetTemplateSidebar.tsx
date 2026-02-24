import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  ChevronsLeft,
  ChevronsRight,
  History,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react';
import FadditLogoOnly from '../../../images/icons/faddit-logo-only.svg';

type ToolTab = 'template' | 'element' | 'history' | 'comment';

interface WorksheetTemplateSidebarProps {
  collapsible?: boolean;
}

const TOOL_ITEMS: {
  key: ToolTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'element', label: '요소', icon: Box },
  { key: 'history', label: '히스토리', icon: History },
  { key: 'comment', label: '코멘트', icon: MessageSquare },
];

const CONTENT_PANEL_WIDTH = 206;
const GAP_X = 12;

const CATEGORY_ROW1 = ['전체', '남성', '여성', '아동'] as const;
const CATEGORY_ROW2 = ['반팔', '긴팔', '긴바지', '원피스', '반바지'] as const;
const MOCK_TEMPLATES = [0, 1, 2, 3, 4, 5];
const MOCK_RECOMMENDED = [0, 1, 2, 3];

export default function WorksheetTemplateSidebar({
  collapsible = false,
}: WorksheetTemplateSidebarProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>('template');
  const [contentOpen, setContentOpen] = useState(true);
  const [cat1, setCat1] = useState('전체');
  const [cat2, setCat2] = useState('');

  const tabContent = (
    <>
      {activeTab === 'template' && (
        <>
          <div className='shrink-0 border-b border-gray-100 pb-2'>
            <div className='relative flex items-center gap-1 rounded-lg border border-gray-200 bg-white'>
              <textarea
                placeholder='템플릿 검색 (예: 카라가 있는 티셔츠)'
                className='form-input min-w-0 flex-1 resize-none rounded-l-lg border-0 px-2 py-1 pb-9 text-[13px] outline-none focus:ring-0'
              />
              <button
                type='button'
                className='absolute right-2 bottom-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700'
                aria-label='검색'
              >
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            <div className='mb-3'>
              <h4 className='mb-1 text-xs font-semibold text-gray-700'>추천 템플릿</h4>
              <div className='grid grid-cols-2 gap-1.5'>
                {MOCK_RECOMMENDED.map((i) => (
                  <div
                    key={i}
                    className='aspect-square rounded-md border border-gray-200 bg-[#f6f6f7]'
                  />
                ))}
              </div>
            </div>

            <div className='mb-2 flex flex-wrap gap-1'>
              {CATEGORY_ROW1.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => setCat1((prev) => (prev === c ? '' : c))}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat1 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className='mb-2 flex flex-wrap gap-1'>
              {CATEGORY_ROW2.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => setCat2((prev) => (prev === c ? '' : c))}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat2 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className='grid grid-cols-2 gap-1.5'>
              {MOCK_TEMPLATES.map((i) => (
                <div key={i} className='group cursor-pointer'>
                  <div className='mb-1 aspect-[4/3] rounded-md border border-gray-200 bg-[#f6f6f7] transition-colors group-hover:border-violet-300' />
                  <p className='truncate text-[10px] text-gray-500'>템플릿 {i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'element' && (
        <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto'>
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-2'>
            <p className='mb-2 text-[11px] font-semibold text-gray-700'>기본 요소</p>
            <div className='grid grid-cols-2 gap-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`element-placeholder-${i}`}
                  className='aspect-square rounded-md border border-gray-200 bg-white'
                />
              ))}
            </div>
          </div>
          <div className='rounded-lg border border-dashed border-gray-200 bg-white px-2 py-3 text-center text-[11px] text-gray-400'>
            요소 라이브러리는 준비 중입니다
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`history-placeholder-${i}`}
              className='rounded-md border border-gray-200 bg-white px-2 py-1.5'
            >
              <div className='mb-1 h-2 w-2/3 rounded bg-gray-200' />
              <div className='h-2 w-1/3 rounded bg-gray-100' />
            </div>
          ))}
          <p className='pt-1 text-center text-[11px] text-gray-400'>히스토리는 준비 중입니다</p>
        </div>
      )}

      {activeTab === 'comment' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`comment-placeholder-${i}`}
              className='rounded-md border border-gray-200 bg-white px-2 py-2'
            >
              <div className='mb-1 flex items-center gap-2'>
                <div className='h-4 w-4 rounded-full bg-gray-200' />
                <div className='h-2 w-16 rounded bg-gray-200' />
              </div>
              <div className='mb-1 h-2 w-full rounded bg-gray-100' />
              <div className='h-2 w-3/4 rounded bg-gray-100' />
            </div>
          ))}
          <p className='pt-1 text-center text-[11px] text-gray-400'>코멘트는 준비 중입니다</p>
        </div>
      )}
    </>
  );

  return (
    <div className='flex h-full min-h-0 bg-white p-2'>
      <div className='flex min-h-0 min-w-0 flex-1'>
        <nav className='flex w-14 shrink-0 flex-col gap-y-2'>
          <Link
            to='/faddit/drive'
            className='flex aspect-square cursor-pointer items-center justify-center rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-200/60'
            aria-label='패딧 홈으로 이동'
          >
            <img src={FadditLogoOnly} alt='Faddit' className='h-7 w-7' />
          </Link>

          {TOOL_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type='button'
              onClick={() => setActiveTab(key)}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-2 text-[10px] transition-colors ${
                activeTab === key
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
            </button>
          ))}
          {collapsible && (
            <div className='mt-auto flex justify-center py-2'>
              <button
                type='button'
                onClick={() => setContentOpen((open) => !open)}
                className='cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                aria-label={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
              >
                {contentOpen ? (
                  <ChevronsLeft size={18} strokeWidth={1.5} />
                ) : (
                  <ChevronsRight size={18} strokeWidth={1.5} />
                )}
              </button>
            </div>
          )}
        </nav>

        {collapsible ? (
          <div
            className='flex shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-in-out'
            style={{ width: contentOpen ? CONTENT_PANEL_WIDTH + GAP_X : 0 }}
          >
            <div
              className='flex min-h-0 min-w-[206px] flex-1 flex-col gap-y-3 pl-3 transition-opacity duration-300 ease-in-out'
              style={{ opacity: contentOpen ? 1 : 0 }}
            >
              {tabContent}
            </div>
          </div>
        ) : (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-y-3 pl-3'>
            {tabContent}
          </div>
        )}
      </div>
    </div>
  );
}
