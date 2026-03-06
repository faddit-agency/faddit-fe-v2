import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Canvas } from 'fabric';
import {
  getDefaultAnnotationText,
  type WorksheetCanvasAnnotation,
  type WorksheetCanvasAnnotationStatus,
  type WorksheetCanvasAnnotationType,
  type WorksheetCanvasPoint,
} from './worksheetEditorSchema';

type Mat6 = [number, number, number, number, number, number];

type DraftAnnotation = {
  type: WorksheetCanvasAnnotationType;
  anchor: WorksheetCanvasPoint;
  label: WorksheetCanvasPoint;
};

type DragMode = 'anchor' | 'label' | 'annotation';

type DragState = {
  annotationId: string;
  mode: DragMode;
  startScene: WorksheetCanvasPoint;
  initialAnchor: WorksheetCanvasPoint;
  initialLabel: WorksheetCanvasPoint;
};

type SceneBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type SceneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ViewportBox = SceneBox;

type ViewportRect = SceneRect;

type RenderAnnotation = {
  annotation: WorksheetCanvasAnnotation;
  selected: boolean;
  editing: boolean;
  kind: WorksheetCanvasAnnotationType;
  anchorViewport: WorksheetCanvasPoint;
  secondaryHandleViewport?: WorksheetCanvasPoint;
  elbowViewport?: WorksheetCanvasPoint;
  edgeViewport?: WorksheetCanvasPoint;
  boxViewport?: ViewportBox;
  rectViewport?: ViewportRect;
  startTickViewport?: [WorksheetCanvasPoint, WorksheetCanvasPoint];
  endTickViewport?: [WorksheetCanvasPoint, WorksheetCanvasPoint];
};

interface WorksheetAnnotationOverlayProps {
  canvas: Canvas | null;
  annotations: WorksheetCanvasAnnotation[];
  selectedAnnotationId: string | null;
  visible: boolean;
  draftAnnotation?: DraftAnnotation | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onAnnotationsChange: (annotations: WorksheetCanvasAnnotation[]) => void;
}

const CARD_WIDTH = 184;
const PIN_WIDTH = 148;
const STATUS_WIDTH = 170;
const HIGHLIGHT_LABEL_WIDTH = 152;
const BOX_PADDING_X = 14;
const BOX_PADDING_Y = 12;
const FONT_SIZE = 13;
const LINE_HEIGHT = 1.45;
const CARD_MIN_HEIGHT = 56;
const PIN_MIN_HEIGHT = 44;
const STATUS_MIN_HEIGHT = 72;
const DIMENSION_MIN_HEIGHT = 36;
const HIGHLIGHT_MIN_HEIGHT = 44;
const CARD_RADIUS = 14;
const PIN_RADIUS = 999;
const STATUS_RADIUS = 16;
const DIMENSION_RADIUS = 999;
const HIGHLIGHT_RADIUS = 12;
const CONNECTOR_GAP = 26;
const PIN_CONNECTOR_GAP = 18;
const HANDLE_RADIUS = 4;
const SELECTED_HANDLE_RADIUS = 5.5;
const HIT_STROKE_WIDTH = 18;
const TICK_HALF = 7;
const DIMENSION_LABEL_OFFSET = 18;
const HIGHLIGHT_LABEL_GAP = 10;

function invertMat([a, b, c, d, e, f]: Mat6): Mat6 {
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

function sceneToViewport(matrix: Mat6, point: WorksheetCanvasPoint): WorksheetCanvasPoint {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  };
}

function clientToScene(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  matrix: Mat6,
): WorksheetCanvasPoint {
  const inv = invertMat(matrix);
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  return {
    x: inv[0] * localX + inv[2] * localY + inv[4],
    y: inv[1] * localX + inv[3] * localY + inv[5],
  };
}

