import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  ActiveSelection,
  Canvas,
  FabricImage,
  FabricObject,
  Group,
  Rect,
  cache,
  loadSVGFromString,
} from 'fabric';
import { applyPathfinderOperation, type PathfinderOp } from './pathfinder';
import type { WorksheetCanvasSpec } from './worksheetEditorSchema';

export type ToolType =
  | 'select'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'draw'
  | 'pen';

export type AlignType = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

export interface LayerItem {
  obj: FabricObject;
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  previewColor: string;
  depth: number;
  isGroup: boolean;
  isExpanded: boolean;
  children: LayerItem[];
}

interface CanvasCtx {
  canvasRef: MutableRefObject<Canvas | null>;
  canvasSession: number;
  registerCanvas: (c: Canvas) => void;
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  strokePantoneCode: string | null;
  setStrokePantoneCode: (code: string | null) => void;
  fillColor: string;
  setFillColor: (c: string) => void;
  fillPantoneCode: string | null;
  setFillPantoneCode: (code: string | null) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontWeight: string;
  setFontWeight: (weight: string) => void;
  fontStyle: string;
  setFontStyle: (style: string) => void;
  cornerRadius: number;
  setCornerRadius: (radius: number) => void;
  selectedType: string | null;
  showGrid: boolean;
  toggleGrid: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  exportCanvasJson: () => string | null;
  importCanvasJson: (json: string) => Promise<boolean>;
  clearCanvas: () => void;
  setCanvasPageSpec: (spec: WorksheetCanvasSpec) => void;
  layers: LayerItem[];
  refreshLayers: () => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  toggleLayerExpanded: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToFront: (id: string) => void;
  moveLayerToBack: (id: string) => void;
  bringSelectionForward: () => void;
  sendSelectionBackward: () => void;
  bringSelectionToFront: () => void;
  sendSelectionToBack: () => void;
  alignSelected: (type: AlignType) => void;
  uploadToCanvas: (file: File) => void;
  activeLayerId: string | null;
  selectLayer: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  applyPathfinder: (op: PathfinderOp) => void;
}

const CanvasContext = createContext<CanvasCtx | null>(null);

const LAYER_NAME_MAP: Record<string, string> = {
  rect: '사각형',
  ellipse: '원',
  triangle: '삼각형',
  line: '선',
  'i-text': '텍스트',
  path: '브러쉬',
  image: '이미지',
  arrow: '화살표',
  group: '그룹',
};

type ObjectData = {
  id?: string;
  name?: string;
  kind?: string;
  fill_pantone_code?: string | null;
  stroke_pantone_code?: string | null;
};

type ObjWithData = FabricObject & { data?: ObjectData };

const CANVAS_ARTBOARD_OBJECT_ID = '__canvas-artboard__';
const MIN_ARTBOARD_SIZE = 64;
const MAX_ARTBOARD_SIZE = 8192;

function clampArtboardSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 1920;
  }
  return Math.max(MIN_ARTBOARD_SIZE, Math.min(MAX_ARTBOARD_SIZE, Math.round(value)));
}

