import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import ModalFooterBasic from '../../../components/ModalFooterBasic';
import ModalAction from '../../../components/ModalAction';
import { AGREEMENT_OPTIONS } from '../../../constants/agreements';
import { checkVerificationEmail, requestEmailVerification, signUp } from '../../../lib/api/authApi';

interface SignupFormInputs {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  verificationCode: string;
  serviceAgreement: boolean;
  userAgreement: boolean;
  marketingAgreement: boolean;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      verificationCode: '',
      serviceAgreement: false,
      userAgreement: false,
      marketingAgreement: false,
    },
  });

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [currentTermContent, setCurrentTermContent] = useState({ title: '', content: '' });
  const [currentTermId, setCurrentTermId] = useState<string>('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const [isVerificationVisible, setIsVerificationVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const emailValue = watch('email');
  const serviceAgreement = watch('serviceAgreement');
  const userAgreement = watch('userAgreement');
  const marketingAgreement = watch('marketingAgreement');
  const verificationCodeValue = watch('verificationCode');

  const allAgreed = serviceAgreement && userAgreement && marketingAgreement;

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  useEffect(() => {
    if (
      !isVerificationVisible ||
      !verificationCodeValue ||
      verificationCodeValue.length < 6 ||
      !emailValue
    ) {
      setIsEmailVerified(false);
      clearErrors('verificationCode');
      return;
    }

    if (!/^\d+$/.test(verificationCodeValue)) {
      setIsEmailVerified(false);
      setError('verificationCode', { message: '인증번호는 숫자만 입력해주세요.' });
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const verification = await checkVerificationEmail({
          email: emailValue,
          code: Number(verificationCodeValue),
        });

        if (cancelled) {
          return;
        }

        const isVerified = Boolean(
          verification?.verified ??
          verification?.isVerified ??
          verification?.is_verified ??
          verification?.success,
        );

        setIsEmailVerified(isVerified);
        if (isVerified) {
          clearErrors('verificationCode');
        } else {
          setError('verificationCode', { message: '인증번호가 올바르지 않습니다.' });
        }
        if (isVerified) {
          setIsTimerActive(false);
        }
      } catch (error) {
        if (!cancelled) {
          setIsEmailVerified(false);
          setError('verificationCode', {
            message: '인증번호 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isVerificationVisible, verificationCodeValue, emailValue, clearErrors, setError, trigger]);

  useEffect(() => {
    if (isEmailVerified) {
      trigger('email');
    }
  }, [isEmailVerified, trigger]);

  useEffect(() => {
    if (isEmailVerified) {
      setIsEmailVerified(false);
    }
  }, [emailValue]);

  const handleAllAgreementChange = () => {
    const newValue = !allAgreed;
    setValue('serviceAgreement', newValue, { shouldValidate: true });
    setValue('userAgreement', newValue, { shouldValidate: true });
    setValue('marketingAgreement', newValue, { shouldValidate: true });
  };

  const openTermModal = (id: string, title: string, content: string) => {
    setCurrentTermId(id);
    setCurrentTermContent({ title, content });
    setTermModalOpen(true);
  };

  const handleTermModalConfirm = () => {
    if (currentTermId) {
      const fieldName = getAgreementFieldName(currentTermId);
      if (fieldName) {
        setValue(fieldName, true, { shouldValidate: true });
      }
    }
    setTermModalOpen(false);
  };

  const handleRequestVerification = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

    if (!emailValue || !emailPattern.test(emailValue)) {
      await trigger('email');
      return;
    }

    try {
      await requestEmailVerification(emailValue);
      setIsVerificationVisible(true);
      setTimeLeft(180);
      setIsTimerActive(true);
      setModalOpen(true);
      setValue('verificationCode', '');
      setIsEmailVerified(false);
      clearErrors('verificationCode');
    } catch (error) {
      setError('email', { message: '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
  };

  const handleResend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!emailValue) {
      return;
    }

    try {
      await requestEmailVerification(emailValue);
      setTimeLeft(180);
      setIsTimerActive(true);
      setModalOpen(true);
      setValue('verificationCode', '');
      setIsEmailVerified(false);
      clearErrors('verificationCode');
    } catch (error) {
      setError('email', { message: '인증 메일 재전송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const getAgreementFieldName = (id: string): keyof SignupFormInputs | undefined => {
    switch (id) {
      case 'service-terms':
        return 'serviceAgreement';
      case 'member-info-terms':
        return 'userAgreement';
      case 'marketing-terms':
        return 'marketingAgreement';
      default:
        return undefined;
    }
  };

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    try {
      await signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        serviceAgreement: data.serviceAgreement,
        userAgreement: data.userAgreement,
        marketingAgreement: data.marketingAgreement,
      });
      navigate('/faddit/sign/in');
    } catch (error) {
      setError('email', { message: '회원가입에 실패했습니다. 입력값을 확인해주세요.' });
    }
  };

  const onError = (errors: any) => {
    if (errors.serviceAgreement || errors.userAgreement || errors.marketingAgreement) {
      setIsAccordionOpen(true);
    }
  };

  return (
    <>
      <h1 className='mb-6 text-3xl font-bold text-gray-800 dark:text-gray-100'>회원가입</h1>
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <div className='space-y-4'>
          <div>
            <label className='mb-1 block text-sm font-medium' htmlFor='name'>
              이름
            </label>
            <input
              id='name'
              className={`form-input w-full ${errors.name ? 'border-red-500' : ''}`}
              type='text'
              {...register('name', { required: '이름을 입력해주세요.' })}
            />
            {errors.name && (
              <span className='mt-1 text-xs text-red-500'>{errors.name.message}</span>
            )}
          </div>

          {/* Email Input with Verification */}
          <div>
            <label className='mb-1 block text-sm font-medium' htmlFor='email'>
              이메일
            </label>
            <div className='relative'>
              <input
                id='email'
                className={`form-input w-full pr-20 ${errors.email ? 'border-red-500' : ''}`}
                type='email'
                {...register('email', {
                  required: '이메일을 입력해주세요.',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '유효한 이메일 주소를 입력해주세요.',
                  },
                  validate: () => isEmailVerified || '이메일 인증을 완료해주세요.',
                })}
              />
              <button
                type='button'
                className={`absolute top-1/2 right-4 -translate-y-1/2 transform text-sm font-medium transition-colors ${
                  emailValue && (!errors.email || errors.email.type === 'validate')
                    ? 'text-faddit cursor-pointer hover:opacity-80'
                    : 'cursor-not-allowed text-gray-400'
                }`}
                onClick={handleRequestVerification}
                disabled={!emailValue || (!!errors.email && errors.email.type !== 'validate')}
              >
                인증하기
              </button>
            </div>
            {errors.email && (
              <span className='mt-1 text-xs text-red-500'>{errors.email.message}</span>
            )}

            {/* Verification Code Section */}
            {isVerificationVisible && (
              <div className='mt-2'>
                <div className='flex items-center space-x-2'>
                  <div className='relative w-full'>
                    <input
                      id='verificationCode'
                      className={`form-input w-full ${errors.verificationCode ? 'border-red-500' : ''}`}
                      type='text'
                      placeholder='인증번호 입력'
                      {...register('verificationCode', {
                        required: '인증번호를 입력해주세요.',
                        validate: () => isEmailVerified || '인증번호가 올바르지 않습니다.',
                      })}
                    />
                    {!isEmailVerified && (
                      <span className='absolute top-1/2 right-3 -translate-y-1/2 transform text-sm text-red-500'>
                        {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                  <button
                    type='button'
                    className='btn-sm border-gray-200 whitespace-nowrap text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300 dark:hover:border-gray-600'
                    onClick={handleResend}
                  >
                    재전송
                  </button>
                </div>
                {errors.verificationCode && (
                  <span className='mt-1 text-xs text-red-500'>
                    {errors.verificationCode.message}
                  </span>
                )}
                {isEmailVerified && !errors.verificationCode && (
                  <span className='mt-1 text-xs text-green-500'>인증되었습니다.</span>
                )}
              </div>
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
          <div>
            <label className='mb-1 block text-sm font-medium' htmlFor='passwordConfirm'>
              비밀번호 확인
            </label>
            <input
              id='passwordConfirm'
              className={`form-input w-full ${errors.passwordConfirm ? 'border-red-500' : ''}`}
              type='password'
              autoComplete='on'
              {...register('passwordConfirm', {
                required: '비밀번호 확인을 입력해주세요.',
                validate: (value) => value === watch('password') || '비밀번호가 일치하지 않습니다.',
              })}
            />
            {errors.passwordConfirm && (
              <span className='mt-1 text-xs text-red-500'>{errors.passwordConfirm.message}</span>
            )}
          </div>
        </div>

        {/* Terms Agreement */}
        <div className='mt-6 translate-y-0 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-800'>
          <div
            className='flex cursor-pointer items-center justify-between'
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          >
            <label
              className='flex cursor-pointer items-center'
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type='checkbox'
                className='form-checkbox'
                checked={allAgreed}
                onChange={handleAllAgreementChange}
              />
              <div
                className='ml-2 text-sm font-medium text-gray-800 select-none dark:text-gray-100'
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              >
                전체 동의하기
              </div>
            </label>
            <button
              type='button'
              className={`ml-2 transform text-gray-400 transition-transform duration-200 hover:text-gray-500 ${
                isAccordionOpen ? 'rotate-180' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIsAccordionOpen(!isAccordionOpen);
              }}
            >
              <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                <path d='M8 12L2 6h12l-6 6z' />
              </svg>
            </button>
          </div>

          <div
            className={`mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700/60 ${
              !isAccordionOpen ? 'hidden' : ''
            }`}
          >
            {AGREEMENT_OPTIONS.map((option) => {
              const fieldName = getAgreementFieldName(option.id);
              if (!fieldName) return null;

              return (
                <div key={option.id} className='ml-1 flex flex-col'>
                  <div className='flex items-center justify-between'>
                    <label className='flex cursor-pointer items-center'>
                      <input
                        type='checkbox'
                        className={`form-checkbox ${errors[fieldName] ? 'border-red-500' : ''}`}
                        {...register(fieldName, {
                          required: option.required ? '약관에 동의해주세요.' : false,
                        })}
                      />
                      <span className='ml-2 text-sm text-gray-600 dark:text-gray-400'>
                        {option.required ? (
                          <span className='text-faddit mr-1 font-medium'>[필수]</span>
                        ) : (
                          <span className='mr-1 font-medium text-gray-400'>[선택]</span>
                        )}
                        {option.label}
                      </span>
                    </label>
                  </div>
                  {errors[fieldName] && (
                    <span className='mt-1 ml-6 text-xs text-red-500'>
                      {errors[fieldName]?.message}
                    </span>
                  )}
                  {option.links && (
                    <div className='mt-1 ml-6 flex flex-wrap gap-2'>
                      {option.links.map((link, idx) => (
                        <button
                          key={idx}
                          type='button'
                          className='cursor-pointer text-left text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openTermModal(option.id, link.text, link.contents);
                          }}
                        >
                          {link.text} &gt;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className='mt-6 flex items-center justify-between'>
          <button
            className='btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
            type='submit'
          >
            회원가입
          </button>
        </div>
      </form>
      {/* Footer */}
      <div className='mt-6 flex items-center justify-between border-t border-gray-100 pt-5 text-sm dark:border-gray-700/60'>
        <div>이미 계정이 있으신가요?</div>
        <Link
          className='text-faddit font-medium transition-opacity hover:opacity-80'
          to='/faddit/sign/in'
        >
          로그인 바로가기
        </Link>
      </div>

      {/* Term Modal */}
      <ModalFooterBasic
        id='scrollbar-modal'
        modalOpen={termModalOpen}
        setModalOpen={setTermModalOpen}
        title={currentTermContent.title}
        footer={
          <div className='border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700/60 dark:bg-gray-800'>
            <div className='flex flex-wrap justify-end space-x-2'>
              <button
                type='button'
                className='btn-sm cursor-pointer border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300 dark:hover:border-gray-600'
                onClick={(e) => {
                  e.stopPropagation();
                  setTermModalOpen(false);
                }}
              >
                취소
              </button>
              <button
                type='button'
                className='btn-sm cursor-pointer bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
                onClick={(e) => {
                  e.stopPropagation();
                  handleTermModalConfirm();
                }}
              >
                확인
              </button>
            </div>
          </div>
        }
      >
        <div className='px-5 py-4'>
          <div className='text-sm'>
            <div className='space-y-2'>
              <p className='whitespace-pre-line text-gray-600 dark:text-gray-400'>
                {currentTermContent.content}
              </p>
            </div>
          </div>
        </div>
      </ModalFooterBasic>

      {/* Email Verification Modal */}
      <ModalAction id='verification-modal' modalOpen={modalOpen} setModalOpen={setModalOpen}>
        <div className='p-4 text-center'>
          <div className='mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100'>
            이메일 인증 번호를 발송하였습니다.
          </div>
          <p className='mb-6 text-sm text-gray-600 dark:text-gray-400'>
            입력하신 메일로 수신하신 번호를 확인 후
            <br />
            인증번호를 입력하여 인증을 완료하세요.
          </p>
          <button
            className='btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
            onClick={() => setModalOpen(false)}
          >
            확인
          </button>
        </div>
      </ModalAction>
    </>
  );
};
export default Signup;
