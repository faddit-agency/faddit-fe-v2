import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Upload, X } from 'lucide-react';

import {
  getMaterialFieldDefs,
  type MaterialCategory,
  type MaterialFieldDef,
} from '../../../lib/api/materialApi';
import {
  WORKSHEET_UPLOAD_CATEGORIES,
  type WorksheetUploadCategory,
} from './worksheetElementUploadUtils';

type DimensionValue = {
  width?: number;
  height?: number;
  unit: 'cm' | 'inch';
};

type OptionWithOtherValue = {
  selected: string;
  customText: string;
};

type NumberWithOptionValue = {
  value?: number;
  unit: string;
};

type NumberPairValue = {
  first?: number;
  second?: number | string;
};

const TOP_LEVEL_FIELD_MAP: Record<
  string,
  'codeInternal' | 'vendorName' | 'itemName' | 'originCountry'
> = {
  code_internal: 'codeInternal',
  vendor_name: 'vendorName',
  item_name: 'itemName',
  origin_country: 'originCountry',
};

const WORKSHEET_UPLOAD_TO_MATERIAL_CATEGORY: Partial<
  Record<WorksheetUploadCategory, MaterialCategory>
> = {
  원단: 'fabric',
  시보리원단: 'rib_fabric',
  라벨: 'label',
  부자재: 'trim',
};

const appendEtcOption = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.input_type === 'option_with_other') {
    if (
      fieldDef.options &&
      typeof fieldDef.options === 'object' &&
      !Array.isArray(fieldDef.options)
    ) {
      const optionsRaw = (fieldDef.options as { options?: unknown }).options;
      const options = Array.isArray(optionsRaw) ? optionsRaw.map((option) => String(option)) : [];
      if (options.includes('기타')) {
        return fieldDef;
      }
      return {
        ...fieldDef,
        options: {
          ...(fieldDef.options as Record<string, unknown>),
          options: [...options, '기타'],
        },
      };
    }
    return fieldDef;
  }

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

const getSelectOptions = (fieldDef: MaterialFieldDef) => {
  if (Array.isArray(fieldDef.options)) {
    return fieldDef.options.map((option) => String(option));
  }
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const optionsRaw = (fieldDef.options as { options?: unknown }).options;
    if (Array.isArray(optionsRaw)) {
      return optionsRaw.map((option) => String(option));
    }
  }
  return [];
};

const getUnitOptions = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const unitsRaw = (fieldDef.options as { units?: unknown }).units;
    if (Array.isArray(unitsRaw)) {
      return unitsRaw.map((unit) => String(unit));
    }
  }
  return [];
};

const getNumberPairLabels = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const options = fieldDef.options as { first_label?: unknown; second_label?: unknown };
    return {
      firstLabel: typeof options.first_label === 'string' ? options.first_label : '값 1',
      secondLabel: typeof options.second_label === 'string' ? options.second_label : '값 2',
    };
  }
  return { firstLabel: '값 1', secondLabel: '값 2' };
};

const getNumberPairKind = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const pairKind = (fieldDef.options as { pair_kind?: unknown }).pair_kind;
    return pairKind === 'price_quantity' ? 'price_quantity' : 'width_height';
  }
  return 'width_height';
};

const getDefaultFieldValue = (fieldDef: MaterialFieldDef): unknown => {
  if (fieldDef.input_type === 'dimension') {
    return { unit: 'cm' } as DimensionValue;
  }
  if (fieldDef.input_type === 'option_with_other') {
    return { selected: '', customText: '' } as OptionWithOtherValue;
  }
  if (fieldDef.input_type === 'number_with_option') {
    const units = getUnitOptions(fieldDef);
    return { unit: units[0] ?? '' } as NumberWithOptionValue;
  }
  if (fieldDef.input_type === 'number_pair') {
    return {} as NumberPairValue;
  }
  return '';
};

const formatNumberWithCommas = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US');
};