function getCanvasRect(canvas: Canvas | null): DOMRect | null {
  const element =
    ((canvas as unknown as { upperCanvasEl?: HTMLCanvasElement | null })?.upperCanvasEl ??
      (canvas as unknown as { lowerCanvasEl?: HTMLCanvasElement | null })?.lowerCanvasEl) ??
    null;
  return element?.getBoundingClientRect() ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateMultilineHeight(text: string, minHeight: number, approxCharsPerLine = 20): number {
  const normalized = text.trim().length > 0 ? text : ' ';
  const lines = normalized.split('\n');
  const lineCount = lines.reduce((count, line) => {
    const visualLength = Math.max(1, Math.ceil(line.length / approxCharsPerLine));
    return count + visualLength;
  }, 0);

  return Math.max(minHeight, Math.round(lineCount * FONT_SIZE * LINE_HEIGHT + BOX_PADDING_Y * 2));
}

function estimateSingleLineWidth(text: string, minWidth: number, maxWidth: number): number {
  const normalized = text.trim().length > 0 ? text : ' ';
  const longestLine = normalized.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
  const contentWidth = BOX_PADDING_X * 2 + longestLine * 7.2;
  return clamp(Math.round(contentWidth), minWidth, maxWidth);
}

function getStatusMeta(status: WorksheetCanvasAnnotationStatus | undefined) {
  if (status === 'done') {
    return {
      label: '완료',
      chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    };
  }

  if (status === 'update') {
    return {
      label: '수정 요청',
      chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    };
  }

  return {
    label: '확인 필요',
    chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  };
}

function scenePointToOverlay(
  matrix: Mat6,
  offset: WorksheetCanvasPoint,
  point: WorksheetCanvasPoint,
): WorksheetCanvasPoint {
  const viewport = sceneToViewport(matrix, point);
  return {
    x: viewport.x + offset.x,
    y: viewport.y + offset.y,
  };
}

function sceneBoxToOverlay(
  matrix: Mat6,
  offset: WorksheetCanvasPoint,
  box: SceneBox,
): ViewportBox {
  const topLeft = scenePointToOverlay(matrix, offset, { x: box.x, y: box.y });
  const bottomRight = scenePointToOverlay(matrix, offset, {
    x: box.x + box.width,
    y: box.y + box.height,
  });

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
    radius: box.radius,
  };
}

function sceneRectToOverlay(
  matrix: Mat6,
  offset: WorksheetCanvasPoint,
  rect: SceneRect,
): ViewportRect {
  const topLeft = scenePointToOverlay(matrix, offset, { x: rect.x, y: rect.y });
  const bottomRight = scenePointToOverlay(matrix, offset, {
    x: rect.x + rect.width,
    y: rect.y + rect.height,
  });

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

function buildCardLikeLayout(annotation: WorksheetCanvasAnnotation, kind: 'card' | 'pin' | 'status') {
  const width = kind === 'card' ? CARD_WIDTH : kind === 'pin' ? PIN_WIDTH : STATUS_WIDTH;
  const minHeight = kind === 'card' ? CARD_MIN_HEIGHT : kind === 'pin' ? PIN_MIN_HEIGHT : STATUS_MIN_HEIGHT;
  const radius = kind === 'card' ? CARD_RADIUS : kind === 'pin' ? PIN_RADIUS : STATUS_RADIUS;
  const gap = kind === 'pin' ? PIN_CONNECTOR_GAP : CONNECTOR_GAP;
  const box: SceneBox = {
    x: annotation.label.x,
    y: annotation.label.y,
    width,
    height: estimateMultilineHeight(annotation.text, minHeight, kind === 'pin' ? 18 : 20),
    radius,
  };
  const centerX = box.x + box.width / 2;
  const attachLeft = annotation.anchor.x <= centerX;
  const edge = {
    x: attachLeft ? box.x : box.x + box.width,
    y: clamp(annotation.anchor.y, box.y + 14, box.y + box.height - 14),
  };
  const elbow = {
    x: edge.x + (attachLeft ? -gap : gap),
    y: edge.y,
  };

  return {
    kind,
    box,
    anchor: annotation.anchor,
    edge,
    elbow,
  };
}

function buildDimensionLayout(annotation: WorksheetCanvasAnnotation) {
  const start = annotation.anchor;
  const end = annotation.label;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: -dy / length, y: dx / length };
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const boxWidth = estimateSingleLineWidth(annotation.text, 88, 160);
  const boxHeight = estimateMultilineHeight(annotation.text, DIMENSION_MIN_HEIGHT, 16);
  const box: SceneBox = {
    x: mid.x + normal.x * DIMENSION_LABEL_OFFSET - boxWidth / 2,
    y: mid.y + normal.y * DIMENSION_LABEL_OFFSET - boxHeight / 2,
    width: boxWidth,
    height: boxHeight,
    radius: DIMENSION_RADIUS,
  };

  return {
    kind: 'dimension' as const,
    start,
    end,
    box,
    startTick: [
      { x: start.x + normal.x * TICK_HALF, y: start.y + normal.y * TICK_HALF },
      { x: start.x - normal.x * TICK_HALF, y: start.y - normal.y * TICK_HALF },
    ] as [WorksheetCanvasPoint, WorksheetCanvasPoint],
    endTick: [
      { x: end.x + normal.x * TICK_HALF, y: end.y + normal.y * TICK_HALF },
      { x: end.x - normal.x * TICK_HALF, y: end.y - normal.y * TICK_HALF },
    ] as [WorksheetCanvasPoint, WorksheetCanvasPoint],
  };
}

