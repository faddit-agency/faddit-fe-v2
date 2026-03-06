import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Transition from '../../../../utils/Transition';
import ChildClothImage from '../../../../images/faddit/childcloth.png';
import {
  RecommendResponse,
  RecommendRow,
  requestTemplateRecommendations,
  resolveRecommendAssetUrl,
} from '../../../../lib/api/services/recommendationApi';

type WorksheetFormValue = {
  title: string;
  description: string;
};

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (value: WorksheetFormValue) => Promise<void> | void;
};

type TemplateCategory = '상의' | '하의' | '아우터' | '원피스' | '기타';
type ResultSource = 'primary' | 'keyword_priority' | 'image_priority';

type TemplateItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  subtitle: string;
  sketchImage: string;
  recommendation: RecommendRow;
  source: ResultSource;
};

type BasicInfoFormValue = {
  fileName: string;
  assigneeName: string;
  brandName: string;
  seasonYear: string;
  seasonLabel: string;
  gender: string;
  category: string;
  garment: string;
  measurementUnit: 'cm' | 'inch';
};

const RECOMMENDED_KEYWORDS = [
  '여름에 입을 옷 추천해줘',
  '여성 코트 추천',
  '오피스룩 자켓',
  '롱스커트 도식화',
] as const;

const GENDER_OPTIONS = ['남성', '여성', '유니섹스'] as const;
const CATEGORY_OPTIONS = ['상의', '하의', '아우터', '원피스'] as const;
const GARMENT_OPTIONS = ['티셔츠', '셔츠', '후디', '팬츠', '스커트', '자켓'] as const;
const SEASON_OPTIONS = ['SS', 'FW'] as const;

const RECOMMEND_TOP_K = 5;
const RECOMMEND_MIN_SCORE = 0.05;
const RECOMMEND_DIVERSITY_LIMIT = 2;
const AI_SEARCH_EFFECT_MIN_MS = 4000;

const createInitialBasicInfo = (): BasicInfoFormValue => ({
  fileName: '',
  assigneeName: '',
  brandName: '',
  seasonYear: String(new Date().getFullYear()),
  seasonLabel: '',
  gender: '',
  category: '',
  garment: '',
  measurementUnit: 'cm',
});

const mapTemplateCategory = (row: RecommendRow): TemplateCategory => {
  const detail = String(row.metadata?.information?.category_detail || '').toLowerCase();
  if (detail.includes('top') || row.class_base.includes('_top_')) {
    return '상의';
  }
  if (detail.includes('bottom') || row.class_base.includes('_bottom_')) {
    return '하의';
  }
  if (detail.includes('outer') || row.class_base.includes('_outer_')) {
    return '아우터';
  }
  if (detail.includes('one-piece') || row.class_base.includes('_one-piece_')) {
    return '원피스';
  }
  return '기타';
};

const getModeLabel = (mode?: RecommendResponse['mode']) => {
  if (mode === 'hybrid') return '종합 검색';
  if (mode === 'image_only') return '이미지 모드';
  if (mode === 'keyword_only') return '키워드 모드';
  return '-';
};

const getSourceLabel = (source: ResultSource) => {
  if (source === 'keyword_priority') return '키워드 검색 기준';
  if (source === 'image_priority') return '이미지 검색 기준';
  return '기본 결과';
};

const getConflictReasonLabel = (reason: string) => {
  if (reason === 'gender_mismatch') return '성별 불일치';
  if (reason === 'category_mismatch') return '카테고리 불일치';
  if (reason === 'item_mismatch') return '아이템 불일치';
  return reason;
};

const renderCategoryIcon = (category: TemplateCategory) => {
  if (category === '하의') {
    return (
      <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
        <path d='M6 2h8l1 7-2.3 9H9.7L10 11h0l.3 7H7.3L5 9l1-7Zm2 2-.5 3h5L12 4H8Z' />
      </svg>
    );
  }

  if (category === '원피스') {
    return (
      <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
        <path d='M6 3h8l.8 3.5L13 17H7L5.2 6.5 6 3Zm1.5 2-.2.8L8.6 15h2.8l1.3-9.2-.2-.8H7.5Z' />
      </svg>
    );
  }

  if (category === '아우터') {
    return (
      <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
        <path d='M7.2 3h5.6l2 2.1-1.5 2V17H6.7V7.1l-1.5-2L7.2 3Zm.8 2.2-.4.5.9 1.2v8h3V6.9l.9-1.2-.4-.5H8Z' />
      </svg>
    );
  }

  return (
    <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
      <path d='M6 3h8l.8 3.5L13 17H7L5.2 6.5 6 3Zm1.5 2-.2.8L8.6 15h2.8l1.3-9.2-.2-.8H7.5Z' />
    </svg>
  );
};

