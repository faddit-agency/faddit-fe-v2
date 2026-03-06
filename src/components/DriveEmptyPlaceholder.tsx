import React from 'react';

type DriveEmptyPlaceholderProps = {
  message: string;
};

const DriveEmptyPlaceholder: React.FC<DriveEmptyPlaceholderProps> = ({ message }) => {
  return (
    <div className='flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center dark:border-gray-700/60 dark:bg-gray-900/40'>
      <div className='bg-faddit/10 text-faddit mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl'>
        <svg className='h-8 w-8' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
          <path
            d='M3.5 7.25A2.75 2.75 0 0 1 6.25 4.5h3.88a2 2 0 0 1 1.41.59l.9.9c.37.37.88.58 1.41.58h3.9a2.75 2.75 0 0 1 2.75 2.75v6.43a2.75 2.75 0 0 1-2.75 2.75H6.25a2.75 2.75 0 0 1-2.75-2.75V7.25Z'
            stroke='currentColor'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M9.25 12h5.5M9.25 14.75h3.5'
            stroke='currentColor'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
      <p className='text-sm font-semibold text-gray-500 dark:text-gray-300'>{message}</p>
    </div>
  );
};

export default DriveEmptyPlaceholder;
