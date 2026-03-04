import { FormEvent, useEffect, useMemo, useState } from 'react';
import ModalFooterBasic from '../../../../components/ModalFooterBasic';
import {
  getMaterialFieldDefs,
  MaterialCategory,
  MaterialFieldDef,
} from '../../../../lib/api/materialApi';

type DimensionValue = {
  width?: number | string;
  height?: number | string;
  unit: 'cm' | 'inch';
};

type OptionWithOtherValue = {
  selected: string;
  customText: string;
};

type NumberWithOptionValue = {
  value?: number | string;
  unit: string;
};

type NumberPairValue = {
  first?: number | string;
  second?: number | string;
};

type CreateMaterialFormValue = {
  category: MaterialCategory;
  codeInternal?: string;
  vendorName?: string;
  itemName?: string;
  originCountry?: string;
  attributes: Record<string, unknown>;
  file: File;
};

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (value: CreateMaterialFormValue) => Promise<void> | void;
};

const CATEGORY_OPTIONS: Array<{ value: MaterialCategory; label: string }> = [
  { value: 'label', label: '라벨' },
  { value: 'rib_fabric', label: '시보리원단' },
  { value: 'fabric', label: '원단' },
  { value: 'trim', label: '부자재' },
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

const appendEtcOption = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.input_type === 'option_with_other') {
    if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
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
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const optionsRaw = (fieldDef.options as { options?: unknown }).options;
    if (Array.isArray(optionsRaw)) {
      return optionsRaw.map((option) => String(option));
    }
  }
  return [];
};

const getUnitOptions = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const unitsRaw = (fieldDef.options as { units?: unknown }).units;
    if (Array.isArray(unitsRaw)) {
      return unitsRaw.map((unit) => String(unit));
    }
  }
  return [];
};

const getNumberPairLabels = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const options = fieldDef.options as { first_label?: unknown; second_label?: unknown };
    return {
      firstLabel: typeof options.first_label === 'string' ? options.first_label : '값 1',
      secondLabel: typeof options.second_label === 'string' ? options.second_label : '값 2',
    };
  }
  return { firstLabel: '값 1', secondLabel: '값 2' };
};

const getNumberPairKind = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
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

