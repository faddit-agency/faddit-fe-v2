import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Control,
  Canvas,
  Ellipse,
  IText,
  Line,
  Path,
  PencilBrush,
  Point,
  Rect,
  Triangle,
  controlsUtils,
  type TPointerEventInfo,
  type TPointerEvent,
  type FabricObject,
  type TSimplePathData,
} from 'fabric';
import { useCanvas } from './CanvasProvider';
import SketchBottomBar from './SketchBottomBar';
import PathEditorOverlay, { applyNodesToFabric, type NodePoint } from './PathEditorOverlay';
import {
  ENABLE_CANVA_INTERACTION_ENGINE,
  createInteractionController,
  InteractionOverlay,
  type InteractionControllerApi,
  type OverlayModel,
} from './interaction';

const LAYER_NAME_MAP: Record<string, string> = {
  rect: '사각형',
  ellipse: '원',
  triangle: '삼각형',
  line: '선',
  'i-text': '텍스트',
  path: '브러쉬',
  image: '이미지',
  arrow: '화살표',
};

let objCounter = 0;
function makeData(type: string) {
  objCounter += 1;
  return { id: `${type}-${Date.now()}-${objCounter}`, name: LAYER_NAME_MAP[type] ?? type };
}

type Mat6 = [number, number, number, number, number, number];
type ArrowPoint = { x: number; y: number };
type ArrowObjectData = { id?: string; name?: string; kind?: string };
type PenAnchor = {
  x: number;
  y: number;
  inHandle?: ArrowPoint;
  outHandle?: ArrowPoint;
};
const GRID_UNIT = 10;
const MIN_ZOOM_SCALE = 0.1;
const MAX_ZOOM_SCALE = 5;

function clampZoomScale(value: number): number {
  return Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, value));
}

function clampZoomPercent(value: number): number {
  return Math.max(MIN_ZOOM_SCALE * 100, Math.min(MAX_ZOOM_SCALE * 100, value));
}

function getTouchDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getEventClientPoint(event: TPointerEvent): ArrowPoint | null {
  if ('clientX' in event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }

  if ('touches' in event && event.touches && event.touches.length > 0) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  if ('changedTouches' in event && event.changedTouches && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }

  return null;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_UNIT) * GRID_UNIT;
}

function invertMat([a, b, c, d, e, f]: Mat6): Mat6 {
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

function getObjectData(obj: FabricObject): ArrowObjectData | undefined {
  return (obj as unknown as { data?: ArrowObjectData }).data;
}

function isArrowPathObject(obj: FabricObject | null): obj is Path {
  if (!(obj instanceof Path)) return false;
  const data = getObjectData(obj);
  return (
    data?.kind === 'arrow' ||
    data?.name === '화살표' ||
    (typeof data?.id === 'string' && data.id.startsWith('arrow-'))
  );
}

function buildArrowPathCommands(tail: ArrowPoint, tip: ArrowPoint): TSimplePathData {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const angle = Math.atan2(dy, dx);
  const len = Math.sqrt(dx * dx + dy * dy);
  const headLen = Math.max(10, Math.min(len * 0.3, 20));
  const headAngle = Math.PI / 6;
  const wing1 = {
    x: tip.x - headLen * Math.cos(angle - headAngle),
    y: tip.y - headLen * Math.sin(angle - headAngle),
  };
  const wing2 = {
    x: tip.x - headLen * Math.cos(angle + headAngle),
    y: tip.y - headLen * Math.sin(angle + headAngle),
  };
  return [
    ['M', tail.x, tail.y],
    ['L', tip.x, tip.y],
    ['M', wing1.x, wing1.y],
    ['L', tip.x, tip.y],
    ['L', wing2.x, wing2.y],
  ];
}

function samePoint(a: ArrowPoint, b: ArrowPoint): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function buildPenPathCommands(anchors: PenAnchor[], closePath = false): TSimplePathData {
  if (anchors.length === 0) {
    return [];
  }

  const [first, ...rest] = anchors;
  const commands: TSimplePathData = [['M', first.x, first.y]];

  let prev = first;
  for (const anchor of rest) {
    const c1 = prev.outHandle ?? { x: prev.x, y: prev.y };
    const c2 = anchor.inHandle ?? { x: anchor.x, y: anchor.y };

    if (samePoint(c1, { x: prev.x, y: prev.y }) && samePoint(c2, { x: anchor.x, y: anchor.y })) {
      commands.push(['L', anchor.x, anchor.y]);
    } else {
      commands.push(['C', c1.x, c1.y, c2.x, c2.y, anchor.x, anchor.y]);
    }

    prev = anchor;
  }

  if (closePath && anchors.length >= 3) {
    const last = anchors[anchors.length - 1];
    const c1 = last.outHandle ?? { x: last.x, y: last.y };
    const c2 = first.inHandle ?? { x: first.x, y: first.y };
    commands.push(['C', c1.x, c1.y, c2.x, c2.y, first.x, first.y]);
    commands.push(['Z']);
  }

  return commands;
}

function getArrowEndpoints(path: Path): { tail: ArrowPoint; tip: ArrowPoint } | null {
  const commands = path.path;
  if (!commands || commands.length < 2) return null;
  const first = commands[0];
  const second = commands[1];
  if (!first || !second) return null;
  if (first[0] !== 'M' || second[0] !== 'L') return null;
  return {
    tail: { x: first[1] as number, y: first[2] as number },
    tip: { x: second[1] as number, y: second[2] as number },
  };
}

function viewportToPathLocal(path: Path, vx: number, vy: number): ArrowPoint {
  const inv = invertMat(path.calcTransformMatrix() as Mat6);
  const offset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
    x: 0,
    y: 0,
  };
  return {
    x: inv[0] * vx + inv[2] * vy + inv[4] + offset.x,
    y: inv[1] * vx + inv[3] * vy + inv[5] + offset.y,
  };
}

function pathLocalToScene(path: Path, point: ArrowPoint): ArrowPoint {
  const matrix = path.calcTransformMatrix() as Mat6;
  const offset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
    x: 0,
    y: 0,
  };
  const lx = point.x - offset.x;
  const ly = point.y - offset.y;
  return {
    x: matrix[0] * lx + matrix[2] * ly + matrix[4],
    y: matrix[1] * lx + matrix[3] * ly + matrix[5],
  };
}

