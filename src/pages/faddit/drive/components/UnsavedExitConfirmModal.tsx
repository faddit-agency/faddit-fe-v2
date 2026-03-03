import { useEffect } from 'react';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const UnsavedExitConfirmModal = ({ open, onCancel, onConfirm }: Props) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 px-4'
      onClick={onCancel}
    >
      <div
        className='w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700/60 dark:bg-gray-800'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='text-base font-semibold text-gray-800 dark:text-gray-100'>
          이대로 나가시겠습니까?
        </div>
        <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
          저장하지 않은 변경사항은 사라집니다.
        </p>
        <div className='mt-4 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='btn cursor-pointer border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500'
          >
            취소
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='btn cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500'
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedExitConfirmModal;