function buildHighlightLayout(annotation: WorksheetCanvasAnnotation) {
  const left = Math.min(annotation.anchor.x, annotation.label.x);
  const top = Math.min(annotation.anchor.y, annotation.label.y);
  const width = Math.max(1, Math.abs(annotation.label.x - annotation.anchor.x));
  const height = Math.max(1, Math.abs(annotation.label.y - annotation.anchor.y));
  const labelWidth = estimateSingleLineWidth(annotation.text, 120, 188);
  const labelHeight = estimateMultilineHeight(annotation.text, HIGHLIGHT_MIN_HEIGHT, 18);

  return {
    kind: 'highlight' as const,
    rect: { x: left, y: top, width, height },
    box: {
      x: left,
      y: top - labelHeight - HIGHLIGHT_LABEL_GAP,
      width: Math.max(labelWidth, HIGHLIGHT_LABEL_WIDTH),
      height: labelHeight,
      radius: HIGHLIGHT_RADIUS,
    },
    anchor: annotation.anchor,
    secondary: annotation.label,
  };
}

function buildRenderAnnotation(
  annotation: WorksheetCanvasAnnotation,
  matrix: Mat6,
  offset: WorksheetCanvasPoint,
  selected: boolean,
  editing: boolean,
): RenderAnnotation {
  if (annotation.type === 'dimension') {
    const layout = buildDimensionLayout(annotation);
    return {
      annotation,
      selected,
      editing,
      kind: 'dimension',
      anchorViewport: scenePointToOverlay(matrix, offset, layout.start),
      secondaryHandleViewport: scenePointToOverlay(matrix, offset, layout.end),
      boxViewport: sceneBoxToOverlay(matrix, offset, layout.box),
      startTickViewport: [
        scenePointToOverlay(matrix, offset, layout.startTick[0]),
        scenePointToOverlay(matrix, offset, layout.startTick[1]),
      ],
      endTickViewport: [
        scenePointToOverlay(matrix, offset, layout.endTick[0]),
        scenePointToOverlay(matrix, offset, layout.endTick[1]),
      ],
    };
  }

  if (annotation.type === 'highlight') {
    const layout = buildHighlightLayout(annotation);
    return {
      annotation,
      selected,
      editing,
      kind: 'highlight',
      anchorViewport: scenePointToOverlay(matrix, offset, layout.anchor),
      secondaryHandleViewport: scenePointToOverlay(matrix, offset, layout.secondary),
      boxViewport: sceneBoxToOverlay(matrix, offset, layout.box),
      rectViewport: sceneRectToOverlay(matrix, offset, layout.rect),
    };
  }

  const kind = annotation.type === 'pin' || annotation.type === 'status' ? annotation.type : 'card';
  const layout = buildCardLikeLayout(annotation, kind);
  return {
    annotation,
    selected,
    editing,
    kind,
    anchorViewport: scenePointToOverlay(matrix, offset, layout.anchor),
    elbowViewport: scenePointToOverlay(matrix, offset, layout.elbow),
    edgeViewport: scenePointToOverlay(matrix, offset, layout.edge),
    boxViewport: sceneBoxToOverlay(matrix, offset, layout.box),
  };
}

