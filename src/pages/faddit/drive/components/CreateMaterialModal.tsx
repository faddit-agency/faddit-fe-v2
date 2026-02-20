import { FormEvent, useEffect, useMemo, useState } from 'react';
import ModalFooterBasic from '../../../../components/ModalFooterBasic';
import { getMaterialFieldDefs, MaterialCategory, MaterialFieldDef } from '../materialApi';

type DimensionValue = {
  width?: number;
  height?: number;
  unit: 'cm' | 'inch';
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
