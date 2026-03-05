import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowRight,
  Bold,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Check,
  Eye,
  EyeOff,
  Italic,
  Layers,
  LayoutGrid,
  Lock,
  Minus,
  Paintbrush,
  Palette,
  PenTool,
  Pencil,
  Scissors,
  Search,
  Square,
  Trash2,
  Triangle,
  Type,
  Ungroup,
  Unlock,
  Wrench,
} from 'lucide-react';
import {
  CgPathBack,
  CgPathCrop,
  CgPathDivide,
  CgPathExclude,
  CgPathFront,
  CgPathIntersect,
  CgPathOutline,
  CgPathTrim,
  CgPathUnite,
} from 'react-icons/cg';
import FadditLogoOnly from '../../../images/icons/faddit-logo-only.svg';
import { useCanvas, type AlignType, type ToolType } from './CanvasProvider';
import type { PathfinderOp } from './pathfinder';
import SketchColorPicker from './SketchColorPicker';

const CONTENT_PANEL_WIDTH = 230;
const GAP_X = 12;

const TOOL_ITEMS = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'tools', label: '도구', icon: Wrench },
  { key: 'text', label: '텍스트', icon: Type },
  { key: 'color', label: '색상', icon: Palette },
  { key: 'layer', label: '레이어', icon: Layers },
  { key: 'brush', label: '브러쉬', icon: Paintbrush },
  { key: 'sewing', label: '봉제', icon: Scissors },
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
const PATHFINDER_BUTTONS: { op: PathfinderOp; title: string }[] = [
  { op: 'unite', title: '합치기' },
  { op: 'minusFront', title: '앞면 제외' },
  { op: 'intersect', title: '교차 영역' },
  { op: 'exclude', title: '교차 영역 제외' },
  { op: 'divide', title: '나누기' },
  { op: 'trim', title: '동색 오브젝트 분리' },
  { op: 'merge', title: '병합' },
  { op: 'crop', title: '자르기' },
  { op: 'outline', title: '윤곽선' },
  { op: 'minusBack', title: '이면 오브젝트 제외' },
];

const LAYER_ORDER_ICON_SIZE = 18;
const LAYER_ORDER_ICON_STROKE = 1.8;

function PathfinderGlyph({ op }: { op: PathfinderOp }) {
  const iconClass = 'h-[20px] w-[20px] text-current';

  if (op === 'unite') return <CgPathUnite className={iconClass} />;
  if (op === 'intersect') return <CgPathIntersect className={iconClass} />;
  if (op === 'exclude') return <CgPathExclude className={iconClass} />;
  if (op === 'divide') return <CgPathDivide className={iconClass} />;
  if (op === 'trim') return <CgPathTrim className={iconClass} />;
  if (op === 'crop') return <CgPathCrop className={iconClass} />;
  if (op === 'outline') return <CgPathOutline className={iconClass} />;
  if (op === 'minusBack') return <CgPathBack className={iconClass} />;
  if (op === 'minusFront') return <CgPathFront className={iconClass} />;

  return <CgPathUnite className={iconClass} />;
}

type LayerOrderGlyphProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function LayerBringToFrontGlyph({
  size = LAYER_ORDER_ICON_SIZE,
  strokeWidth = LAYER_ORDER_ICON_STROKE,
  className,
}: LayerOrderGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      shapeRendering='geometricPrecision'
      className={className}
      aria-hidden='true'
    >
      <path d='M12 4 20 8 12 12 4 8Z' />
      <path d='M4 13 12 17 20 13' />
      <path d='M4 16 12 20 20 16' />
      <path d='M12 2v9' />
      <path d='m9.3 4.7 2.7-2.7 2.7 2.7' />
    </svg>
  );
}

function LayerBringForwardGlyph({
  size = LAYER_ORDER_ICON_SIZE,
  strokeWidth = LAYER_ORDER_ICON_STROKE,
  className,
}: LayerOrderGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      shapeRendering='geometricPrecision'
      className={className}
      aria-hidden='true'
    >
      <path d='M12 5 20 9 12 13 4 9Z' />
      <path d='M4 14 12 18 20 14' />
      <path d='M12 3v8.5' />
      <path d='m9.3 5.7 2.7-2.7 2.7 2.7' />
    </svg>
  );
}

