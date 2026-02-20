import ModalFooterBasic from '../../../../components/ModalFooterBasic';

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  onSelectFolder: () => void;
  onSelectMaterial: () => void;
};

const AddViewOptionModal = ({
  modalOpen,
  setModalOpen,
  onSelectFolder,
  onSelectMaterial,
}: Props) => {
  return (
    <ModalFooterBasic
      id='faddit-add-view-option-modal'
      title='추가 옵션 선택'
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      footer={
        <div className='border-t border-gray-200 px-5 py-4 dark:border-gray-700/60'>
          <button
            type='button'
            onClick={() => setModalOpen(false)}
            className='btn w-full border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
          >
            닫기
          </button>
        </div>
      }
    >
      <div className='space-y-3 px-5 py-4'>
        <button
          type='button'
          onClick={onSelectFolder}
          className='w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800'
        >
          폴더 생성
        </button>
        <button
          type='button'
          onClick={onSelectMaterial}
          className='w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800'
        >
          소재 추가(라벨/시보리원단 등)
        </button>
      </div>
    </ModalFooterBasic>
  );
};

export default AddViewOptionModal;
