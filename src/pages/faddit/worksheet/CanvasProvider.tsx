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
import { applyPathfinderOperation, type PathfinderOp } from './pathfinder';

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
  fillColor: string;
  setFillColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontWeight: string;
  setFontWeight: (weight: string) => void;
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

type ObjWithData = FabricObject & { data?: { id?: string; name?: string; kind?: string } };

function isArrowObject(obj: FabricObject): boolean {
  const data = (obj as ObjWithData).data;
  return data?.id?.startsWith('arrow-') ?? false;
}

function isInternalOverlayObject(obj: FabricObject): boolean {
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
  const [fillColor, setFillColorState] = useState('#ffffff');
  const [strokeWidth, setStrokeWidthState] = useState(2);
  const [fontSize, setFontSizeState] = useState(20);
  const [fontFamily, setFontFamilyState] = useState('Arial');
  const [fontWeight, setFontWeightState] = useState('normal');
  const [cornerRadius, setCornerRadiusState] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [canvasSession, setCanvasSession] = useState(0);

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
      setFontWeightState((obj.fontWeight as string) ?? 'normal');
    }
    if (obj.type === 'rect') {
      setCornerRadiusState(((obj as unknown as { rx?: number }).rx ?? 0) as number);
    } else {
      setCornerRadiusState(0);
    }
    setActiveLayerId((obj as ObjWithData).data?.id ?? null);
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
        if (obj.type !== 'i-text' && obj.type !== 'image') {
          obj.set({ strokeUniform: true });
        }
      });
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

  const setFontWeight = useCallback(
    (weight: string) => {
      setFontWeightState(weight);
      const obj = canvasRef.current?.getActiveObject();
      if (obj instanceof IText) {
        obj.set('fontWeight', weight);
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
        fillColor,
        setFillColor,
        strokeWidth,
        setStrokeWidth,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        fontWeight,
        setFontWeight,
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
