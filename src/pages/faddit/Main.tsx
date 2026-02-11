import React from 'react';

const FadditMain: React.FC = () => {
  return (
    <div className='px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto'>
      <h1 className='text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold'>
        Home
      </h1>
      <div className='flex flex-wrap'>
        {
          Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className='w-1/2'>
              <h2 className='text-lg md:text-xl text-gray-800 dark:text-gray-100 font-bold'>
                {`Item ${index + 1}`}
              </h2>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default FadditMain;
