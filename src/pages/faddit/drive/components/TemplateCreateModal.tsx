import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getMaterialFieldDefs, MaterialCategory, MaterialFieldDef } from '../materialApi';

type DimensionValue = {
  width?: number;
  height?: number;
  unit: 'cm' | 'inch';
};

export type CreateMaterialFormValue = {
  category: MaterialCategory;
  codeInternal?: string;
  vendorName?: string;
  itemName?: string;
  originCountry?: string;
  attributes: Record<string, unknown>;
  file: File;
};

export type CreateWorksheetFormValue = {
  title: string;
  description: string;
};

type TemplateKey =
  | 'folder'
  | 'fabric'
  | 'rib_fabric'
  | 'label'
  | 'trim'
  | 'worksheet'
  | 'schematic'
  | 'pattern'
  | 'print'
  | 'etc';

type TemplateItem = {
  key: TemplateKey;
  title: string;
  description: string;
};

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isSubmittingFolder: boolean;
  isSubmittingMaterial: boolean;
  isSubmittingWorksheet: boolean;
  onCreateFolder: (folderName: string) => Promise<void> | void;
  onCreateMaterial: (value: CreateMaterialFormValue) => Promise<void> | void;
  onCreateWorksheet: (value: CreateWorksheetFormValue) => Promise<void> | void;
};

const TEMPLATE_ITEMS: TemplateItem[] = [
  { key: 'folder', title: '폴더', description: '텍스트 이름으로 폴더 생성' },
  { key: 'fabric', title: '원단', description: '원단 소재 등록' },
  { key: 'rib_fabric', title: '시보리원단', description: '시보리 원단 등록' },
  { key: 'label', title: '라벨', description: '라벨 소재 등록' },
  { key: 'trim', title: '부자재', description: '부자재 소재 등록' },
  { key: 'worksheet', title: '작업지시서', description: '제목/설명 입력' },
  { key: 'schematic', title: '도식화', description: '제목/설명 입력' },
  { key: 'pattern', title: '패턴', description: '제목/설명 입력' },
  { key: 'print', title: '인쇄', description: '제목/설명 입력' },
  { key: 'etc', title: '기타', description: '제목/설명 입력' },
];

const TOP_LEVEL_FIELD_MAP: Record<
  string,
  'codeInternal' | 'vendorName' | 'itemName' | 'originCountry'
> = {
  code_internal: 'codeInternal',
  vendor_name: 'vendorName',
  item_name: 'itemName',
  origin_country: 'originCountry',
};

const TEMPLATE_TO_MATERIAL_CATEGORY: Partial<Record<TemplateKey, MaterialCategory>> = {
  fabric: 'fabric',
  rib_fabric: 'rib_fabric',
  label: 'label',
  trim: 'trim',
};

const appendEtcOption = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.input_type !== 'select' && fieldDef.input_type !== 'multiselect') {
    return fieldDef;
  }
  if (!Array.isArray(fieldDef.options)) {
    return fieldDef;
  }

  const normalized = fieldDef.options.map((option) => String(option));
  if (normalized.includes('기타')) {
    return { ...fieldDef, options: normalized };
  }

  return { ...fieldDef, options: [...normalized, '기타'] };
};

const shouldShowField = (fieldDef: MaterialFieldDef, values: Record<string, unknown>) => {
  if (!fieldDef.show_if) {
    return true;
  }

  const compareValue = String(values[fieldDef.show_if.field] ?? '');
  return fieldDef.show_if.in.includes(compareValue);
};

const isMaterialTemplate = (key: TemplateKey | null): key is MaterialCategory => {
  if (!key) return false;
  return Boolean(TEMPLATE_TO_MATERIAL_CATEGORY[key]);
};