function buildDraftAnnotation(draft: DraftAnnotation): WorksheetCanvasAnnotation {
  const draftLabel =
    draft.type === 'pin'
      ? { x: draft.label.x + 14, y: draft.label.y - 14 }
      : draft.type === 'status'
        ? { x: draft.label.x + 18, y: draft.label.y - 18 }
        : draft.type === 'card'
          ? { x: draft.label.x + 12, y: draft.label.y - 18 }
          : draft.label;

  return {
    id: '__draft__',
    type: draft.type,
    anchor: draft.anchor,
    label: draftLabel,
    text: getDefaultAnnotationText(draft.type),
    status: draft.type === 'status' ? 'review' : undefined,
    color:
      draft.type === 'pin'
        ? '#2563EB'
        : draft.type === 'dimension'
          ? '#0F766E'
          : draft.type === 'highlight'
            ? '#D97706'
            : draft.type === 'status'
              ? '#DC2626'
              : '#475569',
    backgroundColor:
      draft.type === 'dimension'
        ? '#ECFDF5'
        : draft.type === 'highlight'
          ? '#FEF3C7'
          : draft.type === 'status'
            ? '#FEF2F2'
            : '#FFFFFF',
    textColor:
      draft.type === 'dimension'
        ? '#115E59'
        : draft.type === 'highlight'
          ? '#92400E'
          : draft.type === 'status'
            ? '#991B1B'
            : undefined,
  };
}

function getSurfaceClass(annotation: WorksheetCanvasAnnotation, selected: boolean) {
  if (annotation.type === 'pin') {
    return selected
      ? 'border-violet-400 bg-white text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.16)] dark:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
      : 'border-blue-200 bg-white text-slate-700 shadow-[0_8px_18px_rgba(37,99,235,0.10)] dark:border-blue-500/40 dark:bg-slate-900 dark:text-slate-100';
  }

  if (annotation.type === 'dimension') {
    return selected
      ? 'border-violet-400 bg-white text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.16)] dark:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
      : 'border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-[0_8px_18px_rgba(15,118,110,0.10)] dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100';
  }

  if (annotation.type === 'highlight') {
    return selected
      ? 'border-violet-400 bg-white text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.16)] dark:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
      : 'border-amber-200 bg-amber-50/95 text-amber-900 shadow-[0_8px_18px_rgba(217,119,6,0.10)] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100';
  }

  if (annotation.type === 'status') {
    return selected
      ? 'border-violet-400 bg-white text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.16)] dark:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
      : 'border-rose-200 bg-rose-50/95 text-rose-900 shadow-[0_8px_18px_rgba(220,38,38,0.10)] dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100';
  }

  return selected
    ? 'border-violet-400 bg-white text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.16)] dark:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
    : 'border-slate-200/90 bg-white/96 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200';
}

