import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import Img from '../../../components/atoms/Img';
import GoogleLogo from '../../../images/icons/google-logo.svg';
import KakaoLogo from '../../../images/icons/kakao-logo.svg';
import NaverLogo from '../../../images/icons/naver-logo.svg';
import { signIn } from '../../../lib/api/authApi';

interface LoginFormInputs {
  email: string;
  password?: string;
  saveId: boolean;
}

const Login: React.FC = () => {
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormInputs>();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setValue('email', savedEmail);
      setValue('saveId', true);
    }
  }, [setValue]);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    if (!data.password) {
      setError('password', { message: '비밀번호를 입력해주세요.' });
      return;
    }

    try {
      await signIn({
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      setError('password', {
        message: '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.',
      });
      return;
    }

    if (data.saveId) {
      localStorage.setItem('savedEmail', data.email);
    } else {
      localStorage.removeItem('savedEmail');
    }

    navigate('/faddit/drive');
  };

  return (
    <>
      <h1 className='mb-6 text-3xl font-bold text-gray-800 dark:text-gray-100'>로그인</h1>
      {/* Form */}
      <div className='mb-6 flex items-center justify-between border-b border-gray-100 pb-5 text-sm dark:border-gray-700/60'>
        <div>패딧에 처음 오셨나요?</div>
        <Link
          className='text-faddit font-medium transition-opacity hover:opacity-80'
          to='/faddit/sign/up'
        >
          회원가입
        </Link>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='space-y-4'>
          <div>
            <label className='mb-1 block text-sm font-medium' htmlFor='email'>
              이메일주소
            </label>
            <input
              id='email'
              className={`form-input w-full ${errors.email ? 'border-red-500' : ''}`}
              type='text'
              {...register('email', {
                required: '이메일을 입력해주세요.',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '유효한 이메일 주소를 입력해주세요.',
                },
              })}
            />
            {errors.email && (
              <span className='mt-1 text-xs text-red-500'>{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium' htmlFor='password'>
              비밀번호
            </label>
            <input
              id='password'
              className={`form-input w-full ${errors.password ? 'border-red-500' : ''}`}
              type='password'
              autoComplete='on'
              {...register('password', { required: '비밀번호를 입력해주세요.' })}
            />
            {errors.password && (
              <span className='mt-1 text-xs text-red-500'>{errors.password.message}</span>
            )}
          </div>
        </div>

        {/* Save ID & Forgot Password */}
        <div className='mt-6 flex items-center justify-between'>
          <div className='flex items-center'>
            <input
              id='save-id'
              type='checkbox'
              className='form-checkbox cursor-pointer'
              {...register('saveId')}
            />
            <label
              className='ml-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400'
              htmlFor='save-id'
            >
              아이디 저장
            </label>
          </div>
          <Link
            className='text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            to='/sign/reset-password'
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        {/* Login Button */}
        <div className='mt-6'>
          <button
            className='btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
            type='submit'
          >
            로그인
          </button>
        </div>
      </form>

      {/* Social Login Footer */}
      <div className='mt-6'>
        <div className='relative'>
          <div className='absolute inset-0 flex items-center' aria-hidden='true'>
            <div className='w-full border-t border-gray-200 dark:border-gray-700/60'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='bg-white px-2 text-gray-500 dark:bg-gray-900'>
              SNS 계정으로 로그인/회원가입
            </span>
          </div>
        </div>

        <div className='mt-6 flex justify-center gap-6'>
          <button
            type='button'
            className='cursor-pointer transition-opacity hover:opacity-80'
            aria-label='Continue with Google'
          >
            <Img src={GoogleLogo} alt='Google' className='h-12 w-12' />
          </button>
          <button
            type='button'
            className='cursor-pointer transition-opacity hover:opacity-80'
            aria-label='Continue with Kakao'
          >
            <Img src={KakaoLogo} alt='Kakao' className='h-12 w-12' />
          </button>
          <button
            type='button'
            className='cursor-pointer transition-opacity hover:opacity-80'
            aria-label='Continue with Naver'
          >
            <Img src={NaverLogo} alt='Naver' className='h-12 w-12' />
          </button>
        </div>
      </div>
    </>
  );
};
export default Login;