function normalizeArtboardBackground(value: unknown): string {
  if (typeof value !== 'string') {
    return '#FFFFFF';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '#FFFFFF';
}

function isArtboardObject(obj: FabricObject | null | undefined): boolean {
  if (!obj) {
    return false;
  }
  const data = (obj as ObjWithData).data;
  return data?.kind === '__artboard__' || data?.id === CANVAS_ARTBOARD_OBJECT_ID;
}

type CanvasTextObject = FabricObject & {
  text?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fontSize?: number;
  styles?: Record<string, Record<string, Record<string, unknown>>>;
  initDimensions: () => void;
};

const FONT_FAMILY_ALIASES: Record<string, string> = {
  'spoqahan sans neo': 'Spoqa Han Sans Neo',
  'spoqa han sans neo': 'Spoqa Han Sans Neo',
  pretendard: 'Pretendard',
  suit: 'SUIT',
  'noto sans kr': 'Noto Sans KR',
};

const FONT_PRELOAD_FAMILIES = [
  'Pretendard',
  'SUIT',
  'Spoqa Han Sans Neo',
  'Noto Sans KR',
  'Noto Serif KR',
  'IBM Plex Sans KR',
  'IBM Plex Serif KR',
  'Nanum Gothic',
  'Nanum Myeongjo',
  'Nanum Pen Script',
  'Nanum Brush Script',
  'Black Han Sans',
  'Gowun Dodum',
  'Gowun Batang',
  'Do Hyeon',
  'Jua',
  'Sunflower',
  'Song Myung',
  'Poor Story',
  'Hi Melody',
  'Gamja Flower',
  'Yeon Sung',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Raleway',
  'Work Sans',
  'Manrope',
  'DM Sans',
  'Source Sans 3',
  'Source Serif 4',
  'Merriweather',
  'Playfair Display',
  'PT Sans',
  'Rubik',
  'Quicksand',
  'Space Grotesk',
  'Oswald',
  'Barlow',
  'Fira Sans',
  'Fira Mono',
  'JetBrains Mono',
  'Inconsolata',
  'Helvetica Neue',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Trebuchet MS',
  'Impact',
  'Malgun Gothic',
  'Apple SD Gothic Neo',
] as const;

function resolveFontFamilyAlias(font: string): string {
  const normalized = String(font ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
  const key = normalized.toLowerCase();
  return FONT_FAMILY_ALIASES[key] ?? normalized;
}

function getFontLoadCandidates(font: string): string[] {
  const resolved = resolveFontFamilyAlias(font);
  const candidates = new Set<string>([resolved]);
  if (resolved === 'Spoqa Han Sans Neo') {
    candidates.add('SpoqaHan Sans Neo');
  }
  if (resolved === 'Pretendard') {
    candidates.add('Pretendard Variable');
  }
  if (resolved === 'SUIT') {
    candidates.add('SUIT Variable');
  }
  return [...candidates];
}

function isTextObject(obj: FabricObject | null | undefined): obj is CanvasTextObject {
  if (!obj) {
    return false;
  }
  const type = String(obj.type ?? '').toLowerCase();
  return type === 'i-text' || type === 'textbox' || type === 'text';
}

function syncInlineFontStyles(target: CanvasTextObject): boolean {
  const styleMap = target.styles;
  if (!styleMap) {
    return false;
  }

  const desiredFamily = resolveFontFamilyAlias(target.fontFamily ?? '');
  const desiredWeight = target.fontWeight ?? undefined;
  const desiredStyle = target.fontStyle ?? undefined;
  const desiredSize = target.fontSize ?? undefined;

  let changed = false;
  Object.values(styleMap).forEach((lineStyles) => {
    if (!lineStyles || typeof lineStyles !== 'object') {
      return;
    }

    Object.values(lineStyles).forEach((charStyle) => {
      if (!charStyle || typeof charStyle !== 'object') {
        return;
      }
      const mutableStyle = charStyle as Record<string, unknown>;

      if (desiredFamily && mutableStyle.fontFamily !== desiredFamily) {
        mutableStyle.fontFamily = desiredFamily;
        changed = true;
      }
      if (desiredWeight !== undefined && mutableStyle.fontWeight !== desiredWeight) {
        mutableStyle.fontWeight = desiredWeight;
        changed = true;
      }
      if (desiredStyle !== undefined && mutableStyle.fontStyle !== desiredStyle) {
        mutableStyle.fontStyle = desiredStyle;
        changed = true;
      }
      if (desiredSize !== undefined && mutableStyle.fontSize !== desiredSize) {
        mutableStyle.fontSize = desiredSize;
        changed = true;
      }
    });
  });

  return changed;
}

function clearAllInlineTextStyles(target: CanvasTextObject): boolean {
  const styleMap = target.styles;
  if (!styleMap || Object.keys(styleMap).length === 0) {
    return false;
  }
  target.styles = {};
  return true;
}

function normalizeTextForFontChange(target: CanvasTextObject): void {
  clearAllInlineTextStyles(target);

  const styleOps = target as CanvasTextObject & {
    removeStyle?: (prop: 'fontFamily' | 'fontWeight' | 'fontStyle' | 'fontSize') => void;
  };
  styleOps.removeStyle?.('fontFamily');
  styleOps.removeStyle?.('fontWeight');
  styleOps.removeStyle?.('fontStyle');
  styleOps.removeStyle?.('fontSize');

  // Force Fabric to rebuild grapheme/style internals.
  target.set({ text: `${target.text ?? ''}` });
}

function isArrowObject(obj: FabricObject): boolean {
  const data = (obj as ObjWithData).data;
  return data?.id?.startsWith('arrow-') ?? false;
}

function isInternalOverlayObject(obj: FabricObject): boolean {
  if (isArtboardObject(obj)) {
    return true;
  }
  const data = (obj as ObjWithData).data;
  return data?.kind === '__hover_overlay__';
}

function applyCornerRoundness(obj: FabricObject, radius: number): void {
  if (obj.type === 'rect') {
    obj.set({ rx: radius, ry: radius });
    return;
  }
  if (obj.type === 'line' || obj.type === 'triangle' || obj.type === 'path' || isArrowObject(obj)) {
    obj.set({
      strokeLineCap: radius > 0 ? 'round' : 'butt',
      strokeLineJoin: radius > 0 ? 'round' : 'miter',
    });
  }
}

function getObjPreviewColor(obj: FabricObject): string {
  const fill = obj.get('fill');
  const stroke = obj.get('stroke');
  if (typeof fill === 'string' && fill && fill !== 'transparent') return fill;
  if (typeof stroke === 'string' && stroke && stroke !== 'transparent') return stroke;
  return '#cccccc';
}

function buildLayerTree(
  objs: FabricObject[],
  depth: number,
  expandedIds: Set<string>,
  counter: { n: number },
): LayerItem[] {
  return [...objs]
    .filter((obj) => !isInternalOverlayObject(obj))
    .reverse()
    .map((obj) => {
      counter.n += 1;
      const type = obj.type ?? 'object';
      const currentData = (obj as ObjWithData).data;
      const fallbackId = `obj-${Date.now()}-${counter.n}`;
      const fallbackName = LAYER_NAME_MAP[type] ?? type;
      const normalizedData = {
        ...(currentData ?? {}),
        id: currentData?.id ?? fallbackId,
        name: currentData?.name ?? fallbackName,
      };

      if (!currentData?.id || !currentData?.name) {
        (obj as ObjWithData).data = normalizedData;
      }

      const id = normalizedData.id;
      const name = normalizedData.name;
      const isGroup = obj instanceof Group;
      const isExpanded = expandedIds.has(id);

      const children: LayerItem[] =
        isGroup && isExpanded
          ? buildLayerTree((obj as Group).getObjects(), depth + 1, expandedIds, counter)
          : [];

      return {
        obj,
        id,
        name,
        visible: obj.visible !== false,
        locked: !obj.selectable,
        previewColor: getObjPreviewColor(obj),
        depth,
        isGroup,
        isExpanded,
        children,
      };
    });
}

function flattenLayerTree(items: LayerItem[]): LayerItem[] {
  const result: LayerItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.isExpanded && item.children.length > 0) {
      result.push(...flattenLayerTree(item.children));
    }
  }
  return result;
}

