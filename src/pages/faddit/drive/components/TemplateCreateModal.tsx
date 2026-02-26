import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getMaterialFieldDefs,
  MaterialCategory,
  MaterialFieldDef,
} from '../../../../lib/api/materialApi';

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
  hiddenTemplateKeys?: TemplateKey[];
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

const parseFormattedNumber = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatDualLengthText = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as { value_cm?: unknown; value_inch?: unknown; value?: unknown; unit?: unknown };
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
  hiddenTemplateKeys = [],
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
            next[fieldDef.field_key] = getDefaultFieldValue(fieldDef);
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
  const visibleTemplateItems = useMemo(
    () => TEMPLATE_ITEMS.filter((item) => !hiddenTemplateKeys.includes(item.key)),
    [hiddenTemplateKeys],
  );

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
                : formatNumberWithCommas(pairValue.second)
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
            isNumber
              ? parseFormattedNumber(event.target.value) ?? ''
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

    if (selectedTemplate && hiddenTemplateKeys.includes(selectedTemplate)) {
      setSelectedTemplate(null);
      setMobileStep('select');
    }
  }, [hiddenTemplateKeys, modalOpen, selectedTemplate]);

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
                        {visibleTemplateItems.map((template) => {
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
