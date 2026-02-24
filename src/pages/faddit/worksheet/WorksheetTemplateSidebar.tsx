import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  Check,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  History,
  LayoutGrid,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import FadditLogoOnly from '../../../images/icons/faddit-logo-only.svg';
import { useWorksheetV2Store } from '../worksheet-v2/useWorksheetV2Store';
import { CARD_DEFINITIONS } from '../worksheet-v2/worksheetV2Constants';

type ToolTab = 'template' | 'module' | 'history' | 'comment';

interface WorksheetTemplateSidebarProps {
  collapsible?: boolean;
}

const TOOL_ITEMS: {
  key: ToolTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'module', label: '모듈', icon: Box },
  { key: 'history', label: '히스토리', icon: History },
  { key: 'comment', label: '코멘트', icon: MessageSquare },
];

const CONTENT_PANEL_WIDTH = 206;
const GAP_X = 12;
const WORKSHEET_MODULE_DRAG_TYPE = 'application/x-faddit-worksheet-card';

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
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [editingCustomCardId, setEditingCustomCardId] = useState<string | null>(null);
  const [editingCustomTitle, setEditingCustomTitle] = useState('');

  const worksheetActiveTab = useWorksheetV2Store((s) => s.activeTab);
  const cardVisibility = useWorksheetV2Store((s) => s.cardVisibility);
  const toggleCardVisibility = useWorksheetV2Store((s) => s.toggleCardVisibility);
  const restoreCard = useWorksheetV2Store((s) => s.restoreCard);
  const addCustomCard = useWorksheetV2Store((s) => s.addCustomCard);
  const updateCustomCardTitle = useWorksheetV2Store((s) => s.updateCustomCardTitle);
  const deleteCustomCard = useWorksheetV2Store((s) => s.deleteCustomCard);
  const customCards = useWorksheetV2Store((s) => s.customCards);
  const setDraggingCardId = useWorksheetV2Store((s) => s.setDraggingCardId);

  const cards = [...CARD_DEFINITIONS[worksheetActiveTab], ...customCards[worksheetActiveTab]];
  const visMap = cardVisibility[worksheetActiveTab];

  const addCustomModule = () => {
    addCustomCard(worksheetActiveTab, customTitle);
    setCustomTitle('');
  };

  const startEditingCustomModule = (cardId: string, currentTitle: string) => {
    setEditingCustomCardId(cardId);
    setEditingCustomTitle(currentTitle);
  };

  const cancelEditingCustomModule = () => {
    setEditingCustomCardId(null);
    setEditingCustomTitle('');
  };

  const commitEditingCustomModule = () => {
    if (!editingCustomCardId) {
      return;
    }

    updateCustomCardTitle(worksheetActiveTab, editingCustomCardId, editingCustomTitle);
    cancelEditingCustomModule();
  };

  useEffect(() => {
    setEditingCustomCardId(null);
    setEditingCustomTitle('');
  }, [worksheetActiveTab]);

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

      {activeTab === 'module' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'>
          <div className='flex items-center gap-2'>
            <input
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder='커스텀 웹에디터 제목'
              className='form-input h-8 flex-1 text-xs'
            />
            <button
              type='button'
              onClick={addCustomModule}
              className='inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50'
              aria-label='커스텀 모듈 추가'
            >
              <Plus size={14} />
            </button>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const droppedCardId =
                event.dataTransfer.getData(WORKSHEET_MODULE_DRAG_TYPE) ||
                event.dataTransfer.getData('text/plain') ||
                dragCardId;
              if (!droppedCardId) return;
              restoreCard(worksheetActiveTab, droppedCardId);
              setDragCardId(null);
              setDraggingCardId(null);
            }}
            className='rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500'
          >
            숨김 모듈을 여기로 드래그하면 화면에 표시됩니다.
          </div>

          <div className='overflow-hidden rounded-lg border border-gray-200'>
            {cards.map((card) => {
              const visible = visMap[card.id] ?? true;
              const custom = !card.isDefault;
              const isEditingCustom = custom && editingCustomCardId === card.id;

              return (
                <div
                  key={card.id}
                  draggable={!visible}
                  onDragStart={(event) => {
                    setDragCardId(card.id);
                    setDraggingCardId(card.id);
                    event.dataTransfer.setData(WORKSHEET_MODULE_DRAG_TYPE, card.id);
                    event.dataTransfer.setData('text/plain', card.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragCardId(null);
                    setDraggingCardId(null);
                  }}
                  className='flex items-center gap-2 border-b border-gray-100 bg-white px-2 py-2 text-sm last:border-b-0'
                >
                  <button
                    type='button'
                    onClick={() => toggleCardVisibility(worksheetActiveTab, card.id)}
                    className='inline-flex items-center'
                    aria-label={`${card.title} 표시 토글`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        visible ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {visible && <Check size={10} strokeWidth={3} />}
                    </span>
                  </button>

                  {!visible ? <GripVertical size={13} className='text-gray-400' /> : null}

                  <div className='min-w-0 flex-1'>
                    {isEditingCustom ? (
                      <input
                        value={editingCustomTitle}
                        autoFocus
                        onChange={(event) => setEditingCustomTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitEditingCustomModule();
                            return;
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditingCustomModule();
                          }
                        }}
                        className='form-input h-6 w-full text-xs'
                      />
                    ) : (
                      <p className='truncate text-xs'>{card.title}</p>
                    )}
                    <p className={`text-[10px] ${visible ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {visible ? '표시 중' : '숨김'}
                    </p>
                  </div>

                  {custom ? (
                    <div className='flex items-center gap-1'>
                      {isEditingCustom ? (
                        <button
                          type='button'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={commitEditingCustomModule}
                          className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                          aria-label='커스텀 모듈 이름 수정완료'
                        >
                          <Check size={13} />
                        </button>
                      ) : (
                        <>
                          <button
                            type='button'
                            onClick={() => startEditingCustomModule(card.id, card.title)}
                            className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            aria-label='커스텀 모듈 이름 수정'
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type='button'
                            onClick={() => deleteCustomCard(worksheetActiveTab, card.id)}
                            className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500'
                            aria-label='커스텀 모듈 삭제'
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}

                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      custom ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {custom ? '커스텀' : '기본'}
                  </span>
                </div>
              );
            })}
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