const toNumberOrUndefined = (value: unknown) => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const getNumericInputValue = (value: unknown) => {
  if (typeof value === 'number') {
    return formatNumberWithCommas(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

const formatUnitForDisplay = (unit: string) =>
  unit.replace(/\^(\d+)/g, (_, exponent: string) => {
    const superscriptDigits: Record<string, string> = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
    };

    return exponent
      .split('')
      .map((digit) => superscriptDigits[digit] ?? digit)
      .join('');
  });

const formatDualLengthText = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as { value_cm?: unknown; value_inch?: unknown; value?: unknown; unit?: unknown };
  let cm = toNumberOrUndefined(payload.value_cm);
  let inch = toNumberOrUndefined(payload.value_inch);

  const numeric = toNumberOrUndefined(payload.value);
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
      return toNumberOrUndefined(numberValue) !== undefined;
    }
    return false;
  }

  if (fieldDef.input_type === 'number_pair') {
    if (typeof value === 'object' && value !== null) {
      const first = (value as { first?: unknown }).first;
      const second = (value as { second?: unknown }).second;
      const pairKind = getNumberPairKind(fieldDef);
      if (pairKind === 'price_quantity') {
        return toNumberOrUndefined(first) !== undefined && String(second ?? '').trim() !== '';
      }
      return toNumberOrUndefined(first) !== undefined && toNumberOrUndefined(second) !== undefined;
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

const CreateMaterialModal = ({ modalOpen, setModalOpen, isSubmitting, onSubmit }: Props) => {
  const [category, setCategory] = useState<MaterialCategory>('label');
  const [file, setFile] = useState<File | null>(null);
  const [fieldDefs, setFieldDefs] = useState<MaterialFieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [loadingFieldDefs, setLoadingFieldDefs] = useState(false);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }
    setCategory('label');
    setFile(null);
    setFieldValues({});
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

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
            next[fieldDef.field_key] = getDefaultFieldValue(fieldDef);
          });
          return next;
        });
      })
      .finally(() => {
        setLoadingFieldDefs(false);
      });
  }, [category, modalOpen]);

  const groupedDefs = useMemo(() => {
    const groups = fieldDefs.filter((fieldDef) => fieldDef.input_type === 'group');
    const regular = fieldDefs.filter((fieldDef) => fieldDef.input_type !== 'group');
    return { groups, regular };
  }, [fieldDefs]);

  const handleFieldValueChange = (fieldKey: string, value: unknown) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const renderInput = (fieldDef: MaterialFieldDef) => {
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
            value={getNumericInputValue(dimension.width)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                width: event.target.value,
              })
            }
          />
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder='세로'
            value={getNumericInputValue(dimension.height)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                height: event.target.value,
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
              value={getNumericInputValue(numberWithUnit.value)}
              onChange={(event) =>
                handleFieldValueChange(fieldDef.field_key, {
                  ...numberWithUnit,
                  value: event.target.value,
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
                  {formatUnitForDisplay(unit)}
                </option>
              ))}
            </select>
          </div>
          {dualLengthText ? (
            <div className='text-xs text-gray-500 dark:text-gray-400'>{dualLengthText}</div>
          ) : null}
        </div>
      );
    }

    if (fieldDef.input_type === 'number_pair') {
      const pairValue =
        typeof value === 'object' && value !== null ? (value as NumberPairValue) : ({} as NumberPairValue);
      const { firstLabel, secondLabel } = getNumberPairLabels(fieldDef);
      const pairKind = getNumberPairKind(fieldDef);
      return (
        <div className='grid grid-cols-2 gap-2'>
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder={firstLabel}
            value={getNumericInputValue(pairValue.first)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                first: event.target.value,
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
                : getNumericInputValue(pairValue.second)
            }
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                second:
                  pairKind === 'price_quantity'
                    ? event.target.value
                    : event.target.value,
              } as NumberPairValue)
            }
          />
        </div>
      );
    }

    const isNumber = fieldDef.input_type === 'number';
    const unitText = formatUnitForDisplay(String(fieldDef.unit ?? '').trim());
    const inputElement = (
      <input
        id={`field-${fieldDef.field_key}`}
        type='text'
        inputMode={isNumber ? 'decimal' : undefined}
        className='form-input w-full'
        value={
          isNumber
            ? getNumericInputValue(value)
            : String(value ?? '')
        }
        onChange={(event) =>
          handleFieldValueChange(
            fieldDef.field_key,
            isNumber ? event.target.value : event.target.value,
          )
        }
      />
    );

    if (!unitText) {
      return inputElement;
    }

    return (
      <div className='flex items-center gap-2'>
        <div className='min-w-0 flex-1'>{inputElement}</div>
        <span className='text-sm text-gray-500 dark:text-gray-400'>{unitText}</span>
      </div>
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      return;
    }

    const next: CreateMaterialFormValue = {
      category,
      attributes: {},
      file,
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

    await onSubmit(next);
    setModalOpen(false);
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

  return (
    <ModalFooterBasic
      id='faddit-create-material-modal'
      title='소재 추가'
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      footer={
        <div className='border-t border-gray-200 px-5 py-4 dark:border-gray-700/60'>
          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => setModalOpen(false)}
              className='btn border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300'
            >
              취소
            </button>
            <button
              type='submit'
              form='faddit-create-material-form'
              disabled={isSubmitting || loadingFieldDefs || !file}
              className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
            >
              추가
            </button>
          </div>
        </div>
      }
    >
      <form
        id='faddit-create-material-form'
        onSubmit={handleSubmit}
        className='space-y-4 px-5 py-4'
      >
        <div>
          <label
            htmlFor='faddit-material-file'
            className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'
          >
            파일 업로드 (이미지/PDF)
          </label>
          <input
            id='faddit-material-file'
            type='file'
            accept='image/*,.pdf'
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className='form-input w-full'
          />
        </div>

        <div>
          <label
            htmlFor='faddit-material-category'
            className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200'
          >
            소재 구분
          </label>
          <select
            id='faddit-material-category'
            className='form-select w-full'
            value={category}
            onChange={(event) => setCategory(event.target.value as MaterialCategory)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
                {renderInput(fieldDef)}
              </div>
            ))
        )}
      </form>
    </ModalFooterBasic>
  );
};

export type { CreateMaterialFormValue };
export default CreateMaterialModal;
