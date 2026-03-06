import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import UserAvatar from '../../../images/user-avatar-80.png';

type MySection = 'profile' | 'plan' | 'billing';

const resolveSection = (pathname: string): MySection => {
  if (pathname.startsWith('/faddit/my/plan')) {
    return 'plan';
  }

  if (pathname.startsWith('/faddit/my/billing')) {
    return 'billing';
  }

  return 'profile';
};

const SectionContainer = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className='rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800'>
    <div className='border-b border-gray-200 px-5 py-4 dark:border-gray-700/60 sm:px-6'>
      <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>{title}</h2>
      <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>
    </div>
    <div className='px-5 py-5 sm:px-6'>{children}</div>
  </div>
);

const ReadonlyInput = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>{label}</label>
    <input
      className='form-input w-full cursor-not-allowed bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
      value={value}
      readOnly
    />
  </div>
);

const MyPage: React.FC = () => {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const section = useMemo(() => resolveSection(pathname), [pathname]);

  const topTitle =
    section === 'profile' ? '나의 프로필' : section === 'plan' ? '나의 플랜' : '나의 결제내역';

  return (
    <div className='h-[calc(100dvh-64px)] overflow-y-auto bg-white dark:bg-gray-900'>
      <div className='mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl'>
            {topTitle}
          </h1>
          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
            계정 정보와 플랜/결제 정보를 확인할 수 있습니다.
          </p>
        </div>

        {section === 'profile' ? (
          <SectionContainer
            title='나의 프로필'
            description='서비스 완료 전까지 사용할 독립 프로필 화면입니다.'
          >
            <div className='mb-6 flex items-center gap-4'>
              <img
                src={user?.profileImg || UserAvatar}
                alt='내 프로필 이미지'
                className='h-16 w-16 rounded-full border border-gray-200 object-cover dark:border-gray-700/60'
              />
              <div>
                <div className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  {user?.name || '이름 미설정'}
                </div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>
                  {user?.email || '이메일 미설정'}
                </div>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <ReadonlyInput label='이름' value={user?.name || ''} />
              <ReadonlyInput label='이메일' value={user?.email || ''} />
              <ReadonlyInput label='권한' value={user?.role || 'USER'} />
              <ReadonlyInput label='가입 상태' value='활성' />
            </div>
          </SectionContainer>
        ) : null}

        {section === 'plan' ? (
          <SectionContainer
            title='나의 플랜'
            description='현재 이용 중인 플랜과 업그레이드 정보를 제공합니다.'
          >
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='rounded-xl border border-faddit/30 bg-faddit/5 p-4'>
                <div className='text-sm font-semibold text-faddit'>현재 플랜</div>
                <div className='mt-2 text-xl font-bold text-gray-900 dark:text-gray-100'>Basic</div>
                <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                  월간 사용량 기준으로 기본 기능을 이용 중입니다.
                </p>
              </div>
              <div className='rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-900/40'>
                <div className='text-sm font-semibold text-gray-700 dark:text-gray-200'>
                  업그레이드 안내
                </div>
                <div className='mt-2 text-xl font-bold text-gray-900 dark:text-gray-100'>Pro 10GB</div>
                <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                  저장공간 확장 및 고급 기능은 정식 출시 후 제공 예정입니다.
                </p>
              </div>
            </div>
          </SectionContainer>
        ) : null}

        {section === 'billing' ? (
          <SectionContainer
            title='나의 결제내역'
            description='최근 결제 기록을 확인할 수 있습니다.'
          >
            <div className='overflow-x-auto'>
              <table className='w-full table-auto text-sm'>
                <thead>
                  <tr className='border-b border-gray-200 text-left text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                    <th className='py-2'>일자</th>
                    <th className='py-2'>항목</th>
                    <th className='py-2'>금액</th>
                    <th className='py-2'>상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-b border-gray-100 dark:border-gray-800'>
                    <td className='py-3 text-gray-700 dark:text-gray-300'>2026-02-20</td>
                    <td className='py-3 text-gray-700 dark:text-gray-300'>Basic 플랜</td>
                    <td className='py-3 font-semibold text-gray-900 dark:text-gray-100'>₩0</td>
                    <td className='py-3 text-emerald-600'>완료</td>
                  </tr>
                  <tr>
                    <td className='py-3 text-gray-700 dark:text-gray-300'>2026-01-20</td>
                    <td className='py-3 text-gray-700 dark:text-gray-300'>Basic 플랜</td>
                    <td className='py-3 font-semibold text-gray-900 dark:text-gray-100'>₩0</td>
                    <td className='py-3 text-emerald-600'>완료</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionContainer>
        ) : null}
      </div>
    </div>
  );
};

export default MyPage;