const TemplateIcon = ({ type }: { type: TemplateKey }) => {
  const iconClass = 'h-5 w-5 text-gray-600 dark:text-gray-300';
  switch (type) {
    case 'folder':
      return (
        <svg className={iconClass} viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.2a2 2 0 0 1 1.42.58l.75.76c.18.18.43.28.7.28h4.43a2.25 2.25 0 0 1 2.25 2.25v6.88a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
        </svg>
      );
    case 'worksheet':
      return (
        <svg
          className={iconClass}
          viewBox='0 0 20 20'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <rect x='3.5' y='3.5' width='13' height='13' rx='2' />
          <path d='M7 8h6M7 11h6M7 14h4' />
        </svg>
      );
    case 'schematic':
      return (
        <svg
          className={iconClass}
          viewBox='0 0 20 20'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <circle cx='6' cy='6' r='2' />
          <circle cx='14' cy='6' r='2' />
          <circle cx='10' cy='14' r='2' />
          <path d='M8 6h4M7.2 7.5l1.8 4M12.8 7.5l-1.8 4' />
        </svg>
      );
    case 'pattern':
      return (
        <svg
          className={iconClass}
          viewBox='0 0 20 20'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <path d='M4 4h12v12H4z' />
          <path d='M4 10h12M10 4v12' />
        </svg>
      );
    case 'print':
      return (
        <svg
          className={iconClass}
          viewBox='0 0 20 20'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <path d='M6 7V3h8v4M4.5 8.5h11a1.5 1.5 0 0 1 1.5 1.5v3h-3v4H6v-4H3v-3a1.5 1.5 0 0 1 1.5-1.5Z' />
        </svg>
      );
    case 'etc':
      return (
        <svg className={iconClass} viewBox='0 0 20 20' fill='currentColor'>
          <circle cx='5' cy='10' r='1.5' />
          <circle cx='10' cy='10' r='1.5' />
          <circle cx='15' cy='10' r='1.5' />
        </svg>
      );
    default:
      return (
        <svg
          className={iconClass}
          viewBox='0 0 20 20'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <rect x='3.5' y='3.5' width='13' height='13' rx='2' />
          <path d='M6 12l2.5-2.5L10.5 11l2.5-2.5L16 12.5' />
          <circle cx='7' cy='7' r='1.25' fill='currentColor' stroke='none' />
        </svg>
      );
  }
};

