import React, { useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Check,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Lock,
  Minus,
  Paintbrush,
  PenTool,
  Pencil,
  Scissors,
  Square,
  Trash2,
  Triangle,
  Type,
  Ungroup,
  Unlock,
  Wrench,
} from 'lucide-react';
import { useCanvas, type AlignType, type ToolType } from './CanvasProvider';

const CONTENT_PANEL_WIDTH = 224;
const GAP_X = 12;

const TOOL_ITEMS = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'brush', label: '브러쉬', icon: Paintbrush },
  { key: 'sewing', label: '봉제', icon: Scissors },
  { key: 'text', label: '텍스트', icon: Type },
  { key: 'tools', label: '도구', icon: Wrench },
  { key: 'layer', label: '레이어', icon: Layers },
];

const ALIGN_BUTTONS: { type: AlignType; icon: React.ReactNode; title: string }[] = [
  { type: 'left', icon: <AlignStartVertical size={14} strokeWidth={1.5} />, title: '왼쪽 정렬' },
  {
    type: 'centerH',
    icon: <AlignCenterVertical size={14} strokeWidth={1.5} />,
    title: '수평 중앙 정렬',
  },
  { type: 'right', icon: <AlignEndVertical size={14} strokeWidth={1.5} />, title: '오른쪽 정렬' },
  { type: 'top', icon: <AlignStartHorizontal size={14} strokeWidth={1.5} />, title: '위 정렬' },
  {
    type: 'centerV',
    icon: <AlignCenterHorizontal size={14} strokeWidth={1.5} />,
    title: '수직 중앙 정렬',
  },
  { type: 'bottom', icon: <AlignEndHorizontal size={14} strokeWidth={1.5} />, title: '아래 정렬' },
];

const RECOMMENDED_SECTIONS_COUNT = 3;
const PLACEHOLDERS_PER_SECTION = 4;

const SHAPE_ITEMS: { tool: ToolType; label: string; icon: React.ReactNode }[] = [
  { tool: 'rect', label: '사각형 (R)', icon: <Square size={18} strokeWidth={1.5} /> },
  { tool: 'ellipse', label: '원 (O)', icon: <Circle size={18} strokeWidth={1.5} /> },
  { tool: 'triangle', label: '삼각형 (Y)', icon: <Triangle size={18} strokeWidth={1.5} /> },
  { tool: 'line', label: '선 (L)', icon: <Minus size={18} strokeWidth={1.5} /> },
  { tool: 'arrow', label: '화살표 (A)', icon: <ArrowRight size={18} strokeWidth={1.5} /> },
  { tool: 'draw', label: '브러쉬 (B)', icon: <Paintbrush size={18} strokeWidth={1.5} /> },
  { tool: 'pen', label: '펜 (P)', icon: <PenTool size={18} strokeWidth={1.5} /> },
  { tool: 'text', label: '텍스트 (T)', icon: <Type size={18} strokeWidth={1.5} /> },
];

