import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import WorksheetTemplateSidebar from './WorksheetTemplateSidebar';
import WorksheetHeader from './WorksheetHeader';
import WorksheetGridContent from './WorksheetGridContent';
import { getWorksheetDetail, saveWorksheetUiInfo } from '../../../lib/api/worksheetApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWorksheetStore } from './useWorksheetStore';
import {
  createDefaultWorksheetEditorDocument,
  parseWorksheetEditorDocument,
  type WorksheetEditorDocument,
} from './worksheetEditorSchema';

const EDITOR_KEY = 'worksheet_v2_editor';

function parseUiInfoJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};

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

const Worksheet: React.FC = () => {
  const { worksheetId } = useParams<{ worksheetId?: string }>();
  const userId = useAuthStore((state) => state.user?.userId);
  const setWorksheetTitle = useWorksheetStore((state) => state.setWorksheetTitle);
  const setWorksheetLoading = useWorksheetStore((state) => state.setWorksheetLoading);
  const setWorksheetLoadError = useWorksheetStore((state) => state.setWorksheetLoadError);
  const hydrateWorksheetUiInfo = useWorksheetStore((state) => state.hydrateWorksheetUiInfo);
  const activeTab = useWorksheetStore((state) => state.activeTab);
  const setActiveCard = useWorksheetStore((state) => state.setActiveCard);
  const [editorDocument, setEditorDocument] = useState<WorksheetEditorDocument>(
    createDefaultWorksheetEditorDocument(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessAt, setSaveSuccessAt] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorDocumentRef = useRef(editorDocument);
  const lastSavedSnapshotRef = useRef<string>('');

  const blurActiveEditableElement = useCallback(() => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return;
    }

    const tagName = activeElement.tagName;
    const isFormControl = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
    if (activeElement.isContentEditable || isFormControl) {
      activeElement.blur();
    }
  }, []);

  const handleRootMouseDownCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;

      const moduleRoot = target.closest<HTMLElement>('.worksheet-grid-card-root');
      if (moduleRoot?.dataset.cardId) {
        setActiveCard(activeTab, moduleRoot.dataset.cardId);
        return;
      }

      const gridItem = target.closest<HTMLElement>('.react-grid-item');
      if (gridItem) {
        const gridCardRoot = gridItem.querySelector<HTMLElement>('.worksheet-grid-card-root');
        if (gridCardRoot?.dataset.cardId) {
          setActiveCard(activeTab, gridCardRoot.dataset.cardId);
          return;
        }
      }

      setActiveCard(activeTab, null);
      blurActiveEditableElement();
    },
    [activeTab, setActiveCard, blurActiveEditableElement],
  );

  const buildSavePayload = useCallback(
    (document: WorksheetEditorDocument): Record<string, unknown> => {
      const state = useWorksheetStore.getState();
      return {
        activeTab: state.activeTab,
        tabLayouts: state.tabLayouts,
        cardVisibility: state.cardVisibility,
        sizeSpecUnit: state.sizeSpecUnit,
        moduleElements: state.moduleElements,
        moduleSheetStates: state.moduleSheetStates,
        costState: state.costState,
        customCards: state.customCards,
        customCardContent: state.customCardContent,
        [EDITOR_KEY]: document,
      };
    },
    [],
  );

  const syncUnsavedState = useCallback(() => {
    if (!worksheetId) {
      setHasUnsavedChanges(false);
      return;
    }

    if (useWorksheetStore.getState().isLoadingWorksheet) {
      return;
    }

    const nextSnapshot = JSON.stringify(buildSavePayload(editorDocumentRef.current));
    setHasUnsavedChanges(nextSnapshot !== lastSavedSnapshotRef.current);
  }, [buildSavePayload, worksheetId]);

  const handleSave = useCallback(async () => {
    if (!worksheetId || !userId) {
      setSaveError('저장할 작업지시서 정보를 확인할 수 없습니다.');
      setSaveSuccessAt(null);
      return;
    }

    blurActiveEditableElement();
    setIsSaving(true);
    setSaveError(null);

    const uiInfo = buildSavePayload(editorDocumentRef.current);
    const nextSnapshot = JSON.stringify(uiInfo);

    try {
      await saveWorksheetUiInfo(worksheetId, userId, uiInfo);
      lastSavedSnapshotRef.current = nextSnapshot;
      setHasUnsavedChanges(false);
      setSaveSuccessAt(Date.now());
    } catch {
      setSaveError('작업지시서 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setSaveSuccessAt(null);
    } finally {
      setIsSaving(false);
    }
  }, [worksheetId, userId, blurActiveEditableElement, buildSavePayload]);

  useEffect(() => {
    editorDocumentRef.current = editorDocument;
    syncUnsavedState();
  }, [editorDocument, syncUnsavedState]);

  useEffect(() => {
    const unsubscribe = useWorksheetStore.subscribe(() => {
      syncUnsavedState();
    });

    return () => {
      unsubscribe();
    };
  }, [syncUnsavedState]);

  useEffect(() => {
    if (!worksheetId) {
      setWorksheetLoadError(null);
      setWorksheetLoading(false);
      const defaultDocument = createDefaultWorksheetEditorDocument();
      setEditorDocument(defaultDocument);
      lastSavedSnapshotRef.current = '';
      setHasUnsavedChanges(false);
      setSaveError(null);
      setSaveSuccessAt(null);
      return;
    }

    let isMounted = true;

    const loadWorksheet = async () => {
      try {
        setWorksheetLoading(true);
        setWorksheetLoadError(null);
        const detail = await getWorksheetDetail(worksheetId, userId);

        if (!isMounted) return;

        setWorksheetTitle(detail.worksheet?.name || '작업지시서 명');
        hydrateWorksheetUiInfo(detail.worksheet?.ui_info_json ?? null);
        const uiInfo = parseUiInfoJson(detail.worksheet?.ui_info_json ?? null);
        const nextEditorDocument = readEditorDocument(uiInfo);
        setEditorDocument(nextEditorDocument);
        lastSavedSnapshotRef.current = JSON.stringify(buildSavePayload(nextEditorDocument));
        setHasUnsavedChanges(false);
        setSaveError(null);
        setSaveSuccessAt(null);
      } catch {
        if (!isMounted) return;
        setWorksheetLoadError('작업지시서 정보를 불러오지 못했습니다.');
        const defaultDocument = createDefaultWorksheetEditorDocument();
        setEditorDocument(defaultDocument);
        lastSavedSnapshotRef.current = '';
        setHasUnsavedChanges(false);
        setSaveSuccessAt(null);
      } finally {
        if (!isMounted) return;
        setWorksheetLoading(false);
      }
    };

    loadWorksheet();

    return () => {
      isMounted = false;
    };
  }, [
    worksheetId,
    userId,
    setWorksheetTitle,
    setWorksheetLoading,
    setWorksheetLoadError,
    hydrateWorksheetUiInfo,
    buildSavePayload,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setActiveCard(activeTab, null);
      blurActiveEditableElement();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, setActiveCard, blurActiveEditableElement]);

  return (
    <div
      className='worksheet-pointer-scope flex h-screen w-screen gap-2 overflow-hidden bg-[#f9f9f9] p-2'
      data-worksheet-id={worksheetId || ''}
      onMouseDownCapture={handleRootMouseDownCapture}
    >
      <aside className='shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <WorksheetTemplateSidebar collapsible />
      </aside>
      <main className='flex min-w-0 flex-1 flex-col gap-y-6 p-4'>
        <WorksheetHeader
          onSave={handleSave}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          saveError={saveError}
          saveSuccessAt={saveSuccessAt}
        />
        <WorksheetGridContent editorDocument={editorDocument} />
      </main>
    </div>
  );
};

export default Worksheet;
