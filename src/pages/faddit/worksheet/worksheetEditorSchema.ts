export type WorksheetEditorPageType = 'sketch' | 'pattern' | 'size-spec';

export interface WorksheetEditorPage {
  id: string;
  label: string;
  type: WorksheetEditorPageType;
}

export interface WorksheetEditorDocument {
  schemaVersion: 1;
  activePageId: string;
  pageToggle: boolean;
  zoom: number;
  pages: WorksheetEditorPage[];
  sketchPages: Record<string, string>;
  pageThumbnails: Record<string, string>;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultPages(): WorksheetEditorPage[] {
  return [
    { id: createId(), label: '도식화', type: 'sketch' },
    { id: createId(), label: '패턴', type: 'pattern' },
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
    pageThumbnails: {},
  };
}

function isPageType(value: unknown): value is WorksheetEditorPageType {
  return value === 'sketch' || value === 'pattern' || value === 'size-spec';
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
          const label =
            typeof page.label === 'string' && page.label.trim().length > 0
              ? page.label
              : '페이지';
          const type = isPageType(page.type) ? page.type : 'sketch';

          return { id, label, type } satisfies WorksheetEditorPage;
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
    pageThumbnails,
  };
}
