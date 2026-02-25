import { FormEvent, useEffect, useMemo, useState } from 'react';
import Transition from '../../../../utils/Transition';
import ChildClothImage from '../../../../images/faddit/childcloth.png';

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

type TemplateCategory = '셔츠' | '바지' | '치마';

type TemplateItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  subtitle: string;
  tags: string[];
  technicalDrawingVersion: string;
  details: Array<{ label: string; value: string }>;
  previewImages: Array<{ id: string; label: string; src: string }>;
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

const RECOMMENDED_KEYWORDS = ['오버사이즈 티', '리넨 블레이저', '데님 자켓', '카고 팬츠'] as const;

const GENDER_OPTIONS = ['남성', '여성', '유니섹스'] as const;
const CATEGORY_OPTIONS = ['상의', '하의', '아우터', '원피스'] as const;
const GARMENT_OPTIONS = ['티셔츠', '셔츠', '후디', '팬츠', '스커트', '자켓'] as const;
const SEASON_OPTIONS = ['SS', 'FW'] as const;
const SEARCH_EFFECT_DELAY_MS = 3000;

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

const TEMPLATE_ITEMS: TemplateItem[] = [
  {
    id: 't-shirt-basic-fit',
    name: 'T-Shirt - Basic Fit',
    category: '셔츠',
    subtitle: 'Standard tubular construction',
    tags: ['Cotton Jersey', 'Unisex'],
    technicalDrawingVersion: 'v2.1',
    details: [
      { label: 'Category', value: 'Tops' },
      { label: 'Code', value: 'TS-001-BF' },
      { label: 'Fabric Consumption', value: '0.85 m / unit' },
      { label: 'Construction Time', value: '18 min (SMV)' },
      { label: 'Complexity', value: 'Low' },
    ],
    previewImages: [
      { id: 'drawing-1', label: '도식화', src: ChildClothImage },
      { id: 'pattern-1', label: '패턴', src: ChildClothImage },
    ],
  },
  {
    id: 'cargo-pants-straight',
    name: 'Cargo Pants - Straight',
    category: '바지',
    subtitle: '6-pocket utility construction',
    tags: ['Twill', 'Menswear'],
    technicalDrawingVersion: 'v1.8',
    details: [
      { label: 'Category', value: 'Bottoms' },
      { label: 'Code', value: 'PT-014-CG' },
      { label: 'Fabric Consumption', value: '1.42 m / unit' },
      { label: 'Construction Time', value: '34 min (SMV)' },
      { label: 'Complexity', value: 'Medium' },
    ],
    previewImages: [
      { id: 'drawing-2', label: '도식화', src: ChildClothImage },
      { id: 'pattern-2', label: '패턴', src: ChildClothImage },
    ],
  },
  {
    id: 'flare-skirt-midi',
    name: 'Flare Skirt - Midi',
    category: '치마',
    subtitle: 'Bias cut with concealed waistband',
    tags: ['Poly Blend', 'Womenswear'],
    technicalDrawingVersion: 'v3.0',
    details: [
      { label: 'Category', value: 'Skirts' },
      { label: 'Code', value: 'SK-030-FL' },
      { label: 'Fabric Consumption', value: '1.15 m / unit' },
      { label: 'Construction Time', value: '26 min (SMV)' },
      { label: 'Complexity', value: 'Medium' },
    ],
    previewImages: [
      { id: 'drawing-3', label: '도식화', src: ChildClothImage },
      { id: 'pattern-3', label: '패턴', src: ChildClothImage },
    ],
  },
  {
    id: 'hoodie-oversized',
    name: 'Hoodie - Oversized',
    category: '셔츠',
    subtitle: 'Drop shoulder and kangaroo pocket',
    tags: ['French Terry', 'Unisex'],
    technicalDrawingVersion: 'v2.4',
    details: [
      { label: 'Category', value: 'Tops' },
      { label: 'Code', value: 'HD-011-OV' },
      { label: 'Fabric Consumption', value: '1.90 m / unit' },
      { label: 'Construction Time', value: '42 min (SMV)' },
      { label: 'Complexity', value: 'High' },
    ],
    previewImages: [
      { id: 'drawing-4', label: '도식화', src: ChildClothImage },
      { id: 'pattern-4', label: '패턴', src: ChildClothImage },
    ],
  },
];

