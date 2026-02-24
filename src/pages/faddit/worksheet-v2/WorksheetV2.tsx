import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import WorksheetTemplateSidebar from '../worksheet/WorksheetTemplateSidebar';
import WorksheetV2Header from './WorksheetV2Header';
import WorksheetV2GridContent from './WorksheetV2GridContent';
import { getWorksheetDetail } from '../../../lib/api/worksheetApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWorksheetV2Store } from './useWorksheetV2Store';

const WorksheetV2: React.FC = () => {
  const { worksheetId } = useParams<{ worksheetId?: string }>();
  const userId = useAuthStore((state) => state.user?.userId);
  const setWorksheetTitle = useWorksheetV2Store((state) => state.setWorksheetTitle);
  const setWorksheetLoading = useWorksheetV2Store((state) => state.setWorksheetLoading);
  const setWorksheetLoadError = useWorksheetV2Store((state) => state.setWorksheetLoadError);
  const hydrateWorksheetUiInfo = useWorksheetV2Store((state) => state.hydrateWorksheetUiInfo);
  const activeTab = useWorksheetV2Store((state) => state.activeTab);
  const setActiveCard = useWorksheetV2Store((state) => state.setActiveCard);

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

      const moduleRoot = target.closest<HTMLElement>('.worksheet-v2-grid-card-root');
      if (moduleRoot?.dataset.cardId) {
        setActiveCard(activeTab, moduleRoot.dataset.cardId);
        return;
      }

      const gridItem = target.closest<HTMLElement>('.react-grid-item');
      if (gridItem) {
        const gridCardRoot = gridItem.querySelector<HTMLElement>('.worksheet-v2-grid-card-root');
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

  useEffect(() => {
    if (!worksheetId) {
      setWorksheetLoadError(null);
      setWorksheetLoading(false);
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
      } catch {
        if (!isMounted) return;
        setWorksheetLoadError('작업지시서 정보를 불러오지 못했습니다.');
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
      className='flex h-screen w-screen gap-2 overflow-hidden bg-[#f9f9f9] p-2'
      data-worksheet-id={worksheetId || ''}
      onMouseDownCapture={handleRootMouseDownCapture}
    >
      <aside className='shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <WorksheetTemplateSidebar collapsible />
      </aside>
      <main className='flex min-w-0 flex-1 flex-col gap-2'>
        <WorksheetV2Header />
        <WorksheetV2GridContent />
      </main>
    </div>
  );
};

export default WorksheetV2;
