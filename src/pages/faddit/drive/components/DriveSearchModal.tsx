import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DriveSearchCategory } from '../../../../lib/api/driveApi';

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
};

type SearchChip = {
  label: string;
  value: DriveSearchCategory | 'all';
};

const SEARCH_CHIPS: SearchChip[] = [
  { label: '전체', value: 'all' },
  { label: '폴더', value: 'folder' },
  { label: '작업지시서', value: 'worksheet' },
  { label: 'faddit', value: 'faddit' },
  { label: '도식화', value: 'schematic' },
  { label: '라벨', value: 'label' },
  { label: '원단', value: 'fabric' },
  { label: '패턴', value: 'pattern' },
  { label: '인쇄', value: 'print' },
  { label: '기타', value: 'etc' },
];

const DriveSearchModal = ({ modalOpen, setModalOpen }: Props) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<DriveSearchCategory[]>([]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    setKeyword('');
    setSelectedCategories([]);
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
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

  const toggleCategory = (value: DriveSearchCategory | 'all') => {
    if (value === 'all') {
      setSelectedCategories([]);
      return;
    }

    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    params.set('mode', 'search');
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword) {
      params.set('q', trimmedKeyword);
    }
    if (selectedCategories.length) {
      params.set('categories', selectedCategories.join(','));
    }

    const query = params.toString();
    navigate(query ? `/faddit/drive?${query}` : '/faddit/drive');
    setModalOpen(false);
  };

  if (!modalOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50'>
      <div
        className='absolute inset-0 bg-gray-900/30'
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setModalOpen(false);
          }
        }}
      />

      <div className='relative flex h-full w-full items-start justify-center p-0 lg:pt-20'>
        <form
          onSubmit={handleSubmit}
          className='flex h-screen w-screen flex-col overflow-hidden bg-white shadow-lg lg:h-auto lg:w-[620px] lg:rounded-xl dark:bg-gray-800'
        >
          <div className='border-b border-gray-200 px-4 py-3 dark:border-gray-700/60'>
            <div className='flex items-center gap-3'>
              <div className='relative flex-1'>
                <input
                  ref={searchInputRef}
                  className='form-input w-full pl-10'
                  type='search'
                  placeholder='Search Anything...'
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
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

              <button
                type='submit'
                className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
              >
                검색
              </button>

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
          </div>

          <div className='border-b border-gray-200 px-4 py-3 dark:border-gray-700/60'>
            <div className='flex flex-wrap gap-2'>
              {SEARCH_CHIPS.map((chip) => {
                const active =
                  chip.value === 'all'
                    ? selectedCategories.length === 0
                    : selectedCategories.includes(chip.value);

                return (
                  <button
                    key={chip.value}
                    type='button'
                    onClick={() => toggleCategory(chip.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='px-4 py-5 text-sm text-gray-500 dark:text-gray-400'>
            Enter 또는 검색 버튼으로 결과 페이지로 이동합니다.
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriveSearchModal;
