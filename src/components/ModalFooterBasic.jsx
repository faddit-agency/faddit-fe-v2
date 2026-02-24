import React, { useRef, useEffect } from 'react';
import Transition from '../utils/Transition';

function ModalFooterBasic({ children, footer, id, title, modalOpen, setModalOpen }) {
  const modalContent = useRef(null);

  // close if the esc key is pressed
  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    const keyHandler = ({ keyCode }) => {
      if (keyCode !== 27) return;
      setModalOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [modalOpen, setModalOpen]);

  return (
    <>
      {/* Modal backdrop */}
      <Transition
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
      {/* Modal dialog */}
      <Transition
        id={id}
        className='fixed inset-0 z-50 my-4 flex items-center justify-center overflow-hidden px-4 sm:px-6'
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
          ref={modalContent}
          className='flex max-h-full w-full max-w-lg flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800'
        >
          {/* Modal header - 고정 */}
          <div className='flex-shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-700/60'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold text-gray-800 dark:text-gray-100'>{title}</div>
              <button
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(false);
                }}
              >
                <div className='sr-only'>Close</div>
                <svg className='fill-current' width='16' height='16' viewBox='0 0 16 16'>
                  <path d='M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z' />
                </svg>
              </button>
            </div>
          </div>
          {/* 스크롤 가능한 컨텐츠 영역 */}
          <div className='flex-1 overflow-y-auto'>{children}</div>
          {/* Modal footer - 고정 */}
          {footer && <div className='flex-shrink-0'>{footer}</div>}
        </div>
      </Transition>
    </>
  );
}

export default ModalFooterBasic;