const mapToTemplateItem = (row: RecommendRow, source: ResultSource): TemplateItem => {
  const category = mapTemplateCategory(row);
  const information = row.metadata?.information;
  const sketch = row.metadata?.sketch;

  const title =
    String(information?.category_kr || '').trim() ||
    String(information?.category_en || '').trim() ||
    row.class_base;

  const subtitle =
    String(sketch?.sketch_caption || '').trim() ||
    String(information?.category_detail || '').trim() ||
    row.class_base;

  const sketchUrl = resolveRecommendAssetUrl(row.asset_urls?.sketch);

  return {
    id: row.template_id,
    name: title,
    category,
    subtitle,
    sketchImage: sketchUrl || ChildClothImage,
    recommendation: row,
    source,
  };
};

const CreateWorksheetModal = ({ modalOpen, setModalOpen, isSubmitting, onSubmit }: Props) => {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'selection' | 'basic-info' | 'preview'>(
    'selection',
  );
  const [useTemplateFlow, setUseTemplateFlow] = useState(true);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormValue>(createInitialBasicInfo);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recommendResponse, setRecommendResponse] = useState<RecommendResponse | null>(null);
  const [resultSource, setResultSource] = useState<ResultSource>('primary');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string>('');
  const [isComposerDragActive, setIsComposerDragActive] = useState(false);
  const resultCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const hasConflict = Boolean(recommendResponse?.conflict?.detected);
  const conflictReasons = recommendResponse?.conflict?.reasons || [];
  const normalizedQuery = query.trim();
  const composerModeLabel =
    uploadedFile && !normalizedQuery
      ? '이미지 모드'
      : !uploadedFile && normalizedQuery
        ? '키워드 모드'
        : uploadedFile && normalizedQuery
          ? '종합 검색'
          : '키워드 모드';

  const sourceRows = useMemo(() => {
    if (!recommendResponse) {
      return [] as RecommendRow[];
    }

    if (resultSource === 'primary') {
      return recommendResponse.recommendations || [];
    }

    return recommendResponse.alternative_recommendations?.[resultSource] || [];
  }, [recommendResponse, resultSource]);

  const searchResults = useMemo(() => {
    return sourceRows.map((row) => mapToTemplateItem(row, resultSource));
  }, [sourceRows, resultSource]);

  const selectedTemplate = useMemo(() => {
    if (!useTemplateFlow) {
      return null;
    }

    return searchResults.find((item) => item.id === selectedTemplateId) || searchResults[0] || null;
  }, [searchResults, selectedTemplateId, useTemplateFlow]);

  const selectedTemplateIndex = useMemo(() => {
    if (!selectedTemplate) {
      return -1;
    }
    return searchResults.findIndex((item) => item.id === selectedTemplate.id);
  }, [searchResults, selectedTemplate]);

  useEffect(() => {
    if (!uploadedFile) {
      setUploadedFilePreview('');
      return;
    }

    if (!uploadedFile.type.startsWith('image/')) {
      setUploadedFilePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(uploadedFile);
    setUploadedFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadedFile]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    setQuery('');
    setSubmittedQuery('');
    setHasSearched(false);
    setSelectedTemplateId('');
    setCurrentStep('selection');
    setUseTemplateFlow(true);
    setIsSearchPending(false);
    setBasicInfo(createInitialBasicInfo());
    setSearchError(null);
    setRecommendResponse(null);
    setResultSource('primary');
    setUploadedFile(null);
    setUploadedFilePreview('');
    setIsComposerDragActive(false);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, setModalOpen]);

  useEffect(() => {
    if (!useTemplateFlow) {
      setSelectedTemplateId('');
      return;
    }

    if (!searchResults.length) {
      setSelectedTemplateId('');
      return;
    }

    const hasCurrent = searchResults.some((item) => item.id === selectedTemplateId);
    if (!hasCurrent) {
      setSelectedTemplateId(searchResults[0].id);
    }
  }, [searchResults, selectedTemplateId, useTemplateFlow]);

  useEffect(() => {
    if (!selectedTemplate?.id) {
      return;
    }

    const activeCard = resultCardRefs.current[selectedTemplate.id];
    if (!activeCard) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [selectedTemplate?.id, searchResults.length]);

  const runSearch = async (nextQuery?: string) => {
    if (isSearchPending) {
      return;
    }

    const targetQuery = nextQuery ?? query;
    const normalized = targetQuery.trim();

    if (!normalized && !uploadedFile) {
      setSearchError('키워드 또는 이미지를 입력해 주세요.');
      return;
    }

    const effectStartedAt = Date.now();
    setIsSearchPending(true);
    setSearchError(null);

    let response: RecommendResponse | null = null;

    try {
      response = await requestTemplateRecommendations({
        keyword: normalized || undefined,
        file: uploadedFile,
        topK: RECOMMEND_TOP_K,
        minScore: RECOMMEND_MIN_SCORE,
        diversityClassLimit: RECOMMEND_DIVERSITY_LIMIT,
      });
    } catch (error) {
      console.error('Failed to request recommendations', error);
      setSearchError('추천 서버 호출에 실패했습니다. 추천 서버 포트/상태를 확인해 주세요.');
    } finally {
      if (response) {
        const elapsedMs = Date.now() - effectStartedAt;
        const remainingMs = Math.max(0, AI_SEARCH_EFFECT_MIN_MS - elapsedMs);
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs));
        }

        setRecommendResponse(response);
        setQuery(targetQuery);
        setSubmittedQuery(targetQuery);
        setHasSearched(true);
        setCurrentStep('selection');
        setUseTemplateFlow(true);

        if (response.conflict?.detected) {
          const hasKeywordPriority =
            (response.alternative_recommendations?.keyword_priority || []).length > 0;
          const hasImagePriority =
            (response.alternative_recommendations?.image_priority || []).length > 0;
          if (hasKeywordPriority) {
            setResultSource('keyword_priority');
          } else if (hasImagePriority) {
            setResultSource('image_priority');
          } else {
            setResultSource('primary');
          }
        } else {
          setResultSource('primary');
        }
      }

      setIsSearchPending(false);
    }
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch();
  };

  const handleRecommendedKeywordClick = (keyword: string) => {
    setQuery(keyword);
    void runSearch(keyword);
  };

  const handleAttachFile = (file: File | null) => {
    if (!file) {
      setUploadedFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSearchError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploadedFile(file);
    setSearchError(null);
  };

  const handleComposerDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsComposerDragActive(false);
    handleAttachFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleSwitchTemplateByChevron = (direction: -1 | 1) => {
    if (!searchResults.length) {
      return;
    }

    const currentIndex = selectedTemplateIndex >= 0 ? selectedTemplateIndex : 0;
    const nextIndex = (currentIndex + direction + searchResults.length) % searchResults.length;
    setSelectedTemplateId(searchResults[nextIndex].id);
  };

  const handleStartWithoutTemplate = () => {
    setUseTemplateFlow(false);
    setHasSearched(true);
    setCurrentStep('basic-info');
    setSelectedTemplateId('');
  };

  const handleNextFromTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    setBasicInfo((prev) => ({
      ...prev,
      fileName: prev.fileName || selectedTemplate.name,
      category: prev.category || selectedTemplate.category,
    }));
    setUseTemplateFlow(true);
    setCurrentStep('basic-info');
  };

  const handleGoPreview = () => {
    if (!basicInfo.fileName.trim()) {
      return;
    }
    setCurrentStep('preview');
  };

  const handleSubmitBasicInfo = async () => {
    const fileName = basicInfo.fileName.trim();
    if (!fileName) {
      return;
    }

    const descriptionParts = [
      useTemplateFlow && selectedTemplate ? `${selectedTemplate.category} 템플릿` : '템플릿 없음',
      `담당자:${basicInfo.assigneeName || '-'}`,
      `브랜드:${basicInfo.brandName || '-'}`,
      `시즌:${basicInfo.seasonYear}${basicInfo.seasonLabel ? ` ${basicInfo.seasonLabel}` : ''}`,
      `성별:${basicInfo.gender || '-'}`,
      `카테고리:${basicInfo.category || '-'}`,
      `의류:${basicInfo.garment || '-'}`,
      `측정단위:${basicInfo.measurementUnit}`,
    ];

    if (useTemplateFlow && selectedTemplate) {
      const row = selectedTemplate.recommendation;
      descriptionParts.push(`추천모드:${getModeLabel(recommendResponse?.mode)}`);
      descriptionParts.push(`추천경로:${getSourceLabel(selectedTemplate.source)}`);
      descriptionParts.push(`template_id:${row.template_id}`);
      descriptionParts.push(`class_base:${row.class_base}`);
      descriptionParts.push(`score:${typeof row.score === 'number' ? row.score.toFixed(4) : '-'}`);
    }

    if (hasConflict && conflictReasons.length > 0) {
      descriptionParts.push(`충돌:${conflictReasons.join(',')}`);
    }

    await onSubmit({
      title: fileName,
      description: descriptionParts.join(' | '),
    });
    setModalOpen(false);
  };

  const renderUnifiedComposer = ({
    inputId,
    submitLabel,
    compact = false,
  }: {
    inputId: string;
    submitLabel: string;
    compact?: boolean;
  }) => (
    <>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsComposerDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsComposerDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          const related = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(related)) {
            setIsComposerDragActive(false);
          }
        }}
        onDrop={handleComposerDrop}
        className={`ai-search-composer-shell relative rounded-[24px] shadow-none transition-shadow duration-300 ${
          isSearchPending ? 'ai-search-composer-shell--loading' : ''
        } ${isComposerDragActive ? 'ring-faddit/20 ring-4' : ''}`}
      >
        <div
          className={`ai-search-composer-inner relative overflow-hidden rounded-[24px] bg-white p-3 transition dark:bg-gray-900 ${
            isSearchPending
              ? 'border border-transparent'
              : isComposerDragActive
                ? 'border-faddit/70 border'
                : 'border border-gray-200/80 dark:border-gray-700/60'
          }`}
        >
          <input
            id={inputId}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(event) => handleAttachFile(event.target.files?.[0] ?? null)}
          />

          <div className='space-y-3'>
            {uploadedFile && (
              <div className='inline-flex max-w-full items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-2 dark:border-gray-700/60 dark:bg-gray-800'>
                <img
                  src={uploadedFilePreview || ChildClothImage}
                  alt='첨부 이미지 미리보기'
                  className='h-11 w-11 rounded-lg border border-gray-200 object-cover dark:border-gray-700/60'
                />
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'>
                    {uploadedFile.name}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {Math.round(uploadedFile.size / 1024)} KB
                  </div>
                </div>
                <button
                  type='button'
                  className='inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 dark:border-gray-700/60 dark:text-gray-300'
                  onClick={() => setUploadedFile(null)}
                  aria-label='첨부 이미지 제거'
                  title='첨부 이미지 제거'
                >
                  <svg className='h-3.5 w-3.5 fill-current' viewBox='0 0 16 16'>
                    <path d='M3.28 3.22a.75.75 0 0 1 1.06 0L8 6.88l3.66-3.66a.75.75 0 1 1 1.06 1.06L9.06 7.94l3.66 3.66a.75.75 0 0 1-1.06 1.06L8 9 4.34 12.66a.75.75 0 0 1-1.06-1.06l3.66-3.66-3.66-3.66a.75.75 0 0 1 0-1.06Z' />
                  </svg>
                </button>
              </div>
            )}

            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={isSearchPending}
              rows={compact ? 2 : 3}
              placeholder='키워드를 입력하세요 (예: 여자 코트 추천해줘)'
              className='focus:ring-faddit/20 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[15px] text-gray-800 outline-none focus:ring-3 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-100'
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void runSearch();
                }
              }}
            />

            <div className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:text-gray-200 dark:hover:bg-gray-800'
                  onClick={() => {
                    const input = document.getElementById(inputId) as HTMLInputElement | null;
                    input?.click();
                  }}
                  title='이미지 첨부'
                  aria-label='이미지 첨부'
                >
                  <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                    <path d='M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z' />
                  </svg>
                </button>
                <span className='text-xs font-semibold text-gray-500 dark:text-gray-400'>
                  이미지 첨부
                </span>
              </div>

              <div className='flex min-w-0 items-center justify-center'>
                {isSearchPending ? (
                  <div className='text-faddit inline-flex items-center gap-1.5 text-xs font-semibold'>
                    <svg
                      className='h-3.5 w-3.5 animate-spin fill-current'
                      viewBox='0 0 20 20'
                      aria-hidden='true'
                    >
                      <path d='M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2Z' />
                    </svg>
                    <span className='truncate'>ai가 검색중입니다</span>
                  </div>
                ) : null}
              </div>

              <div className='flex items-center gap-2 justify-self-end'>
                <span className='text-xs font-semibold text-gray-500 dark:text-gray-400'>
                  {composerModeLabel}
                </span>
                <button
                  type='submit'
                  disabled={isSearchPending || (!query.trim() && !uploadedFile)}
                  className='bg-faddit inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                  aria-label={submitLabel}
                  title={submitLabel}
                >
                  {isSearchPending ? (
                    <svg className='h-4 w-4 animate-spin fill-current' viewBox='0 0 20 20'>
                      <path d='M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2Z' />
                    </svg>
                  ) : (
                    <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                      <path d='M2.2 2.2a.75.75 0 0 1 .78-.17l10.5 4.5a.75.75 0 0 1 0 1.38l-10.5 4.5A.75.75 0 0 1 2 11.75V9.12l5.57-1.12L2 6.88V4.25a.75.75 0 0 1 .2-.53Z' />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {isComposerDragActive ? (
            <div className='bg-faddit/10 text-faddit pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold'>
              여기에 이미지를 놓아 업로드
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  const footerActions = hasSearched ? (
    <div className='border-t border-gray-200 bg-white px-4 py-4 sm:px-5 dark:border-gray-700/60 dark:bg-gray-800'>
      <div className='flex items-center justify-between gap-3'>
        {currentStep === 'selection' ? (
          <>
            <button
              type='button'
              onClick={handleStartWithoutTemplate}
              disabled={isSubmitting}
              className='btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
            >
              템플릿 없이 시작하기
            </button>
            <button
              type='button'
              onClick={handleNextFromTemplate}
              disabled={isSubmitting || !selectedTemplate}
              className='btn bg-faddit text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              다음으로
            </button>
          </>
        ) : currentStep === 'basic-info' ? (
          <>
            {useTemplateFlow ? (
              <button
                type='button'
                onClick={() => setCurrentStep('selection')}
                disabled={isSubmitting}
                className='btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
              >
                이전
              </button>
            ) : (
              <div />
            )}
            <button
              type='button'
              onClick={handleGoPreview}
              disabled={isSubmitting || !basicInfo.fileName.trim()}
              className='btn bg-faddit text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              미리보기
            </button>
          </>
        ) : (
          <>
            <button
              type='button'
              onClick={() => setCurrentStep('basic-info')}
              disabled={isSubmitting}
              className='btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
            >
              뒤로가기
            </button>
            <button
              type='button'
              onClick={handleSubmitBasicInfo}
              disabled={isSubmitting || !basicInfo.fileName.trim()}
              className='btn bg-faddit text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              생성하기
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;

  const hasImagePriority =
    (recommendResponse?.alternative_recommendations?.image_priority || []).length > 0;
  const hasKeywordPriority =
    (recommendResponse?.alternative_recommendations?.keyword_priority || []).length > 0;

  return (
    <>
      <Transition
        appear={false}
        className='fixed inset-0 z-50 bg-gray-900/30 transition-opacity'
        onMouseDown={() => setModalOpen(false)}
        show={modalOpen}
        enter='transition ease-out duration-200'
        enterStart='opacity-0'
        enterEnd='opacity-100'
        leave='transition ease-out duration-100'
        leaveStart='opacity-100'
        leaveEnd='opacity-0'
        aria-hidden='true'
      />
      <Transition
        appear={false}
        id='faddit-create-worksheet-modal'
        className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-4'
        role='dialog'
        aria-modal='true'
        show={modalOpen}
        enter='transition ease-in-out duration-200'
        enterStart='opacity-0 translate-y-4'
        enterEnd='opacity-100 translate-y-0'
        leave='transition ease-in-out duration-200'
        leaveStart='opacity-100 translate-y-0'
        leaveEnd='opacity-0 translate-y-4'
      >
        <div
          style={{ maxWidth: hasSearched ? '50rem' : '52rem' }}
          className='mx-auto my-auto flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] lg:h-[85vh] lg:max-h-[85vh] dark:bg-gray-800'
        >
          <div className='flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5 dark:border-gray-700/60'>
            <div className='font-semibold text-gray-800 dark:text-gray-100'>작업지시서 생성</div>
            <button
              type='button'
              className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
              onClick={() => setModalOpen(false)}
            >
              <span className='sr-only'>Close</span>
              <svg className='fill-current' width='16' height='16' viewBox='0 0 16 16'>
                <path d='M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z' />
              </svg>
            </button>
          </div>

          <div className='min-h-0 flex-1 bg-gray-50 dark:bg-gray-900'>
            <div className='flex h-full min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5'>
              <div className='mb-6 flex items-center gap-2 text-sm font-semibold'>
                <div
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    !hasSearched || currentStep === 'selection'
                      ? 'bg-faddit text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  1
                </div>
                <span
                  className={
                    !hasSearched || currentStep === 'selection' ? 'text-faddit' : 'text-gray-500'
                  }
                >
                  도식화 & 패턴
                </span>
                <span className='text-gray-300'>/</span>
                <div
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    currentStep === 'basic-info'
                      ? 'bg-faddit text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  2
                </div>
                <span className={currentStep === 'basic-info' ? 'text-faddit' : 'text-gray-500'}>
                  기본 정보
                </span>
                <span className='text-gray-300'>/</span>
                <div
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    currentStep === 'preview'
                      ? 'bg-faddit text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  3
                </div>
                <span className={currentStep === 'preview' ? 'text-faddit' : 'text-gray-500'}>
                  미리보기
                </span>
              </div>

              {!hasSearched ? (
                <div className='min-h-0 flex-1 overflow-y-auto'>
                  <div className='relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-xs sm:p-8 dark:border-gray-700/60 dark:bg-gray-800'>
                    <div className='bg-faddit/10 pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl' />
                    <div className='relative'>
                      <div className='border-faddit/20 bg-faddit/5 text-faddit mx-auto flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'>
                        <svg
                          className='h-3.5 w-3.5 fill-current'
                          viewBox='0 0 20 20'
                          aria-hidden='true'
                        >
                          <path d='M11.5 2.5h-3l-.7 2.1-2.1.7v3l2.1.7.7 2.1h3l.7-2.1 2.1-.7v-3l-2.1-.7-.7-2.1Zm-6 8h2l.4 1.3 1.3.4v2l-1.3.4L7.5 16h-2l-.4-1.3-1.3-.4v-2l1.3-.4.4-1.4Zm10 1h1.8l.3.9.9.3v1.8l-.9.3-.3.9h-1.8l-.3-.9-.9-.3v-1.8l.9-.3.3-.9Z' />
                        </svg>
                        AI Recommendation
                      </div>

                      <h2 className='mt-4 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100'>
                        What would you like to create?
                      </h2>
                      <p className='mx-auto mt-2 max-w-2xl text-center text-base text-gray-500 dark:text-gray-300'>
                        키워드, 이미지 또는 둘 다 입력하면 추천 템플릿을 찾아드립니다.
                      </p>

                      <form
                        onSubmit={handleSearchSubmit}
                        className='mx-auto mt-7 max-w-4xl space-y-3'
                      >
                        {renderUnifiedComposer({
                          inputId: 'faddit-worksheet-recommend-file-initial',
                          submitLabel: isSearchPending ? '추천중' : '추천 실행',
                        })}

                        {searchError ? (
                          <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-800/70 dark:bg-rose-900/20 dark:text-rose-200'>
                            {searchError}
                          </div>
                        ) : null}
                      </form>

                      <div className='mt-5 flex flex-wrap items-center justify-center gap-2 text-sm'>
                        {RECOMMENDED_KEYWORDS.map((keyword) => (
                          <button
                            key={keyword}
                            type='button'
                            onClick={() => handleRecommendedKeywordClick(keyword)}
                            disabled={isSearchPending}
                            className='hover:border-faddit/40 hover:bg-faddit/5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/70'
                          >
                            <span className='text-faddit'>{renderCategoryIcon('상의')}</span>
                            <span>{keyword}</span>
                          </button>
                        ))}
                      </div>

                      <div className='mx-auto mt-auto flex max-w-xl items-center gap-4 pt-8'>
                        <div className='h-px flex-1 bg-gray-200 dark:bg-gray-700/60' />
                        <span className='text-xs font-semibold tracking-wide text-gray-400'>
                          OR
                        </span>
                        <div className='h-px flex-1 bg-gray-200 dark:bg-gray-700/60' />
                      </div>

                      <div className='mt-6 flex justify-center'>
                        <button
                          type='button'
                          onClick={handleStartWithoutTemplate}
                          disabled={isSubmitting || isSearchPending}
                          className='inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                        >
                          <svg
                            className='text-faddit h-4 w-4 fill-current'
                            viewBox='0 0 16 16'
                            aria-hidden='true'
                          >
                            <path d='M2 2h9v2H4v8h8v-7h2v9H2V2Zm11 0v2h-1.6l2.3 2.3-1.4 1.4L10 5.4V7H8V2h5Z' />
                          </svg>
                          템플릿 없이 시작하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentStep === 'selection' ? (
                <div className='flex min-h-0 flex-1 flex-col gap-4'>
                  <form onSubmit={handleSearchSubmit} className='shrink-0 space-y-3'>
                    {renderUnifiedComposer({
                      inputId: 'faddit-worksheet-recommend-file-inline',
                      submitLabel: isSearchPending ? '검색중' : '검색 실행',
                      compact: true,
                    })}

                    {searchError ? (
                      <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-800/70 dark:bg-rose-900/20 dark:text-rose-200'>
                        {searchError}
                      </div>
                    ) : null}

                    {hasConflict ? (
                      <div className='rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800/70 dark:bg-indigo-900/20'>
                        <div className='text-xs font-semibold text-indigo-700 dark:text-indigo-200'>
                          키워드와 이미지 신호가 충돌했습니다.
                          {conflictReasons.length > 0
                            ? ` (${conflictReasons.map(getConflictReasonLabel).join(', ')})`
                            : ''}
                        </div>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {hasImagePriority ? (
                            <button
                              type='button'
                              onClick={() => setResultSource('image_priority')}
                              className={`btn h-8 px-3 text-xs ${
                                resultSource === 'image_priority'
                                  ? 'bg-faddit text-white'
                                  : 'border-gray-200 text-gray-700 dark:border-gray-700/60 dark:text-gray-200'
                              }`}
                            >
                              이미지 검색 기준
                            </button>
                          ) : null}
                          {hasKeywordPriority ? (
                            <button
                              type='button'
                              onClick={() => setResultSource('keyword_priority')}
                              className={`btn h-8 px-3 text-xs ${
                                resultSource === 'keyword_priority'
                                  ? 'bg-faddit text-white'
                                  : 'border-gray-200 text-gray-700 dark:border-gray-700/60 dark:text-gray-200'
                              }`}
                            >
                              키워드 검색 기준
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </form>

                  <div className='flex min-h-0 flex-1 justify-center overflow-y-auto px-0'>
                    <div className='w-full max-w-[100vw] lg:max-w-[50rem]'>
                      <div className='rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-700/60 dark:bg-gray-800'>
                        <div className='text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400'>
                          {isSearchPending
                            ? '검색 결과 생성 중...'
                            : `검색 결과 (${searchResults.length}) · ${getSourceLabel(resultSource)}`}
                        </div>

                        {selectedTemplate ? (
                          <div className='mt-4'>
                            <div className='min-w-0'>
                              <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                                {selectedTemplate.name}
                              </h3>
                              <p className='mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300'>
                                {selectedTemplate.category} * {selectedTemplate.subtitle}
                              </p>
                            </div>

                            <div className='relative mt-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700/60 dark:bg-gray-900'>
                              <img
                                src={selectedTemplate.sketchImage}
                                alt={`${selectedTemplate.name} 도식화`}
                                className='mx-auto h-[300px] w-full object-contain'
                                onError={(event) => {
                                  event.currentTarget.src = ChildClothImage;
                                }}
                              />
                            </div>

                            <div className='mt-4'>
                              <div className='mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                                다른 검색 결과
                              </div>
                              <div className='flex items-center gap-2'>
                                <button
                                  type='button'
                                  disabled={isSearchPending || searchResults.length <= 1}
                                  onClick={() => handleSwitchTemplateByChevron(-1)}
                                  className='hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex dark:border-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700'
                                  aria-label='이전 결과'
                                  title='이전 결과'
                                >
                                  <svg className='h-4 w-4' viewBox='0 0 16 16' fill='none'>
                                    <path
                                      d='M9.8 3.5 5.8 8l4 4.5'
                                      stroke='currentColor'
                                      strokeWidth='1.8'
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                    />
                                  </svg>
                                </button>

                                <div className='no-scrollbar min-w-0 flex-1 overflow-x-auto scroll-smooth pb-1'>
                                  <div className='flex gap-2'>
                                    {searchResults.map((item) => {
                                      const active = selectedTemplate.id === item.id;
                                      return (
                                        <button
                                          key={item.id}
                                          data-template-id={item.id}
                                          ref={(element) => {
                                            resultCardRefs.current[item.id] = element;
                                          }}
                                          type='button'
                                          disabled={isSearchPending}
                                          onClick={() => handleTemplateSelect(item.id)}
                                          className={`group flex max-w-[220px] min-w-[220px] shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                                            active
                                              ? 'border-faddit bg-faddit/5 dark:bg-faddit/10 shadow-[0_0_0_1px_rgba(43,117,255,0.35)]'
                                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:bg-gray-700/50'
                                          } ${isSearchPending ? 'cursor-not-allowed opacity-70' : ''}`}
                                        >
                                          <img
                                            src={item.sketchImage}
                                            alt={`${item.name} 썸네일`}
                                            className='h-12 w-12 shrink-0 rounded-md border border-gray-200 object-contain dark:border-gray-700/60'
                                            onError={(event) => {
                                              event.currentTarget.src = ChildClothImage;
                                            }}
                                          />
                                          <div className='min-w-0'>
                                            <div className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'>
                                              {item.name}
                                            </div>
                                            <div className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                              {item.category} * {item.subtitle}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <button
                                  type='button'
                                  disabled={isSearchPending || searchResults.length <= 1}
                                  onClick={() => handleSwitchTemplateByChevron(1)}
                                  className='hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex dark:border-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700'
                                  aria-label='다음 결과'
                                  title='다음 결과'
                                >
                                  <svg className='h-4 w-4' viewBox='0 0 16 16' fill='none'>
                                    <path
                                      d='m6.2 3.5 4 4.5-4 4.5'
                                      stroke='currentColor'
                                      strokeWidth='1.8'
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                            {isSearchPending
                              ? 'ai가 검색중이에요.'
                              : '검색 결과가 없습니다. 키워드/이미지를 바꿔 다시 검색해 보세요.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentStep === 'basic-info' ? (
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-700/60 dark:bg-gray-800'>
                  <div className='min-h-0 flex-1 overflow-y-auto'>
                    <div className='mx-auto w-full max-w-4xl'>
                      <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                        기본 정보
                      </h3>

                      <div className='mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <label className='block'>
                          <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                            파일명
                          </span>
                          <input
                            type='text'
                            value={basicInfo.fileName}
                            onChange={(event) =>
                              setBasicInfo((prev) => ({ ...prev, fileName: event.target.value }))
                            }
                            className='form-input h-11 w-full'
                            placeholder='작업지시서 파일명을 입력하세요'
                          />
                        </label>
                        <label className='block'>
                          <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                            담당자 이름
                          </span>
                          <input
                            type='text'
                            value={basicInfo.assigneeName}
                            onChange={(event) =>
                              setBasicInfo((prev) => ({
                                ...prev,
                                assigneeName: event.target.value,
                              }))
                            }
                            className='form-input h-11 w-full'
                            placeholder='담당자 이름'
                          />
                        </label>
                        <label className='block'>
                          <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                            브랜드 이름
                          </span>
                          <input
                            type='text'
                            value={basicInfo.brandName}
                            onChange={(event) =>
                              setBasicInfo((prev) => ({ ...prev, brandName: event.target.value }))
                            }
                            className='form-input h-11 w-full'
                            placeholder='브랜드 이름'
                          />
                        </label>
                        <div className='grid grid-cols-[1fr_120px] gap-2'>
                          <label className='block'>
                            <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                              시즌
                            </span>
                            <input
                              type='text'
                              value={basicInfo.seasonYear}
                              onChange={(event) =>
                                setBasicInfo((prev) => ({
                                  ...prev,
                                  seasonYear: event.target.value,
                                }))
                              }
                              className='form-input h-11 w-full'
                            />
                          </label>
                          <label className='block'>
                            <span className='mb-1.5 block text-sm font-semibold text-transparent select-none'>
                              시즌 구분
                            </span>
                            <select
                              value={basicInfo.seasonLabel}
                              onChange={(event) =>
                                setBasicInfo((prev) => ({
                                  ...prev,
                                  seasonLabel: event.target.value,
                                }))
                              }
                              className='form-select h-11 w-full'
                            >
                              <option value=''>선택</option>
                              {SEASON_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className='mt-7'>
                        <h4 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                          Fit Profile
                        </h4>
                        <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                          <label className='block'>
                            <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                              성별
                            </span>
                            <select
                              value={basicInfo.gender}
                              onChange={(event) =>
                                setBasicInfo((prev) => ({ ...prev, gender: event.target.value }))
                              }
                              className='form-select h-11 w-full'
                            >
                              <option value=''>선택</option>
                              {GENDER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className='block'>
                            <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                              카테고리
                            </span>
                            <select
                              value={basicInfo.category}
                              onChange={(event) =>
                                setBasicInfo((prev) => ({ ...prev, category: event.target.value }))
                              }
                              className='form-select h-11 w-full'
                            >
                              <option value=''>선택</option>
                              {CATEGORY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className='block'>
                            <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                              의류
                            </span>
                            <select
                              value={basicInfo.garment}
                              onChange={(event) =>
                                setBasicInfo((prev) => ({ ...prev, garment: event.target.value }))
                              }
                              className='form-select h-11 w-full'
                            >
                              <option value=''>선택</option>
                              {GARMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className='mt-7'>
                        <span className='mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300'>
                          측정 사이즈
                        </span>
                        <select
                          value={basicInfo.measurementUnit}
                          onChange={(event) =>
                            setBasicInfo((prev) => ({
                              ...prev,
                              measurementUnit: event.target.value as 'cm' | 'inch',
                            }))
                          }
                          className='form-select h-11 w-full max-w-[120px]'
                        >
                          <option value='cm'>cm</option>
                          <option value='inch'>inch</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-700/60 dark:bg-gray-800'>
                  <div className='min-h-0 flex-1 overflow-y-auto'>
                    <div className='mx-auto w-full max-w-5xl space-y-4'>
                      {useTemplateFlow && selectedTemplate ? (
                        <>
                          <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-900'>
                            <h3 className='mb-3 text-lg font-bold text-gray-900 dark:text-gray-100'>
                              템플릿 미리보기
                            </h3>
                            <div className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                              {selectedTemplate.name}
                            </div>
                            <p className='mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300'>
                              {selectedTemplate.category} * {selectedTemplate.subtitle}
                            </p>
                            <div className='mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                              <img
                                src={selectedTemplate.sketchImage}
                                alt={`${selectedTemplate.name} 도식화`}
                                className='h-[220px] w-full object-contain'
                                onError={(event) => {
                                  event.currentTarget.src = ChildClothImage;
                                }}
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-900'>
                        <h3 className='mb-3 text-lg font-bold text-gray-900 dark:text-gray-100'>
                          입력한 기본 정보
                        </h3>
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              파일명
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.fileName || '-'}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              담당자 이름
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.assigneeName || '-'}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              브랜드 이름
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.brandName || '-'}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              시즌
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.seasonYear}
                              {basicInfo.seasonLabel ? ` ${basicInfo.seasonLabel}` : ''}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              성별
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.gender || '-'}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              카테고리/의류
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.category || '-'} / {basicInfo.garment || '-'}
                            </div>
                          </div>
                          <div className='rounded-lg border border-gray-200 bg-white px-4 py-3 sm:col-span-2 dark:border-gray-700/60 dark:bg-gray-800'>
                            <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                              측정 사이즈 단위
                            </div>
                            <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                              {basicInfo.measurementUnit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {footerActions}
        </div>
      </Transition>
    </>
  );
};

export default CreateWorksheetModal;