const categoryMatches = (template: TemplateItem, query: string) => {
  if (query.includes('셔츠') || query.includes('티') || query.includes('자켓')) {
    return template.category === '셔츠';
  }
  if (query.includes('바지') || query.includes('팬츠') || query.includes('카고')) {
    return template.category === '바지';
  }
  if (query.includes('치마') || query.includes('스커트')) {
    return template.category === '치마';
  }
  return false;
};

const renderCategoryIcon = (category: TemplateCategory) => {
  if (category === '바지') {
    return (
      <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
        <path d='M6 2h8l1 7-2.3 9H9.7L10 11h0l.3 7H7.3L5 9l1-7Zm2 2-.5 3h5L12 4H8Z' />
      </svg>
    );
  }

  if (category === '치마') {
    return (
      <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
        <path d='M6 3h8l.8 3.5L13 17H7L5.2 6.5 6 3Zm1.5 2-.2.8L8.6 15h2.8l1.3-9.2-.2-.8H7.5Z' />
      </svg>
    );
  }

  return (
    <svg className='h-4 w-4 fill-current' viewBox='0 0 20 20' aria-hidden='true'>
      <path d='M7.2 3h5.6l2 2.1-1.5 2V17H6.7V7.1l-1.5-2L7.2 3Zm.8 2.2-.4.5.9 1.2v8h3V6.9l.9-1.2-.4-.5H8Z' />
    </svg>
  );
};