function assignSvgNames(obj: FabricObject, depth = 0): void {
  const element = (obj as unknown as { __element?: Element }).__element;
  if (element) {
    const dataName = element.getAttribute('data-name');
    const idAttr = element.getAttribute('id');
    const type = obj.type ?? 'object';
    const name = dataName ?? idAttr ?? LAYER_NAME_MAP[type] ?? type;
    const existing = (obj as ObjWithData).data;
    (obj as ObjWithData).data = {
      id: existing?.id ?? `svg-${depth}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
    };
  }
  if (obj instanceof Group) {
    obj.getObjects().forEach((child) => assignSvgNames(child, depth + 1));
  }
}

const HISTORY_MAX = 50;

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const expandedIdsRef = useRef<Set<string>>(new Set());
  const clipboardRef = useRef<FabricObject[]>([]);
  const pasteCountRef = useRef<number>(0);

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColorState] = useState('#000000');
  const [strokePantoneCode, setStrokePantoneCodeState] = useState<string | null>(null);
  const [fillColor, setFillColorState] = useState('#ffffff');
  const [fillPantoneCode, setFillPantoneCodeState] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidthState] = useState(1);
  const [fontSize, setFontSizeState] = useState(20);
  const [fontFamily, setFontFamilyState] = useState('Arial');
  const [fontWeight, setFontWeightState] = useState('normal');
  const [fontStyle, setFontStyleState] = useState('normal');
  const [cornerRadius, setCornerRadiusState] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [canvasSession, setCanvasSession] = useState(0);

  useEffect(() => {
    const fontFaceSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fontFaceSet) {
      return;
    }

    const preloadSampleText = '텍스트 가나다라마바사 ABC 123';
    FONT_PRELOAD_FAMILIES.forEach((family) => {
      const candidates = getFontLoadCandidates(family);
      candidates.forEach((candidate) => {
        const jobs = [
          fontFaceSet.load(`400 16px "${candidate}"`, preloadSampleText),
          fontFaceSet.load(`700 16px "${candidate}"`, preloadSampleText),
        ];
        void Promise.allSettled(jobs);
      });
    });
  }, []);

  const syncUndoRedo = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toObject(['data', 'selectable', 'evented', 'visible']));
    const idx = historyIdxRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > HISTORY_MAX) {
      historyRef.current.shift();
    }
    historyIdxRef.current = historyRef.current.length - 1;
    syncUndoRedo();
  }, [syncUndoRedo]);

  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const counter = { n: 0 };
    const tree = buildLayerTree(canvas.getObjects(), 0, expandedIdsRef.current, counter);
    setLayers(flattenLayerTree(tree));
  }, []);

  const toggleLayerExpanded = useCallback(
    (id: string) => {
      if (expandedIdsRef.current.has(id)) {
        expandedIdsRef.current.delete(id);
      } else {
        expandedIdsRef.current.add(id);
      }
      refreshLayers();
    },
    [refreshLayers],
  );

  const normalizeTextScale = useCallback((obj: FabricObject) => {
    if (!isTextObject(obj)) {
      return false;
    }

    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) {
      return false;
    }

    const nextFontSize = Math.max(1, Math.round((obj.fontSize ?? 20) * Math.max(scaleX, scaleY)));
    obj.set({
      fontSize: nextFontSize,
      scaleX: 1,
      scaleY: 1,
    });
    obj.setCoords();
    return true;
  }, []);

  const syncSelectionProps = useCallback((obj: FabricObject | null) => {
    if (!obj) {
      setSelectedType(null);
      setActiveLayerId(null);
      setFillPantoneCodeState(null);
      setStrokePantoneCodeState(null);
      return;
    }
    setSelectedType(obj.type ?? null);
    const fill = obj.get('fill');
    if (typeof fill === 'string' && fill) setFillColorState(fill);
    const stroke = obj.get('stroke');
    if (typeof stroke === 'string' && stroke) setStrokeColorState(stroke);
    if (isTextObject(obj)) {
      setFontSizeState(obj.fontSize ?? 20);
      setFontFamilyState(resolveFontFamilyAlias(obj.fontFamily ?? 'Arial'));
      setFontWeightState((obj.fontWeight as string) ?? 'normal');
      setFontStyleState(obj.fontStyle ?? 'normal');
    }
    if (obj.type === 'rect') {
      setCornerRadiusState(((obj as unknown as { rx?: number }).rx ?? 0) as number);
    } else {
      setCornerRadiusState(0);
    }
    const data = (obj as ObjWithData).data;
    setFillPantoneCodeState(
      typeof data?.fill_pantone_code === 'string' && data.fill_pantone_code.trim() !== ''
        ? data.fill_pantone_code
        : null,
    );
    setStrokePantoneCodeState(
      typeof data?.stroke_pantone_code === 'string' && data.stroke_pantone_code.trim() !== ''
        ? data.stroke_pantone_code
        : null,
    );
    setActiveLayerId(data?.id ?? null);
  }, []);

  const exportCanvasJson = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return JSON.stringify(canvas.toObject(['data', 'selectable', 'evented', 'visible']));
  }, []);

  const importCanvasJson = useCallback(
    async (json: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      await canvas.loadFromJSON(json);
      canvas.renderAll();
      refreshLayers();
      syncSelectionProps(null);

      historyRef.current = [json];
      historyIdxRef.current = 0;
      syncUndoRedo();

      return true;
    },
    [refreshLayers, syncSelectionProps, syncUndoRedo],
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
    refreshLayers();
    syncSelectionProps(null);

    const json = JSON.stringify(canvas.toObject(['data', 'selectable', 'evented', 'visible']));
    historyRef.current = [json];
    historyIdxRef.current = 0;
    syncUndoRedo();
  }, [refreshLayers, syncSelectionProps, syncUndoRedo]);

  const setCanvasPageSpec = useCallback(
    (spec: WorksheetCanvasSpec) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const nextWidth = clampArtboardSize(spec.width);
      const nextHeight = clampArtboardSize(spec.height);
      const nextBackground = normalizeArtboardBackground(spec.backgroundColor);
      const centerX = canvas.getWidth() / 2;
      const centerY = canvas.getHeight() / 2;

      const existingArtboard = canvas.getObjects().find((obj) => isArtboardObject(obj)) as
        | Rect
        | undefined;

      if (existingArtboard) {
        existingArtboard.set({
          left: centerX,
          top: centerY,
          width: nextWidth,
          height: nextHeight,
          fill: nextBackground,
          stroke: '#CBD5E1',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          hoverCursor: 'default',
          moveCursor: 'default',
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
        });
        (existingArtboard as ObjWithData).data = {
          id: CANVAS_ARTBOARD_OBJECT_ID,
          name: '아트보드',
          kind: '__artboard__',
        };
        existingArtboard.setCoords();
        canvas.sendObjectToBack(existingArtboard);
      } else {
        const artboard = new Rect({
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          width: nextWidth,
          height: nextHeight,
          fill: nextBackground,
          stroke: '#CBD5E1',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          hoverCursor: 'default',
          moveCursor: 'default',
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
        });
        (artboard as ObjWithData).data = {
          id: CANVAS_ARTBOARD_OBJECT_ID,
          name: '아트보드',
          kind: '__artboard__',
        };
        canvas.add(artboard);
        canvas.sendObjectToBack(artboard);
      }

      canvas.backgroundColor = 'transparent';
      canvas.renderAll();
      refreshLayers();
      syncSelectionProps(canvas.getActiveObject() ?? null);

      const json = JSON.stringify(canvas.toObject(['data', 'selectable', 'evented', 'visible']));
      historyRef.current = [json];
      historyIdxRef.current = 0;
      syncUndoRedo();
    },
    [refreshLayers, syncSelectionProps, syncUndoRedo],
  );

  const registerCanvas = useCallback(
    (c: Canvas) => {
      canvasRef.current = c;
      setCanvasSession((v) => v + 1);
      saveHistory();
      refreshLayers();
      c.on('object:added', refreshLayers);
      c.on('object:added', (e) => {
        const obj = e.target;
        if (!obj) return;
        if (obj.type !== 'i-text' && obj.type !== 'image') {
          obj.set({ strokeUniform: true });
        }
      });
      c.on('object:scaling', (e) => {
        const obj = e.target;
        if (!obj) return;
        if (isTextObject(obj)) {
          const previewFontSize = Math.max(
            1,
            Math.round((obj.fontSize ?? 20) * Math.max(obj.scaleX ?? 1, obj.scaleY ?? 1)),
          );
          setFontSizeState(previewFontSize);
          return;
        }
        if (obj.type !== 'image') {
          obj.set({ strokeUniform: true });
        }
      });
      c.on('object:removed', refreshLayers);
      c.on('object:modified', (e) => {
        const obj = e.target;
        if (obj && normalizeTextScale(obj)) {
          c.renderAll();
        }
        refreshLayers();
        syncSelectionProps(obj ?? c.getActiveObject() ?? null);
      });
      c.on('text:changed', (e) => {
        const obj = e.target;
        if (!isTextObject(obj)) {
          return;
        }

        if (syncInlineFontStyles(obj)) {
          const resolvedFamily = resolveFontFamilyAlias(obj.fontFamily ?? '');
          if (resolvedFamily) {
            cache.clearFontCache(resolvedFamily);
          }
          obj.initDimensions();
          obj.dirty = true;
          obj.setCoords();
          c.requestRenderAll();
        }

        syncSelectionProps(obj);
        refreshLayers();
      });
      c.on('selection:created', (e) => syncSelectionProps(e.selected?.[0] ?? null));
      c.on('selection:updated', (e) => syncSelectionProps(e.selected?.[0] ?? null));
      c.on('selection:cleared', () => syncSelectionProps(null));
      c.on('mouse:dblclick', (opt) => {
        const target = opt.target;
        if (target instanceof Group) {
          target.set({ interactive: true, subTargetCheck: true });
          c.renderAll();
        }
      });
      c.on('selection:cleared', () => {
        c.getObjects().forEach((obj) => {
          if (obj instanceof Group && obj.interactive) {
            obj.set({ interactive: false, subTargetCheck: false });
          }
        });
      });
    },
    [saveHistory, refreshLayers, syncSelectionProps, normalizeTextScale],
  );

  const setFillColor = useCallback((c: string) => {
    setFillColorState(c);
    setFillPantoneCodeState(null);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('fill', c);
      const objWithData = obj as ObjWithData;
      const currentData = objWithData.data ?? {};
      const nextData: ObjectData = { ...currentData };
      delete nextData.fill_pantone_code;
      objWithData.data = nextData;
      canvasRef.current?.renderAll();
    }
  }, []);

  const setFillPantoneCode = useCallback((code: string | null) => {
    setFillPantoneCodeState(code);
    const obj = canvasRef.current?.getActiveObject() as ObjWithData | undefined;
    if (!obj) {
      return;
    }

    const currentData = obj.data ?? {};
    const nextData: ObjectData = { ...currentData };
    if (code && code.trim() !== '') {
      nextData.fill_pantone_code = code;
    } else {
      delete nextData.fill_pantone_code;
    }
    obj.data = nextData;
    canvasRef.current?.renderAll();
  }, []);

  const setStrokeColor = useCallback((c: string) => {
    setStrokeColorState(c);
    setStrokePantoneCodeState(null);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('stroke', c);
      const objWithData = obj as ObjWithData;
      const currentData = objWithData.data ?? {};
      const nextData: ObjectData = { ...currentData };
      delete nextData.stroke_pantone_code;
      objWithData.data = nextData;
      canvasRef.current?.renderAll();
    }
  }, []);

  const setStrokePantoneCode = useCallback((code: string | null) => {
    setStrokePantoneCodeState(code);
    const obj = canvasRef.current?.getActiveObject() as ObjWithData | undefined;
    if (!obj) {
      return;
    }

    const currentData = obj.data ?? {};
    const nextData: ObjectData = { ...currentData };
    if (code && code.trim() !== '') {
      nextData.stroke_pantone_code = code;
    } else {
      delete nextData.stroke_pantone_code;
    }
    obj.data = nextData;
    canvasRef.current?.renderAll();
  }, []);

  const setStrokeWidth = useCallback((w: number) => {
    setStrokeWidthState(w);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('strokeWidth', w);
      canvasRef.current?.renderAll();
    }
  }, []);

  const setFontSize = useCallback(
    (size: number) => {
      setFontSizeState(size);
      const activeObj = canvasRef.current?.getActiveObject();
      const target = isTextObject(activeObj) ? activeObj : null;
      if (target) {
        clearAllInlineTextStyles(target);
        target.set({ fontSize: size });
        target.initDimensions();
        target.dirty = true;
        target.setCoords();
        canvasRef.current?.renderAll();
        saveHistory();
      }
    },
    [saveHistory],
  );

  const setFontFamily = useCallback(
    (font: string) => {
      const resolvedFamily = resolveFontFamilyAlias(font);
      setFontFamilyState(resolvedFamily);

      const activeObj = canvasRef.current?.getActiveObject();
      const target = isTextObject(activeObj) ? activeObj : null;

      if (target) {
        const previousFamily = resolveFontFamilyAlias(target.fontFamily ?? '');
        if (previousFamily) {
          cache.clearFontCache(previousFamily);
        }
        cache.clearFontCache(resolvedFamily);
        normalizeTextForFontChange(target);
        target.set({ fontFamily: resolvedFamily });
        target.initDimensions();
        target.dirty = true;
        target.setCoords();
        canvasRef.current?.renderAll();
        saveHistory();
      }

      const fontFaceSet = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (fontFaceSet) {
        const sampleText = (target?.text && target.text.trim()) || '텍스트';
        const loadJobs = getFontLoadCandidates(resolvedFamily).flatMap((candidate) => [
          fontFaceSet.load(`400 16px "${candidate}"`, sampleText),
        ]);
        const maybeBold =
          target && target.fontWeight && target.fontWeight !== 'normal' && target.fontWeight !== '400';
        if (maybeBold) {
          getFontLoadCandidates(resolvedFamily).forEach((candidate) => {
            loadJobs.push(fontFaceSet.load(`700 16px "${candidate}"`, sampleText));
          });
        }

        void Promise.allSettled(loadJobs).then(() => {
          if (!target || target.canvas !== canvasRef.current) {
            return;
          }

          if (resolveFontFamilyAlias(target.fontFamily ?? '') !== resolvedFamily) {
            return;
          }

          normalizeTextForFontChange(target);
          target.set({ fontFamily: resolvedFamily });
          cache.clearFontCache(resolvedFamily);
          target.initDimensions();
          target.dirty = true;
          target.setCoords();
          canvasRef.current?.requestRenderAll();
        });
      }
    },
    [saveHistory],
  );

  const setFontWeight = useCallback(
    (weight: string) => {
      setFontWeightState(weight);
      const activeObj = canvasRef.current?.getActiveObject();
      const target = isTextObject(activeObj) ? activeObj : null;
      if (target) {
        cache.clearFontCache(target.fontFamily ?? undefined);
        clearAllInlineTextStyles(target);
        target.set({ fontWeight: weight });
        target.initDimensions();
        target.dirty = true;
        target.setCoords();
        canvasRef.current?.renderAll();
        saveHistory();

        const fontFaceSet = (document as Document & { fonts?: FontFaceSet }).fonts;
        const resolvedFamily = resolveFontFamilyAlias(target.fontFamily ?? '');
        if (fontFaceSet && resolvedFamily) {
          const numericWeight = weight === 'bold' ? 700 : Number(weight) || 400;
          const sampleText = (target.text && target.text.trim()) || '텍스트';
          const loadJobs = getFontLoadCandidates(resolvedFamily).map((candidate) =>
            fontFaceSet.load(`${numericWeight} 16px "${candidate}"`, sampleText),
          );
          void Promise.allSettled(loadJobs).then(() => {
            if (!target || target.canvas !== canvasRef.current) {
              return;
            }
            cache.clearFontCache(resolvedFamily);
            target.initDimensions();
            target.dirty = true;
            target.setCoords();
            canvasRef.current?.requestRenderAll();
          });
        }
      }
    },
    [saveHistory],
  );

  const setFontStyle = useCallback(
    (style: string) => {
      setFontStyleState(style);
      const activeObj = canvasRef.current?.getActiveObject();
      const target = isTextObject(activeObj) ? activeObj : null;
      if (target) {
        cache.clearFontCache(target.fontFamily ?? undefined);
        clearAllInlineTextStyles(target);
        target.set({ fontStyle: style });
        target.initDimensions();
        target.dirty = true;
        target.setCoords();
        canvasRef.current?.renderAll();
        saveHistory();
      }
    },
    [saveHistory],
  );

  const setCornerRadius = useCallback(
    (radius: number) => {
      setCornerRadiusState(radius);
      const obj = canvasRef.current?.getActiveObject();
      if (!obj) return;
      applyCornerRoundness(obj, radius);
      obj.setCoords();
      canvasRef.current?.renderAll();
      saveHistory();
    },
    [saveHistory],
  );

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const json = historyRef.current[historyIdxRef.current];
    canvas.loadFromJSON(json).then(() => {
      canvas.renderAll();
      refreshLayers();
      syncUndoRedo();
    });
  }, [refreshLayers, syncUndoRedo]);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const json = historyRef.current[historyIdxRef.current];
    canvas.loadFromJSON(json).then(() => {
      canvas.renderAll();
      refreshLayers();
      syncUndoRedo();
    });
  }, [refreshLayers, syncUndoRedo]);

  const toggleGrid = useCallback(() => setShowGrid((v) => !v), []);

  const findLayerById = useCallback(
    (id: string): LayerItem | undefined => layers.find((l) => l.id === id),
    [layers],
  );

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      item.obj.set('visible', !item.obj.visible);
      canvasRef.current?.renderAll();
      refreshLayers();
    },
    [findLayerById, refreshLayers],
  );

  const toggleLayerLock = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      const locked = !item.obj.selectable;
      item.obj.set({ selectable: locked, evented: locked });
      canvasRef.current?.renderAll();
      refreshLayers();
    },
    [findLayerById, refreshLayers],
  );

  const reorderObject = useCallback(
    (target: FabricObject, direction: 'forward' | 'backward' | 'front' | 'back') => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      if (direction === 'forward') {
        canvas.bringObjectForward(target);
      } else if (direction === 'backward') {
        canvas.sendObjectBackwards(target);
      } else if (direction === 'front') {
        canvas.bringObjectToFront(target);
      } else {
        canvas.sendObjectToBack(target);
      }

      canvas.renderAll();
      refreshLayers();
      saveHistory();
      return true;
    },
    [refreshLayers, saveHistory],
  );

  const moveLayerUp = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      reorderObject(item.obj, 'forward');
    },
    [findLayerById, reorderObject],
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      reorderObject(item.obj, 'backward');
    },
    [findLayerById, reorderObject],
  );

  const moveLayerToFront = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      reorderObject(item.obj, 'front');
    },
    [findLayerById, reorderObject],
  );

  const moveLayerToBack = useCallback(
    (id: string) => {
      const item = findLayerById(id);
      if (!item) return;
      reorderObject(item.obj, 'back');
    },
    [findLayerById, reorderObject],
  );

  const bringSelectionForward = useCallback(() => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    reorderObject(activeObject, 'forward');
  }, [reorderObject]);

  const sendSelectionBackward = useCallback(() => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    reorderObject(activeObject, 'backward');
  }, [reorderObject]);

  const bringSelectionToFront = useCallback(() => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    reorderObject(activeObject, 'front');
  }, [reorderObject]);

  const sendSelectionToBack = useCallback(() => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    reorderObject(activeObject, 'back');
  }, [reorderObject]);

  const alignSelected = useCallback(
    (type: AlignType) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const activeObj = canvas.getActiveObject();
      let objs: FabricObject[] = [];

      if (activeObj instanceof ActiveSelection) {
        objs = activeObj.getObjects();
      } else if (activeObj) {
        objs = [activeObj];
      }
      if (objs.length === 0) return;

      canvas.discardActiveObject();

      const selectionBounds = objs.reduce(
        (acc, obj) => {
          const bounds = obj.getBoundingRect();
          const right = bounds.left + bounds.width;
          const bottom = bounds.top + bounds.height;

          return {
            left: Math.min(acc.left, bounds.left),
            top: Math.min(acc.top, bounds.top),
            right: Math.max(acc.right, right),
            bottom: Math.max(acc.bottom, bottom),
          };
        },
        {
          left: Number.POSITIVE_INFINITY,
          top: Number.POSITIVE_INFINITY,
          right: Number.NEGATIVE_INFINITY,
          bottom: Number.NEGATIVE_INFINITY,
        },
      );

      const selectionLeft = selectionBounds.left;
      const selectionTop = selectionBounds.top;
      const selectionWidth = Math.max(0, selectionBounds.right - selectionBounds.left);
      const selectionHeight = Math.max(0, selectionBounds.bottom - selectionBounds.top);

      objs.forEach((obj) => {
        const bounds = obj.getBoundingRect();
        let targetLeft = bounds.left;
        let targetTop = bounds.top;

        if (type === 'left') {
          targetLeft = selectionLeft;
        } else if (type === 'centerH') {
          targetLeft = selectionLeft + selectionWidth / 2 - bounds.width / 2;
        } else if (type === 'right') {
          targetLeft = selectionLeft + selectionWidth - bounds.width;
        } else if (type === 'top') {
          targetTop = selectionTop;
        } else if (type === 'centerV') {
          targetTop = selectionTop + selectionHeight / 2 - bounds.height / 2;
        } else if (type === 'bottom') {
          targetTop = selectionTop + selectionHeight - bounds.height;
        }

        const deltaX = targetLeft - bounds.left;
        const deltaY = targetTop - bounds.top;
        obj.set({
          left: (obj.left ?? 0) + deltaX,
          top: (obj.top ?? 0) + deltaY,
        });
        obj.setCoords();
      });

      if (objs.length > 1) {
        const sel = new ActiveSelection(objs, { canvas });
        canvas.setActiveObject(sel);
      } else if (objs.length === 1) {
        canvas.setActiveObject(objs[0]);
      }

      canvas.renderAll();
      saveHistory();
    },
    [saveHistory],
  );

  const selectLayer = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const item = findLayerById(id);
      if (!item) return;
      canvas.setActiveObject(item.obj);
      canvas.renderAll();
      syncSelectionProps(item.obj);
    },
    [findLayerById, syncSelectionProps],
  );

  const renameLayer = useCallback(
    (id: string, name: string) => {
      const item = findLayerById(id);
      if (!item) return;
      const nextName = name.trim();
      if (!nextName) return;

      const data = (item.obj as ObjWithData).data;
      (item.obj as ObjWithData).data = {
        id: data?.id ?? id,
        name: nextName,
      };

      refreshLayers();
      saveHistory();
    },
    [findLayerById, refreshLayers, saveHistory],
  );

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active instanceof ActiveSelection) {
      active.getObjects().forEach((obj) => canvas.remove(obj));
    } else {
      canvas.remove(active);
    }
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [refreshLayers, saveHistory]);

  const cloneObjects = useCallback(async (objects: FabricObject[]): Promise<FabricObject[]> => {
    const clones = await Promise.all(
      objects.map(async (obj) => {
        try {
          return await obj.clone();
        } catch {
          return null;
        }
      }),
    );
    return clones.filter((obj): obj is FabricObject => !!obj);
  }, []);

  const copySelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const source = active instanceof ActiveSelection ? active.getObjects() : [active];
    const run = async () => {
      const clones = await cloneObjects(source);
      if (clones.length === 0) return;
      clipboardRef.current = clones;
      pasteCountRef.current = 0;
    };

    void run();
  }, [cloneObjects]);

  const pasteClipboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (clipboardRef.current.length === 0) return;

    const run = async () => {
      const base = clipboardRef.current;
      const clones = await cloneObjects(base);
      if (clones.length === 0) return;

      pasteCountRef.current += 1;
      const offset = 20 * pasteCountRef.current;

      clones.forEach((obj, index) => {
        const left = (obj.left ?? 0) + offset;
        const top = (obj.top ?? 0) + offset;
        obj.set({ left, top, strokeUniform: obj.type !== 'i-text' && obj.type !== 'image' });

        const data = (obj as ObjWithData).data;
        if (data) {
          (obj as ObjWithData).data = {
            id: `${data.id ?? 'obj'}-paste-${Date.now()}-${index}`,
            name: `${data.name ?? '요소'} 붙여넣기`,
          };
        }
        obj.setCoords();
        canvas.add(obj);
      });

      if (clones.length > 1) {
        canvas.setActiveObject(new ActiveSelection(clones, { canvas }));
      } else {
        canvas.setActiveObject(clones[0]);
      }

      canvas.renderAll();
      refreshLayers();
      saveHistory();
    };

    void run();
  }, [cloneObjects, refreshLayers, saveHistory]);

  const duplicateSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const duplicateSingle = async (obj: FabricObject): Promise<FabricObject | null> => {
      try {
        const cloned = await obj.clone();
        if (!cloned) return null;
        const left = (obj.left ?? 0) + 20;
        const top = (obj.top ?? 0) + 20;
        cloned.set({ left, top });
        const data = (obj as ObjWithData).data;
        if (data) {
          (cloned as ObjWithData).data = {
            id: `${data.id ?? 'obj'}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: `${data.name ?? '요소'} 복제`,
          };
        }
        cloned.setCoords();
        canvas.add(cloned);
        return cloned;
      } catch {
        return null;
      }
    };

    const run = async () => {
      if (active instanceof ActiveSelection) {
        const objects = active.getObjects();
        canvas.discardActiveObject();
        const clones = (await Promise.all(objects.map((obj) => duplicateSingle(obj)))).filter(
          (obj): obj is FabricObject => !!obj,
        );
        if (clones.length > 1) {
          canvas.setActiveObject(new ActiveSelection(clones, { canvas }));
        } else if (clones.length === 1) {
          canvas.setActiveObject(clones[0]);
        }
      } else {
        const clone = await duplicateSingle(active);
        if (clone) {
          canvas.setActiveObject(clone);
        }
      }
      canvas.renderAll();
      refreshLayers();
      saveHistory();
    };

    void run();
  }, [refreshLayers, saveHistory]);

  const groupSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!(active instanceof ActiveSelection)) return;
    const objs = active.getObjects();
    if (objs.length < 2) return;
    canvas.discardActiveObject();
    objs.forEach((obj) => canvas.remove(obj));
    const group = new Group(objs);
    (group as ObjWithData).data = {
      id: `group-${Date.now()}`,
      name: '그룹',
    };
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [refreshLayers, saveHistory]);

  const ungroupSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!(active instanceof Group)) return;
    const objs = active.removeAll();
    canvas.remove(active);
    const ungrouped: FabricObject[] = [];
    objs.forEach((obj) => {
      obj.setCoords();
      canvas.add(obj);
      ungrouped.push(obj);
    });
    if (ungrouped.length > 0) {
      const sel = new ActiveSelection(ungrouped, { canvas });
      canvas.setActiveObject(sel);
    }
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [refreshLayers, saveHistory]);

  const uploadToCanvas = useCallback(
    (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const svgText = e.target?.result as string;
          if (!svgText) return;
          try {
            const { objects } = await loadSVGFromString(svgText);
            const validObjs = objects.filter((o): o is FabricObject => o !== null);
            if (validObjs.length === 0) return;

            const cx = canvas.getWidth() / 2;
            const cy = canvas.getHeight() / 2;
            const maxW = canvas.getWidth() * 0.7;
            const maxH = canvas.getHeight() * 0.7;
            const baseName = file.name.replace(/\.svg$/i, '') || 'SVG';

            const fabricObj: FabricObject =
              validObjs.length === 1 ? validObjs[0] : new Group(validObjs);

            assignSvgNames(fabricObj);

            const w = fabricObj.width ?? 1;
            const h = fabricObj.height ?? 1;
            const scale = Math.min(1, maxW / w, maxH / h);
            fabricObj.scale(scale);
            fabricObj.set({ left: cx, top: cy, originX: 'center', originY: 'center' });
            fabricObj.setCoords();

            const topData = (fabricObj as ObjWithData).data;
            if (!topData?.name || topData.name === (fabricObj.type ?? 'object')) {
              (fabricObj as ObjWithData).data = {
                id: topData?.id ?? `svg-${Date.now()}`,
                name: baseName,
              };
            }

            canvas.add(fabricObj);
            canvas.renderAll();
            refreshLayers();
            saveHistory();
          } catch {
            const url = URL.createObjectURL(file);
            FabricImage.fromURL(url).then((img) => {
              img.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2 });
              canvas.add(img);
              canvas.renderAll();
              saveHistory();
              URL.revokeObjectURL(url);
            });
          }
        };
        reader.readAsText(file);
        return;
      }

      const url = URL.createObjectURL(file);
      FabricImage.fromURL(url).then((img) => {
        const maxW = canvas.getWidth() * 0.5;
        const maxH = canvas.getHeight() * 0.5;
        if (img.width > maxW || img.height > maxH) {
          const scale = Math.min(maxW / img.width, maxH / img.height);
          img.scale(scale);
        }
        img.set({
          left: canvas.getWidth() / 2 - img.getScaledWidth() / 2,
          top: canvas.getHeight() / 2 - img.getScaledHeight() / 2,
        });
        (img as ObjWithData).data = {
          id: `img-${Date.now()}`,
          name: file.name.replace(/\.[^.]+$/, '') || '이미지',
        };
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveHistory();
        URL.revokeObjectURL(url);
      });
    },
    [saveHistory, refreshLayers],
  );

  const applyPathfinder = useCallback(
    (op: PathfinderOp) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const changed = applyPathfinderOperation(canvas, op);
      if (!changed) return;

      refreshLayers();
      saveHistory();
    },
    [refreshLayers, saveHistory],
  );

  return (
    <CanvasContext.Provider
      value={{
        canvasRef,
        canvasSession,
        registerCanvas,
        activeTool,
        setActiveTool,
        strokeColor,
        setStrokeColor,
        strokePantoneCode,
        setStrokePantoneCode,
        fillColor,
        setFillColor,
        fillPantoneCode,
        setFillPantoneCode,
        strokeWidth,
        setStrokeWidth,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        fontWeight,
        setFontWeight,
        fontStyle,
        setFontStyle,
        cornerRadius,
        setCornerRadius,
        selectedType,
        showGrid,
        toggleGrid,
        canUndo,
        canRedo,
        undo,
        redo,
        saveHistory,
        exportCanvasJson,
        importCanvasJson,
        clearCanvas,
        setCanvasPageSpec,
        layers,
        refreshLayers,
        toggleLayerVisibility,
        toggleLayerLock,
        toggleLayerExpanded,
        moveLayerUp,
        moveLayerDown,
        moveLayerToFront,
        moveLayerToBack,
        bringSelectionForward,
        sendSelectionBackward,
        bringSelectionToFront,
        sendSelectionToBack,
        alignSelected,
        uploadToCanvas,
        activeLayerId,
        selectLayer,
        renameLayer,
        deleteSelected,
        duplicateSelected,
        copySelected,
        pasteClipboard,
        groupSelected,
        ungroupSelected,
        applyPathfinder,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas(): CanvasCtx {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasProvider');
  return ctx;
}
