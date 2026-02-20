import React, {
  createContext,
  useCallback,
  useContext,
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
  IText,
  loadSVGFromString,
} from 'fabric';

export type ToolType =
  | 'select'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'draw';

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
  registerCanvas: (c: Canvas) => void;
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  fillColor: string;
  setFillColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  selectedType: string | null;
  showGrid: boolean;
  toggleGrid: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  layers: LayerItem[];
  refreshLayers: () => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  toggleLayerExpanded: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  alignSelected: (type: AlignType) => void;
  uploadToCanvas: (file: File) => void;
  activeLayerId: string | null;
  selectLayer: (id: string) => void;
  deleteSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
}

const CanvasContext = createContext<CanvasCtx | null>(null);

const LAYER_NAME_MAP: Record<string, string> = {
  rect: '사각형',
  ellipse: '원',
  triangle: '삼각형',
  line: '선',
  'i-text': '텍스트',
  path: '펜',
  image: '이미지',
  arrow: '화살표',
  group: '그룹',
};

type ObjWithData = FabricObject & { data?: { id?: string; name?: string } };

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
  return [...objs].reverse().map((obj) => {
    counter.n += 1;
    const type = obj.type ?? 'object';
    const data = (obj as ObjWithData).data ?? {};
    const id = data.id ?? `obj-${counter.n}`;
    const name = data.name ?? LAYER_NAME_MAP[type] ?? type;
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

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColorState] = useState('#000000');
  const [fillColor, setFillColorState] = useState('#ffffff');
  const [strokeWidth, setStrokeWidthState] = useState(2);
  const [fontSize, setFontSizeState] = useState(20);
  const [fontFamily, setFontFamilyState] = useState('Arial');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [layers, setLayers] = useState<LayerItem[]>([]);

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

  const syncSelectionProps = useCallback((obj: FabricObject | null) => {
    if (!obj) {
      setSelectedType(null);
      setActiveLayerId(null);
      return;
    }
    setSelectedType(obj.type ?? null);
    const fill = obj.get('fill');
    if (typeof fill === 'string' && fill) setFillColorState(fill);
    const stroke = obj.get('stroke');
    if (typeof stroke === 'string' && stroke) setStrokeColorState(stroke);
    if (obj instanceof IText) {
      setFontSizeState(obj.fontSize ?? 20);
      setFontFamilyState(obj.fontFamily ?? 'Arial');
    }
    setActiveLayerId((obj as ObjWithData).data?.id ?? null);
  }, []);

  const registerCanvas = useCallback(
    (c: Canvas) => {
      canvasRef.current = c;
      saveHistory();
      refreshLayers();
      c.on('object:added', refreshLayers);
      c.on('object:removed', refreshLayers);
      c.on('object:modified', refreshLayers);
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
    [saveHistory, refreshLayers, syncSelectionProps],
  );

  const setFillColor = useCallback((c: string) => {
    setFillColorState(c);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('fill', c);
      canvasRef.current?.renderAll();
    }
  }, []);

  const setStrokeColor = useCallback((c: string) => {
    setStrokeColorState(c);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('stroke', c);
      canvasRef.current?.renderAll();
    }
  }, []);

  const setStrokeWidth = useCallback((w: number) => {
    setStrokeWidthState(w);
    const obj = canvasRef.current?.getActiveObject();
    if (obj) {
      obj.set('strokeWidth', w);
      canvasRef.current?.renderAll();
    }
  }, []);

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    const obj = canvasRef.current?.getActiveObject();
    if (obj instanceof IText) {
      obj.set('fontSize', size);
      canvasRef.current?.renderAll();
    }
  }, []);

  const setFontFamily = useCallback((font: string) => {
    setFontFamilyState(font);
    const obj = canvasRef.current?.getActiveObject();
    if (obj instanceof IText) {
      obj.set('fontFamily', font);
      canvasRef.current?.renderAll();
    }
  }, []);

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

  const moveLayerUp = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const item = findLayerById(id);
      if (!item) return;
      canvas.bringObjectForward(item.obj);
      canvas.renderAll();
      refreshLayers();
      saveHistory();
    },
    [findLayerById, refreshLayers, saveHistory],
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const item = findLayerById(id);
      if (!item) return;
      canvas.sendObjectBackwards(item.obj);
      canvas.renderAll();
      refreshLayers();
      saveHistory();
    },
    [findLayerById, refreshLayers, saveHistory],
  );

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

      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      objs.forEach((obj) => {
        const bounds = obj.getBoundingRect();
        if (type === 'left') {
          obj.set({ left: 0 });
        } else if (type === 'centerH') {
          obj.set({ left: canvasWidth / 2 - bounds.width / 2 });
        } else if (type === 'right') {
          obj.set({ left: canvasWidth - bounds.width });
        } else if (type === 'top') {
          obj.set({ top: 0 });
        } else if (type === 'centerV') {
          obj.set({ top: canvasHeight / 2 - bounds.height / 2 });
        } else if (type === 'bottom') {
          obj.set({ top: canvasHeight - bounds.height });
        }
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
    },
    [findLayerById],
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
    const objs = active.getObjects();
    canvas.remove(active);
    const ungrouped: FabricObject[] = [];
    objs.forEach((obj) => {
      const matrix = active.calcTransformMatrix();
      const point = obj.getRelativeCenterPoint();
      const transformed = point.transform(matrix);
      obj.set({
        left: transformed.x,
        top: transformed.y,
        scaleX: (obj.scaleX ?? 1) * (active.scaleX ?? 1),
        scaleY: (obj.scaleY ?? 1) * (active.scaleY ?? 1),
        angle: (obj.angle ?? 0) + (active.angle ?? 0),
        originX: 'center',
        originY: 'center',
      });
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

  return (
    <CanvasContext.Provider
      value={{
        canvasRef,
        registerCanvas,
        activeTool,
        setActiveTool,
        strokeColor,
        setStrokeColor,
        fillColor,
        setFillColor,
        strokeWidth,
        setStrokeWidth,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        selectedType,
        showGrid,
        toggleGrid,
        canUndo,
        canRedo,
        undo,
        redo,
        saveHistory,
        layers,
        refreshLayers,
        toggleLayerVisibility,
        toggleLayerLock,
        toggleLayerExpanded,
        moveLayerUp,
        moveLayerDown,
        alignSelected,
        uploadToCanvas,
        activeLayerId,
        selectLayer,
        deleteSelected,
        groupSelected,
        ungroupSelected,
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
