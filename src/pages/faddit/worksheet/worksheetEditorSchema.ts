export type WorksheetEditorPageType =
  | 'custom-design'
  | 'sketch'
  | 'pattern'
  | 'label'
  | 'size-spec';

export interface WorksheetCanvasSpec {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface WorksheetCanvasPoint {
  x: number;
  y: number;
}

export type WorksheetCanvasAnnotationType =
  | 'card'
  | 'pin'
  | 'dimension'
  | 'highlight'
  | 'status';

export type WorksheetCanvasAnnotationStatus = 'review' | 'update' | 'done';

export interface WorksheetCanvasAnnotation {
  id: string;
  type: WorksheetCanvasAnnotationType;
  anchor: WorksheetCanvasPoint;
  label: WorksheetCanvasPoint;
  text: string;
  status?: WorksheetCanvasAnnotationStatus;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface WorksheetEditorPage {
  id: string;
  label: string;
  type: WorksheetEditorPageType;
  canvasSpec?: WorksheetCanvasSpec;
}

export interface WorksheetEditorDocument {
  schemaVersion: 1;
  activePageId: string;
  pageToggle: boolean;
  zoom: number;
  pages: WorksheetEditorPage[];
  sketchPages: Record<string, string>;
  pageAnnotations: Record<string, WorksheetCanvasAnnotation[]>;
  pageThumbnails: Record<string, string>;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const MIN_CANVAS_SIZE = 64;
const MAX_CANVAS_SIZE = 8192;
const DEFAULT_CANVAS_WIDTH = 1920;
const DEFAULT_CANVAS_HEIGHT = 1080;
const DEFAULT_CANVAS_BACKGROUND = '#FFFFFF';

function clampCanvasSize(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, Math.round(value)));
}

function normalizeCanvasBackground(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_CANVAS_BACKGROUND;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CANVAS_BACKGROUND;
}

export function createCanvasSpec(width: number, height: number): WorksheetCanvasSpec {
  return {
    width: clampCanvasSize(width, DEFAULT_CANVAS_WIDTH),
    height: clampCanvasSize(height, DEFAULT_CANVAS_HEIGHT),
    backgroundColor: DEFAULT_CANVAS_BACKGROUND,
  };
}

export function isWorksheetCanvasPageType(type: WorksheetEditorPageType): boolean {
  return type === 'custom-design' || type === 'sketch' || type === 'pattern' || type === 'label';
}

export function getDefaultCanvasSpecForPageType(
  type: WorksheetEditorPageType,
): WorksheetCanvasSpec | undefined {
  if (!isWorksheetCanvasPageType(type)) {
    return undefined;
  }
  return createCanvasSpec(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
}

function normalizeCanvasSpec(
  pageType: WorksheetEditorPageType,
  value: unknown,
): WorksheetCanvasSpec | undefined {
  if (!isWorksheetCanvasPageType(pageType)) {
    return undefined;
  }

  if (pageType === 'sketch' || pageType === 'pattern') {
    return createCanvasSpec(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
  }

  const defaultSpec = getDefaultCanvasSpecForPageType(pageType);
  if (!value || typeof value !== 'object') {
    return defaultSpec;
  }

  const raw = value as Partial<WorksheetCanvasSpec>;
  const fallbackWidth = defaultSpec?.width ?? DEFAULT_CANVAS_WIDTH;
  const fallbackHeight = defaultSpec?.height ?? DEFAULT_CANVAS_HEIGHT;

  return {
    width: clampCanvasSize(typeof raw.width === 'number' ? raw.width : fallbackWidth, fallbackWidth),
    height: clampCanvasSize(typeof raw.height === 'number' ? raw.height : fallbackHeight, fallbackHeight),
    backgroundColor: normalizeCanvasBackground(raw.backgroundColor),
  };
}

function getDefaultLabelByType(type: WorksheetEditorPageType): string {
  if (type === 'custom-design') return '새 디자인';
  if (type === 'sketch') return '도식화';
  if (type === 'pattern') return '패턴';
  if (type === 'label') return '라벨';
  return '사이즈 스펙';
}

function createDefaultPages(): WorksheetEditorPage[] {
  return [
    {
      id: createId(),
      label: '새 디자인',
      type: 'custom-design',
      canvasSpec: createCanvasSpec(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT),
    },
  ];
}

export function createDefaultWorksheetEditorDocument(): WorksheetEditorDocument {
  const pages = createDefaultPages();

  return {
    schemaVersion: 1,
    activePageId: pages[0]?.id ?? '',
    pageToggle: true,
    zoom: 100,
    pages,
    sketchPages: {},
    pageAnnotations: {},
    pageThumbnails: {},
  };
}

function isPageType(value: unknown): value is WorksheetEditorPageType {
  return (
    value === 'custom-design' ||
    value === 'sketch' ||
    value === 'pattern' ||
    value === 'label' ||
    value === 'size-spec'
  );
}

export function isWorksheetCanvasAnnotationType(value: unknown): value is WorksheetCanvasAnnotationType {
  return (
    value === 'card' ||
    value === 'pin' ||
    value === 'dimension' ||
    value === 'highlight' ||
    value === 'status'
  );
}

export function getDefaultAnnotationText(type: WorksheetCanvasAnnotationType): string {
  if (type === 'pin') return '핀 주석';
  if (type === 'dimension') return '치수 주석';
  if (type === 'highlight') return '영역 주석';
  if (type === 'status') return '확인 필요';
  return '주석 입력';
}

function normalizeAnnotationStatus(
  type: WorksheetCanvasAnnotationType,
  value: unknown,
): WorksheetCanvasAnnotationStatus | undefined {
  if (value === 'review' || value === 'update' || value === 'done') {
    return value;
  }
  return type === 'status' ? 'review' : undefined;
}

export function parseWorksheetEditorDocument(input: unknown): WorksheetEditorDocument {
  const fallback = createDefaultWorksheetEditorDocument();

  if (!input || typeof input !== 'object') {
    return fallback;
  }

  const raw = input as Partial<WorksheetEditorDocument>;
  const pages = Array.isArray(raw.pages)
    ? raw.pages
        .map((page) => {
          if (!page || typeof page !== 'object') {
            return null;
          }

          const id = typeof page.id === 'string' && page.id.length > 0 ? page.id : createId();
          const type = isPageType(page.type) ? page.type : 'custom-design';
          const label =
            typeof page.label === 'string' && page.label.trim().length > 0
              ? page.label
              : getDefaultLabelByType(type);
          const canvasSpec = normalizeCanvasSpec(type, page.canvasSpec);

          return { id, label, type, canvasSpec } satisfies WorksheetEditorPage;
        })
        .filter((page): page is WorksheetEditorPage => page !== null)
    : [];

  const normalizedPages = pages.length > 0 ? pages : fallback.pages;
  const pageIdSet = new Set(normalizedPages.map((page) => page.id));

  const activePageId =
    typeof raw.activePageId === 'string' && pageIdSet.has(raw.activePageId)
      ? raw.activePageId
      : normalizedPages[0]?.id ?? '';

  const zoom =
    typeof raw.zoom === 'number' && Number.isFinite(raw.zoom) ? Math.max(10, Math.min(500, raw.zoom)) : 100;

  const sketchPages =
    raw.sketchPages && typeof raw.sketchPages === 'object'
      ? Object.entries(raw.sketchPages).reduce<Record<string, string>>((acc, [pageId, value]) => {
          if (typeof value === 'string') {
            acc[pageId] = value;
          }
          return acc;
        }, {})
      : {};

  const pageAnnotations =
    raw.pageAnnotations && typeof raw.pageAnnotations === 'object'
      ? Object.entries(raw.pageAnnotations).reduce<Record<string, WorksheetCanvasAnnotation[]>>(
          (acc, [pageId, value]) => {
            if (!Array.isArray(value)) {
              return acc;
            }

            const annotations = value
              .map((entry, index) => {
                if (!entry || typeof entry !== 'object') {
                  return null;
                }

                const rawEntry = entry as Partial<WorksheetCanvasAnnotation>;
                const anchorX = Number(rawEntry.anchor?.x);
                const anchorY = Number(rawEntry.anchor?.y);
                const labelX = Number(rawEntry.label?.x);
                const labelY = Number(rawEntry.label?.y);
                const annotationType = isWorksheetCanvasAnnotationType(rawEntry.type)
                  ? rawEntry.type
                  : 'card';

                if (![anchorX, anchorY, labelX, labelY].every((number) => Number.isFinite(number))) {
                  return null;
                }

                return {
                  id:
                    typeof rawEntry.id === 'string' && rawEntry.id.trim().length > 0
                      ? rawEntry.id
                      : `${pageId}-annotation-${index}`,
                  type: annotationType,
                  anchor: { x: anchorX, y: anchorY },
                  label: { x: labelX, y: labelY },
                  text:
                    typeof rawEntry.text === 'string' && rawEntry.text.trim().length > 0
                      ? rawEntry.text
                      : getDefaultAnnotationText(annotationType),
                  status: normalizeAnnotationStatus(annotationType, rawEntry.status),
                  color:
                    typeof rawEntry.color === 'string' && rawEntry.color.trim().length > 0
                      ? rawEntry.color
                      : undefined,
                  backgroundColor:
                    typeof rawEntry.backgroundColor === 'string' &&
                    rawEntry.backgroundColor.trim().length > 0
                      ? rawEntry.backgroundColor
                      : undefined,
                  textColor:
                    typeof rawEntry.textColor === 'string' && rawEntry.textColor.trim().length > 0
                      ? rawEntry.textColor
                      : undefined,
                } satisfies WorksheetCanvasAnnotation;
              })
              .filter((annotation): annotation is WorksheetCanvasAnnotation => annotation !== null);

            if (annotations.length > 0) {
              acc[pageId] = annotations;
            }
            return acc;
          },
          {},
        )
      : {};

  const pageThumbnails =
    raw.pageThumbnails && typeof raw.pageThumbnails === 'object'
      ? Object.entries(raw.pageThumbnails).reduce<Record<string, string>>((acc, [pageId, value]) => {
          if (typeof value === 'string') {
            acc[pageId] = value;
          }
          return acc;
        }, {})
      : {};

  return {
    schemaVersion: 1,
    activePageId,
    pageToggle: typeof raw.pageToggle === 'boolean' ? raw.pageToggle : true,
    zoom,
    pages: normalizedPages,
    sketchPages,
    pageAnnotations,
    pageThumbnails,
  };
}