const parseFormattedNumber = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatDualLengthText = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as {
    value_cm?: unknown;
    value_inch?: unknown;
    value?: unknown;
    unit?: unknown;
  };
  let cm = typeof payload.value_cm === 'number' ? payload.value_cm : undefined;
  let inch = typeof payload.value_inch === 'number' ? payload.value_inch : undefined;

  const numeric = typeof payload.value === 'number' ? payload.value : undefined;
  const unit = String(payload.unit ?? '');
  if (numeric !== undefined && unit === 'cm') {
    cm = numeric;
    inch = numeric / 2.54;
  }
  if (numeric !== undefined && unit === 'inch') {
    inch = numeric;
    cm = numeric * 2.54;
  }

  if (cm === undefined && inch === undefined) return null;

  const cmText = cm !== undefined ? `${formatNumberWithCommas(cm)} cm` : '-';
  const inchText = inch !== undefined ? `${formatNumberWithCommas(inch)} inch` : '-';
  return `${cmText} / ${inchText}`;
};

const hasMeaningfulValue = (fieldDef: MaterialFieldDef, value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return false;
  }
  if (fieldDef.input_type === 'option_with_other') {
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object' && value !== null) {
      const selected = String((value as { selected?: unknown }).selected ?? '').trim();
      const customText = String((value as { customText?: unknown }).customText ?? '').trim();
      if (!selected) return false;
      if (selected !== '기타') return true;
      return customText !== '';
    }
    return false;
  }
  if (fieldDef.input_type === 'number_with_option') {
    if (typeof value === 'object' && value !== null) {
      const numberValue = (value as { value?: unknown }).value;
      return typeof numberValue === 'number' && !Number.isNaN(numberValue);
    }
    return false;
  }
  if (fieldDef.input_type === 'number_pair') {
    if (typeof value === 'object' && value !== null) {
      const first = (value as { first?: unknown }).first;
      const second = (value as { second?: unknown }).second;
      const pairKind = getNumberPairKind(fieldDef);
      if (pairKind === 'price_quantity') {
        return typeof first === 'number' && String(second ?? '').trim() !== '';
      }
      return typeof first === 'number' && typeof second === 'number';
    }
    return false;
  }
  return true;
};

const shouldShowField = (fieldDef: MaterialFieldDef, values: Record<string, unknown>) => {
  if (!fieldDef.show_if) {
    return true;
  }

  const rawValue = values[fieldDef.show_if.field];
  const compareValue =
    typeof rawValue === 'object' && rawValue !== null
      ? String((rawValue as { selected?: unknown }).selected ?? rawValue)
      : String(rawValue ?? '');
  return fieldDef.show_if.in.includes(compareValue);
};

export type WorksheetElementUploadMaterialDetails = {
  category: MaterialCategory;
  codeInternal?: string;
  vendorName?: string;
  itemName?: string;
  originCountry?: string;
  attributes: Record<string, unknown>;
};

export type WorksheetElementUploadSubmitPayload = {
  files: File[];
  category: WorksheetUploadCategory;
  materialDetails?: WorksheetElementUploadMaterialDetails;
  title?: string;
  description?: string;
};

type WorksheetElementUploadModalProps = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (payload: WorksheetElementUploadSubmitPayload) => Promise<void> | void;
};