const TemplateCreateModal = ({
  modalOpen,
  setModalOpen,
  isSubmittingFolder,
  isSubmittingMaterial,
  isSubmittingWorksheet,
  onCreateFolder,
  onCreateMaterial,
  onCreateWorksheet,
}: Props) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [mobileStep, setMobileStep] = useState<'select' | 'form'>('select');
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  const [folderName, setFolderName] = useState('새 폴더');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const [fieldDefs, setFieldDefs] = useState<MaterialFieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [loadingFieldDefs, setLoadingFieldDefs] = useState(false);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }
    setSelectedTemplate(null);
    setMobileStep('select');
    setFolderName('새 폴더');
    setTitle('');
    setDescription('');
    setFile(null);
    setPreviewUrl(null);
    setFieldDefs([]);
    setFieldValues({});
  }, [modalOpen]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!modalOpen || !selectedTemplate || !isMaterialTemplate(selectedTemplate)) {
      setFieldDefs([]);
      setFieldValues({});
      return;
    }

    const category = TEMPLATE_TO_MATERIAL_CATEGORY[selectedTemplate] as MaterialCategory;
    setLoadingFieldDefs(true);
    getMaterialFieldDefs(category)
      .then((defs) => {
        const withEtc = defs.map(appendEtcOption);
        setFieldDefs(withEtc);
        setFieldValues((prev) => {
          const next: Record<string, unknown> = {};
          withEtc.forEach((fieldDef) => {
            if (prev[fieldDef.field_key] !== undefined) {
              next[fieldDef.field_key] = prev[fieldDef.field_key];
              return;
            }
            if (fieldDef.input_type === 'dimension') {
              next[fieldDef.field_key] = { unit: 'cm' } as DimensionValue;
              return;
            }
            next[fieldDef.field_key] = '';
          });
          return next;
        });
      })
      .finally(() => {
        setLoadingFieldDefs(false);
      });
  }, [selectedTemplate, modalOpen]);

  const groupedDefs = useMemo(() => {
    const groups = fieldDefs.filter((fieldDef) => fieldDef.input_type === 'group');
    const regular = fieldDefs.filter((fieldDef) => fieldDef.input_type !== 'group');
    return { groups, regular };
  }, [fieldDefs]);

  const isMaterial = selectedTemplate ? isMaterialTemplate(selectedTemplate) : false;
  const isFolder = selectedTemplate === 'folder';

  const isSubmitting = isSubmittingFolder || isSubmittingMaterial || isSubmittingWorksheet;

  const isCreateDisabled = (() => {
    if (!selectedTemplate) return true;
    if (isFolder) return !folderName.trim() || isSubmitting;
    if (isMaterial) return !file || loadingFieldDefs || isSubmitting;
    return !title.trim() || isSubmitting;
  })();

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplate(key);
    if (isCompact) {
      setMobileStep('form');
    }
  };

  const handleFieldValueChange = (fieldKey: string, value: unknown) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const onDropFile = (nextFile: File | null) => {
    setFile(nextFile);
    setDraggingFile(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) {
      return;
    }

    if (selectedTemplate === 'folder') {
      await onCreateFolder(folderName.trim());
      setModalOpen(false);
      return;
    }

    if (isMaterialTemplate(selectedTemplate)) {
      if (!file) {
        return;
      }
      const category = TEMPLATE_TO_MATERIAL_CATEGORY[selectedTemplate] as MaterialCategory;
      const next: CreateMaterialFormValue = {
        category,
        attributes: {},
        file,
      };

      Object.entries(fieldValues).forEach(([fieldKey, value]) => {
        if (value === '' || value === null || value === undefined) {
          return;
        }

        const topLevelKey = TOP_LEVEL_FIELD_MAP[fieldKey];
        if (topLevelKey) {
          next[topLevelKey] = String(value);
          return;
        }

        next.attributes[fieldKey] = value;
      });

      await onCreateMaterial(next);
      setModalOpen(false);
      return;
    }

    if (selectedTemplate === 'worksheet') {
      await onCreateWorksheet({
        title: title.trim(),
        description: description.trim(),
      });
      setModalOpen(false);
      return;
    }

    setModalOpen(false);
  };

  const renderMaterialInput = (fieldDef: MaterialFieldDef) => {
    const value = fieldValues[fieldDef.field_key];

    if (fieldDef.input_type === 'select') {
      const options = Array.isArray(fieldDef.options)
        ? fieldDef.options.map((option) => String(option))
        : [];

      return (
        <select
          id={`field-${fieldDef.field_key}`}
          className='form-select w-full'
          value={String(value ?? '')}
          onChange={(event) => handleFieldValueChange(fieldDef.field_key, event.target.value)}
        >
          <option value=''>선택</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (fieldDef.input_type === 'dimension') {
      const dimension =
        typeof value === 'object' && value !== null
          ? (value as DimensionValue)
          : ({ unit: 'cm' } as DimensionValue);

      return (
        <div className='grid grid-cols-3 gap-2'>
          <input
            type='number'
            className='form-input w-full'
            placeholder='가로'
            value={dimension.width ?? ''}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                width: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
          <input
            type='number'
            className='form-input w-full'
            placeholder='세로'
            value={dimension.height ?? ''}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                height: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
          <select
            className='form-select w-full'
            value={dimension.unit}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                unit: event.target.value as 'cm' | 'inch',
              })
            }
          >
            <option value='cm'>cm</option>
            <option value='inch'>inch</option>
          </select>
        </div>
      );
    }

    if (fieldDef.input_type === 'textarea') {
      return (
        <textarea
          id={`field-${fieldDef.field_key}`}
          className='form-textarea w-full'
          value={String(value ?? '')}
          onChange={(event) => handleFieldValueChange(fieldDef.field_key, event.target.value)}
        />
      );
    }

    const isNumber = fieldDef.input_type === 'number';
    return (
      <input
        id={`field-${fieldDef.field_key}`}
        type={isNumber ? 'number' : 'text'}
        className='form-input w-full'
        value={String(value ?? '')}
        onChange={(event) =>
          handleFieldValueChange(
            fieldDef.field_key,
            isNumber
              ? event.target.value === ''
                ? ''
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
    );
  };

  const getParentLabel = (fieldDef: MaterialFieldDef) => {
    if (!fieldDef.parent_field_key) {
      return null;
    }
    const parent = groupedDefs.groups.find(
      (group) => group.field_key === fieldDef.parent_field_key,
    );
    return parent?.label ?? null;
  };

  const showSelectorPane = !isCompact || mobileStep === 'select';
  const showFormPane = !isCompact || mobileStep === 'form';

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, setModalOpen]);

  if (!modalOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50'>
      <div
        className='absolute inset-0 bg-gray-900/30'
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setModalOpen(false);
          }
        }}
      />
      <div className='relative flex h-full w-full items-center justify-center p-0 lg:p-4'>
        <div className='flex h-screen w-screen flex-col bg-white shadow-lg lg:h-[70vh] lg:max-h-[70vh] lg:w-[80vw] lg:max-w-[80vw] lg:rounded-lg dark:bg-gray-800'>
          <div className='flex-shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-700/60'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold text-gray-800 dark:text-gray-100'>새 항목 만들기</div>
              <button
                type='button'
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
                onClick={() => setModalOpen(false)}
              >
                <span className='sr-only'>Close</span>
                <svg className='fill-current' width='16' height='16' viewBox='0 0 16 16'>
                  <path d='M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z' />
                </svg>
              </button>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-hidden'>
            <form
              id='faddit-template-create-form'
              onSubmit={handleSubmit}
              className='h-full px-5 py-4'
            >
              <div className='grid h-full gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
                {showSelectorPane && (
                  <section className='flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                    <h3 className='mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200'>
                      생성 템플릿 선택
                    </h3>
                    <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
                      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                        {TEMPLATE_ITEMS.map((template) => {
                          const isActive = selectedTemplate === template.key;
                          return (
                            <button
                              key={template.key}
                              type='button'
                              onClick={() => handleSelectTemplate(template.key)}
                              className={`flex min-h-[136px] cursor-pointer flex-col items-center justify-start gap-3 rounded-xl border px-4 py-4 text-center transition ${
                                isActive
                                  ? 'border-violet-300 bg-violet-50 dark:border-violet-500/60 dark:bg-violet-500/15'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span className='inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700'>
                                <TemplateIcon type={template.key} />
                              </span>
                              <span>
                                <span className='block text-base leading-tight font-semibold text-gray-800 dark:text-gray-100'>
                                  {template.title}
                                </span>
                                <span className='mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400'>
                                  {template.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {showFormPane && (
                  <section className='flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                    <h3 className='mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200'>
                      {selectedTemplate
                        ? `${TEMPLATE_ITEMS.find((item) => item.key === selectedTemplate)?.title || '항목'} 정보 입력`
                        : '항목 정보 입력'}
                    </h3>

                    <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
                      {!selectedTemplate ? (
                        <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                          왼쪽에서 생성할 템플릿을 선택해주세요.
                        </div>
                      ) : isFolder ? (
                        <div className='space-y-3'>
                          <div>
                            <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'>
                              폴더 이름
                            </label>
                            <input
                              type='text'
                              className='form-input w-full'
                              value={folderName}
                              onChange={(event) => setFolderName(event.target.value)}
                              placeholder='폴더 이름 입력'
                            />
                          </div>
                        </div>
                      ) : isMaterial ? (
                        <div className='space-y-4'>
                          <div>
                            <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'>
                              이미지 업로드
                            </label>
                            <div
                              role='button'
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  const input = document.getElementById(
                                    'faddit-material-drop-input',
                                  ) as HTMLInputElement | null;
                                  input?.click();
                                }
                              }}
                              onDragEnter={(event) => {
                                event.preventDefault();
                                setDraggingFile(true);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDraggingFile(true);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                const related = event.relatedTarget as Node | null;
                                if (!event.currentTarget.contains(related)) {
                                  setDraggingFile(false);
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const dropped = event.dataTransfer.files?.[0] ?? null;
                                onDropFile(dropped);
                              }}
                              onClick={() => {
                                const input = document.getElementById(
                                  'faddit-material-drop-input',
                                ) as HTMLInputElement | null;
                                input?.click();
                              }}
                              className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
                                draggingFile
                                  ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/10'
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700/60 dark:hover:border-gray-600 dark:hover:bg-gray-700/40'
                              }`}
                            >
                              <input
                                id='faddit-material-drop-input'
                                type='file'
                                accept='image/*,.pdf'
                                className='hidden'
                                onChange={(event) => onDropFile(event.target.files?.[0] ?? null)}
                              />

                              {file ? (
                                <div className='space-y-3'>
                                  {previewUrl ? (
                                    <img
                                      src={previewUrl}
                                      alt='업로드 미리보기'
                                      className='mx-auto h-32 w-32 rounded-md border border-gray-200 object-cover dark:border-gray-700/60'
                                    />
                                  ) : (
                                    <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-600 dark:border-gray-700/60 dark:text-gray-300'>
                                      파일
                                    </div>
                                  )}
                                  <div className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                                    {file.name}
                                  </div>
                                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                                    클릭 또는 드래그로 파일 변경
                                  </div>
                                </div>
                              ) : (
                                <div className='space-y-1'>
                                  <div className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                                    파일을 드래그하여 업로드
                                  </div>
                                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                                    또는 클릭해서 이미지/PDF 선택
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {loadingFieldDefs ? (
                            <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700/60 dark:text-gray-400'>
                              필드 정보를 불러오는 중입니다...
                            </div>
                          ) : (
                            groupedDefs.regular
                              .filter((fieldDef) => shouldShowField(fieldDef, fieldValues))
                              .map((fieldDef) => (
                                <div key={fieldDef.id}>
                                  <label
                                    htmlFor={`field-${fieldDef.field_key}`}
                                    className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'
                                  >
                                    {fieldDef.label}
                                    {fieldDef.required ? ' *' : ''}
                                    {getParentLabel(fieldDef) ? (
                                      <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                                        ({getParentLabel(fieldDef)} 하위)
                                      </span>
                                    ) : null}
                                  </label>
                                  {renderMaterialInput(fieldDef)}
                                </div>
                              ))
                          )}
                        </div>
                      ) : (
                        <div className='space-y-3'>
                          <div>
                            <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'>
                              제목
                            </label>
                            <input
                              type='text'
                              className='form-input w-full'
                              value={title}
                              onChange={(event) => setTitle(event.target.value)}
                              placeholder='제목 입력'
                            />
                          </div>
                          <div>
                            <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'>
                              텍스트
                            </label>
                            <textarea
                              className='form-textarea w-full'
                              rows={5}
                              value={description}
                              onChange={(event) => setDescription(event.target.value)}
                              placeholder='내용 입력'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </form>
          </div>

          <div className='flex-shrink-0 border-t border-gray-200 px-5 py-4 dark:border-gray-700/60'>
            <div className='flex items-center justify-end gap-2'>
              {isCompact && mobileStep === 'form' && (
                <button
                  type='button'
                  onClick={() => setMobileStep('select')}
                  className='btn border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
                >
                  이전
                </button>
              )}
              <button
                type='button'
                onClick={() => setModalOpen(false)}
                className='btn border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
              >
                닫기
              </button>
              <button
                type='submit'
                form='faddit-template-create-form'
                disabled={isCreateDisabled}
                className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
              >
                생성
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateCreateModal;
