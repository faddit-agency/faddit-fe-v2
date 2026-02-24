import React, { useEffect } from 'react';
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

  return (
    <div
      className='flex h-screen w-screen gap-2 overflow-hidden bg-[#f9f9f9] p-2'
      data-worksheet-id={worksheetId || ''}
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