export default function WorksheetElementUploadModal({
  modalOpen,
  setModalOpen,
  isSubmitting,
  submitError,
  onSubmit,
}: WorksheetElementUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<WorksheetUploadCategory>('원단');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fieldDefs, setFieldDefs] = useState<MaterialFieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [loadingFieldDefs, setLoadingFieldDefs] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const materialCategory = WORKSHEET_UPLOAD_TO_MATERIAL_CATEGORY[category] ?? null;
  const isMaterialCategory = Boolean(materialCategory);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    setSelectedFile(null);
    setCategory('원단');
    setIsDragOver(false);
    setFieldDefs([]);
    setFieldValues({});
    setLoadingFieldDefs(false);
    setTitle('');
    setDescription('');
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setModalOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen, setModalOpen]);

  useEffect(() => {
    if (!modalOpen || !materialCategory) {
      setFieldDefs([]);
      setFieldValues({});
      setLoadingFieldDefs(false);
      return;
    }

    let disposed = false;
    setLoadingFieldDefs(true);

    getMaterialFieldDefs(materialCategory)
      .then((defs) => {
        if (disposed) {
          return;
        }

        const withEtc = defs.map(appendEtcOption);
        setFieldDefs(withEtc);
        setFieldValues((prev) => {
          const next: Record<string, unknown> = {};
          withEtc.forEach((fieldDef) => {
            if (prev[fieldDef.field_key] !== undefined) {
              next[fieldDef.field_key] = prev[fieldDef.field_key];
              return;
            }
            next[fieldDef.field_key] = getDefaultFieldValue(fieldDef);
          });
          return next;
        });
      })
      .finally(() => {
        if (!disposed) {
          setLoadingFieldDefs(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [materialCategory, modalOpen]);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const groupedDefs = useMemo(() => {
    const groups = fieldDefs.filter((fieldDef) => fieldDef.input_type === 'group');
    const regular = fieldDefs.filter((fieldDef) => fieldDef.input_type !== 'group');
    return { groups, regular };
  }, [fieldDefs]);

  const selectSingleFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const firstImageFile = Array.from(fileList).find((file) => file.type.startsWith('image/'));
    if (!firstImageFile) {
      return;
    }

    setSelectedFile(firstImageFile);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleFieldValueChange = (fieldKey: string, value: unknown) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
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

  const renderMaterialInput = (fieldDef: MaterialFieldDef) => {
    const value = fieldValues[fieldDef.field_key];

    if (fieldDef.input_type === 'select') {
      const options = getSelectOptions(fieldDef);

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

    if (fieldDef.input_type === 'option_with_other') {
      const options = getSelectOptions(fieldDef);
      const optionValue =
        typeof value === 'object' && value !== null
          ? (value as OptionWithOtherValue)
          : ({ selected: '', customText: '' } as OptionWithOtherValue);

      return (
        <div className='space-y-2'>
          <select
            id={`field-${fieldDef.field_key}`}
            className='form-select w-full'
            value={optionValue.selected}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...optionValue,
                selected: event.target.value,
              } as OptionWithOtherValue)
            }
          >
            <option value=''>선택</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {optionValue.selected === '기타' ? (
            <input
              type='text'
              className='form-input w-full'
              placeholder='기타 입력'
              value={optionValue.customText ?? ''}
              onChange={(event) =>
                handleFieldValueChange(fieldDef.field_key, {
                  ...optionValue,
                  customText: event.target.value,
                } as OptionWithOtherValue)
              }
            />
          ) : null}
        </div>
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
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder='가로'
            value={formatNumberWithCommas(dimension.width)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                width: parseFormattedNumber(event.target.value),
              })
            }
          />
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder='세로'
            value={formatNumberWithCommas(dimension.height)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                height: parseFormattedNumber(event.target.value),
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

    if (fieldDef.input_type === 'number_with_option') {
      const unitOptions = getUnitOptions(fieldDef);
      const numberWithUnit =
        typeof value === 'object' && value !== null
          ? (value as NumberWithOptionValue)
          : ({ unit: unitOptions[0] ?? '' } as NumberWithOptionValue);

      const dualLengthText = formatDualLengthText(numberWithUnit);

      return (
        <div className='space-y-2'>
          <div className='grid grid-cols-3 gap-2'>
            <input
              type='text'
              inputMode='decimal'
              className='form-input col-span-2 w-full'
              value={formatNumberWithCommas(numberWithUnit.value)}
              onChange={(event) =>
                handleFieldValueChange(fieldDef.field_key, {
                  ...numberWithUnit,
                  value: parseFormattedNumber(event.target.value),
                } as NumberWithOptionValue)
              }
            />
            <select
              className='form-select w-full'
              value={numberWithUnit.unit ?? ''}
              onChange={(event) =>
                handleFieldValueChange(fieldDef.field_key, {
                  ...numberWithUnit,
                  unit: event.target.value,
                } as NumberWithOptionValue)
              }
            >
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          {dualLengthText ? <div className='text-xs text-gray-500'>{dualLengthText}</div> : null}
        </div>
      );
    }

    if (fieldDef.input_type === 'number_pair') {
      const pairValue =
        typeof value === 'object' && value !== null
          ? (value as NumberPairValue)
          : ({} as NumberPairValue);
      const { firstLabel, secondLabel } = getNumberPairLabels(fieldDef);
      const pairKind = getNumberPairKind(fieldDef);

      return (
        <div className='grid grid-cols-2 gap-2'>
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder={firstLabel}
            value={formatNumberWithCommas(pairValue.first)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                first: parseFormattedNumber(event.target.value),
              } as NumberPairValue)
            }
          />
          <input
            type='text'
            inputMode={pairKind === 'price_quantity' ? undefined : 'decimal'}
            className='form-input w-full'
            placeholder={secondLabel}
            value={
              pairKind === 'price_quantity'
                ? String(pairValue.second ?? '')
                : formatNumberWithCommas(
                    typeof pairValue.second === 'number' ? pairValue.second : undefined,
                  )
            }
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                second:
                  pairKind === 'price_quantity'
                    ? event.target.value
                    : parseFormattedNumber(event.target.value),
              } as NumberPairValue)
            }
          />
        </div>
      );
    }

    const isNumber = fieldDef.input_type === 'number';

    return (
      <input
        id={`field-${fieldDef.field_key}`}
        type='text'
        inputMode={isNumber ? 'decimal' : undefined}
        className='form-input w-full'
        value={
          isNumber
            ? formatNumberWithCommas(typeof value === 'number' ? value : undefined)
            : String(value ?? '')
        }
        onChange={(event) =>
          handleFieldValueChange(
            fieldDef.field_key,
            isNumber ? (parseFormattedNumber(event.target.value) ?? '') : event.target.value,
          )
        }
      />
    );
  };

  const buildMaterialDetails = (): WorksheetElementUploadMaterialDetails | undefined => {
    if (!materialCategory) {
      return undefined;
    }

    const next: WorksheetElementUploadMaterialDetails = {
      category: materialCategory,
      attributes: {},
    };

    const fieldDefByKey = new Map(fieldDefs.map((fieldDef) => [fieldDef.field_key, fieldDef]));

    Object.entries(fieldValues).forEach(([fieldKey, value]) => {
      const fieldDef = fieldDefByKey.get(fieldKey);
      if (!fieldDef) {
        return;
      }
      if (!hasMeaningfulValue(fieldDef, value)) {
        return;
      }

      const topLevelKey = TOP_LEVEL_FIELD_MAP[fieldKey];
      if (topLevelKey) {
        next[topLevelKey] = String(value);
        return;
      }

      next.attributes[fieldKey] = value;
    });

    return next;
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || isSubmitting) {
      return;
    }

    await onSubmit({
      files: [selectedFile],
      category,
      materialDetails: buildMaterialDetails(),
      title: title.trim(),
      description: description.trim(),
    });
  };

  if (!modalOpen) {
    return null;
  }

  return createPortal(
    <div className='fixed inset-0 z-[1200] flex items-center justify-center px-4 py-4'>
      <button
        type='button'
        aria-label='요소 업로드 모달 닫기'
        className='absolute inset-0 bg-gray-900/45'
        onClick={() => setModalOpen(false)}
      />

      <div className='relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-gray-200 px-5 py-3'>
          <h2 className='text-sm font-semibold text-gray-800'>요소 업로드</h2>
          <button
            type='button'
            onClick={() => setModalOpen(false)}
            className='inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700'
            aria-label='닫기'
          >
            <X size={14} />
          </button>
        </div>

        <form
          id='worksheet-element-upload-form'
          onSubmit={handleSubmit}
          className='space-y-5 overflow-y-auto px-5 py-4'
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          <section className='space-y-3'>
            <div className='space-y-1'>
              <h3 className='text-sm font-semibold text-gray-800'>이미지 업로드</h3>
              <p className='text-xs text-gray-500'>
                이미지를 업로드하고, 아래에서 태그와 세부사항을 입력하세요.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={(event) => {
                selectSingleFile(event.target.files);
                event.currentTarget.value = '';
              }}
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                selectSingleFile(event.dataTransfer.files);
              }}
              className={`rounded-lg border border-dashed p-6 transition-colors ${
                isDragOver ? 'border-faddit bg-violet-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              {previewUrl && selectedFile ? (
                <div className='space-y-2'>
                  <div className='relative overflow-hidden rounded-md border border-gray-200 bg-gray-100'>
                    <img
                      src={previewUrl}
                      alt={selectedFile.name}
                      className='h-[320px] w-full object-contain'
                      loading='lazy'
                    />
                    <button
                      type='button'
                      onClick={clearSelectedFile}
                      className='absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white'
                      aria-label='이미지 제거'
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className='flex items-center justify-between gap-2'>
                    <p className='truncate text-xs text-gray-600'>{selectedFile.name}</p>
                    <button
                      type='button'
                      onClick={() => fileInputRef.current?.click()}
                      className='inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100'
                    >
                      <Upload size={13} />
                      이미지 변경
                    </button>
                  </div>
                </div>
              ) : (
                <div className='flex min-h-[260px] flex-col items-center justify-center gap-3 text-center'>
                  <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm'>
                    <ImagePlus size={18} />
                  </span>
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-700'>
                      드래그하거나 버튼으로 이미지 선택
                    </p>
                    <p className='text-xs text-gray-500'>JPG, PNG, WEBP 중 1장 업로드</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100'
                  >
                    <Upload size={13} />
                    파일 선택
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className='space-y-3 border-t border-gray-100 pt-4'>
            <div className='space-y-1'>
              <h3 className='text-sm font-semibold text-gray-800'>태그 및 세부사항</h3>
            </div>

            <div className='flex flex-wrap gap-1.5'>
              {WORKSHEET_UPLOAD_CATEGORIES.map((option) => {
                const isSelected = option === category;
                return (
                  <button
                    key={option}
                    type='button'
                    onClick={() => setCategory(option)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-faddit text-faddit bg-violet-50'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {isMaterialCategory ? (
              loadingFieldDefs ? (
                <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500'>
                  필드 정보를 불러오는 중입니다...
                </div>
              ) : (
                <div className='space-y-3'>
                  {groupedDefs.regular
                    .filter((fieldDef) => shouldShowField(fieldDef, fieldValues))
                    .map((fieldDef) => (
                      <div key={fieldDef.id}>
                        <label
                          htmlFor={`field-${fieldDef.field_key}`}
                          className='mb-2 block text-sm font-medium text-gray-700'
                        >
                          {fieldDef.label}
                          {fieldDef.required ? ' *' : ''}
                          {getParentLabel(fieldDef) ? (
                            <span className='ml-2 text-xs text-gray-500'>
                              ({getParentLabel(fieldDef)} 하위)
                            </span>
                          ) : null}
                        </label>
                        {renderMaterialInput(fieldDef)}
                      </div>
                    ))}
                </div>
              )
            ) : (
              <div className='space-y-3'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>제목</label>
                  <input
                    type='text'
                    className='form-input w-full'
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder='제목 입력'
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>텍스트</label>
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
          </section>

          {submitError ? <p className='text-xs text-rose-500'>{submitError}</p> : null}

          <div className='flex items-center justify-end gap-2 border-t border-gray-200 pt-4'>
            <button
              type='button'
              onClick={() => setModalOpen(false)}
              className='btn border-gray-200 text-gray-700 hover:border-gray-300'
            >
              취소
            </button>
            <button
              type='submit'
              disabled={!selectedFile || isSubmitting || (isMaterialCategory && loadingFieldDefs)}
              className='btn bg-faddit text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSubmitting ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