function getLineEndpointsInScene(line: Line): { start: ArrowPoint; end: ArrowPoint } {
  const points = line.calcLinePoints();
  const matrix = line.calcTransformMatrix() as Mat6;
  const start = new Point(points.x1, points.y1).transform(matrix);
  const end = new Point(points.x2, points.y2).transform(matrix);
  return {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
  };
}

function getArrowEndpointsInScene(path: Path): { tail: ArrowPoint; tip: ArrowPoint } | null {
  const endpoints = getArrowEndpoints(path);
  if (!endpoints) return null;
  return {
    tail: pathLocalToScene(path, endpoints.tail),
    tip: pathLocalToScene(path, endpoints.tip),
  };
}

function snapPointToAngle(anchor: ArrowPoint, moving: ArrowPoint, degreeStep = 15): ArrowPoint {
  const dx = moving.x - anchor.x;
  const dy = moving.y - anchor.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return moving;
  const step = (degreeStep * Math.PI) / 180;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / step) * step;
  return {
    x: anchor.x + distance * Math.cos(snappedAngle),
    y: anchor.y + distance * Math.sin(snappedAngle),
  };
}

function updateArrowPathPreservePosition(path: Path, commands: TSimplePathData): void {
  const oldPm = path.calcTransformMatrix() as Mat6;
  const oldOffset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
    x: 0,
    y: 0,
  };

  path.set({ path: commands });
  path.setBoundingBox();

  const newOffset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
    x: 0,
    y: 0,
  };
  const dx = newOffset.x - oldOffset.x;
  const dy = newOffset.y - oldOffset.y;

  path.left = oldPm[4] + oldPm[0] * dx + oldPm[2] * dy;
  path.top = oldPm[5] + oldPm[1] * dx + oldPm[3] * dy;
  path.setCoords();
}

function applyEndpointHandleStyle(obj: FabricObject): void {
  obj.set({
    selectable: true,
    evented: true,
    hasBorders: false,
    cornerStyle: 'circle',
    transparentCorners: false,
    cornerColor: '#2563EB',
    cornerStrokeColor: '#ffffff',
    cornerSize: 12,
    padding: 8,
    hoverCursor: 'move',
    moveCursor: 'move',
    lockScalingX: true,
    lockScalingY: true,
    lockSkewingX: true,
    lockSkewingY: true,
    lockRotation: true,
  });
}

function createRotateControl(): Control {
  return new Control({
    x: 0,
    y: -0.5,
    offsetY: -26,
    actionName: 'rotate',
    cursorStyleHandler: controlsUtils.rotationStyleHandler,
    actionHandler: controlsUtils.rotationWithSnapping,
  });
}

function createLineEndpointControls(): Record<string, Control> {
  const startControl = new Control({
    cursorStyle: 'pointer',
    actionName: 'modifyLineStart',
    positionHandler: (_dim, finalMatrix, fabricObject) => {
      const line = fabricObject as Line;
      const points = line.calcLinePoints();
      return new Point(points.x1, points.y1).transform(finalMatrix);
    },
    actionHandler: (_eventData, transform, x, y) => {
      const target = transform.target;
      if (!(target instanceof Line)) return false;
      const endpoints = getLineEndpointsInScene(target);
      const shouldSnap = !!transform.shiftKey;
      const nextStart = shouldSnap ? snapPointToAngle(endpoints.end, { x, y }) : { x, y };
      target.set({ x1: nextStart.x, y1: nextStart.y, x2: endpoints.end.x, y2: endpoints.end.y });
      target.setCoords();
      target.canvas?.requestRenderAll();
      return true;
    },
  });

  const endControl = new Control({
    cursorStyle: 'pointer',
    actionName: 'modifyLineEnd',
    positionHandler: (_dim, finalMatrix, fabricObject) => {
      const line = fabricObject as Line;
      const points = line.calcLinePoints();
      return new Point(points.x2, points.y2).transform(finalMatrix);
    },
    actionHandler: (_eventData, transform, x, y) => {
      const target = transform.target;
      if (!(target instanceof Line)) return false;
      const endpoints = getLineEndpointsInScene(target);
      const shouldSnap = !!transform.shiftKey;
      const nextEnd = shouldSnap ? snapPointToAngle(endpoints.start, { x, y }) : { x, y };
      target.set({ x1: endpoints.start.x, y1: endpoints.start.y, x2: nextEnd.x, y2: nextEnd.y });
      target.setCoords();
      target.canvas?.requestRenderAll();
      return true;
    },
  });

  return {
    start: startControl,
    end: endControl,
    mtr: createRotateControl(),
  };
}

function createArrowEndpointControls(): Record<string, Control> {
  const startControl = new Control({
    cursorStyle: 'pointer',
    actionName: 'modifyArrowStart',
    positionHandler: (_dim, finalMatrix, fabricObject) => {
      const path = fabricObject as Path;
      const endpoints = getArrowEndpoints(path);
      if (!endpoints) return new Point(0, 0).transform(finalMatrix);
      const offset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
        x: 0,
        y: 0,
      };
      return new Point(endpoints.tail.x - offset.x, endpoints.tail.y - offset.y).transform(
        finalMatrix,
      );
    },
    actionHandler: (_eventData, transform, x, y) => {
      const target = transform.target;
      if (!(target instanceof Path) || !isArrowPathObject(target)) return false;
      const endpoints = getArrowEndpointsInScene(target);
      if (!endpoints) return false;
      const shouldSnap = !!transform.shiftKey;
      const nextTailScene = shouldSnap ? snapPointToAngle(endpoints.tip, { x, y }) : { x, y };
      const nextTail = viewportToPathLocal(target, nextTailScene.x, nextTailScene.y);
      const fixedTip = viewportToPathLocal(target, endpoints.tip.x, endpoints.tip.y);
      updateArrowPathPreservePosition(target, buildArrowPathCommands(nextTail, fixedTip));
      target.canvas?.requestRenderAll();
      return true;
    },
  });

  const endControl = new Control({
    cursorStyle: 'pointer',
    actionName: 'modifyArrowEnd',
    positionHandler: (_dim, finalMatrix, fabricObject) => {
      const path = fabricObject as Path;
      const endpoints = getArrowEndpoints(path);
      if (!endpoints) return new Point(0, 0).transform(finalMatrix);
      const offset = (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? {
        x: 0,
        y: 0,
      };
      return new Point(endpoints.tip.x - offset.x, endpoints.tip.y - offset.y).transform(
        finalMatrix,
      );
    },
    actionHandler: (_eventData, transform, x, y) => {
      const target = transform.target;
      if (!(target instanceof Path) || !isArrowPathObject(target)) return false;
      const endpoints = getArrowEndpointsInScene(target);
      if (!endpoints) return false;
      const shouldSnap = !!transform.shiftKey;
      const nextTipScene = shouldSnap ? snapPointToAngle(endpoints.tail, { x, y }) : { x, y };
      const fixedTail = viewportToPathLocal(target, endpoints.tail.x, endpoints.tail.y);
      const nextTip = viewportToPathLocal(target, nextTipScene.x, nextTipScene.y);
      updateArrowPathPreservePosition(target, buildArrowPathCommands(fixedTail, nextTip));
      target.canvas?.requestRenderAll();
      return true;
    },
  });

  return {
    start: startControl,
    end: endControl,
    mtr: createRotateControl(),
  };
}