export default function WorksheetToolbox() {
  const [activePanelKey, setActivePanelKey] = useState('template');
  const [contentOpen, setContentOpen] = useState(true);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const touchActionLockRef = useRef(false);

  const {
    layers,
    alignSelected,
    toggleLayerVisibility,
    toggleLayerLock,
    toggleLayerExpanded,
    activeTool,
    setActiveTool,
    activeLayerId,
    selectLayer,
    renameLayer,
    deleteSelected,
    groupSelected,
    ungroupSelected,
  } = useCanvas();

  const beginLayerRename = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingLayerName(currentName);
  };

  const commitLayerRename = () => {
    if (!editingLayerId) return;
    renameLayer(editingLayerId, editingLayerName);
    setEditingLayerId(null);
    setEditingLayerName('');
  };

  const handleFastPress = (
    event: React.PointerEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    if (event.pointerType !== 'touch') {
      return;
    }

    event.preventDefault();
    touchActionLockRef.current = true;
    action();
  };

  const runClickAction = (action: () => void) => {
    if (touchActionLockRef.current) {
      touchActionLockRef.current = false;
      return;
    }

    action();
  };

  const handleToolTabClick = (tab: string) => {
    setActivePanelKey(tab);
    setContentOpen(true);
  };

  return (
    <div className='flex h-full shrink-0 overflow-hidden rounded-lg bg-white p-3 shadow-sm'>
      <div className='flex min-h-0 min-w-0 flex-1'>
        <nav className='flex w-14 shrink-0 flex-col gap-y-2'>
          {TOOL_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type='button'
              onPointerDown={(event) => handleFastPress(event, () => handleToolTabClick(key))}
              onClick={() => runClickAction(() => handleToolTabClick(key))}
              className={`flex touch-manipulation aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-2 text-[10px] transition-colors ${
                activePanelKey === key
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
            </button>
          ))}
          <div className='mt-auto flex justify-center py-2'>
            <button
              type='button'
              onPointerDown={(event) =>
                handleFastPress(event, () => setContentOpen((open) => !open))
              }
              onClick={() => runClickAction(() => setContentOpen((open) => !open))}
              className='touch-manipulation cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              aria-label={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
            >
              {contentOpen ? (
                <ChevronsLeft size={18} strokeWidth={1.5} />
              ) : (
                <ChevronsRight size={18} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </nav>

        <div
          className='flex shrink-0 flex-col overflow-hidden transition-[width] duration-150 ease-out'
          style={{ width: contentOpen ? CONTENT_PANEL_WIDTH + GAP_X : 0 }}
        >
          <div
            className='flex min-h-0 min-w-56 flex-1 flex-col gap-y-2 pl-3 transition-opacity duration-150 ease-out'
            style={{ opacity: contentOpen ? 1 : 0 }}
          >
            {activePanelKey === 'tools' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-y-auto'>
                <p className='shrink-0 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                  도구
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {SHAPE_ITEMS.map(({ tool, label, icon }) => (
                    <button
                      key={tool}
                      type='button'
                      onPointerDown={(event) => handleFastPress(event, () => setActiveTool(tool))}
                      onClick={() => runClickAction(() => setActiveTool(tool))}
                      title={label}
                      className={`flex touch-manipulation flex-col items-center gap-1 rounded-lg px-2 py-3 text-[10px] transition-colors ${
                        activeTool === tool
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : activePanelKey === 'layer' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-hidden'>
                <div className='shrink-0'>
                  <p className='mb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                    Position
                  </p>
                  <div className='grid grid-cols-6 gap-1'>
                    {ALIGN_BUTTONS.map(({ type, icon, title }) => (
                      <button
                        key={type}
                        type='button'
                        onClick={() => alignSelected(type)}
                        title={title}
                        className='flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  <div className='mb-1.5 flex shrink-0 items-center gap-1'>
                    <p className='flex-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                      Layers
                    </p>
                    <button
                      type='button'
                      onClick={groupSelected}
                      title='그룹화 (Cmd/Ctrl+G)'
                      className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                    >
                      <Layers size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      type='button'
                      onClick={ungroupSelected}
                      title='그룹 해제 (Cmd/Ctrl+Alt+G)'
                      className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                    >
                      <Ungroup size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      type='button'
                      onClick={deleteSelected}
                      title='삭제 (Delete)'
                      className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500'
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className='flex min-h-0 flex-1 flex-col gap-y-0.5 overflow-y-auto'>
                    {layers.length === 0 && (
                      <p className='py-4 text-center text-xs text-gray-400'>
                        캔버스가 비어 있습니다
                      </p>
                    )}
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => selectLayer(layer.id)}
                        className={`flex cursor-pointer items-center gap-1 rounded-md py-1 pr-1 ${
                          activeLayerId === layer.id
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        style={{ paddingLeft: `${4 + layer.depth * 12}px` }}
                      >
                        {layer.isGroup ? (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerExpanded(layer.id);
                            }}
                            className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                          >
                            {layer.isExpanded ? (
                              <ChevronDown size={12} strokeWidth={1.5} />
                            ) : (
                              <ChevronRight size={12} strokeWidth={1.5} />
                            )}
                          </button>
                        ) : (
                          <span className='w-3 shrink-0' />
                        )}

                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          title={layer.visible ? '숨기기' : '표시'}
                          className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                        >
                          {layer.visible ? (
                            <Eye size={13} strokeWidth={1.5} />
                          ) : (
                            <EyeOff size={13} strokeWidth={1.5} />
                          )}
                        </button>

                        <div
                          className='h-3 w-3 shrink-0 rounded-sm border border-gray-200'
                          style={{ background: layer.previewColor }}
                          title={layer.previewColor}
                        />

                        {editingLayerId === layer.id ? (
                          <input
                            value={editingLayerName}
                            onChange={(e) => setEditingLayerName(e.target.value)}
                            onBlur={commitLayerRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitLayerRename();
                              }
                              if (e.key === 'Escape') {
                                setEditingLayerId(null);
                                setEditingLayerName('');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className='form-input h-6 min-w-0 flex-1 px-1 text-xs'
                            autoFocus
                          />
                        ) : (
                          <span
                            className='min-w-0 flex-1 truncate text-xs text-gray-700'
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              beginLayerRename(layer.id, layer.name);
                            }}
                          >
                            {layer.name}
                          </span>
                        )}

                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingLayerId === layer.id) {
                              commitLayerRename();
                              return;
                            }
                            beginLayerRename(layer.id, layer.name);
                          }}
                          title={editingLayerId === layer.id ? '수정 완료' : '이름 수정'}
                          className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                        >
                          {editingLayerId === layer.id ? (
                            <Check size={13} strokeWidth={1.7} />
                          ) : (
                            <Pencil size={13} strokeWidth={1.7} />
                          )}
                        </button>

                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerLock(layer.id);
                          }}
                          title={layer.locked ? '잠금 해제' : '잠금'}
                          className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                        >
                          {layer.locked ? (
                            <Lock size={13} strokeWidth={1.5} />
                          ) : (
                            <Unlock size={13} strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className='shrink-0 border-b border-gray-100'>
                  <div className='relative flex items-center gap-1 rounded-lg border border-gray-200 bg-white'>
                    <textarea
                      placeholder='템플릿 검색 (예: 카라가 있는 티셔츠)'
                      className='form-input min-w-0 flex-1 resize-none rounded-l-lg border-0 px-2 py-1 pb-9 text-sm text-[13px] outline-none focus:ring-0'
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
                <div className='flex min-h-0 flex-1 flex-col gap-y-4 overflow-y-auto'>
                  {Array.from({ length: RECOMMENDED_SECTIONS_COUNT }).map((_, sectionIndex) => (
                    <div key={sectionIndex} className='flex flex-col gap-y-2'>
                      <p className='text-xs font-semibold text-gray-700'>추천 템플릿</p>
                      <div className='grid grid-cols-2 gap-2'>
                        {Array.from({ length: PLACEHOLDERS_PER_SECTION }).map((_, i) => (
                          <div key={i} className='aspect-square rounded-lg bg-gray-100' />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