const CreateWorksheetModal = ({ modalOpen, setModalOpen, isSubmitting, onSubmit }: Props) => {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  const [mobileSearchStep, setMobileSearchStep] = useState<'list' | 'detail'>('list');
  const [currentStep, setCurrentStep] = useState<'selection' | 'basic-info' | 'preview'>(
    'selection',
  );
  const [useTemplateFlow, setUseTemplateFlow] = useState(true);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [basicInfo, setBasicInfo] = useState<BasicInfoFormValue>(createInitialBasicInfo);

  const searchResults = useMemo(() => {
    if (!hasSearched) {
      return [] as TemplateItem[];
    }

    const normalized = submittedQuery.trim().toLowerCase();
    if (!normalized) {
      return TEMPLATE_ITEMS;
    }

    return TEMPLATE_ITEMS.filter((item) => {
      const textMatches =
        item.name.toLowerCase().includes(normalized) ||
        item.subtitle.toLowerCase().includes(normalized) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalized));
      return textMatches || categoryMatches(item, normalized);
    });
  }, [hasSearched, submittedQuery]);

  const selectedTemplate = useMemo(() => {
    if (!useTemplateFlow) {
      return null;
    }

    return searchResults.find((item) => item.id === selectedTemplateId) || searchResults[0] || null;
  }, [searchResults, selectedTemplateId, useTemplateFlow]);

  const activePreviewImages = selectedTemplate?.previewImages || [];

  useEffect(() => {
    const handleResize = () => {
      setIsCompactLayout(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    setQuery('');
    setSubmittedQuery('');
    setHasSearched(false);
    setSelectedTemplateId('');
    setCarouselIndex(0);
    setMobileSearchStep('list');
    setCurrentStep('selection');
    setUseTemplateFlow(true);
    setIsSearchPending(false);
    setBasicInfo(createInitialBasicInfo());
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
      setCarouselIndex(0);
      return;
    }

    if (!searchResults.length) {
      setSelectedTemplateId('');
      setCarouselIndex(0);
      return;
    }

    const hasCurrent = searchResults.some((item) => item.id === selectedTemplateId);
    if (!hasCurrent) {
      setSelectedTemplateId(searchResults[0].id);
      setCarouselIndex(0);
    }
  }, [searchResults, selectedTemplateId, useTemplateFlow]);

  useEffect(() => {
    if (!activePreviewImages.length) {
      setCarouselIndex(0);
      return;
    }

    if (carouselIndex > activePreviewImages.length - 1) {
      setCarouselIndex(0);
    }
  }, [activePreviewImages, carouselIndex]);

  const runSearch = async (nextQuery?: string) => {
    if (isSearchPending) {
      return;
    }

    const targetQuery = nextQuery ?? query;

    if (!hasSearched) {
      setIsSearchPending(true);
      await new Promise((resolve) => setTimeout(resolve, SEARCH_EFFECT_DELAY_MS));
      setIsSearchPending(false);
    }

    setQuery(targetQuery);
    setSubmittedQuery(targetQuery);
    setHasSearched(true);
    setMobileSearchStep('list');
    setCurrentStep('selection');
    setUseTemplateFlow(true);
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch();
  };

  const handleRecommendedKeywordClick = (keyword: string) => {
    void runSearch(keyword);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCarouselIndex(0);
    if (isCompactLayout) {
      setMobileSearchStep('detail');
    }
  };

  const handleStartWithoutTemplate = () => {
    setUseTemplateFlow(false);
    setHasSearched(true);
    setCurrentStep('basic-info');
    setSelectedTemplateId('');
    setCarouselIndex(0);
  };

  const handleNextFromTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    setBasicInfo((prev) => ({
      ...prev,
      fileName: prev.fileName || selectedTemplate.name,
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

    await onSubmit({
      title: fileName,
      description: descriptionParts.join(' | '),
    });
    setModalOpen(false);
  };

  const carouselImage = activePreviewImages[carouselIndex];
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
          style={{ maxWidth: hasSearched ? '78rem' : '52rem' }}
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
                        Keyword Template Suggest
                      </div>

                      <h2 className='mt-4 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100'>
                        What would you like to create?
                      </h2>
                      <p className='mx-auto mt-2 max-w-2xl text-center text-base text-gray-500 dark:text-gray-300'>
                        키워드를 입력하면 맞는 작업지시서 템플릿을 추천해드립니다.
                      </p>

                      <form onSubmit={handleSearchSubmit} className='mx-auto mt-7 max-w-4xl'>
                        <div className='rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-gray-700/60 dark:bg-gray-900'>
                          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                            <div className='relative flex-1'>
                              <svg
                                className='text-faddit pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 fill-current'
                                viewBox='0 0 16 16'
                                aria-hidden='true'
                              >
                                <path d='M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z' />
                                <path d='m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z' />
                              </svg>
                              <input
                                type='search'
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                disabled={isSearchPending}
                                className='focus:border-faddit/40 focus:ring-faddit/20 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pr-3 pl-10 text-[15px] text-gray-800 transition outline-none placeholder:text-gray-400 focus:ring-3 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-100'
                                placeholder='키워드를 입력해 템플릿을 추천받아 보세요 (예: 오버사이즈 티, 카고 팬츠)'
                              />
                            </div>
                            <button
                              type='submit'
                              disabled={isSearchPending}
                              className='btn bg-faddit h-12 px-5 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
                            >
                              {isSearchPending ? '추천 템플릿 찾는 중...' : '템플릿 추천받기'}
                            </button>
                          </div>
                        </div>
                      </form>

                      {isSearchPending ? (
                        <div className='text-faddit border-faddit/20 bg-faddit/5 mx-auto mt-3 flex max-w-4xl items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold'>
                          <svg
                            className='h-4 w-4 animate-spin fill-current'
                            viewBox='0 0 20 20'
                            aria-hidden='true'
                          >
                            <path d='M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2Z' />
                          </svg>
                          AI가 키워드를 분석해 템플릿을 추천하고 있습니다...
                        </div>
                      ) : null}

                      <div className='mt-5 flex flex-wrap items-center justify-center gap-2 text-sm'>
                        {RECOMMENDED_KEYWORDS.map((keyword) => (
                          <button
                            key={keyword}
                            type='button'
                            onClick={() => handleRecommendedKeywordClick(keyword)}
                            disabled={isSearchPending}
                            className='hover:border-faddit/40 hover:bg-faddit/5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/70'
                          >
                            <span className='text-faddit'>{renderCategoryIcon('셔츠')}</span>
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
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800'>
                  <div className='shrink-0 border-b border-gray-200 p-4 dark:border-gray-700/60'>
                    <form onSubmit={handleSearchSubmit} className='flex items-center gap-2'>
                      <div className='relative flex-1'>
                        <input
                          type='search'
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          className='form-input h-11 w-full pl-10'
                          placeholder='Describe your garment'
                        />
                        <svg
                          className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 fill-current text-gray-400'
                          viewBox='0 0 16 16'
                          aria-hidden='true'
                        >
                          <path d='M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z' />
                          <path d='m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z' />
                        </svg>
                      </div>
                      <button type='submit' className='btn bg-faddit text-white hover:opacity-90'>
                        검색
                      </button>
                    </form>
                  </div>

                  <div className='flex min-h-0 flex-1 overflow-hidden'>
                    {(!isCompactLayout || mobileSearchStep === 'list') && (
                      <div
                        className={`flex min-h-0 flex-col border-gray-200 bg-gray-50 dark:border-gray-700/60 dark:bg-gray-900 ${
                          isCompactLayout
                            ? 'w-full border-0'
                            : 'w-[30%] shrink-0 border-r border-b-0'
                        }`}
                      >
                        <div className='shrink-0 border-b border-gray-200 px-4 py-3 text-xs font-bold tracking-wide text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                          검색 결과
                        </div>
                        <div className='min-h-0 flex-1 overflow-y-auto bg-gray-100/70 p-3 dark:bg-gray-900'>
                          {searchResults.length ? (
                            <div className='space-y-2'>
                              {searchResults.map((item) => {
                                const active = selectedTemplate?.id === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type='button'
                                    onClick={() => handleTemplateSelect(item.id)}
                                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                      active
                                        ? 'border-faddit bg-faddit/5 dark:bg-faddit/10 shadow-[0_0_0_1px_rgba(43,117,255,0.35)]'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:bg-gray-700/50'
                                    }`}
                                  >
                                    <div className='flex items-start gap-3'>
                                      <div className='text-faddit mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700/60'>
                                        {renderCategoryIcon(item.category)}
                                      </div>
                                      <div className='min-w-0 flex-1'>
                                        <div className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'>
                                          {item.name}
                                        </div>
                                        <div className='mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400'>
                                          {item.category} · {item.subtitle}
                                        </div>
                                      </div>
                                      <svg
                                        className={`mt-1 h-4 w-4 shrink-0 ${
                                          active
                                            ? 'text-faddit'
                                            : 'text-gray-300 dark:text-gray-500'
                                        }`}
                                        viewBox='0 0 16 16'
                                        fill='none'
                                        aria-hidden='true'
                                      >
                                        <path
                                          d='M6 3.5 10 8l-4 4.5'
                                          stroke='currentColor'
                                          strokeWidth='1.8'
                                          strokeLinecap='round'
                                          strokeLinejoin='round'
                                        />
                                      </svg>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className='rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                              검색 결과가 없습니다. 다른 키워드로 검색해 보세요.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(!isCompactLayout || mobileSearchStep === 'detail') && (
                      <div
                        className={`min-h-0 overflow-y-auto ${
                          isCompactLayout ? 'w-full' : 'w-0 min-w-0 flex-1'
                        }`}
                      >
                        {selectedTemplate ? (
                          <div className='flex min-h-full flex-col'>
                            <div className='flex items-center justify-between border-b border-gray-200 px-5 py-3 lg:hidden dark:border-gray-700/60'>
                              <div className='flex items-center gap-2'>
                                {isCompactLayout ? (
                                  <button
                                    type='button'
                                    className='btn hidden h-8 border-gray-200 px-3 text-xs text-gray-700 hover:border-gray-300 sm:inline-flex dark:border-gray-700/60 dark:text-gray-300'
                                    onClick={() => setMobileSearchStep('list')}
                                  >
                                    뒤로
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className='px-5 pt-5'>
                              <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-900'>
                                <div className='relative overflow-hidden rounded-lg bg-white p-5 dark:bg-gray-800'>
                                  {carouselImage ? (
                                    <img
                                      src={carouselImage.src}
                                      alt={carouselImage.label}
                                      className='mx-auto h-[220px] w-full max-w-[520px] object-contain'
                                    />
                                  ) : null}
                                </div>

                                <div className='mt-3 flex items-center justify-between'>
                                  <button
                                    type='button'
                                    className='btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
                                    onClick={() =>
                                      setCarouselIndex((prev) =>
                                        prev === 0 ? activePreviewImages.length - 1 : prev - 1,
                                      )
                                    }
                                    disabled={activePreviewImages.length <= 1}
                                  >
                                    이전
                                  </button>
                                  <span className='text-xs font-semibold text-gray-500 dark:text-gray-400'>
                                    {carouselImage?.label || '-'}
                                  </span>
                                  <button
                                    type='button'
                                    className='btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
                                    onClick={() =>
                                      setCarouselIndex((prev) =>
                                        prev === activePreviewImages.length - 1 ? 0 : prev + 1,
                                      )
                                    }
                                    disabled={activePreviewImages.length <= 1}
                                  >
                                    다음
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className='mt-5 px-5 pb-5'>
                              <div className='flex flex-wrap items-center gap-2'>
                                {selectedTemplate.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className='bg-faddit/10 text-faddit rounded-full px-3 py-1 text-xs font-semibold'
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              <h3 className='mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100'>
                                {selectedTemplate.name}
                              </h3>

                              <div className='mt-4 grid grid-cols-2 gap-3'>
                                {selectedTemplate.details.map((detail) => (
                                  <div
                                    key={detail.label}
                                    className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700/60 dark:bg-gray-900'
                                  >
                                    <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                                      {detail.label}
                                    </div>
                                    <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                                      {detail.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='flex h-full items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400'>
                            표시할 템플릿이 없습니다.
                          </div>
                        )}
                      </div>
                    )}
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
                            <div className='mb-3 flex items-center justify-between'>
                              <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                도식화/패턴 미리보기
                              </h3>
                              <span className='text-xs font-semibold text-gray-500 dark:text-gray-400'>
                                {selectedTemplate.technicalDrawingVersion}
                              </span>
                            </div>
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                              {activePreviewImages.map((image) => (
                                <div
                                  key={image.id}
                                  className='rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'
                                >
                                  <div className='mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                                    {image.label}
                                  </div>
                                  <img
                                    src={image.src}
                                    alt={image.label}
                                    className='h-[180px] w-full object-contain'
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-900'>
                            <h3 className='mb-3 text-lg font-bold text-gray-900 dark:text-gray-100'>
                              템플릿 기본 정보
                            </h3>
                            <div className='flex flex-wrap items-center gap-2'>
                              {selectedTemplate.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className='bg-faddit/10 text-faddit rounded-full px-3 py-1 text-xs font-semibold'
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className='mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100'>
                              {selectedTemplate.name}
                            </div>
                            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                              {selectedTemplate.details.map((detail) => (
                                <div
                                  key={detail.label}
                                  className='rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/60 dark:bg-gray-800'
                                >
                                  <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                                    {detail.label}
                                  </div>
                                  <div className='mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100'>
                                    {detail.value}
                                  </div>
                                </div>
                              ))}
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
