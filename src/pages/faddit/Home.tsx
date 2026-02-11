import React from 'react';
import FilterButton from '../../components/DropdownFilter';
import Datepicker from '../../components/Datepicker';
import ShopCards01 from '../../partials/ecommerce/ShopCards01';
import ShopCards02 from '../../partials/ecommerce/ShopCards02';
import ShopCards03 from '../../partials/ecommerce/ShopCards03';
import ShopCards04 from '../../partials/ecommerce/ShopCards04';
import ShopCards05 from '../../partials/ecommerce/ShopCards05';
import ShopCards06 from '../../partials/ecommerce/ShopCards06';
import DriveItemCard from '../../components/DriveItemCard';
import AppImage01 from '../../images/applications-image-01.jpg';

const FadditHome: React.FC = () => {
  return (
    <div className='mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8'>
      {/* Home actions */}
      <div className='mb-8 sm:flex sm:items-center sm:justify-between'>
        {/* Left: Title */}
        <div className='mb-4 sm:mb-0'>
          <h1 className='text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100'>Home</h1>
        </div>

        {/* Right: Actions */}
        <div className='grid grid-flow-col justify-start gap-2 sm:auto-cols-max sm:justify-end'>
          <FilterButton align='right' />
          <Datepicker align='right' />
          <button
            type='button'
            className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
          >
            <svg
              className='xs:hidden shrink-0 fill-current'
              width='16'
              height='16'
              viewBox='0 0 16 16'
            >
              <path d='M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z' />
            </svg>
            <span className='max-xs:sr-only'>Add View</span>
          </button>
        </div>
      </div>

      <div>
        <div className='mt-8'>
          <div className='grid grid-cols-12 gap-6'>
            {Array.from({ length: 10 }).map((_, index) => (
              <DriveItemCard
                key={index}
                imageSrc={AppImage01}
                imageAlt='Application 01'
                title={`[패딧] 2025 S/S 남성 청바지_데미지 ${index + 1}`}
                subtitle='테스트 필드'
                badge='작업지시서'
                actionLabel='View'
                actionHref='#0'
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FadditHome;
