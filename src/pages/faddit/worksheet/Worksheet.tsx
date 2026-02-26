import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import WorksheetTopBar from './WorksheetTopBar';
import WorksheetToolbox from './WorksheetToolbox';
import WorksheetContentPanel from './WorksheetContentPanel';
import { CanvasProvider } from './CanvasProvider';
import { getWorksheetDetail, saveWorksheetUiInfo } from '../../../lib/api/worksheetApi';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  createDefaultWorksheetEditorDocument,
  parseWorksheetEditorDocument,
  type WorksheetEditorDocument,
} from './worksheetEditorSchema';

const EDITOR_KEY = 'worksheet_v2_editor';

function parseUiInfoJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readEditorDocument(uiInfo: Record<string, unknown>): WorksheetEditorDocument {
  const nested = uiInfo[EDITOR_KEY];
  if (nested && typeof nested === 'object') {
    return parseWorksheetEditorDocument(nested);
  }

  return parseWorksheetEditorDocument(uiInfo);
}

function applyRequestedPageId(
  document: WorksheetEditorDocument,
  requestedPageId: string | null,
): WorksheetEditorDocument {
  if (!requestedPageId) {
    return document;
  }

  if (!document.pages.some((page) => page.id === requestedPageId)) {
    return document;
  }

  if (document.activePageId === requestedPageId) {
    return document;
  }

  return {
    ...document,
    activePageId: requestedPageId,
  };
}

const Worksheet: React.FC = () => {
  const { worksheetId } = useParams<{ worksheetId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.userId);
  const requestedPageId = searchParams.get('pageId');
  const [editorDoc, setEditorDoc] = useState<WorksheetEditorDocument>(
    createDefaultWorksheetEditorDocument(),
  );
  const [uiInfo, setUiInfo] = useState<Record<string, unknown>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [guideModeEnabled, setGuideModeEnabled] = useState(false);

  const autosaveTimerRef = useRef<number | null>(null);
  const lastSavedDocJsonRef = useRef<string>(JSON.stringify(editorDoc));
  const editorDocRef = useRef(editorDoc);

  useEffect(() => {
    editorDocRef.current = editorDoc;
  }, [editorDoc]);

  const saveEditorDocument = useCallback(
    async (nextDoc: WorksheetEditorDocument) => {
      if (!worksheetId || !userId) {
        return;
      }

      const nextUiInfo = {
        ...uiInfo,
        [EDITOR_KEY]: nextDoc,
      };

      setIsSaving(true);
      try {
        await saveWorksheetUiInfo(worksheetId, userId, nextUiInfo);
        setUiInfo(nextUiInfo);
        const serialized = JSON.stringify(nextDoc);
        lastSavedDocJsonRef.current = serialized;
        setHasUnsavedChanges(false);
      } finally {
        setIsSaving(false);
      }
    },
    [worksheetId, userId, uiInfo],
  );

  const handleManualSave = useCallback(() => {
    void saveEditorDocument(editorDocRef.current);
  }, [saveEditorDocument]);

  useEffect(() => {
    if (!worksheetId || !userId) {
      const fallback = applyRequestedPageId(
        createDefaultWorksheetEditorDocument(),
        requestedPageId,
      );
      const serialized = JSON.stringify(fallback);
      setUiInfo({});
      setEditorDoc(fallback);
      lastSavedDocJsonRef.current = serialized;
      setHasUnsavedChanges(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsInitialLoading(true);
      try {
        const detail = await getWorksheetDetail(worksheetId, userId);
        if (!isMounted) {
          return;
        }

        const nextUiInfo = parseUiInfoJson(detail.worksheet?.ui_info_json ?? null);
        const nextDoc = applyRequestedPageId(readEditorDocument(nextUiInfo), requestedPageId);
        const serialized = JSON.stringify(nextDoc);

        setUiInfo(nextUiInfo);
        setEditorDoc(nextDoc);
        lastSavedDocJsonRef.current = serialized;
        setHasUnsavedChanges(false);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [worksheetId, userId, requestedPageId]);

  useEffect(() => {
    const serialized = JSON.stringify(editorDoc);
    const changed = serialized !== lastSavedDocJsonRef.current;
    setHasUnsavedChanges(changed);
  }, [editorDoc]);

  useEffect(() => {
    if (!autosaveEnabled || !worksheetId || !userId || isInitialLoading || isSaving) {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (!hasUnsavedChanges) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void saveEditorDocument(editorDocRef.current);
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [autosaveEnabled, worksheetId, userId, hasUnsavedChanges, isInitialLoading, isSaving, saveEditorDocument]);

  const topbarUnsaved = useMemo(
    () => hasUnsavedChanges && !isInitialLoading,
    [hasUnsavedChanges, isInitialLoading],
  );

  return (
    <div className='worksheet-pointer-scope flex h-screen w-screen gap-2 overflow-hidden bg-[var(--worksheet-common-bg)] p-2'>
      <CanvasProvider>
        <div className='h-full shrink-0'>
          <WorksheetToolbox />
        </div>
        <section className='flex min-h-0 min-w-0 flex-1 flex-col gap-2'>
          <WorksheetTopBar
            onExit={() => navigate(-1)}
            onSave={worksheetId && userId ? handleManualSave : undefined}
            isSaving={isSaving}
            hasUnsavedChanges={topbarUnsaved}
          />
          <main className='flex min-h-0 min-w-0 flex-1'>
            <WorksheetContentPanel
              editorDocument={editorDoc}
              onDocumentChange={setEditorDoc}
              readOnly={isInitialLoading}
              autosaveEnabled={autosaveEnabled}
              onToggleAutosave={() => setAutosaveEnabled((prev) => !prev)}
              guideModeEnabled={guideModeEnabled}
              onToggleGuideMode={() => setGuideModeEnabled((prev) => !prev)}
            />
          </main>
        </section>
      </CanvasProvider>
    </div>
  );
};

export default Worksheet;