function setupLineEndpointEditing(line: Line): void {
  applyEndpointHandleStyle(line);
  line.set({ lockRotation: false });
  line.controls = createLineEndpointControls();
}

function setupArrowEndpointEditing(path: Path): void {
  applyEndpointHandleStyle(path);
  path.set({
    lockRotation: false,
    perPixelTargetFind: false,
    objectCaching: false,
    padding: 10,
  });
  path.controls = createArrowEndpointControls();
}

function setupEndpointEditingIfNeeded(obj: FabricObject): void {
  if (obj instanceof Line) {
    setupLineEndpointEditing(obj);
    return;
  }
  if (isArrowPathObject(obj)) {
    setupArrowEndpointEditing(obj);
  }
}

interface WorksheetSketchViewProps {
  zoom: number;
  onZoomChange: (z: number) => void;
}

export default function WorksheetSketchView({ zoom, onZoomChange }: WorksheetSketchViewProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<FabricObject | null>(null);
  const interactionControllerRef = useRef<InteractionControllerApi | null>(null);
  const snapKeyDownRef = useRef(false);
  const penPointsRef = useRef<PenAnchor[]>([]);
  const penDraftRef = useRef<Path | null>(null);
  const penGuideRef = useRef<Line | null>(null);
  const penHandleInGuideRef = useRef<Line | null>(null);
  const penHandleOutGuideRef = useRef<Line | null>(null);
  const penDragRef = useRef<{
    down: boolean;
    anchorIndex: number;
    moved: boolean;
    startX: number;
    startY: number;
  }>({
    down: false,
    anchorIndex: -1,
    moved: false,
    startX: 0,
    startY: 0,
  });

  const {
    canvasRef,
    registerCanvas,
    activeTool,
    setActiveTool,
    fillColor,
    strokeColor,
    strokeWidth,
    cornerRadius,
    showGrid,
    saveHistory,
    refreshLayers,
    deleteSelected,
    copySelected,
    pasteClipboard,
    groupSelected,
    ungroupSelected,
  } = useCanvas();

  const [localZoom, setLocalZoom] = useState(zoom);
  const [pathEditingPath, setPathEditingPath] = useState<Path | null>(null);
  const [interactionOverlayModel, setInteractionOverlayModel] = useState<OverlayModel>({
    guides: [],
    hud: [],
  });
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  const syncZoomState = useCallback((nextScale: number) => {
    const clampedScale = clampZoomScale(nextScale);
    const zoomPct = clampZoomPercent(Math.round(clampedScale * 100));
    setLocalZoom(zoomPct);
    onZoomChangeRef.current(zoomPct);
    return clampedScale;
  }, []);

  const gridStyle = (() => {
    const canvas = fabricRef.current;
    const vpt = canvas?.viewportTransform ?? [localZoom / 100, 0, 0, localZoom / 100, 0, 0];
    const scaleX = Math.max(0.0001, Math.abs(vpt[0]));
    const scaleY = Math.max(0.0001, Math.abs(vpt[3]));
    const stepX = 10 * scaleX;
    const stepY = 10 * scaleY;

    return {
      backgroundImage:
        'linear-gradient(to right, rgba(255,0,0,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,0,0,0.25) 1px, transparent 1px)',
      backgroundSize: `${stepX}px ${stepY}px`,
      backgroundPosition: `${vpt[4]}px ${vpt[5]}px`,
      opacity: showGrid ? 1 : 0,
    };
  })();

  const handlePathEditDone = useCallback(
    (nodes: NodePoint[]) => {
      const canvas = fabricRef.current;
      if (!canvas || !pathEditingPath) return;
      applyNodesToFabric(pathEditingPath, nodes, canvas);
      setPathEditingPath(null);
      canvas.selection = activeTool === 'select';
      canvas.renderAll();
      saveHistory();
      refreshLayers();
    },
    [pathEditingPath, activeTool, saveHistory, refreshLayers],
  );

  const handleZoomChange = (z: number) => {
    const clamped = clampZoomPercent(z);
    const canvas = fabricRef.current;
    if (canvas) {
      const cx = canvas.getWidth() / 2;
      const cy = canvas.getHeight() / 2;
      canvas.zoomToPoint(new Point(cx, cy), clampZoomScale(clamped / 100));
      canvas.requestRenderAll();
    }
    setLocalZoom(clamped);
    onZoomChangeRef.current(clamped);
  };

  useEffect(() => {
    const normalizedZoom = clampZoomPercent(zoom);
    if (Math.abs(normalizedZoom - localZoom) < 0.001) {
      return;
    }

    setLocalZoom(normalizedZoom);

    const canvas = fabricRef.current;
    if (!canvas) {
      return;
    }

    const cx = canvas.getWidth() / 2;
    const cy = canvas.getHeight() / 2;
    canvas.zoomToPoint(new Point(cx, cy), clampZoomScale(normalizedZoom / 100));
    canvas.requestRenderAll();
  }, [zoom, localZoom]);

  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const canvas = new Canvas(el, {
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
      targetFindTolerance: 10,
      uniScaleKey: 'shiftKey',
      centeredKey: 'altKey',
    });
    (canvas as unknown as { snapAngle?: number }).snapAngle = 15;
    fabricRef.current = canvas;
    canvasRef.current = canvas;
    registerCanvas(canvas);
    const upperCanvasEl = (canvas as unknown as { upperCanvasEl?: HTMLCanvasElement }).upperCanvasEl;
    if (upperCanvasEl) {
      upperCanvasEl.style.touchAction = 'none';
    }
    if (ENABLE_CANVA_INTERACTION_ENGINE) {
      interactionControllerRef.current = createInteractionController(canvas);
      setInteractionOverlayModel(interactionControllerRef.current.getOverlayModel());
    }

    const resizeCanvas = () => {
      const c = containerRef.current;
      const fc = fabricRef.current;
      if (!c || !fc) return;
      const { clientWidth, clientHeight } = c;
      if (clientWidth === 0 || clientHeight === 0) return;
      fc.setDimensions({ width: clientWidth, height: clientHeight });
      fc.renderAll();
    };

    resizeCanvas();
    const initialScale = clampZoomScale(localZoom / 100);
    const initialCx = canvas.getWidth() / 2;
    const initialCy = canvas.getHeight() / 2;
    canvas.zoomToPoint(new Point(initialCx, initialCy), initialScale);
    canvas.requestRenderAll();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
      canvasRef.current = null;
      interactionControllerRef.current = null;
      setInteractionOverlayModel({ guides: [], hud: [] });
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = fabricRef.current;
      if (!canvas) return;
      const nextScale = clampZoomScale(canvas.getZoom() * Math.exp(-e.deltaY * 0.001));
      canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), nextScale);
      syncZoomState(nextScale);
      canvas.requestRenderAll();
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [syncZoomState]);

  useEffect(() => {
    const canvas = fabricRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const upperCanvasEl = (canvas as unknown as { upperCanvasEl?: HTMLCanvasElement }).upperCanvasEl;
    if (!upperCanvasEl) return;

    const gesture = {
      active: false,
      startDistance: 0,
      startZoom: 1,
      lastCenter: null as { x: number; y: number } | null,
    };
    const textTap = {
      tracking: false,
      moved: false,
      startX: 0,
      startY: 0,
    };

    const stopEvent = (event: TouchEvent) => {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      } else {
        event.stopPropagation();
      }
    };

    const getPairFromTouches = (touches: TouchList) => {
      if (touches.length < 2) return null;
      const a = touches[0];
      const b = touches[1];
      return [
        { x: a.clientX, y: a.clientY },
        { x: b.clientX, y: b.clientY },
      ] as const;
    };

    const clientToScenePoint = (clientX: number, clientY: number) => {
      const currentCanvas = fabricRef.current;
      if (!currentCanvas) {
        return { x: 0, y: 0 };
      }

      const rect = container.getBoundingClientRect();
      const viewportPoint = { x: clientX - rect.left, y: clientY - rect.top };
      const vpt = (currentCanvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as Mat6;
      const inv = invertMat(vpt);
      return {
        x: inv[0] * viewportPoint.x + inv[2] * viewportPoint.y + inv[4],
        y: inv[1] * viewportPoint.x + inv[3] * viewportPoint.y + inv[5],
      };
    };

    const restoreCanvasInteraction = () => {
      const currentCanvas = fabricRef.current;
      if (!currentCanvas) return;

      if (currentCanvas.viewportTransform) {
        currentCanvas.setViewportTransform(currentCanvas.viewportTransform as Mat6);
      }

      if (pathEditingPath) {
        currentCanvas.selection = false;
        currentCanvas.defaultCursor = 'default';
      } else {
        currentCanvas.selection = activeTool === 'select';
        currentCanvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
      }

      currentCanvas.requestRenderAll();
    };

    const beginGesture = (touches: TouchList) => {
      const currentCanvas = fabricRef.current;
      const pair = getPairFromTouches(touches);
      if (!currentCanvas || !pair) return;

      const [a, b] = pair;
      const distance = getTouchDistance(a, b);
      if (distance <= 0) return;

      gesture.active = true;
      gesture.startDistance = distance;
      gesture.startZoom = currentCanvas.getZoom();
      gesture.lastCenter = getTouchCenter(a, b);

      currentCanvas.discardActiveObject();
      currentCanvas.selection = false;
      currentCanvas.isDrawingMode = false;
      currentCanvas.defaultCursor = 'grabbing';
      currentCanvas.requestRenderAll();
    };

    const endGesture = () => {
      gesture.active = false;
      gesture.startDistance = 0;
      gesture.startZoom = 1;
      gesture.lastCenter = null;
      restoreCanvasInteraction();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!gesture.active && activeTool === 'text' && event.touches.length === 1) {
        const t = event.touches[0];
        textTap.tracking = true;
        textTap.moved = false;
        textTap.startX = t.clientX;
        textTap.startY = t.clientY;
        stopEvent(event);
        return;
      }

      if (event.touches.length < 2) return;
      stopEvent(event);
      if (!gesture.active) {
        beginGesture(event.touches);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (textTap.tracking && event.touches.length === 1) {
        const t = event.touches[0];
        const dx = t.clientX - textTap.startX;
        const dy = t.clientY - textTap.startY;
        if (Math.sqrt(dx * dx + dy * dy) > 6) {
          textTap.moved = true;
        }
        stopEvent(event);
      }

      if (!gesture.active) return;
      stopEvent(event);
      if (event.touches.length < 2) return;

      const currentCanvas = fabricRef.current;
      const pair = getPairFromTouches(event.touches);
      if (!currentCanvas || !pair || gesture.startDistance <= 0) return;

      const [a, b] = pair;
      const distance = getTouchDistance(a, b);
      if (distance <= 0) return;

      const center = getTouchCenter(a, b);
      const rect = container.getBoundingClientRect();
      const scaleRatio = distance / gesture.startDistance;
      const nextScale = clampZoomScale(gesture.startZoom * scaleRatio);

      currentCanvas.zoomToPoint(new Point(center.x - rect.left, center.y - rect.top), nextScale);

      if (gesture.lastCenter) {
        const dx = center.x - gesture.lastCenter.x;
        const dy = center.y - gesture.lastCenter.y;
        if (dx !== 0 || dy !== 0) {
          currentCanvas.relativePan(new Point(dx, dy));
        }
      }

      gesture.lastCenter = center;
      syncZoomState(nextScale);
      currentCanvas.requestRenderAll();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (textTap.tracking && !gesture.active && activeTool === 'text' && event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        if (!textTap.moved) {
          stopEvent(event);
          const currentCanvas = fabricRef.current;
          if (currentCanvas) {
            const point = clientToScenePoint(touch.clientX, touch.clientY);
            const text = new IText('텍스트', {
              left: point.x,
              top: point.y,
              fontSize: 20,
              fill: fillColor,
              fontFamily: 'sans-serif',
            });
            (text as unknown as { data: unknown }).data = makeData('i-text');
            currentCanvas.add(text);
            currentCanvas.setActiveObject(text);
            text.enterEditing();
            text.selectAll();
            currentCanvas.requestRenderAll();
            saveHistory();
            refreshLayers();
            setActiveTool('select');
          }
        }

        textTap.tracking = false;
        textTap.moved = false;
      }

      if (!gesture.active) return;
      stopEvent(event);
      if (event.touches.length === 0) {
        endGesture();
      }
    };

    upperCanvasEl.addEventListener('touchstart', handleTouchStart, {
      passive: false,
      capture: true,
    });
    upperCanvasEl.addEventListener('touchmove', handleTouchMove, {
      passive: false,
      capture: true,
    });
    upperCanvasEl.addEventListener('touchend', handleTouchEnd, {
      passive: false,
      capture: true,
    });
    upperCanvasEl.addEventListener('touchcancel', handleTouchEnd, {
      passive: false,
      capture: true,
    });

    return () => {
      upperCanvasEl.removeEventListener('touchstart', handleTouchStart, true);
      upperCanvasEl.removeEventListener('touchmove', handleTouchMove, true);
      upperCanvasEl.removeEventListener('touchend', handleTouchEnd, true);
      upperCanvasEl.removeEventListener('touchcancel', handleTouchEnd, true);

      if (gesture.active) {
        endGesture();
      }

      textTap.tracking = false;
      textTap.moved = false;
    };
  }, [activeTool, fillColor, pathEditingPath, refreshLayers, saveHistory, setActiveTool, syncZoomState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pan = { active: false, lastX: 0, lastY: 0 };
    const space = { down: false };

    const getUpperCanvas = () =>
      (fabricRef.current as unknown as { upperCanvasEl?: HTMLCanvasElement })?.upperCanvasEl;

    const setCursor = (cursor: string) => {
      const el = getUpperCanvas();
      if (el) el.style.cursor = cursor;
    };

    const overrideFabricCursor = (cursor: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.defaultCursor = cursor;
      canvas.hoverCursor = cursor;
    };

    const restoreFabricCursor = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    };

    const startPan = (x: number, y: number) => {
      pan.active = true;
      pan.lastX = x;
      pan.lastY = y;
      overrideFabricCursor('grabbing');
      setCursor('grabbing');
    };

    const stopPan = () => {
      pan.active = false;
      restoreFabricCursor();
      if (space.down) {
        overrideFabricCursor('grab');
        setCursor('grab');
      } else {
        setCursor('');
      }
    };

    const isTextFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isTextFocused()) {
        e.preventDefault();
        space.down = true;
        if (!pan.active) {
          overrideFabricCursor('grab');
          setCursor('grab');
        }
      } else if (e.code === 'KeyQ' && !isTextFocused()) {
        snapKeyDownRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        space.down = false;
        if (pan.active) stopPan();
        else {
          restoreFabricCursor();
          setCursor('');
        }
      } else if (e.code === 'KeyQ') {
        snapKeyDownRef.current = false;
      }
    };

    const handleWindowBlur = () => {
      space.down = false;
      snapKeyDownRef.current = false;
      if (pan.active) stopPan();
      else {
        restoreFabricCursor();
        setCursor('');
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        startPan(e.clientX, e.clientY);
      } else if (e.button === 0 && space.down) {
        e.stopPropagation();
        startPan(e.clientX, e.clientY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!pan.active) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.relativePan(new Point(e.clientX - pan.lastX, e.clientY - pan.lastY));
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
      canvas.renderAll();
      setCursor('grabbing');
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (pan.active && (e.button === 1 || e.button === 0)) stopPan();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    container.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      container.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const isTextFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextFocused()) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyV') {
        e.preventDefault();
        pasteClipboard();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyG') {
        e.preventDefault();
        groupSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && e.code === 'KeyG') {
        e.preventDefault();
        ungroupSelected();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'KeyV') {
          e.preventDefault();
          setActiveTool('select');
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          setActiveTool('rect');
        } else if (e.code === 'KeyO') {
          e.preventDefault();
          setActiveTool('ellipse');
        } else if (e.code === 'KeyY') {
          e.preventDefault();
          setActiveTool('triangle');
        } else if (e.code === 'KeyL') {
          e.preventDefault();
          setActiveTool('line');
        } else if (e.code === 'KeyA') {
          e.preventDefault();
          setActiveTool('arrow');
        } else if (e.code === 'KeyB') {
          e.preventDefault();
          setActiveTool('draw');
        } else if (e.code === 'KeyP') {
          e.preventDefault();
          setActiveTool('pen');
        } else if (e.code === 'KeyT') {
          e.preventDefault();
          setActiveTool('text');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, copySelected, pasteClipboard, groupSelected, ungroupSelected, setActiveTool]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
  }, [showGrid]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const hoverStrokeMap = new WeakMap<FabricObject, unknown>();
    const mainColor =
      getComputedStyle(document.documentElement).getPropertyValue('--color-faddit').trim() || '#763bff';

    const applyHoverHighlight = (target: FabricObject) => {
      if (!target.evented) {
        return;
      }

      if (target.type !== 'i-text' && target.type !== 'image') {
        if (!hoverStrokeMap.has(target)) {
          hoverStrokeMap.set(target, target.get('stroke') ?? null);
        }
        target.set({ stroke: mainColor });
      }
      canvas.requestRenderAll();
    };

    const clearHoverHighlight = (target: FabricObject) => {
      if (hoverStrokeMap.has(target)) {
        target.set({ stroke: hoverStrokeMap.get(target) as FabricObject['stroke'] });
      }

      canvas.requestRenderAll();
    };

    const handleObjectAdded = (e: { target?: FabricObject }) => {
      if (!e.target) return;
      if (ENABLE_CANVA_INTERACTION_ENGINE) {
        interactionControllerRef.current?.applyObjectControls(e.target);
      }
      setupEndpointEditingIfNeeded(e.target);
    };

    const handleSelection = (e: { selected?: FabricObject[] }) => {
      const selected = e.selected ?? [];
      if (ENABLE_CANVA_INTERACTION_ENGINE) {
        selected.forEach((obj) => interactionControllerRef.current?.applyObjectControls(obj));
      }
      selected.forEach(setupEndpointEditingIfNeeded);
    };

    const handleMouseOver = (e: { target?: FabricObject }) => {
      if (!e.target) return;
      applyHoverHighlight(e.target);
    };

    const handleMouseOut = (e: { target?: FabricObject }) => {
      if (!e.target) return;
      clearHoverHighlight(e.target);
    };

    const handleObjectMoving = (e: { target?: FabricObject; e?: TPointerEvent }) => {
      const target = e.target;
      if (!target || !snapKeyDownRef.current) return;
      const left = target.left;
      const top = target.top;
      if (typeof left !== 'number' || typeof top !== 'number') return;
      target.set({
        left: snapToGrid(left),
        top: snapToGrid(top),
      });
      target.setCoords();
    };

    const handleObjectScaling = (e: { target?: FabricObject; e?: TPointerEvent }) => {
      const target = e.target;
      if (!target || !snapKeyDownRef.current) return;
      const baseWidth = target.width ?? 0;
      const baseHeight = target.height ?? 0;
      if (baseWidth <= 0 || baseHeight <= 0) return;

      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;
      const absScaleX = Math.abs(scaleX);
      const absScaleY = Math.abs(scaleY);
      const uniformScale = Math.abs(absScaleX - absScaleY) < 0.001;

      if (uniformScale) {
        const dominant = Math.max(baseWidth, baseHeight);
        const snappedDominant = Math.max(
          GRID_UNIT,
          snapToGrid(dominant * Math.max(absScaleX, absScaleY)),
        );
        const nextScale = snappedDominant / dominant;
        target.set({
          scaleX: Math.sign(scaleX) * nextScale,
          scaleY: Math.sign(scaleY) * nextScale,
        });
      } else {
        const snappedWidth = Math.max(GRID_UNIT, snapToGrid(baseWidth * absScaleX));
        const snappedHeight = Math.max(GRID_UNIT, snapToGrid(baseHeight * absScaleY));
        target.set({
          scaleX: Math.sign(scaleX) * (snappedWidth / baseWidth),
          scaleY: Math.sign(scaleY) * (snappedHeight / baseHeight),
        });
      }

      target.setCoords();
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('mouse:over', handleMouseOver);
    canvas.on('mouse:out', handleMouseOut);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('mouse:over', handleMouseOver);
      canvas.off('mouse:out', handleMouseOut);
    };
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const handleDblClick = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (activeTool === 'pen') {
        return;
      }
      const target = opt.target;
      if (target instanceof Path && !pathEditingPath && !isArrowPathObject(target)) {
        setPathEditingPath(target);
        setActiveTool('select');
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.renderAll();
      }
    };
    canvas.on('mouse:dblclick', handleDblClick);
    return () => {
      canvas.off('mouse:dblclick', handleDblClick);
    };
  }, [activeTool, pathEditingPath, setActiveTool]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (pathEditingPath) {
      canvas.selection = false;
      canvas.defaultCursor = 'default';
    } else {
      canvas.selection = activeTool === 'select';
      canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
    }
  }, [pathEditingPath, activeTool]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';

    const handleMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (ENABLE_CANVA_INTERACTION_ENGINE && interactionControllerRef.current) {
        const consumed = interactionControllerRef.current.onMouseDown(opt);
        setInteractionOverlayModel(interactionControllerRef.current.getOverlayModel());
        if (consumed) return;
      }
      if (activeTool === 'select') return;
      const pointer = canvas.getScenePoint(opt.e);
      drawStartRef.current = { x: pointer.x, y: pointer.y };

      if (activeTool === 'text') {
        const text = new IText('텍스트', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: fillColor,
          fontFamily: 'sans-serif',
        });
        (text as unknown as { data: unknown }).data = makeData('i-text');
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
        saveHistory();
        refreshLayers();
        setActiveTool('select');
        return;
      }

      if (activeTool === 'rect') {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          strokeUniform: true,
          rx: cornerRadius,
          ry: cornerRadius,
        });
        (rect as unknown as { data: unknown }).data = makeData('rect');
        activeShapeRef.current = rect;
        canvas.add(rect);
        canvas.renderAll();
      }

      if (activeTool === 'ellipse') {
        const ellipse = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          strokeUniform: true,
        });
        (ellipse as unknown as { data: unknown }).data = makeData('ellipse');
        activeShapeRef.current = ellipse;
        canvas.add(ellipse);
        canvas.renderAll();
      }

      if (activeTool === 'triangle') {
        const tri = new Triangle({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          strokeUniform: true,
          strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
        });
        (tri as unknown as { data: unknown }).data = makeData('triangle');
        activeShapeRef.current = tri;
        canvas.add(tri);
        canvas.renderAll();
      }

      if (activeTool === 'line' || activeTool === 'arrow') {
        const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor,
          strokeWidth,
          selectable: true,
          evented: true,
          perPixelTargetFind: true,
          objectCaching: false,
          padding: 8,
          strokeUniform: true,
          strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
          strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
        });
        (line as unknown as { data: unknown }).data = makeData('line');
        setupLineEndpointEditing(line);
        activeShapeRef.current = line;
        canvas.add(line);
        canvas.renderAll();
      }
    };

    const handleMouseMove = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (ENABLE_CANVA_INTERACTION_ENGINE) {
        interactionControllerRef.current?.onMouseMove(opt);
        if (interactionControllerRef.current) {
          setInteractionOverlayModel(interactionControllerRef.current.getOverlayModel());
        }
      }
      if (!drawStartRef.current || !activeShapeRef.current) return;
      const pointer = canvas.getScenePoint(opt.e);
      const { x: startX, y: startY } = drawStartRef.current;
      const shape = activeShapeRef.current;

      if (activeTool === 'rect') {
        const rect = shape as Rect;
        rect.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        });
        rect.setCoords();
      }

      if (activeTool === 'ellipse') {
        const ellipse = shape as Ellipse;
        ellipse.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          rx: Math.abs(pointer.x - startX) / 2,
          ry: Math.abs(pointer.y - startY) / 2,
        });
        ellipse.setCoords();
      }

      if (activeTool === 'triangle') {
        const tri = shape as Triangle;
        tri.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        });
        tri.setCoords();
      }

      if (activeTool === 'line' || activeTool === 'arrow') {
        const line = shape as Line;
        line.set({ x2: pointer.x, y2: pointer.y });
        line.setCoords();
      }

      canvas.renderAll();
    };

    const handleMouseUp = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (ENABLE_CANVA_INTERACTION_ENGINE && interactionControllerRef.current) {
        const consumed = interactionControllerRef.current.onMouseUp(opt);
        setInteractionOverlayModel(interactionControllerRef.current.getOverlayModel());
        if (consumed) return;
      }
      if (!drawStartRef.current) return;
      const pointer = canvas.getScenePoint(opt.e);
      const { x: startX, y: startY } = drawStartRef.current;

      if (activeTool === 'arrow' && activeShapeRef.current) {
        canvas.remove(activeShapeRef.current);
        const tip = { x: pointer.x, y: pointer.y };
        const tail = { x: startX, y: startY };
        const arrow = new Path(buildArrowPathCommands(tail, tip), {
          stroke: strokeColor,
          strokeWidth,
          fill: '',
          strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
          strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
          perPixelTargetFind: true,
          objectCaching: false,
          padding: 8,
          strokeUniform: true,
        });
        (arrow as unknown as { data: unknown }).data = { ...makeData('arrow'), kind: 'arrow' };
        setupArrowEndpointEditing(arrow);
        canvas.add(arrow);
        canvas.setActiveObject(arrow);
      } else if (activeShapeRef.current) {
        if (activeShapeRef.current instanceof Line) {
          setupLineEndpointEditing(activeShapeRef.current);
        }
        canvas.setActiveObject(activeShapeRef.current);
      }

      drawStartRef.current = null;
      activeShapeRef.current = null;
      canvas.renderAll();
      saveHistory();
      refreshLayers();
      setActiveTool('select');
    };

    if (activeTool === 'draw') {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = strokeColor;
      brush.width = strokeWidth;
      canvas.freeDrawingBrush = brush;

      const handlePathCreated = (e: { path?: FabricObject }) => {
        const path = e.path;
        if (path instanceof Path) {
          path.set({
            strokeUniform: true,
            strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
            strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
          });
          path.setCoords();
        }
        saveHistory();
      };
      canvas.on('path:created', handlePathCreated);
      return () => {
        canvas.isDrawingMode = false;
        canvas.off('path:created', handlePathCreated);
      };
    }

    if (activeTool === 'pen') {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';

      const getPenCloseThreshold = () => 8 / Math.max(canvas.getZoom(), 0.001);
      const getPenDragThreshold = () => 8;

      const isNearFirstPoint = (point: ArrowPoint, points: PenAnchor[]) => {
        if (points.length < 2) {
          return false;
        }
        const first = points[0];
        const dx = point.x - first.x;
        const dy = point.y - first.y;
        return Math.sqrt(dx * dx + dy * dy) <= getPenCloseThreshold();
      };

      const clearGuide = () => {
        if (!penGuideRef.current) return;
        canvas.remove(penGuideRef.current);
        penGuideRef.current = null;
      };

      const clearDraft = () => {
        if (!penDraftRef.current) return;
        canvas.remove(penDraftRef.current);
        penDraftRef.current = null;
      };

      const clearHandleGuides = () => {
        if (penHandleInGuideRef.current) {
          canvas.remove(penHandleInGuideRef.current);
          penHandleInGuideRef.current = null;
        }
        if (penHandleOutGuideRef.current) {
          canvas.remove(penHandleOutGuideRef.current);
          penHandleOutGuideRef.current = null;
        }
      };

      const updateGuideLine = (
        ref: { current: Line | null },
        x1: number,
        y1: number,
        x2: number,
        y2: number,
      ) => {
        if (!ref.current) {
          ref.current = new Line([x1, y1, x2, y2], {
            stroke: strokeColor,
            strokeWidth: Math.max(1, strokeWidth * 0.75),
            selectable: false,
            evented: false,
            objectCaching: false,
            strokeDashArray: [4, 4],
            strokeUniform: true,
          });
          canvas.add(ref.current);
          return;
        }

        ref.current.set({
          x1,
          y1,
          x2,
          y2,
          stroke: strokeColor,
          strokeWidth: Math.max(1, strokeWidth * 0.75),
        });
      };

      const updateHandleGuides = (anchor: PenAnchor | null) => {
        if (!anchor) {
          clearHandleGuides();
          return;
        }

        if (anchor.inHandle) {
          updateGuideLine(
            penHandleInGuideRef,
            anchor.x,
            anchor.y,
            anchor.inHandle.x,
            anchor.inHandle.y,
          );
        } else if (penHandleInGuideRef.current) {
          canvas.remove(penHandleInGuideRef.current);
          penHandleInGuideRef.current = null;
        }

        if (anchor.outHandle) {
          updateGuideLine(
            penHandleOutGuideRef,
            anchor.x,
            anchor.y,
            anchor.outHandle.x,
            anchor.outHandle.y,
          );
        } else if (penHandleOutGuideRef.current) {
          canvas.remove(penHandleOutGuideRef.current);
          penHandleOutGuideRef.current = null;
        }

        if (penHandleInGuideRef.current) {
          canvas.bringObjectToFront(penHandleInGuideRef.current);
        }
        if (penHandleOutGuideRef.current) {
          canvas.bringObjectToFront(penHandleOutGuideRef.current);
        }
      };

      const renderDraftPath = (points: PenAnchor[], closePath = false) => {
        if (points.length < 2) {
          clearDraft();
          canvas.requestRenderAll();
          return;
        }

        const commands = buildPenPathCommands(points, closePath);

        if (!penDraftRef.current) {
          const path = new Path(commands, {
            stroke: strokeColor,
            strokeWidth,
            fill: '',
            selectable: false,
            evented: false,
            objectCaching: false,
            strokeUniform: true,
            strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
            strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
          });
          penDraftRef.current = path;
          canvas.add(path);
        } else {
          (penDraftRef.current as unknown as { path: TSimplePathData }).path = commands;
          penDraftRef.current.set({
            stroke: strokeColor,
            strokeWidth,
            strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
            strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
          });
          penDraftRef.current.setCoords();
        }

        if (penHandleInGuideRef.current) {
          canvas.bringObjectToFront(penHandleInGuideRef.current);
        }
        if (penHandleOutGuideRef.current) {
          canvas.bringObjectToFront(penHandleOutGuideRef.current);
        }

        canvas.requestRenderAll();
      };

      const resetPenState = () => {
        clearGuide();
        clearDraft();
        clearHandleGuides();
        penPointsRef.current = [];
        penDragRef.current = { down: false, anchorIndex: -1, moved: false, startX: 0, startY: 0 };
      };

      const finalizePenPath = (closePath = false) => {
        const points = penPointsRef.current;
        if (points.length < 2) {
          resetPenState();
          return;
        }

        const shouldClose = closePath && points.length >= 3;

        const finalPath = new Path(buildPenPathCommands(points, shouldClose), {
          stroke: strokeColor,
          strokeWidth,
          fill: '',
          selectable: true,
          evented: true,
          objectCaching: false,
          strokeUniform: true,
          strokeLineCap: cornerRadius > 0 ? 'round' : 'butt',
          strokeLineJoin: cornerRadius > 0 ? 'round' : 'miter',
        });
        (finalPath as unknown as { data: unknown }).data = { ...makeData('path'), name: '펜' };

        resetPenState();
        canvas.add(finalPath);
        canvas.setActiveObject(finalPath);
        canvas.requestRenderAll();
        saveHistory();
        refreshLayers();
        setActiveTool('select');
      };

      const cancelPenPath = () => {
        resetPenState();
        canvas.requestRenderAll();
      };

      const handlePenMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
        const pointer = canvas.getScenePoint(opt.e);
        const clientPoint = getEventClientPoint(opt.e);
        const nextPoint = { x: pointer.x, y: pointer.y };
        const points = penPointsRef.current;

        if (isNearFirstPoint(nextPoint, points)) {
          finalizePenPath(true);
          return;
        }

        const anchor: PenAnchor = { x: nextPoint.x, y: nextPoint.y };
        penPointsRef.current = [...points, anchor];
        penDragRef.current = {
          down: true,
          anchorIndex: penPointsRef.current.length - 1,
          moved: false,
          startX: clientPoint?.x ?? nextPoint.x,
          startY: clientPoint?.y ?? nextPoint.y,
        };
        clearGuide();
        renderDraftPath(penPointsRef.current);
      };

      const handlePenMouseMove = (opt: TPointerEventInfo<TPointerEvent>) => {
        const points = penPointsRef.current;
        if (points.length === 0) return;

        const pointer = canvas.getScenePoint(opt.e);
        const last = points[points.length - 1];

        if (penDragRef.current.down && penDragRef.current.anchorIndex >= 0) {
          const idx = penDragRef.current.anchorIndex;
          const anchor = points[idx];
          if (!anchor) return;

          const clientPoint = getEventClientPoint(opt.e);
          const moveDx = (clientPoint?.x ?? pointer.x) - penDragRef.current.startX;
          const moveDy = (clientPoint?.y ?? pointer.y) - penDragRef.current.startY;
          const moved = Math.sqrt(moveDx * moveDx + moveDy * moveDy) > getPenDragThreshold();
          penDragRef.current.moved = penDragRef.current.moved || moved;

          if (penDragRef.current.moved) {
            const dx = pointer.x - anchor.x;
            const dy = pointer.y - anchor.y;
            anchor.inHandle = { x: anchor.x - dx, y: anchor.y - dy };
            anchor.outHandle = { x: anchor.x + dx, y: anchor.y + dy };
          } else {
            delete anchor.inHandle;
            delete anchor.outHandle;
          }

          penPointsRef.current = [...points];
          renderDraftPath(penPointsRef.current);
          clearGuide();
          updateHandleGuides(anchor);
          canvas.requestRenderAll();
          return;
        }

        const closeCandidate = isNearFirstPoint({ x: pointer.x, y: pointer.y }, points);
        const previewTarget: PenAnchor = closeCandidate
          ? { x: points[0].x, y: points[0].y }
          : { x: pointer.x, y: pointer.y };

        renderDraftPath([...points, previewTarget], closeCandidate);

        if (!penGuideRef.current) {
          penGuideRef.current = new Line([last.x, last.y, previewTarget.x, previewTarget.y], {
            stroke: strokeColor,
            strokeWidth,
            selectable: false,
            evented: false,
            objectCaching: false,
            strokeDashArray: [4, 4],
            strokeUniform: true,
          });
          canvas.add(penGuideRef.current);
        } else {
          penGuideRef.current.set({
            x1: last.x,
            y1: last.y,
            x2: previewTarget.x,
            y2: previewTarget.y,
          });
        }

        canvas.bringObjectToFront(penGuideRef.current);
        canvas.requestRenderAll();
      };

      const handlePenDblClick = () => {
        finalizePenPath(false);
      };

      const handlePenMouseUp = () => {
        if (!penDragRef.current.down) {
          return;
        }

        penDragRef.current.down = false;
        penDragRef.current.anchorIndex = -1;
        penDragRef.current.moved = false;
        penDragRef.current.startX = 0;
        penDragRef.current.startY = 0;
        clearGuide();
        renderDraftPath(penPointsRef.current);
        updateHandleGuides(penPointsRef.current[penPointsRef.current.length - 1] ?? null);
      };

      const handlePenKeyDown = (event: KeyboardEvent) => {
        if (event.code === 'Enter') {
          event.preventDefault();
          finalizePenPath();
          return;
        }

        if (event.code === 'Escape') {
          event.preventDefault();
          cancelPenPath();
        }
      };

      canvas.on('mouse:down', handlePenMouseDown);
      canvas.on('mouse:move', handlePenMouseMove);
      canvas.on('mouse:up', handlePenMouseUp);
      canvas.on('mouse:dblclick', handlePenDblClick);
      window.addEventListener('keydown', handlePenKeyDown);

      return () => {
        canvas.off('mouse:down', handlePenMouseDown);
        canvas.off('mouse:move', handlePenMouseMove);
        canvas.off('mouse:up', handlePenMouseUp);
        canvas.off('mouse:dblclick', handlePenDblClick);
        window.removeEventListener('keydown', handlePenKeyDown);
        resetPenState();
      };
    }

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.isDrawingMode = false;
    };
  }, [
    activeTool,
    fillColor,
    strokeColor,
    strokeWidth,
    cornerRadius,
    saveHistory,
    setActiveTool,
    refreshLayers,
  ]);

  return (
    <div
      ref={containerRef}
      className='relative h-full w-full overflow-hidden rounded-md'
      style={{ touchAction: 'none' }}
    >
      <div className='pointer-events-none absolute inset-0 z-10' style={gridStyle} />
      <canvas ref={canvasElRef} className='absolute inset-0 z-20' />
      <InteractionOverlay
        canvas={ENABLE_CANVA_INTERACTION_ENGINE ? fabricRef.current : null}
        model={ENABLE_CANVA_INTERACTION_ENGINE ? interactionOverlayModel : { guides: [], hud: [] }}
      />
      {pathEditingPath && fabricRef.current && (
        <PathEditorOverlay
          canvas={fabricRef.current}
          path={pathEditingPath}
          onDone={handlePathEditDone}
        />
      )}
      <SketchBottomBar zoom={localZoom} onZoomChange={handleZoomChange} />
    </div>
  );
}
