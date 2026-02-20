import { FormEvent, useEffect, useState } from 'react';
import ModalFooterBasic from '../../../../components/ModalFooterBasic';

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (folderName: string) => Promise<void> | void;
};

const CreateFolderModal = ({ modalOpen, setModalOpen, isSubmitting, onSubmit }: Props) => {
  const [folderName, setFolderName] = useState('새 폴더');

  useEffect(() => {
    if (modalOpen) {
      setFolderName('새 폴더');
    }
  }, [modalOpen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = folderName.trim();
    if (!nextName) {
      return;
    }
    await onSubmit(nextName);
    setModalOpen(false);
  };

  return (
    <ModalFooterBasic
      id='faddit-create-folder-modal'
      title='폴더 생성'
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      footer={
        <div className='border-t border-gray-200 px-5 py-4 dark:border-gray-700/60'>
          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => setModalOpen(false)}
              className='btn border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
            >
              취소
            </button>
            <button
              type='submit'
              form='faddit-create-folder-form'
              disabled={isSubmitting || !folderName.trim()}
              className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
            >
              생성
            </button>
          </div>
        </div>
      }
    >
      <form id='faddit-create-folder-form' onSubmit={handleSubmit} className='px-5 py-4'>
        <label
          htmlFor='faddit-folder-name'
          className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'
        >
          폴더 이름
        </label>
        <input
          id='faddit-folder-name'
          type='text'
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          className='form-input w-full'
          placeholder='폴더 이름을 입력하세요'
        />
      </form>
    </ModalFooterBasic>
  );
};

export default CreateFolderModal;