export default function WorksheetAnnotationOverlay({
  canvas,
  annotations,
  selectedAnnotationId,
  visible,
  draftAnnotation = null,
  onSelectAnnotation,
  onAnnotationsChange,
}: WorksheetAnnotationOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const annotationsRef = useRef(annotations);
  const dragStateRef = useRef<DragState | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [viewportVersion, setViewportVersion] = useState(0);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    if (!visible) {
      setEditingAnnotationId(null);
    }
  }, [visible]);

  useEffect(() => {
    const syncViewport = () => {
      setViewportVersion((version) => version + 1);
    };

    if (!canvas) {
      return;
    }

    syncViewport();
    canvas.on('after:render', syncViewport);
    return () => {
      canvas.off('after:render', syncViewport);
    };
  }, [canvas]);

  const viewportMatrix = ((canvas?.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as Mat6).slice() as Mat6;
  void viewportVersion;

  const viewportOffset = useMemo(() => {
    const rootRect = rootRef.current?.getBoundingClientRect() ?? null;
    const canvasRect = getCanvasRect(canvas);
    if (!rootRect || !canvasRect) {
      return { x: 0, y: 0 };
    }
    return {
      x: canvasRect.left - rootRect.left,
      y: canvasRect.top - rootRect.top,
    };
  }, [canvas, viewportVersion]);

  const commitText = useCallback(
    (annotationId: string, nextText: string) => {
      const currentAnnotation = annotationsRef.current.find((annotation) => annotation.id === annotationId);
      const fallbackText = getDefaultAnnotationText(currentAnnotation?.type ?? 'card');
      const normalized = nextText.trim().length > 0 ? nextText : fallbackText;
      onAnnotationsChange(
        annotationsRef.current.map((annotation) =>
          annotation.id === annotationId ? { ...annotation, text: normalized } : annotation,
        ),
      );
      setEditingAnnotationId(null);
    },
    [onAnnotationsChange],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const canvasRect = getCanvasRect(canvas);
      if (!dragState || !canvasRect) {
        return;
      }

      const nextScene = clientToScene(
        event.clientX,
        event.clientY,
        canvasRect,
        ((canvas?.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as Mat6).slice() as Mat6,
      );

      onAnnotationsChange(
        annotationsRef.current.map((annotation) => {
          if (annotation.id !== dragState.annotationId) {
            return annotation;
          }

          if (dragState.mode === 'anchor') {
            return {
              ...annotation,
              anchor: nextScene,
            };
          }

          const deltaX = nextScene.x - dragState.startScene.x;
          const deltaY = nextScene.y - dragState.startScene.y;

          if (dragState.mode === 'label') {
            return {
              ...annotation,
              label: {
                x: dragState.initialLabel.x + deltaX,
                y: dragState.initialLabel.y + deltaY,
              },
            };
          }

          return {
            ...annotation,
            anchor: {
              x: dragState.initialAnchor.x + deltaX,
              y: dragState.initialAnchor.y + deltaY,
            },
            label: {
              x: dragState.initialLabel.x + deltaX,
              y: dragState.initialLabel.y + deltaY,
            },
          };
        }),
      );
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [canvas, onAnnotationsChange]);

  const beginDrag = useCallback(
    (event: React.PointerEvent, annotation: WorksheetCanvasAnnotation, mode: DragMode) => {
      const canvasRect = getCanvasRect(canvas);
      if (!canvasRect) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      onSelectAnnotation(annotation.id);
      const startScene = clientToScene(
        event.clientX,
        event.clientY,
        canvasRect,
        ((canvas?.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as Mat6).slice() as Mat6,
      );
      dragStateRef.current = {
        annotationId: annotation.id,
        mode,
        startScene,
        initialAnchor: annotation.anchor,
        initialLabel: annotation.label,
      };
    },
    [canvas, onSelectAnnotation],
  );

  const renderAnnotations = useMemo(() => {
    if (!visible) {
      return [] as RenderAnnotation[];
    }

    return annotations.map((annotation) =>
      buildRenderAnnotation(
        annotation,
        viewportMatrix,
        viewportOffset,
        annotation.id === selectedAnnotationId,
        annotation.id === editingAnnotationId,
      ),
    );
  }, [annotations, editingAnnotationId, selectedAnnotationId, viewportMatrix, viewportOffset, visible]);

  const draftLayout = useMemo(() => {
    if (!draftAnnotation || !visible) {
      return null;
    }

    return buildRenderAnnotation(
      buildDraftAnnotation(draftAnnotation),
      viewportMatrix,
      viewportOffset,
      false,
      false,
    );
  }, [draftAnnotation, viewportMatrix, viewportOffset, visible]);

  return (
    <div ref={rootRef} className='pointer-events-none absolute inset-0 z-30 overflow-hidden'>
      <svg className='pointer-events-none absolute inset-0 h-full w-full overflow-visible'>
        {visible &&
          renderAnnotations.map((item) => {
            if (item.kind === 'dimension' && item.boxViewport && item.secondaryHandleViewport && item.startTickViewport && item.endTickViewport) {
              return (
                <g key={item.annotation.id}>
                  <path
                    d={`M ${item.anchorViewport.x} ${item.anchorViewport.y} L ${item.secondaryHandleViewport.x} ${item.secondaryHandleViewport.y}`}
                    fill='none'
                    stroke='transparent'
                    strokeWidth={HIT_STROKE_WIDTH}
                    strokeLinecap='round'
                    pointerEvents='stroke'
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'annotation')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                  <path
                    d={`M ${item.anchorViewport.x} ${item.anchorViewport.y} L ${item.secondaryHandleViewport.x} ${item.secondaryHandleViewport.y}`}
                    fill='none'
                    stroke={item.annotation.color ?? '#0F766E'}
                    strokeWidth={item.selected ? 2.25 : 1.5}
                    strokeLinecap='round'
                    opacity={item.selected ? 1 : 0.92}
                  />
                  <line
                    x1={item.startTickViewport[0].x}
                    y1={item.startTickViewport[0].y}
                    x2={item.startTickViewport[1].x}
                    y2={item.startTickViewport[1].y}
                    stroke={item.annotation.color ?? '#0F766E'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    strokeLinecap='round'
                  />
                  <line
                    x1={item.endTickViewport[0].x}
                    y1={item.endTickViewport[0].y}
                    x2={item.endTickViewport[1].x}
                    y2={item.endTickViewport[1].y}
                    stroke={item.annotation.color ?? '#0F766E'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    strokeLinecap='round'
                  />
                  <circle
                    cx={item.anchorViewport.x}
                    cy={item.anchorViewport.y}
                    r={item.selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS}
                    fill='#ffffff'
                    stroke={item.selected ? '#7C3AED' : '#94A3B8'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'anchor')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                  <circle
                    cx={item.secondaryHandleViewport.x}
                    cy={item.secondaryHandleViewport.y}
                    r={item.selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS}
                    fill='#ffffff'
                    stroke={item.selected ? '#7C3AED' : '#94A3B8'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'label')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                </g>
              );
            }

            if (item.kind === 'highlight' && item.rectViewport && item.boxViewport && item.secondaryHandleViewport) {
              return (
                <g key={item.annotation.id}>
                  <rect
                    x={item.rectViewport.x}
                    y={item.rectViewport.y}
                    width={item.rectViewport.width}
                    height={item.rectViewport.height}
                    rx={8}
                    fill='transparent'
                    stroke='transparent'
                    strokeWidth={14}
                    pointerEvents='all'
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'annotation')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                  <rect
                    x={item.rectViewport.x}
                    y={item.rectViewport.y}
                    width={item.rectViewport.width}
                    height={item.rectViewport.height}
                    rx={8}
                    fill={item.annotation.backgroundColor ?? '#FEF3C7'}
                    fillOpacity={0.26}
                    stroke={item.annotation.color ?? '#D97706'}
                    strokeWidth={item.selected ? 2.2 : 1.4}
                    strokeDasharray='6 5'
                  />
                  <circle
                    cx={item.anchorViewport.x}
                    cy={item.anchorViewport.y}
                    r={item.selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS}
                    fill='#ffffff'
                    stroke={item.selected ? '#7C3AED' : '#94A3B8'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'anchor')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                  <circle
                    cx={item.secondaryHandleViewport.x}
                    cy={item.secondaryHandleViewport.y}
                    r={item.selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS}
                    fill='#ffffff'
                    stroke={item.selected ? '#7C3AED' : '#94A3B8'}
                    strokeWidth={item.selected ? 2 : 1.5}
                    className='pointer-events-auto'
                    onPointerDown={(event) => beginDrag(event, item.annotation, 'label')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(item.annotation.id);
                    }}
                  />
                </g>
              );
            }

            if (!item.boxViewport || !item.elbowViewport || !item.edgeViewport) {
              return null;
            }

            return (
              <g key={item.annotation.id}>
                <path
                  d={`M ${item.anchorViewport.x} ${item.anchorViewport.y} L ${item.elbowViewport.x} ${item.elbowViewport.y} L ${item.edgeViewport.x} ${item.edgeViewport.y}`}
                  fill='none'
                  stroke='transparent'
                  strokeWidth={HIT_STROKE_WIDTH}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  pointerEvents='stroke'
                  className='pointer-events-auto'
                  onPointerDown={(event) => beginDrag(event, item.annotation, 'annotation')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectAnnotation(item.annotation.id);
                  }}
                />
                <path
                  d={`M ${item.anchorViewport.x} ${item.anchorViewport.y} L ${item.elbowViewport.x} ${item.elbowViewport.y} L ${item.edgeViewport.x} ${item.edgeViewport.y}`}
                  fill='none'
                  stroke={item.annotation.color ?? (item.selected ? '#7C3AED' : '#475569')}
                  strokeWidth={item.selected ? 2.25 : 1.5}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  opacity={item.selected ? 1 : 0.9}
                />
                <circle
                  cx={item.anchorViewport.x}
                  cy={item.anchorViewport.y}
                  r={item.selected ? SELECTED_HANDLE_RADIUS : HANDLE_RADIUS}
                  fill='#ffffff'
                  stroke={item.selected ? '#7C3AED' : '#94A3B8'}
                  strokeWidth={item.selected ? 2 : 1.5}
                  className='pointer-events-auto'
                  onPointerDown={(event) => beginDrag(event, item.annotation, 'anchor')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectAnnotation(item.annotation.id);
                  }}
                />
              </g>
            );
          })}
        {draftLayout && draftLayout.kind === 'dimension' && draftLayout.secondaryHandleViewport && draftLayout.startTickViewport && draftLayout.endTickViewport && (
          <g opacity={0.8}>
            <path
              d={`M ${draftLayout.anchorViewport.x} ${draftLayout.anchorViewport.y} L ${draftLayout.secondaryHandleViewport.x} ${draftLayout.secondaryHandleViewport.y}`}
              fill='none'
              stroke='#64748B'
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeDasharray='5 5'
            />
            <line
              x1={draftLayout.startTickViewport[0].x}
              y1={draftLayout.startTickViewport[0].y}
              x2={draftLayout.startTickViewport[1].x}
              y2={draftLayout.startTickViewport[1].y}
              stroke='#64748B'
              strokeWidth={1.5}
            />
            <line
              x1={draftLayout.endTickViewport[0].x}
              y1={draftLayout.endTickViewport[0].y}
              x2={draftLayout.endTickViewport[1].x}
              y2={draftLayout.endTickViewport[1].y}
              stroke='#64748B'
              strokeWidth={1.5}
            />
          </g>
        )}
        {draftLayout && draftLayout.kind === 'highlight' && draftLayout.rectViewport && (
          <g opacity={0.85}>
            <rect
              x={draftLayout.rectViewport.x}
              y={draftLayout.rectViewport.y}
              width={draftLayout.rectViewport.width}
              height={draftLayout.rectViewport.height}
              rx={8}
              fill='#FEF3C7'
              fillOpacity={0.2}
              stroke='#D97706'
              strokeWidth={1.5}
              strokeDasharray='6 5'
            />
          </g>
        )}
        {draftLayout && (draftLayout.kind === 'card' || draftLayout.kind === 'pin' || draftLayout.kind === 'status') && draftLayout.elbowViewport && draftLayout.edgeViewport && (
          <g opacity={0.8}>
            <path
              d={`M ${draftLayout.anchorViewport.x} ${draftLayout.anchorViewport.y} L ${draftLayout.elbowViewport.x} ${draftLayout.elbowViewport.y} L ${draftLayout.edgeViewport.x} ${draftLayout.edgeViewport.y}`}
              fill='none'
              stroke='#64748B'
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeDasharray='5 5'
            />
            <circle
              cx={draftLayout.anchorViewport.x}
              cy={draftLayout.anchorViewport.y}
              r={4}
              fill='#ffffff'
              stroke='#94A3B8'
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {visible &&
        renderAnnotations.map((item) => {
          if (!item.boxViewport) {
            return null;
          }

          const statusMeta = item.annotation.type === 'status' ? getStatusMeta(item.annotation.status) : null;
          const labelDragMode =
            item.annotation.type === 'card' || item.annotation.type === 'pin' || item.annotation.type === 'status'
              ? 'label'
              : 'annotation';

          return (
            <div
              key={`${item.annotation.id}-label`}
              className='pointer-events-auto absolute'
              style={{
                left: `${item.boxViewport.x}px`,
                top: `${item.boxViewport.y}px`,
                width: `${item.boxViewport.width}px`,
                minHeight: `${item.boxViewport.height}px`,
              }}
              onPointerDown={(event) => {
                if (!item.editing) {
                  beginDrag(event, item.annotation, labelDragMode);
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectAnnotation(item.annotation.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onSelectAnnotation(item.annotation.id);
                setEditingAnnotationId(item.annotation.id);
                setEditingText(item.annotation.text);
              }}
            >
              <div
                className={`border px-[14px] py-[12px] shadow-sm transition-all duration-150 ${getSurfaceClass(
                  item.annotation,
                  item.selected,
                )}`}
                style={{
                  minHeight: `${item.boxViewport.height}px`,
                  borderRadius: `${item.boxViewport.radius}px`,
                  color: item.annotation.textColor,
                  backgroundColor: item.annotation.backgroundColor,
                }}
              >
                {statusMeta && (
                  <div className='mb-2 flex items-center justify-between'>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.chipClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                )}
                {item.editing ? (
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onBlur={() => commitText(item.annotation.id, editingText)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        commitText(item.annotation.id, editingText);
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setEditingAnnotationId(null);
                      }
                    }}
                    className='min-h-[36px] w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-[1.45] text-inherit outline-none'
                    rows={Math.max(2, item.annotation.text.split('\n').length)}
                  />
                ) : (
                  <div className='whitespace-pre-wrap break-words text-[13px] leading-[1.45]'>
                    {item.annotation.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}

      {draftLayout?.boxViewport && (
        <div
          className='pointer-events-none absolute'
          style={{
            left: `${draftLayout.boxViewport.x}px`,
            top: `${draftLayout.boxViewport.y}px`,
            width: `${draftLayout.boxViewport.width}px`,
            minHeight: `${draftLayout.boxViewport.height}px`,
          }}
        >
          <div
            className='rounded-[14px] border border-dashed border-slate-300 bg-white/85 px-[14px] py-[12px] text-[13px] leading-[1.45] text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-slate-600 dark:bg-slate-900/85 dark:text-slate-300'
            style={{ borderRadius: `${draftLayout.boxViewport.radius}px` }}
          >
            {draftLayout.annotation.type === 'status' && (
              <div className='mb-2'>
                <span className='inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'>
                  확인 필요
                </span>
              </div>
            )}
            {draftLayout.annotation.text}
          </div>
        </div>
      )}
    </div>
  );
}