function LayerSendBackwardGlyph({
  size = LAYER_ORDER_ICON_SIZE,
  strokeWidth = LAYER_ORDER_ICON_STROKE,
  className,
}: LayerOrderGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      shapeRendering='geometricPrecision'
      className={className}
      aria-hidden='true'
    >
      <path d='M12 5 20 9 12 13 4 9Z' />
      <path d='M4 14 12 18 20 14' />
      <path d='M12 5.5v9' />
      <path d='m9.3 11.9 2.7 2.7 2.7-2.7' />
    </svg>
  );
}

function LayerSendToBackGlyph({
  size = LAYER_ORDER_ICON_SIZE,
  strokeWidth = LAYER_ORDER_ICON_STROKE,
  className,
}: LayerOrderGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      shapeRendering='geometricPrecision'
      className={className}
      aria-hidden='true'
    >
      <path d='M12 4 20 8 12 12 4 8Z' />
      <path d='M4 11 12 15 20 11' />
      <path d='M4 14 12 18 20 14' />
      <path d='M12 5.5v10.5' />
      <path d='m9.3 13.3 2.7 2.7 2.7-2.7' />
    </svg>
  );
}

function SidePanelTooltip({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });

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
    if (!open) return;

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [open, updateTooltipPosition]);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className ?? ''}`}
      onMouseEnter={() => {
        updateTooltipPosition();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        updateTooltipPosition();
        setOpen(true);
      }}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
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
              open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            {title}
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}

function IconGridTooltipButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SidePanelTooltip title={title} className='w-full'>
      <button
        type='button'
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`flex aspect-square w-full cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors duration-150 hover:bg-gray-200/70 hover:text-gray-700 ${className ?? ''}`}
      >
        {children}
      </button>
    </SidePanelTooltip>
  );
}

const RECOMMENDED_SECTIONS_COUNT = 3;
const PLACEHOLDERS_PER_SECTION = 4;

const SHAPE_ITEMS: { tool: ToolType; label: string; icon: React.ReactNode }[] = [
  { tool: 'rect', label: '사각형 (R)', icon: <Square size={18} strokeWidth={1.5} /> },
  { tool: 'ellipse', label: '원 (O)', icon: <Circle size={18} strokeWidth={1.5} /> },
  { tool: 'triangle', label: '삼각형 (Y)', icon: <Triangle size={18} strokeWidth={1.5} /> },
  { tool: 'line', label: '선 (L)', icon: <Minus size={18} strokeWidth={1.5} /> },
  { tool: 'arrow', label: '화살표', icon: <ArrowRight size={18} strokeWidth={1.5} /> },
  { tool: 'draw', label: '브러쉬 (B)', icon: <Paintbrush size={18} strokeWidth={1.5} /> },
  { tool: 'pen', label: '펜 (P)', icon: <PenTool size={18} strokeWidth={1.5} /> },
  { tool: 'text', label: '텍스트 (T)', icon: <Type size={18} strokeWidth={1.5} /> },
];

const TEXT_FONT_PRESETS: { label: string; family: string; preview: string }[] = [
  { label: 'Pretendard', family: 'Pretendard', preview: '가나다라마바사 ABC 123' },
  { label: 'SUIT', family: 'SUIT', preview: '깔끔한 UI 본문 스타일' },
  { label: 'Spoqa Han Sans Neo', family: 'Spoqa Han Sans Neo', preview: '한글 UI에 적합한 산세리프' },
  { label: 'Noto Sans KR', family: 'Noto Sans KR', preview: '한글 가독성이 좋은 본문체' },
  { label: 'Noto Serif KR', family: 'Noto Serif KR', preview: '세리프 스타일 제목 샘플' },
  { label: 'IBM Plex Sans KR', family: 'IBM Plex Sans KR', preview: '모던한 한글 산세리프' },
  { label: 'IBM Plex Serif KR', family: 'IBM Plex Serif KR', preview: '차분한 한글 세리프' },
  { label: 'Nanum Gothic', family: 'Nanum Gothic', preview: '나눔고딕 본문 스타일 예시' },
  { label: 'Nanum Myeongjo', family: 'Nanum Myeongjo', preview: '명조 계열 감성 문장 예시' },
  { label: 'Nanum Pen Script', family: 'Nanum Pen Script', preview: '손글씨 느낌 한글 샘플' },
  { label: 'Nanum Brush Script', family: 'Nanum Brush Script', preview: '브러시 느낌 한글 샘플' },
  { label: 'Black Han Sans', family: 'Black Han Sans', preview: '강한 헤드라인용 한글 폰트' },
  { label: 'Gowun Dodum', family: 'Gowun Dodum', preview: '부드러운 한글 본문 폰트' },
  { label: 'Gowun Batang', family: 'Gowun Batang', preview: '정갈한 한글 바탕체 샘플' },
  { label: 'Do Hyeon', family: 'Do Hyeon', preview: '굵은 한글 제목 샘플' },
  { label: 'Jua', family: 'Jua', preview: '친근한 라운드 한글 폰트' },
  { label: 'Sunflower', family: 'Sunflower', preview: '명확한 인상의 한글 폰트' },
  { label: 'Song Myung', family: 'Song Myung', preview: '클래식한 한글 서체 샘플' },
  { label: 'Poor Story', family: 'Poor Story', preview: '개성 있는 손글씨 한글' },
  { label: 'Hi Melody', family: 'Hi Melody', preview: '밝은 감성의 한글 손글씨' },
  { label: 'Gamja Flower', family: 'Gamja Flower', preview: '아기자기한 한글 폰트' },
  { label: 'Yeon Sung', family: 'Yeon Sung', preview: '캘리 느낌 한글 타이포' },
  { label: '맑은 고딕', family: 'Malgun Gothic', preview: '시스템 기본 한글 폰트 예시' },
  { label: 'Apple SD Gothic Neo', family: 'Apple SD Gothic Neo', preview: '애플 시스템 한글 폰트 예시' },
  { label: 'Inter', family: 'Inter', preview: 'Modern UI text sample' },
  { label: 'Roboto', family: 'Roboto', preview: 'Balanced sans serif sample' },
  { label: 'Open Sans', family: 'Open Sans', preview: 'Readable body copy sample' },
  { label: 'Lato', family: 'Lato', preview: 'Friendly editorial sample' },
  { label: 'Montserrat', family: 'Montserrat', preview: 'Clean heading sample' },
  { label: 'Poppins', family: 'Poppins', preview: 'Rounded geometric sample' },
  { label: 'Nunito', family: 'Nunito', preview: 'Soft UI font sample' },
  { label: 'Raleway', family: 'Raleway', preview: 'Elegant title sample' },
  { label: 'Work Sans', family: 'Work Sans', preview: 'Neutral text sample' },
  { label: 'Manrope', family: 'Manrope', preview: 'Contemporary UI font sample' },
  { label: 'DM Sans', family: 'DM Sans', preview: 'Modern display text sample' },
  { label: 'Source Sans 3', family: 'Source Sans 3', preview: 'Readable interface sample' },
  { label: 'Source Serif 4', family: 'Source Serif 4', preview: 'Editorial serif sample' },
  { label: 'Merriweather', family: 'Merriweather', preview: 'Comfortable reading sample' },
  { label: 'Playfair Display', family: 'Playfair Display', preview: 'Luxury heading sample' },
  { label: 'PT Sans', family: 'PT Sans', preview: 'Classic sans sample' },
  { label: 'Rubik', family: 'Rubik', preview: 'Rounded modern sample' },
  { label: 'Quicksand', family: 'Quicksand', preview: 'Soft rounded sample' },
  { label: 'Space Grotesk', family: 'Space Grotesk', preview: 'Trendy headline sample' },
  { label: 'Oswald', family: 'Oswald', preview: 'Condensed heading sample' },
  { label: 'Barlow', family: 'Barlow', preview: 'Versatile branding sample' },
  { label: 'Fira Sans', family: 'Fira Sans', preview: 'Clear UI text sample' },
  { label: 'Fira Mono', family: 'Fira Mono', preview: 'Monospace coding sample' },
  { label: 'JetBrains Mono', family: 'JetBrains Mono', preview: 'Developer monospace sample' },
  { label: 'Inconsolata', family: 'Inconsolata', preview: 'Clean monospace sample' },
  { label: 'Helvetica Neue', family: 'Helvetica Neue', preview: 'Clean sans serif sample text' },
  { label: 'Arial', family: 'Arial', preview: 'Balanced sans serif sample' },
  { label: 'Georgia', family: 'Georgia', preview: 'Elegant serif sample title' },
  { label: 'Times New Roman', family: 'Times New Roman', preview: 'Classic editorial style sample' },
  { label: 'Courier New', family: 'Courier New', preview: 'Monospace coding style sample' },
  { label: 'Trebuchet MS', family: 'Trebuchet MS', preview: 'Friendly UI heading sample' },
  { label: 'Impact', family: 'Impact', preview: 'Bold headline visual sample' },
];

const INITIAL_TEXT_FONT_COUNT = 8;
type SidePanelOpenEventDetail = {
  panel?: string;
  target?: 'fill' | 'stroke';
};

export default function WorksheetToolbox() {
  const [activePanelKey, setActivePanelKey] = useState('template');
  const [contentOpen, setContentOpen] = useState(true);
  const [colorTarget, setColorTarget] = useState<'fill' | 'stroke'>('fill');
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [visibleFontCount, setVisibleFontCount] = useState(INITIAL_TEXT_FONT_COUNT);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const touchActionLockRef = useRef(false);
  const fontListRef = useRef<HTMLDivElement | null>(null);

  const {
    fillColor,
    setFillColor,
    fillPantoneCode,
    setFillPantoneCode,
    strokeColor,
    setStrokeColor,
    strokePantoneCode,
    setStrokePantoneCode,
    layers,
    alignSelected,
    applyPathfinder,
    toggleLayerVisibility,
    toggleLayerLock,
    toggleLayerExpanded,
    moveLayerUp,
    moveLayerDown,
    moveLayerToFront,
    moveLayerToBack,
    activeTool,
    setActiveTool,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    fontWeight,
    setFontWeight,
    fontStyle,
    setFontStyle,
    selectedType,
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

  const activeLayerIndex = layers.findIndex((layer) => layer.id === activeLayerId);
  const hasActiveLayer = activeLayerIndex >= 0;
  const canBringForward = hasActiveLayer && activeLayerIndex > 0;
  const canSendBackward = hasActiveLayer && activeLayerIndex < layers.length - 1;
  const normalizedFontQuery = fontSearchQuery.trim().toLowerCase();
  const filteredFontPresets = useMemo(
    () =>
      TEXT_FONT_PRESETS.filter((font) => {
        if (!normalizedFontQuery) {
          return true;
        }
        return (
          font.label.toLowerCase().includes(normalizedFontQuery) ||
          font.family.toLowerCase().includes(normalizedFontQuery) ||
          font.preview.toLowerCase().includes(normalizedFontQuery)
        );
      }),
    [normalizedFontQuery],
  );
  const visibleFontPresets = filteredFontPresets.slice(0, visibleFontCount);
  const hasMoreFonts = visibleFontCount < filteredFontPresets.length;

  const handleFontListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreFonts) {
        return;
      }

      const target = event.currentTarget;
      const distanceToBottom = target.scrollHeight - (target.scrollTop + target.clientHeight);
      if (distanceToBottom > 32) {
        return;
      }

      setVisibleFontCount((count) =>
        Math.min(count + INITIAL_TEXT_FONT_COUNT, filteredFontPresets.length),
      );
    },
    [hasMoreFonts, filteredFontPresets.length],
  );

  useEffect(() => {
    setVisibleFontCount(INITIAL_TEXT_FONT_COUNT);
  }, [fontSearchQuery]);

  useEffect(() => {
    if (activePanelKey !== 'text' || !hasMoreFonts) {
      return;
    }

    const container = fontListRef.current;
    if (!container) {
      return;
    }

    if (container.scrollHeight <= container.clientHeight + 1) {
      setVisibleFontCount((count) =>
        Math.min(count + INITIAL_TEXT_FONT_COUNT, filteredFontPresets.length),
      );
    }
  }, [activePanelKey, hasMoreFonts, visibleFontCount, filteredFontPresets.length]);

  useEffect(() => {
    const handleOpenPanel = (event: Event) => {
      const customEvent = event as CustomEvent<SidePanelOpenEventDetail>;
      const detail = customEvent.detail;
      if (!detail || detail.panel !== 'color') {
        return;
      }

      if (detail.target === 'fill' || detail.target === 'stroke') {
        setColorTarget(detail.target);
      }
      setActivePanelKey('color');
      setContentOpen(true);
    };

    window.addEventListener('faddit:open-side-panel', handleOpenPanel as EventListener);
    return () => {
      window.removeEventListener('faddit:open-side-panel', handleOpenPanel as EventListener);
    };
  }, []);

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
            <SidePanelTooltip key={key} title={label} className='w-full'>
              <button
                type='button'
                onPointerDown={(event) => handleFastPress(event, () => handleToolTabClick(key))}
                onClick={() => runClickAction(() => handleToolTabClick(key))}
                title={label}
                aria-label={label}
                className={`flex w-full touch-manipulation aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-2 text-[10px] transition-colors ${
                  activePanelKey === key
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                {label}
              </button>
            </SidePanelTooltip>
          ))}
          <div className='mt-auto flex justify-center py-2'>
            <SidePanelTooltip title={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}>
              <button
                type='button'
                onPointerDown={(event) =>
                  handleFastPress(event, () => setContentOpen((open) => !open))
                }
                onClick={() => runClickAction(() => setContentOpen((open) => !open))}
                className='touch-manipulation cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                title={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
                aria-label={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
              >
                {contentOpen ? (
                  <ChevronsLeft size={18} strokeWidth={1.5} />
                ) : (
                  <ChevronsRight size={18} strokeWidth={1.5} />
                )}
              </button>
            </SidePanelTooltip>
          </div>
        </nav>

        <div
          className='flex shrink-0 flex-col overflow-hidden transition-[width] duration-150 ease-out'
          style={{ width: contentOpen ? CONTENT_PANEL_WIDTH + GAP_X : 0 }}
        >
          <div
            className='flex min-h-0 flex-1 flex-col gap-y-2 pl-3 transition-opacity duration-150 ease-out'
            style={{ opacity: contentOpen ? 1 : 0, minWidth: CONTENT_PANEL_WIDTH }}
          >
            {activePanelKey === 'tools' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-y-auto'>
                <p className='shrink-0 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                  도구
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {SHAPE_ITEMS.map(({ tool, label, icon }) => (
                    <SidePanelTooltip key={tool} title={label} className='w-full'>
                      <button
                        type='button'
                        onPointerDown={(event) => handleFastPress(event, () => setActiveTool(tool))}
                        onClick={() => runClickAction(() => setActiveTool(tool))}
                        title={label}
                        aria-label={label}
                        className={`flex w-full touch-manipulation flex-col items-center gap-1 rounded-lg px-2 py-3 text-[10px] transition-colors ${
                          activeTool === tool
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    </SidePanelTooltip>
                  ))}
                </div>
              </div>
            ) : activePanelKey === 'text' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-y-auto overflow-x-hidden'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                    텍스트
                  </p>
                  <button
                    type='button'
                    onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
                    className={`h-6 shrink-0 rounded-md border px-2 text-[10px] font-medium transition-colors ${
                      activeTool === 'text'
                        ? 'border-gray-800 bg-gray-800 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {activeTool === 'text' ? '텍스트 모드' : '텍스트 추가'}
                  </button>
                </div>

                <div className='rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
                  <p className='mb-1 text-[10px] font-semibold tracking-wide text-gray-500'>텍스트 스타일</p>
                  <div className='grid grid-cols-[1fr_auto_auto] items-center gap-1.5'>
                    <label className='flex min-w-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2'>
                      <span className='shrink-0 text-[10px] text-gray-500'>크기</span>
                      <input
                        type='number'
                        min={8}
                        max={200}
                        value={fontSize}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (!Number.isFinite(parsed)) {
                            return;
                          }
                          setFontSize(Math.max(8, Math.min(200, Math.round(parsed))));
                        }}
                        className='h-7 min-w-0 flex-1 text-right text-[11px] text-gray-700 outline-none border-none focus:ring-0'
                      />
                    </label>
                    <button
                      type='button'
                      onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        fontWeight === 'bold'
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      title='굵게'
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type='button'
                      onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        fontStyle === 'italic'
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      title='기울임'
                    >
                      <Italic size={13} />
                    </button>
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
                  <div className='mb-1.5 flex items-center justify-between'>
                    <p className='text-[10px] font-semibold tracking-wide text-gray-500'>글꼴 검색/목록</p>
                    <span className='text-[10px] text-gray-400'>{filteredFontPresets.length}개</span>
                  </div>
                  <div className='mb-1.5 flex min-w-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2'>
                    <Search size={13} className='shrink-0 text-gray-400' />
                    <input
                      type='text'
                      value={fontSearchQuery}
                      onChange={(event) => setFontSearchQuery(event.target.value)}
                      placeholder='폰트명 검색'
                      className='h-7 min-w-0 flex-1 text-[11px] text-gray-700 outline-none border-none focus:ring-0'
                    />
                  </div>
                  <div
                    ref={fontListRef}
                    onScroll={handleFontListScroll}
                    className='min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5'
                  >
                    {visibleFontPresets.length > 0 ? (
                      visibleFontPresets.map((font) => (
                        <button
                          key={font.family}
                          type='button'
                          onClick={() => setFontFamily(font.family)}
                          className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                            fontFamily === font.family
                              ? 'border-gray-800 bg-gray-800 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className='block truncate text-[11px] font-medium'>{font.label}</span>
                          <span
                            className={`mt-0.5 block truncate text-[12px] ${
                              fontFamily === font.family ? 'text-gray-200' : 'text-gray-600'
                            }`}
                            style={{ fontFamily: font.family }}
                          >
                            {font.preview}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className='rounded border border-dashed border-gray-200 bg-white px-2 py-2 text-[10px] text-gray-500'>
                        검색 결과가 없습니다.
                      </p>
                    )}
                  </div>
                </div>

                <p className='text-[10px] text-gray-400'>
                  {selectedType === 'i-text'
                    ? '선택한 텍스트 레이어에 즉시 적용됩니다.'
                    : '텍스트 레이어를 선택하지 않으면 새로 추가되는 텍스트 기본값으로 저장됩니다.'}
                </p>
              </div>
            ) : activePanelKey === 'color' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-y-auto overflow-x-hidden'>
                <div className='flex items-center justify-between'>
                  <p className='text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                    색상
                  </p>
                  <div className='grid w-28 grid-cols-2 items-center rounded-md border border-gray-200 bg-gray-50 p-0.5'>
                    <button
                      type='button'
                      onClick={() => setColorTarget('fill')}
                      className={`h-6 w-full rounded text-[10px] font-medium transition-colors ${
                        colorTarget === 'fill'
                          ? 'bg-white text-gray-800 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      채우기
                    </button>
                    <button
                      type='button'
                      onClick={() => setColorTarget('stroke')}
                      className={`h-6 w-full rounded text-[10px] font-medium transition-colors ${
                        colorTarget === 'stroke'
                          ? 'bg-white text-gray-800 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      선
                    </button>
                  </div>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white'>
                  {colorTarget === 'fill' ? (
                    <SketchColorPicker
                      color={fillColor}
                      onChange={setFillColor}
                      selectedPantoneCode={fillPantoneCode}
                      onPantoneCodeChange={setFillPantoneCode}
                      label='채우기 색상'
                    />
                  ) : (
                    <SketchColorPicker
                      color={strokeColor}
                      onChange={setStrokeColor}
                      selectedPantoneCode={strokePantoneCode}
                      onPantoneCodeChange={setStrokePantoneCode}
                      label='선 색상'
                    />
                  )}
                </div>
              </div>
            ) : activePanelKey === 'layer' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-hidden'>
                <div className='shrink-0'>
                  <p className='mb-1.5 text-[11px] font-semibold text-gray-400'>
                    정렬
                  </p>
                  <div className='grid grid-cols-6 gap-1'>
                    {ALIGN_BUTTONS.map(({ type, icon, title }) => (
                      <IconGridTooltipButton
                        key={type}
                        onClick={() => alignSelected(type)}
                        title={title}
                      >
                        {icon}
                      </IconGridTooltipButton>
                    ))}
                  </div>
                </div>

                <div className='shrink-0'>
                  <p className='mb-1.5 text-[11px] font-semibold text-gray-400'>
                    패스파인더
                  </p>
                  <div className='grid grid-cols-5 gap-1'>
                    {PATHFINDER_BUTTONS.map(({ op, title }) => (
                      <IconGridTooltipButton
                        key={op}
                        onClick={() => applyPathfinder(op)}
                        title={title}
                      >
                        <PathfinderGlyph op={op} />
                      </IconGridTooltipButton>
                    ))}
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  <div className='mb-1.5 flex shrink-0 items-center gap-1'>
                    <p className='flex-1 text-[11px] font-semibold text-gray-400'>
                      레이어
                    </p>
                    <SidePanelTooltip title='그룹화 (Cmd/Ctrl+G)'>
                      <button
                        type='button'
                        onClick={groupSelected}
                        title='그룹화 (Cmd/Ctrl+G)'
                        className='cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      >
                        <Layers size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                    <SidePanelTooltip title='그룹 해제 (Cmd/Ctrl+Alt+G)'>
                      <button
                        type='button'
                        onClick={ungroupSelected}
                        title='그룹 해제 (Cmd/Ctrl+Alt+G)'
                        className='cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      >
                        <Ungroup size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                    <SidePanelTooltip title='삭제 (Delete)'>
                      <button
                        type='button'
                        onClick={deleteSelected}
                        title='삭제 (Delete)'
                        className='cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                  </div>
                  <div className='mb-2 grid shrink-0 gap-1'>
                    <button
                      type='button'
                      onClick={() => {
                        if (activeLayerId) moveLayerToFront(activeLayerId);
                      }}
                      disabled={!canBringForward}
                      className='flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors [&_svg]:text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:[&_svg]:text-gray-300 disabled:hover:bg-transparent'
                    >
                      <span className='inline-flex items-center gap-2'>
                        <LayerBringToFrontGlyph />
                        맨 앞으로 가져오기
                      </span>
                      <span className='text-[11px] text-gray-400'>⌘/Ctrl+Option/Alt+]</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (activeLayerId) moveLayerUp(activeLayerId);
                      }}
                      disabled={!canBringForward}
                      className='flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors [&_svg]:text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:[&_svg]:text-gray-300 disabled:hover:bg-transparent'
                    >
                      <span className='inline-flex items-center gap-2'>
                        <LayerBringForwardGlyph />
                        앞으로 가져오기
                      </span>
                      <span className='text-[11px] text-gray-400'>⌘/Ctrl+]</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (activeLayerId) moveLayerDown(activeLayerId);
                      }}
                      disabled={!canSendBackward}
                      className='flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors [&_svg]:text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:[&_svg]:text-gray-300 disabled:hover:bg-transparent'
                    >
                      <span className='inline-flex items-center gap-2'>
                        <LayerSendBackwardGlyph />
                        뒤로 보내기
                      </span>
                      <span className='text-[11px] text-gray-400'>⌘/Ctrl+[</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (activeLayerId) moveLayerToBack(activeLayerId);
                      }}
                      disabled={!canSendBackward}
                      className='flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors [&_svg]:text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:[&_svg]:text-gray-300 disabled:hover:bg-transparent'
                    >
                      <span className='inline-flex items-center gap-2'>
                        <LayerSendToBackGlyph />
                        맨 뒤로 보내기
                      </span>
                      <span className='text-[11px] text-gray-400'>⌘/Ctrl+Option/Alt+[</span>
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
                          <SidePanelTooltip title={layer.isExpanded ? '그룹 접기' : '그룹 펼치기'}>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerExpanded(layer.id);
                              }}
                              title={layer.isExpanded ? '그룹 접기' : '그룹 펼치기'}
                              className='shrink-0 cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            >
                              {layer.isExpanded ? (
                                <ChevronDown size={12} strokeWidth={1.5} />
                              ) : (
                                <ChevronRight size={12} strokeWidth={1.5} />
                              )}
                            </button>
                          </SidePanelTooltip>
                        ) : (
                          <span className='w-3 shrink-0' />
                        )}

                        <SidePanelTooltip title={layer.visible ? '숨기기' : '표시'}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                            title={layer.visible ? '숨기기' : '표시'}
                            className='shrink-0 cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          >
                            {layer.visible ? (
                              <Eye size={13} strokeWidth={1.5} />
                            ) : (
                              <EyeOff size={13} strokeWidth={1.5} />
                            )}
                          </button>
                        </SidePanelTooltip>

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

                        <SidePanelTooltip title={editingLayerId === layer.id ? '수정 완료' : '이름 수정'}>
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
                            className='shrink-0 cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          >
                            {editingLayerId === layer.id ? (
                              <Check size={13} strokeWidth={1.7} />
                            ) : (
                              <Pencil size={13} strokeWidth={1.7} />
                            )}
                          </button>
                        </SidePanelTooltip>

                        <SidePanelTooltip title={layer.locked ? '잠금 해제' : '잠금'}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                            title={layer.locked ? '잠금 해제' : '잠금'}
                            className='shrink-0 cursor-pointer rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          >
                            {layer.locked ? (
                              <Lock size={13} strokeWidth={1.5} />
                            ) : (
                              <Unlock size={13} strokeWidth={1.5} />
                            )}
                          </button>
                        </SidePanelTooltip>
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
                    <SidePanelTooltip title='검색'>
                      <button
                        type='button'
                        className='absolute right-2 bottom-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700'
                        title='검색'
                        aria-label='검색'
                      >
                        <ArrowRight size={14} strokeWidth={2} />
                      </button>
                    </SidePanelTooltip>
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
