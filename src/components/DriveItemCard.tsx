import React from 'react';

import UserImage01 from '../images/avatar-01.jpg';
import UserImage02 from '../images/avatar-02.jpg';
import UserImage03 from '../images/avatar-03.jpg';
import UserImage04 from '../images/avatar-04.jpg';
import UserImage05 from '../images/avatar-05.jpg';
import UserImage06 from '../images/avatar-06.jpg';

export interface DriveItemCardProps {
  /** 이미지 URL */
  imageSrc: string;
  /** 이미지 대체 텍스트 */
  imageAlt: string;
  /** 카드 제목 */
  title: string;
  /** 부제목/설명 (선택) */
  subtitle?: string;
  /** 가격 표시 (예: "$89.00") */
  price?: string;
  /** 평점 (1~5, 소수 가능) */
  rating?: number;
  /** 리뷰 수 (평점 옆에 표시, 예: 478) */
  ratingCount?: number;
  /** 이미지 아래 배지 텍스트 (예: "Popular") */
  badge?: string;
  /** 액션 버튼 라벨 (예: "Buy Now", "Buy Tickets") */
  actionLabel: string;
  /** 액션 버튼 링크 (기본: "#0") */
  actionHref?: string;
  /** 이미지 위 오른쪽 오버레이 (좋아요 버튼 등) */
  imageOverlay?: React.ReactNode;
  /** 카드 본문 (특징 목록 등) */
  children?: React.ReactNode;
  /** 그리드 컬럼 클래스 (기본: col-span-full sm:col-span-6 xl:col-span-3) */
  className?: string;
}

const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.33 2.67l2.12 2.12-8.48 8.48-2.12.01.01-2.12 8.46-8.47z" />
    <path d="M13.5 1.5l1 1" />
  </svg>
);

const MoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="4" cy="8" r="1.25" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="12" cy="8" r="1.25" />
  </svg>
);

const DriveItemCard: React.FC<DriveItemCardProps> = ({
  imageSrc,
  imageAlt,
  title,
  subtitle,
  price,
  rating,
  ratingCount,
  badge,
  actionLabel,
  actionHref = '#0',
  imageOverlay,
  children,
  className = 'col-span-full sm:col-span-6 xl:col-span-3',
}) => {
  const fullStars = rating != null ? Math.min(5, Math.floor(rating)) : 0;
  const emptyStars = 5 - fullStars;

  return (
    <div className={`group ${className} overflow-hidden rounded-xl bg-white shadow-xs dark:bg-gray-800`}>
      <div className='flex h-full flex-col'>
        {/* Image */}
        <div className='relative'>
          <img className='w-full' src={imageSrc} width='286' height='160' alt={imageAlt} />
          {imageOverlay && <div className='absolute top-0 right-0 mt-4 mr-4'>{imageOverlay}</div>}
          {/* Hover: 연필 / 구분선 / 더보기 */}
          <div className='absolute top-3 right-3 flex items-center rounded-lg bg-white/90 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-800/90'>
            <button
              type='button'
              className='flex h-8 w-8 items-center justify-center rounded-l-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              aria-label='수정'
            >
              <PencilIcon className='h-4 w-4' />
            </button>
            <span className='h-4 w-px bg-gray-200 dark:bg-gray-600' aria-hidden />
            <button
              type='button'
              className='flex h-8 w-8 items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              aria-label='더보기'
            >
              <MoreIcon className='h-4 w-4' />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className='flex grow flex-col p-5'>
          {/* Badge (이미지 아래) */}
          {badge && (
            <div className=''>
              <span className='inline-flex items-center rounded-full bg-[#3ec972]/20 px-2.5 pt-1 pb-0.5 text-center text-xs font-medium text-[#239F52] dark:bg-gray-700/80 dark:text-[#239F52]'>
                {badge}
              </span>
            </div>
          )}
          <div className='mt-3 grow'>
            <header className={subtitle ? 'mb-2' : 'mb-3'}>
              <h3 className='mb-1 text-lg font-semibold text-gray-800 dark:text-gray-100'>
                {title}
              </h3>
              {subtitle && (
                <div className='text-sm text-gray-600 dark:text-gray-400'>{subtitle}</div>
              )}
              {subtitle && (
                <div className='text-sm text-gray-600 dark:text-gray-400'>{subtitle}</div>
              )}
              {subtitle && (
                <div className='text-sm text-gray-600 dark:text-gray-400'>{subtitle}</div>
              )}
            </header>

            {children && <div className='mb-5'>{children}</div>}
          </div>

          {/* Card footer */}
          <div className='flex items-center justify-between'>
            {/* Avatars group */}
            <div className='-ml-0.5 flex -space-x-3'>
              <img
                className='box-content rounded-full border-2 border-white dark:border-gray-800'
                src={UserImage02}
                width='24'
                height='24'
                alt='Avatar'
              />
              <img
                className='box-content rounded-full border-2 border-white dark:border-gray-800'
                src={UserImage03}
                width='24'
                height='24'
                alt='Avatar'
              />
              <img
                className='box-content rounded-full border-2 border-white dark:border-gray-800'
                src={UserImage04}
                width='24'
                height='24'
                alt='Avatar'
              />
              <img
                className='box-content rounded-full border-2 border-white dark:border-gray-800'
                src={UserImage05}
                width='24'
                height='24'
                alt='Avatar'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveItemCard;
