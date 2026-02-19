import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
  requestResetPassword,
  updatePassword,
  verifyResetPassword,
} from '../../../lib/api/authApi';

interface RequestFormInputs {
  email: string;
}

interface UpdateFormInputs {
  password: string;
  passwordConfirm: string;
}

const FadditResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  const userId = searchParams.get('userId') || searchParams.get('user_id') || '';
  const passwordResetToken =
    searchParams.get('passwordResetToken') ||
    searchParams.get('reset-password-token') ||
    searchParams.get('token') ||
    '';

  const resetMode = useMemo(
    () => Boolean(userId && passwordResetToken),
    [userId, passwordResetToken],
  );

  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
  } = useForm<RequestFormInputs>();

  const {
    register: registerUpdate,
    handleSubmit: handleUpdateSubmit,
    watch,
    formState: { errors: updateErrors },
  } = useForm<UpdateFormInputs>();

  useEffect(() => {
    if (!resetMode) {
      return;
    }

    let cancelled = false;

    const verifyToken = async () => {
      setTokenVerifying(true);
      setUpdateError('');

      try {
        await verifyResetPassword({
          userId,
          passwordResetToken,
        });

        if (!cancelled) {
          setTokenValid(true);
        }
      } catch (error) {
        if (!cancelled) {
          setTokenValid(false);
          setUpdateError('비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.');
        }
      } finally {
        if (!cancelled) {
          setTokenVerifying(false);
        }
      }
    };

    void verifyToken();

    return () => {
      cancelled = true;
    };
  }, [resetMode, userId, passwordResetToken]);

  const onRequestSubmit: SubmitHandler<RequestFormInputs> = async ({ email }) => {
    setRequestError('');

    try {
      await requestResetPassword(email);
      setRequestSent(true);
    } catch (error) {
      setRequestError('재설정 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const onUpdateSubmit: SubmitHandler<UpdateFormInputs> = async ({ password }) => {
    if (!tokenValid) {
      return;
    }

    setUpdateError('');

    try {
      await updatePassword({
        userId,
        passwordResetToken,
        password,
      });
      setUpdateSuccess(true);
      navigate('/faddit/sign/in');
    } catch (error) {
      setUpdateError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <>
      {!resetMode ? (
        <>
          <h1 className='mb-6 text-3xl font-bold text-gray-800 dark:text-gray-100'>
            비밀번호 재설정
          </h1>
          <form onSubmit={handleRequestSubmit(onRequestSubmit)}>
            <div className='space-y-4'>
              <div>
                <label className='mb-1 block text-sm font-medium' htmlFor='email'>
                  이메일 주소
                </label>
                <input
                  id='email'
                  className={`form-input w-full ${requestErrors.email ? 'border-red-500' : ''}`}
                  type='email'
                  {...registerRequest('email', {
                    required: '이메일을 입력해주세요.',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '유효한 이메일 주소를 입력해주세요.',
                    },
                  })}
                />
                {requestErrors.email && (
                  <span className='mt-1 text-xs text-red-500'>{requestErrors.email.message}</span>
                )}
              </div>
            </div>

            {requestError && <div className='mt-3 text-sm text-red-500'>{requestError}</div>}
            {requestSent && (
              <div className='mt-3 text-sm text-green-600 dark:text-green-400'>
                비밀번호 재설정 메일을 발송했습니다. 메일함을 확인해주세요.
              </div>
            )}

            <div className='mt-6 flex justify-end'>
              <button className='btn bg-gray-900 whitespace-nowrap text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'>
                재설정 링크 발송
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h1 className='mb-6 text-3xl font-bold text-gray-800 dark:text-gray-100'>
            새 비밀번호 설정
          </h1>
          <form onSubmit={handleUpdateSubmit(onUpdateSubmit)}>
            <div className='space-y-4'>
              <div>
                <label className='mb-1 block text-sm font-medium' htmlFor='password'>
                  새 비밀번호
                </label>
                <input
                  id='password'
                  className={`form-input w-full ${updateErrors.password ? 'border-red-500' : ''}`}
                  type='password'
                  {...registerUpdate('password', {
                    required: '비밀번호를 입력해주세요.',
                    minLength: {
                      value: 8,
                      message: '비밀번호는 최소 8자 이상이어야 합니다.',
                    },
                  })}
                />
                {updateErrors.password && (
                  <span className='mt-1 text-xs text-red-500'>{updateErrors.password.message}</span>
                )}
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium' htmlFor='passwordConfirm'>
                  새 비밀번호 확인
                </label>
                <input
                  id='passwordConfirm'
                  className={`form-input w-full ${updateErrors.passwordConfirm ? 'border-red-500' : ''}`}
                  type='password'
                  {...registerUpdate('passwordConfirm', {
                    required: '비밀번호 확인을 입력해주세요.',
                    validate: (value) =>
                      value === watch('password') || '비밀번호가 일치하지 않습니다.',
                  })}
                />
                {updateErrors.passwordConfirm && (
                  <span className='mt-1 text-xs text-red-500'>
                    {updateErrors.passwordConfirm.message}
                  </span>
                )}
              </div>
            </div>

            {tokenVerifying && (
              <div className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                재설정 링크를 확인하고 있습니다...
              </div>
            )}
            {updateError && <div className='mt-3 text-sm text-red-500'>{updateError}</div>}
            {updateSuccess && (
              <div className='mt-3 text-sm text-green-600 dark:text-green-400'>
                비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.
              </div>
            )}

            <div className='mt-6 flex justify-end'>
              <button
                className='btn bg-gray-900 whitespace-nowrap text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
                disabled={tokenVerifying || !tokenValid}
              >
                비밀번호 변경
              </button>
            </div>
          </form>
        </>
      )}

      <div className='mt-6 border-t border-gray-100 pt-5 text-sm dark:border-gray-700/60'>
        <Link
          className='text-faddit font-medium transition-opacity hover:opacity-80'
          to='/faddit/sign/in'
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </>
  );
};

export default FadditResetPassword;
