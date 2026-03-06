import { FormEvent, useEffect, useMemo, useState } from 'react';
import DropdownButton from '../../../../components/atoms/DropdownButton';
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

type CurrencyCode = string;

type MoqFieldValue = {
  value?: number | string;
  unit?: string;
  value_m?: number | string;
  value_yd?: number | string;
};

type ProcessingFeeFieldValue = {
  amount?: number | string;
  currency?: CurrencyCode | string;
};

type CurrencyOption = {
  code: CurrencyCode;
  flag: string;
  label: string;
  symbol: string;
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

export type TemplateKey =
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

export type CreateCustomTemplateFormValue = {
  template: TemplateKey;
  title: string;
  description: string;
  file?: File;
};

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
  onCreateCustomTemplate?: (value: CreateCustomTemplateFormValue) => Promise<void> | void;
  hiddenTemplateKeys?: TemplateKey[];
  fileRequiredTemplateKeys?: TemplateKey[];
  fileAccept?: string;
  submitError?: string | null;
  submitLabel?: string;
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

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'KRW';
const DEFAULT_CURRENCY_CODES: CurrencyCode[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'VND'];
const CURRENCY_META_BY_CODE: Record<string, Omit<CurrencyOption, 'code'>> = {
  KRW: { flag: '🇰🇷', label: '원화', symbol: '₩' },
  USD: { flag: '🇺🇸', label: '달러', symbol: '$' },
  EUR: { flag: '🇪🇺', label: '유로', symbol: '€' },
  JPY: { flag: '🇯🇵', label: '엔', symbol: '¥' },
  CNY: { flag: '🇨🇳', label: '위안', symbol: '¥' },
  GBP: { flag: '🇬🇧', label: '파운드', symbol: '£' },
  VND: { flag: '🇻🇳', label: '동', symbol: '₫' },
};

const MOQ_UNITS_BY_CATEGORY: Partial<Record<MaterialCategory, string[]>> = {
  fabric: ['m', 'yd'],
  rib_fabric: ['m', 'yd'],
  label: ['ea'],
  trim: ['ea'],
};

const MATERIAL_FIELD_EXCLUSION_KEYS_BY_CATEGORY: Partial<Record<MaterialCategory, Set<string>>> = {
  fabric: new Set(['color', 'pattern_total_area', 'marker_efficiency', 'yocheok', 'total_required_fabric']),
  rib_fabric: new Set(['color', 'pattern_total_area', 'marker_efficiency', 'yocheok', 'total_required_fabric']),
  label: new Set(['attach_position', 'usage_quantity', 'fabric_blend_ratio', 'manufacture_country', 'company_info']),
  trim: new Set([
    'attach_position',
    'usage_quantity_per_garment',
    'usage_length',
    'color',
    'cost_per_garment',
    'total_trim_cost',
  ]),
};

const MATERIAL_FIELD_EXCLUSION_LABEL_KEYWORDS_BY_CATEGORY: Partial<Record<MaterialCategory, string[]>> = {
  fabric: ['컬러', '패턴총면적', '마커효율', '요척', '총필요원단량'],
  rib_fabric: ['컬러', '패턴총면적', '마커효율', '요척', '총필요원단량'],
  label: ['부착위치', '사용수량', '원단혼용률', '제조국', '기업정보'],
  trim: ['부착위치', '사용수량1벌', '사용길이', '컬러', '1벌당자동원가개별', '총부자재원가'],
};

const MATERIAL_FIELD_DISPLAY_ORDER_BY_CATEGORY: Partial<Record<MaterialCategory, string[]>> = {
  fabric: [
    'code_internal',
    'vendor_name',
    'item_name',
    'origin_country',
    'material_position',
    'weave',
    'pattern',
    'width',
    'weight',
    'blend_ratio',
    'stretch',
    'shrinkage_pct',
    'processing',
    'moq',
    'price_per_unit',
    'processing_fee',
  ],
  rib_fabric: [
    'code_internal',
    'vendor_name',
    'item_name',
    'origin_country',
    'rib_type',
    'width_type',
    'weave',
    'pattern',
    'rib_spec',
    'rib_direction',
    'grain_direction',
    'weight',
    'blend_ratio',
    'moq',
    'price_per_unit',
    'processing_fee',
  ],
  label: [
    'code_internal',
    'vendor_name',
    'item_name',
    'origin_country',
    'type',
    'material',
    'size_spec',
    'thickness_mm',
    'finishing',
    'print_method',
    'color',
    'moq',
    'price_per_unit',
    'processing_fee',
  ],
  trim: [
    'code_internal',
    'vendor_name',
    'item_name',
    'origin_country',
    'type',
    'material',
    'size_spec',
    'gauge_no',
    'thickness_mm',
    'finishing',
    'post_processing',
    'moq',
    'price_per_unit',
  ],
};

const normalizeFieldText = (value: string) => value.replace(/\s+/g, '').replace(/[()]/g, '').toLowerCase();

const shouldExcludeMaterialField = (materialCategory: MaterialCategory, fieldDef: MaterialFieldDef) => {
  const exclusionKeys = MATERIAL_FIELD_EXCLUSION_KEYS_BY_CATEGORY[materialCategory];
  if (exclusionKeys?.has(fieldDef.field_key)) {
    return true;
  }

  const labelKeywords = MATERIAL_FIELD_EXCLUSION_LABEL_KEYWORDS_BY_CATEGORY[materialCategory] ?? [];
  if (labelKeywords.length === 0) {
    return false;
  }

  const normalizedLabel = normalizeFieldText(fieldDef.label);
  return labelKeywords.some((keyword) => normalizedLabel.includes(normalizeFieldText(keyword)));
};

const filterMaterialFieldDefs = (fieldDefs: MaterialFieldDef[], materialCategory: MaterialCategory) =>
  fieldDefs.filter((fieldDef) => {
    if (fieldDef.input_type === 'group') {
      return true;
    }

    return !shouldExcludeMaterialField(materialCategory, fieldDef);
  });

const dedupeStringList = (items: unknown[]) => {
  const seen = new Set<string>();
  return items
    .map((item) => String(item).trim())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
};

const toDropdownOptions = (values: string[], placeholder?: string) => {
  const options = values.map((value, index) => ({
    id: `${value}-${index}`,
    value,
    label: value,
  }));

  if (placeholder === undefined) {
    return options;
  }

  return [
    {
      id: '__placeholder__',
      value: '',
      label: placeholder,
    },
    ...options,
  ];
};

const sortMaterialFieldDefsForCreateModal = (
  fieldDefs: MaterialFieldDef[],
  materialCategory: MaterialCategory,
) => {
  const displayOrder = MATERIAL_FIELD_DISPLAY_ORDER_BY_CATEGORY[materialCategory];
  if (!displayOrder || displayOrder.length === 0) {
    return [...fieldDefs];
  }

  const orderByFieldKey = new Map(displayOrder.map((fieldKey, index) => [fieldKey, index]));
  return [...fieldDefs].sort((left, right) => {
    const leftOrder = orderByFieldKey.get(left.field_key);
    const rightOrder = orderByFieldKey.get(right.field_key);

    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (leftOrder !== undefined) {
      return -1;
    }
    if (rightOrder !== undefined) {
      return 1;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.id - right.id;
  });
};

const appendEtcOption = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.input_type === 'option_with_other') {
    if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
      const optionsRaw = (fieldDef.options as { options?: unknown }).options;
      const options = Array.isArray(optionsRaw) ? dedupeStringList(optionsRaw) : [];
      if (options.includes('기타')) {
        return {
          ...fieldDef,
          options: {
            ...(fieldDef.options as Record<string, unknown>),
            options,
          },
        };
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

  const normalized = dedupeStringList(fieldDef.options);
  if (normalized.includes('기타')) {
    return { ...fieldDef, options: normalized };
  }

  return { ...fieldDef, options: [...normalized, '기타'] };
};

const getSelectOptions = (fieldDef: MaterialFieldDef) => {
  if (Array.isArray(fieldDef.options)) {
    return dedupeStringList(fieldDef.options);
  }
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const optionsRaw = (fieldDef.options as { options?: unknown }).options;
    if (Array.isArray(optionsRaw)) {
      return dedupeStringList(optionsRaw);
    }
  }
  return [];
};

const getUnitOptions = (fieldDef: MaterialFieldDef) => {
  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const unitsRaw = (fieldDef.options as { units?: unknown }).units;
    if (Array.isArray(unitsRaw)) {
      const deduped = dedupeStringList(unitsRaw);
      const meterUnit = deduped.find((unit) => unit.trim().toLowerCase() === 'm');
      const yardUnit = deduped.find((unit) => unit.trim().toLowerCase() === 'yd');
      if (meterUnit && yardUnit) {
        return [
          meterUnit,
          yardUnit,
          ...deduped.filter((unit) => unit !== meterUnit && unit !== yardUnit),
        ];
      }
      return deduped;
    }
  }
  return [];
};

const formatPriceUnitOptionLabel = (unit: string) => {
  const normalized = formatUnitForDisplay(unit);
  return normalized ? `/${normalized}` : '/';
};

const normalizeCurrencyCodeToken = (value: unknown) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) {
    return '';
  }
  if (raw === '$') {
    return 'USD';
  }
  if (raw === '₩') {
    return 'KRW';
  }
  return raw;
};

const dedupeCurrencyCodes = (values: unknown[]) => {
  const seen = new Set<string>();
  return values
    .map((value) => normalizeCurrencyCodeToken(value))
    .filter((code) => {
      if (!code || seen.has(code)) {
        return false;
      }
      seen.add(code);
      return true;
    });
};

const getCurrencyCodes = (fieldDef?: MaterialFieldDef) => {
  if (!fieldDef || !fieldDef.options || typeof fieldDef.options !== 'object' || Array.isArray(fieldDef.options)) {
    return DEFAULT_CURRENCY_CODES;
  }

  const currenciesRaw = (fieldDef.options as { currencies?: unknown }).currencies;
  if (!Array.isArray(currenciesRaw)) {
    return DEFAULT_CURRENCY_CODES;
  }

  const deduped = dedupeCurrencyCodes(currenciesRaw);
  return deduped.length > 0 ? deduped : DEFAULT_CURRENCY_CODES;
};

const getDefaultCurrencyCode = (fieldDef?: MaterialFieldDef) => {
  const currencyCodes = getCurrencyCodes(fieldDef);
  const fallback = currencyCodes[0] ?? DEFAULT_CURRENCY_CODE;

  if (!fieldDef || !fieldDef.options || typeof fieldDef.options !== 'object' || Array.isArray(fieldDef.options)) {
    return fallback;
  }

  const defaultRaw = (fieldDef.options as { default_currency?: unknown }).default_currency;
  const normalized = normalizeCurrencyCodeToken(defaultRaw);
  if (normalized && currencyCodes.includes(normalized)) {
    return normalized;
  }
  return fallback;
};

const toCurrencyOption = (code: CurrencyCode): CurrencyOption => {
  const meta = CURRENCY_META_BY_CODE[code];
  if (meta) {
    return { code, ...meta };
  }
  return {
    code,
    flag: '🌐',
    label: code,
    symbol: code,
  };
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

const getPriceQuantityUnitOptions = (
  fieldDef: MaterialFieldDef,
  materialCategory: MaterialCategory | null,
  currentValue?: unknown,
) => {
  let options: string[] = [];

  if (fieldDef.options && typeof fieldDef.options === 'object' && !Array.isArray(fieldDef.options)) {
    const unitsRaw = (fieldDef.options as { units?: unknown }).units;
    if (Array.isArray(unitsRaw)) {
      options = dedupeStringList(unitsRaw);
      const meterUnit = options.find((unit) => unit.trim().toLowerCase() === 'm');
      const yardUnit = options.find((unit) => unit.trim().toLowerCase() === 'yd');
      if (meterUnit && yardUnit) {
        options = [
          meterUnit,
          yardUnit,
          ...options.filter((unit) => unit !== meterUnit && unit !== yardUnit),
        ];
      }
    }
  }

  if (options.length === 0) {
    if (materialCategory === 'label' || materialCategory === 'trim') {
      options = ['ea'];
    } else {
      options = ['ea'];
    }
  }

  const currentText = String(currentValue ?? '').trim();
  if (currentText && !options.includes(currentText)) {
    options = [currentText, ...options];
  }

  return options.length > 0 ? options : ['ea'];
};

const normalizePriceQuantityUnit = (value: unknown, unitOptions: string[]) => {
  const normalized = String(value ?? '').trim();
  if (normalized && unitOptions.includes(normalized)) {
    return normalized;
  }
  return unitOptions[0] ?? 'ea';
};

const getDefaultFieldValue = (
  fieldDef: MaterialFieldDef,
  materialCategory?: MaterialCategory,
): unknown => {
  if (fieldDef.field_key === 'moq') {
    const unitOptions = getMoqUnitOptions(materialCategory ?? null);
    return {
      value: undefined,
      unit: unitOptions[0] ?? 'ea',
    } as MoqFieldValue;
  }

  if (fieldDef.field_key === 'processing_fee') {
    return {
      amount: undefined,
      currency: getDefaultCurrencyCode(fieldDef),
    } as ProcessingFeeFieldValue;
  }

  if (fieldDef.input_type === 'dimension') {
    return { unit: 'cm' } as DimensionValue;
  }
  if (fieldDef.input_type === 'option_with_other') {
    return { selected: '', customText: '' } as OptionWithOtherValue;
  }
  if (fieldDef.input_type === 'number_with_option') {
    const units = getUnitOptions(fieldDef);
    if (fieldDef.field_key === 'price_per_unit') {
      return {
        unit: units[0] ?? '',
        currency: getDefaultCurrencyCode(fieldDef),
      } as NumberWithOptionValue & { currency?: CurrencyCode };
    }
    return { unit: units[0] ?? '' } as NumberWithOptionValue;
  }
  if (fieldDef.input_type === 'number_pair') {
    if (fieldDef.field_key === 'price_per_unit') {
      const unitOptions = getPriceQuantityUnitOptions(fieldDef, materialCategory ?? null);
      return {
        currency: getDefaultCurrencyCode(fieldDef),
        second: unitOptions[0] ?? 'ea',
      } as NumberPairValue & { currency?: CurrencyCode };
    }
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

const sanitizeNumericInput = (raw: string) => {
  const withoutCommas = raw.replace(/,/g, '');
  const kept = withoutCommas.replace(/[^\d.]/g, '');
  const [whole, ...decimalParts] = kept.split('.');

  if (decimalParts.length === 0) {
    return whole;
  }

  return `${whole}.${decimalParts.join('')}`;
};

const parseNumericOnlyNumber = (raw: string) => toNumberOrUndefined(sanitizeNumericInput(raw));

const normalizeCurrencyCode = (
  value: unknown,
  allowedCodes: CurrencyCode[],
  fallbackCode: CurrencyCode,
): CurrencyCode => {
  const normalized = normalizeCurrencyCodeToken(value);
  if (!normalized) {
    return fallbackCode;
  }
  if (allowedCodes.includes(normalized)) {
    return normalized;
  }
  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }
  return fallbackCode;
};

const getCurrencyOptionLabel = (option: CurrencyOption) => `${option.flag} ${option.label} (${option.symbol})`;

const YARD_TO_METER = 0.9144;

const roundTo = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const convertLengthAmountValue = (
  rawValue: unknown,
  fromUnit: string,
  toUnit: string,
): number | undefined => {
  const value = toNumberOrUndefined(rawValue);
  if (value === undefined) {
    return undefined;
  }

  const from = fromUnit.trim().toLowerCase();
  const to = toUnit.trim().toLowerCase();
  if (!from || !to || from === to) {
    return value;
  }
  if (from === 'yd' && to === 'm') {
    return roundTo(value * YARD_TO_METER);
  }
  if (from === 'm' && to === 'yd') {
    return roundTo(value / YARD_TO_METER);
  }

  return value;
};

const getMoqUnitOptions = (materialCategory: MaterialCategory | null) => {
  if (!materialCategory) {
    return ['ea'];
  }

  return MOQ_UNITS_BY_CATEGORY[materialCategory] ?? ['ea'];
};

const getMoqLengthUnits = (materialCategory: MaterialCategory | null) => {
  const unitOptions = getMoqUnitOptions(materialCategory);
  const meterUnit = unitOptions.find((unit) => unit.trim().toLowerCase() === 'm');
  const yardUnit = unitOptions.find((unit) => unit.trim().toLowerCase() === 'yd');
  return { meterUnit, yardUnit };
};

const normalizeMoqFieldValue = (
  value: unknown,
  materialCategory: MaterialCategory | null,
): { value?: number; unit: string; value_m?: number; value_yd?: number } => {
  const unitOptions = getMoqUnitOptions(materialCategory);
  const defaultUnit = unitOptions[0] ?? 'ea';
  const { meterUnit, yardUnit } = getMoqLengthUnits(materialCategory);
  const supportsDualLength = Boolean(meterUnit && yardUnit);

  const normalizePayload = (payload: {
    value?: unknown;
    unit?: unknown;
    value_m?: unknown;
    value_yd?: unknown;
  }) => {
    const normalizedUnitRaw = String(payload.unit ?? defaultUnit).trim();
    const unit = unitOptions.includes(normalizedUnitRaw) ? normalizedUnitRaw : defaultUnit;
    const numericValue = toNumberOrUndefined(payload.value);

    if (!supportsDualLength || !meterUnit || !yardUnit) {
      return {
        value: numericValue,
        unit,
      };
    }

    let valueMeter = toNumberOrUndefined(payload.value_m);
    let valueYard = toNumberOrUndefined(payload.value_yd);
    if (numericValue !== undefined) {
      if (unit === meterUnit) {
        valueMeter = numericValue;
        valueYard = convertLengthAmountValue(numericValue, meterUnit, yardUnit);
      } else if (unit === yardUnit) {
        valueYard = numericValue;
        valueMeter = convertLengthAmountValue(numericValue, yardUnit, meterUnit);
      }
    }

    if (valueMeter !== undefined && valueYard === undefined) {
      valueYard = convertLengthAmountValue(valueMeter, meterUnit, yardUnit);
    }
    if (valueYard !== undefined && valueMeter === undefined) {
      valueMeter = convertLengthAmountValue(valueYard, yardUnit, meterUnit);
    }

    return {
      value: numericValue,
      unit,
      value_m: valueMeter,
      value_yd: valueYard,
    };
  };

  if (typeof value === 'object' && value !== null) {
    return normalizePayload(value as { value?: unknown; unit?: unknown; value_m?: unknown; value_yd?: unknown });
  }

  const rawText = String(value ?? '').trim();
  if (!rawText) {
    return normalizePayload({
      value: undefined,
      unit: defaultUnit,
    });
  }

  const detectedUnit =
    unitOptions.find((unit) => rawText.toLowerCase().includes(unit.toLowerCase())) ?? defaultUnit;

  return normalizePayload({
    value: parseNumericOnlyNumber(rawText),
    unit: detectedUnit,
  });
};

const formatMoqDualLengthText = (
  value: unknown,
  materialCategory: MaterialCategory | null,
) => {
  const { meterUnit, yardUnit } = getMoqLengthUnits(materialCategory);
  if (!meterUnit || !yardUnit) {
    return null;
  }

  const normalized = normalizeMoqFieldValue(value, materialCategory);
  const meterValue = toNumberOrUndefined(normalized.value_m);
  const yardValue = toNumberOrUndefined(normalized.value_yd);
  if (meterValue === undefined && yardValue === undefined) {
    return null;
  }

  const meterText = meterValue !== undefined ? `${formatNumberWithCommas(meterValue)} ${meterUnit}` : '-';
  const yardText = yardValue !== undefined ? `${formatNumberWithCommas(yardValue)} ${yardUnit}` : '-';
  const normalizedUnit = String(normalized.unit ?? '').trim().toLowerCase();
  if (normalizedUnit === yardUnit.trim().toLowerCase()) {
    return `${yardText} / ${meterText}`;
  }
  return `${meterText} / ${yardText}`;
};

const formatMoqForSubmit = (value: unknown, materialCategory: MaterialCategory | null) => {
  const normalized = normalizeMoqFieldValue(value, materialCategory);
  if (normalized.value === undefined) {
    return '';
  }

  return `${normalized.value} ${normalized.unit}`.trim();
};

const normalizeProcessingFeeFieldValue = (
  value: unknown,
  fieldDef?: MaterialFieldDef,
): { amount?: number; currency: CurrencyCode } => {
  const currencyCodes = getCurrencyCodes(fieldDef);
  const fallbackCurrency = getDefaultCurrencyCode(fieldDef);

  if (typeof value === 'object' && value !== null) {
    const payload = value as { amount?: unknown; value?: unknown; currency?: unknown; unit?: unknown };
    return {
      amount: toNumberOrUndefined(payload.amount ?? payload.value),
      currency: normalizeCurrencyCode(payload.currency ?? payload.unit, currencyCodes, fallbackCurrency),
    };
  }

  const rawText = String(value ?? '').trim();
  if (!rawText) {
    return { amount: undefined, currency: fallbackCurrency };
  }

  const currency = normalizeCurrencyCode(rawText.match(/([A-Za-z]{3})/)?.[1], currencyCodes, fallbackCurrency);
  return {
    amount: parseNumericOnlyNumber(rawText),
    currency,
  };
};

const formatProcessingFeeForSubmit = (value: unknown, fieldDef?: MaterialFieldDef) => {
  const normalized = normalizeProcessingFeeFieldValue(value, fieldDef);
  if (normalized.amount === undefined) {
    return '';
  }

  return `${normalized.currency} ${normalized.amount}`;
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

const normalizeUnitToken = (value: string) =>
  value
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (digit) => {
      const digitBySuperscript: Record<string, string> = {
        '⁰': '0',
        '¹': '1',
        '²': '2',
        '³': '3',
        '⁴': '4',
        '⁵': '5',
        '⁶': '6',
        '⁷': '7',
        '⁸': '8',
        '⁹': '9',
      };
      return digitBySuperscript[digit] ?? digit;
    })
    .replace(/\^(\d+)/g, '$1')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .toLowerCase();

const shouldShowUnitSuffix = (fieldDef: MaterialFieldDef, unit: string) => {
  const normalizedUnit = normalizeUnitToken(unit);
  if (!normalizedUnit) {
    return false;
  }

  const normalizedLabel = normalizeUnitToken(fieldDef.label);
  return !normalizedLabel.includes(normalizedUnit);
};

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
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === 'inch') {
    return `${inchText} / ${cmText}`;
  }
  return `${cmText} / ${inchText}`;
};

const hasMeaningfulValue = (fieldDef: MaterialFieldDef, value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return false;
  }

  if (fieldDef.field_key === 'moq') {
    const normalized = normalizeMoqFieldValue(value, null);
    return normalized.value !== undefined;
  }

  if (fieldDef.field_key === 'processing_fee') {
    const normalized = normalizeProcessingFeeFieldValue(value, fieldDef);
    return normalized.amount !== undefined;
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
  if (fieldDef.input_type === 'number') {
    if (typeof value === 'number') {
      return !Number.isNaN(value);
    }
    return parseNumericOnlyNumber(String(value ?? '')) !== undefined;
  }
  if (fieldDef.input_type === 'number_pair') {
    if (typeof value === 'object' && value !== null) {
      const first = (value as { first?: unknown }).first;
      const second = (value as { second?: unknown }).second;
      const pairKind = getNumberPairKind(fieldDef);
      const firstNumber = toNumberOrUndefined(first);
      const secondNumber = toNumberOrUndefined(second);

      if (pairKind === 'price_quantity') {
        return firstNumber !== undefined && String(second ?? '').trim() !== '';
      }

      return firstNumber !== undefined && secondNumber !== undefined;
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

const getFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex < 0) {
    return '';
  }
  return fileName.slice(lastDotIndex).toLowerCase();
};

const matchesAcceptRule = (file: File, rule: string) => {
  const normalizedRule = rule.trim().toLowerCase();
  if (!normalizedRule) {
    return false;
  }

  const fileType = (file.type || '').toLowerCase();
  const fileExtension = getFileExtension(file.name);

  if (normalizedRule.startsWith('.')) {
    return fileExtension === normalizedRule;
  }

  if (normalizedRule.endsWith('/*')) {
    const mimePrefix = normalizedRule.slice(0, -1);
    return fileType.startsWith(mimePrefix);
  }

  return fileType === normalizedRule;
};

const isFileAcceptedByPattern = (file: File, accept: string) => {
  const rules = accept
    .split(',')
    .map((rule) => rule.trim())
    .filter(Boolean);

  if (rules.length === 0) {
    return true;
  }

  return rules.some((rule) => matchesAcceptRule(file, rule));
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
  onCreateCustomTemplate,
  hiddenTemplateKeys = [],
  fileRequiredTemplateKeys = [],
  fileAccept = 'image/*,.pdf',
  submitError = null,
  submitLabel = '생성',
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
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
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
    setFileValidationError(null);
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
        const filteredDefs = filterMaterialFieldDefs(withEtc, category);
        const sortedDefs = sortMaterialFieldDefsForCreateModal(filteredDefs, category);
        setFieldDefs(sortedDefs);
        setFieldValues((prev) => {
          const next: Record<string, unknown> = {};
          sortedDefs.forEach((fieldDef) => {
            if (prev[fieldDef.field_key] !== undefined) {
              next[fieldDef.field_key] = prev[fieldDef.field_key];
              return;
            }
            next[fieldDef.field_key] = getDefaultFieldValue(fieldDef, category);
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
  const selectedMaterialCategory =
    selectedTemplate && isMaterialTemplate(selectedTemplate)
      ? TEMPLATE_TO_MATERIAL_CATEGORY[selectedTemplate]
      : null;
  const isFolder = selectedTemplate === 'folder';
  const requiresFileForCustomTemplate =
    Boolean(selectedTemplate) &&
    !isFolder &&
    !isMaterial &&
    selectedTemplate !== 'worksheet' &&
    fileRequiredTemplateKeys.includes(selectedTemplate);
  const shouldShowFileUpload = isMaterial || requiresFileForCustomTemplate;
  const visibleTemplateItems = useMemo(
    () => TEMPLATE_ITEMS.filter((item) => !hiddenTemplateKeys.includes(item.key)),
    [hiddenTemplateKeys],
  );

  const isSubmitting = isSubmittingFolder || isSubmittingMaterial || isSubmittingWorksheet;

  const isCreateDisabled = (() => {
    if (!selectedTemplate) return true;
    if (isFolder) return !folderName.trim() || isSubmitting;
    if (isMaterial) return !file || loadingFieldDefs || isSubmitting;
    if (requiresFileForCustomTemplate) return !file || isSubmitting;
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
    if (!nextFile) {
      setFileValidationError(null);
      setFile(null);
      setDraggingFile(false);
      return;
    }

    if (!isFileAcceptedByPattern(nextFile, fileAccept)) {
      setFileValidationError('지원하지 않는 파일 형식입니다. 허용된 형식의 파일을 선택해주세요.');
      setDraggingFile(false);
      return;
    }

    setFileValidationError(null);
    setFile(nextFile);
    setDraggingFile(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) {
      return;
    }
    try {
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

          if (fieldKey === 'moq') {
            const moqText = formatMoqForSubmit(value, category);
            if (moqText) {
              next.attributes[fieldKey] = moqText;
            }
            return;
          }

          if (fieldKey === 'processing_fee') {
            const processingFeeText = formatProcessingFeeForSubmit(value, fieldDef);
            if (processingFeeText) {
              next.attributes[fieldKey] = processingFeeText;
            }
            return;
          }

          if (fieldDef.input_type === 'number') {
            const normalizedNumber =
              typeof value === 'number' ? value : parseNumericOnlyNumber(String(value ?? ''));
            if (normalizedNumber !== undefined) {
              next.attributes[fieldKey] = normalizedNumber;
            }
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

      if (onCreateCustomTemplate) {
        if (requiresFileForCustomTemplate && !file) {
          return;
        }

        await onCreateCustomTemplate({
          template: selectedTemplate,
          title: title.trim(),
          description: description.trim(),
          file: file ?? undefined,
        });
        setModalOpen(false);
        return;
      }

      setModalOpen(false);
    } catch (error) {
      console.error('Failed to submit template create modal', error);
    }
  };

  const renderMaterialInput = (fieldDef: MaterialFieldDef) => {
    const value = fieldValues[fieldDef.field_key];

    if (fieldDef.input_type === 'select') {
      const options = getSelectOptions(fieldDef);
      const dropdownOptions = toDropdownOptions(options, '선택');

      return (
        <DropdownButton
          options={dropdownOptions}
          value={String(value ?? '')}
          size='form'
          onChange={(nextValue) => handleFieldValueChange(fieldDef.field_key, nextValue)}
        />
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
          <DropdownButton
            options={toDropdownOptions(options, '선택')}
            value={optionValue.selected}
            size='form'
            onChange={(nextValue) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...optionValue,
                selected: nextValue,
              } as OptionWithOtherValue)
            }
          />
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
          <DropdownButton
            options={toDropdownOptions(['cm', 'inch'])}
            value={dimension.unit}
            size='form'
            onChange={(nextValue) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...dimension,
                unit: nextValue as 'cm' | 'inch',
              })
            }
          />
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

    if (fieldDef.field_key === 'moq') {
      const unitOptions = getMoqUnitOptions(selectedMaterialCategory);
      const moqValue = normalizeMoqFieldValue(value, selectedMaterialCategory);
      const moqDualLengthText = formatMoqDualLengthText(moqValue, selectedMaterialCategory);

      return (
        <div className='space-y-2'>
          <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
            <input
              type='text'
              inputMode='decimal'
              className='form-input w-full'
              value={getNumericInputValue(moqValue.value)}
              onChange={(event) =>
                handleFieldValueChange(
                  fieldDef.field_key,
                  normalizeMoqFieldValue(
                    {
                      ...moqValue,
                      value: parseNumericOnlyNumber(event.target.value),
                    },
                    selectedMaterialCategory,
                  ) as MoqFieldValue,
                )
              }
            />
            <DropdownButton
              options={unitOptions.map((unit, index) => ({
                id: `${unit}-${index}`,
                value: unit,
                label: formatUnitForDisplay(unit),
              }))}
              value={moqValue.unit}
              size='form'
              onChange={(nextUnit) =>
                handleFieldValueChange(
                  fieldDef.field_key,
                  normalizeMoqFieldValue(
                    {
                      ...moqValue,
                      unit: nextUnit,
                    },
                    selectedMaterialCategory,
                  ) as MoqFieldValue,
                )
              }
            />
          </div>
          {moqDualLengthText ? (
            <div className='text-xs text-gray-500 dark:text-gray-400'>{moqDualLengthText}</div>
          ) : null}
        </div>
      );
    }

    if (fieldDef.field_key === 'processing_fee') {
      const currencyCodes = getCurrencyCodes(fieldDef);
      const defaultCurrency = getDefaultCurrencyCode(fieldDef);
      const processingFee = normalizeProcessingFeeFieldValue(value, fieldDef);
      const selectedCurrency = normalizeCurrencyCode(
        processingFee.currency,
        currencyCodes,
        defaultCurrency,
      );
      const currencyOptionCodes = currencyCodes.includes(selectedCurrency)
        ? currencyCodes
        : [selectedCurrency, ...currencyCodes];
      const currencyOptions = currencyOptionCodes.map((code) => toCurrencyOption(code));

      return (
        <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            value={getNumericInputValue(processingFee.amount)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                amount: parseNumericOnlyNumber(event.target.value),
                currency: processingFee.currency,
              } as ProcessingFeeFieldValue)
            }
          />
          <DropdownButton
            options={currencyOptions.map((option) => ({
              id: option.code,
              value: option.code,
              label: getCurrencyOptionLabel(option),
            }))}
            value={selectedCurrency}
            size='form'
            onChange={(nextCurrency) =>
              handleFieldValueChange(fieldDef.field_key, {
                amount: processingFee.amount,
                currency: normalizeCurrencyCode(nextCurrency, currencyCodes, defaultCurrency),
              } as ProcessingFeeFieldValue)
            }
          />
        </div>
      );
    }

    if (fieldDef.input_type === 'number_with_option') {
      const unitOptions = getUnitOptions(fieldDef);
      const numberWithUnit =
        typeof value === 'object' && value !== null
          ? (value as NumberWithOptionValue)
          : ({ unit: unitOptions[0] ?? '' } as NumberWithOptionValue);
      const showCurrencySelector = fieldDef.field_key === 'price_per_unit';
      const currencyCodes = showCurrencySelector ? getCurrencyCodes(fieldDef) : [];
      const defaultCurrency = showCurrencySelector ? getDefaultCurrencyCode(fieldDef) : DEFAULT_CURRENCY_CODE;
      const selectedCurrency = showCurrencySelector
        ? normalizeCurrencyCode(
            (numberWithUnit as NumberWithOptionValue & { currency?: unknown }).currency,
            currencyCodes,
            defaultCurrency,
          )
        : defaultCurrency;
      const currencyOptionCodes = showCurrencySelector
        ? currencyCodes.includes(selectedCurrency)
          ? currencyCodes
          : [selectedCurrency, ...currencyCodes]
        : [];
      const currencyOptions = currencyOptionCodes.map((code) => toCurrencyOption(code));

      const amountInput = (
        <input
          type='text'
          inputMode='decimal'
          className='form-input w-full'
          value={getNumericInputValue(numberWithUnit.value)}
          onChange={(event) =>
            handleFieldValueChange(fieldDef.field_key, {
              ...numberWithUnit,
              value: parseNumericOnlyNumber(event.target.value),
              ...(showCurrencySelector ? { currency: selectedCurrency } : {}),
            } as NumberWithOptionValue & { currency?: CurrencyCode })
          }
        />
      );

      const currencyDropdown = showCurrencySelector ? (
        <DropdownButton
          options={currencyOptions.map((option) => ({
            id: option.code,
            value: option.code,
            label: getCurrencyOptionLabel(option),
          }))}
          value={selectedCurrency}
          size='form'
          onChange={(nextCurrency) =>
            handleFieldValueChange(fieldDef.field_key, {
              ...numberWithUnit,
              value:
                typeof numberWithUnit.value === 'number'
                  ? numberWithUnit.value
                  : parseNumericOnlyNumber(String(numberWithUnit.value ?? '')),
              currency: normalizeCurrencyCode(nextCurrency, currencyCodes, defaultCurrency),
            } as NumberWithOptionValue & { currency?: CurrencyCode })
          }
        />
      ) : null;

      const unitDropdown = (
        <DropdownButton
          options={unitOptions.map((unit, index) => ({
            id: `${unit}-${index}`,
            value: unit,
            label: showCurrencySelector ? formatPriceUnitOptionLabel(unit) : formatUnitForDisplay(unit),
          }))}
          value={numberWithUnit.unit ?? ''}
          size='form'
          onChange={(nextUnit) =>
            handleFieldValueChange(fieldDef.field_key, {
              ...numberWithUnit,
              value: numberWithUnit.value,
              unit: nextUnit,
              ...(showCurrencySelector ? { currency: selectedCurrency } : {}),
            } as NumberWithOptionValue & { currency?: CurrencyCode })
          }
        />
      );

      const dualLengthText = formatDualLengthText(numberWithUnit);
      return (
        <div className='space-y-2'>
          {showCurrencySelector ? (
            <div className='grid grid-cols-2 gap-2'>
              <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
                {amountInput}
                {currencyDropdown}
              </div>
              {unitDropdown}
            </div>
          ) : (
            <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
              {amountInput}
              {unitDropdown}
            </div>
          )}
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
      const firstNumericValue =
        typeof pairValue.first === 'number'
          ? pairValue.first
          : parseNumericOnlyNumber(String(pairValue.first ?? ''));
      const showCurrencySelector =
        fieldDef.field_key === 'price_per_unit' && pairKind === 'price_quantity';
      const currencyCodes = showCurrencySelector ? getCurrencyCodes(fieldDef) : [];
      const defaultCurrency = showCurrencySelector ? getDefaultCurrencyCode(fieldDef) : DEFAULT_CURRENCY_CODE;
      const pairCurrency = showCurrencySelector
        ? normalizeCurrencyCode(
            (pairValue as NumberPairValue & { currency?: unknown }).currency,
            currencyCodes,
            defaultCurrency,
          )
        : defaultCurrency;
      const currencyOptionCodes = showCurrencySelector
        ? currencyCodes.includes(pairCurrency)
          ? currencyCodes
          : [pairCurrency, ...currencyCodes]
        : [];
      const currencyOptions = currencyOptionCodes.map((code) => toCurrencyOption(code));
      const unitOptions =
        pairKind === 'price_quantity'
          ? getPriceQuantityUnitOptions(fieldDef, selectedMaterialCategory, pairValue.second)
          : [];
      const selectedPairUnit =
        pairKind === 'price_quantity'
          ? normalizePriceQuantityUnit(pairValue.second, unitOptions)
          : '';
      const secondNumericValue =
        pairKind === 'price_quantity'
          ? undefined
          : typeof pairValue.second === 'number'
            ? pairValue.second
            : parseNumericOnlyNumber(String(pairValue.second ?? ''));
      const pairUnitText =
        pairKind === 'width_height' ? String(fieldDef.unit ?? '').trim() : '';

      const secondInput =
        pairKind === 'price_quantity' ? (
          <DropdownButton
            options={unitOptions.map((unit, index) => ({
              id: `${unit}-${index}`,
              value: unit,
              label: showCurrencySelector ? formatPriceUnitOptionLabel(unit) : formatUnitForDisplay(unit),
            }))}
            value={selectedPairUnit}
            size='form'
            onChange={(nextUnit) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                second: nextUnit,
                ...(showCurrencySelector ? { currency: pairCurrency } : {}),
              } as NumberPairValue & { currency?: CurrencyCode })
            }
          />
        ) : (
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder={secondLabel}
            value={getNumericInputValue(secondNumericValue)}
            onChange={(event) =>
              handleFieldValueChange(fieldDef.field_key, {
                ...pairValue,
                second: parseNumericOnlyNumber(event.target.value),
                ...(showCurrencySelector ? { currency: pairCurrency } : {}),
              } as NumberPairValue & { currency?: CurrencyCode })
            }
          />
        );

      const firstInput = (
        <input
          type='text'
          inputMode='decimal'
          className='form-input w-full'
          placeholder={firstLabel}
          value={getNumericInputValue(firstNumericValue)}
          onChange={(event) =>
            handleFieldValueChange(fieldDef.field_key, {
              ...pairValue,
              first: parseNumericOnlyNumber(event.target.value),
              ...(showCurrencySelector ? { currency: pairCurrency } : {}),
            } as NumberPairValue & { currency?: CurrencyCode })
          }
        />
      );

      if (showCurrencySelector) {
        return (
          <div className='grid grid-cols-2 gap-2'>
            <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
              {firstInput}
              <DropdownButton
                options={currencyOptions.map((option) => ({
                  id: option.code,
                  value: option.code,
                  label: getCurrencyOptionLabel(option),
                }))}
                value={pairCurrency}
                size='form'
                onChange={(nextCurrency) =>
                  handleFieldValueChange(fieldDef.field_key, {
                    ...pairValue,
                    first: firstNumericValue,
                    second: pairKind === 'price_quantity' ? selectedPairUnit : secondNumericValue,
                    currency: normalizeCurrencyCode(nextCurrency, currencyCodes, defaultCurrency),
                  } as NumberPairValue & { currency?: CurrencyCode })
                }
              />
            </div>
            {secondInput}
          </div>
        );
      }

      return (
        <div
          className={
            pairUnitText
              ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7.25rem] gap-2'
              : 'grid grid-cols-2 gap-2'
          }
        >
          {firstInput}
          {secondInput}
          {pairUnitText ? (
            <DropdownButton
              options={[
                {
                  id: pairUnitText,
                  value: pairUnitText,
                  label: formatUnitForDisplay(pairUnitText),
                },
              ]}
              value={pairUnitText}
              size='form'
              onChange={() => undefined}
            />
          ) : null}
        </div>
      );
    }

    const isNumber = fieldDef.input_type === 'number';
    const rawUnitText = String(fieldDef.unit ?? '').trim();
    const shouldPreserveDecimalInput = fieldDef.field_key === 'thickness_mm';
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
            isNumber
              ? shouldPreserveDecimalInput
                ? sanitizeNumericInput(event.target.value)
                : parseNumericOnlyNumber(event.target.value)
              : event.target.value,
          )
        }
      />
    );

    if (!rawUnitText) {
      return inputElement;
    }

    return (
      <div className='grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2'>
        {inputElement}
        <DropdownButton
          options={[
            {
              id: rawUnitText,
              value: rawUnitText,
              label: formatUnitForDisplay(rawUnitText),
            },
          ]}
          value={rawUnitText}
          size='form'
              onChange={() => undefined}
        />
      </div>
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
        className='absolute inset-0 bg-gray-900/30 dark:bg-gray-950/75'
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setModalOpen(false);
          }
        }}
      />
      <div className='relative flex h-full w-full items-center justify-center p-0 lg:p-4'>
        <div className='template-create-modal flex h-screen w-screen flex-col bg-white shadow-lg lg:h-[70vh] lg:max-h-[70vh] lg:w-[80vw] lg:max-w-[80vw] lg:rounded-lg dark:bg-gray-900 dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)]'>
          <div className='flex-shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-700'>
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

          <div className='min-h-0 flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950/40'>
            <form
              id='faddit-template-create-form'
              onSubmit={handleSubmit}
              className='h-full px-5 py-4'
            >
              <div className='grid h-full gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]'>
                {showSelectorPane && (
                  <section className='flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-gray-600 dark:bg-gray-800/85'>
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
                  <section className='flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-gray-600 dark:bg-gray-800/85'>
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
                      ) : shouldShowFileUpload ? (
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
                                    'faddit-template-create-drop-input',
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
                                  'faddit-template-create-drop-input',
                                ) as HTMLInputElement | null;
                                input?.click();
                              }}
                              className={`cursor-pointer rounded-lg border-2 border-dashed bg-white px-4 py-5 text-center transition dark:bg-gray-900/50 ${
                                draggingFile
                                  ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/10'
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700/60 dark:hover:border-gray-600 dark:hover:bg-gray-700/40'
                              }`}
                            >
                              <input
                                id='faddit-template-create-drop-input'
                                type='file'
                                accept={fileAccept}
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
                                    또는 클릭해서 파일 선택
                                  </div>
                                </div>
                              )}
                            </div>
                            {fileValidationError ? (
                              <p className='mt-2 text-xs text-rose-500 dark:text-rose-300'>
                                {fileValidationError}
                              </p>
                            ) : null}
                          </div>

                          {isMaterial ? (
                            loadingFieldDefs ? (
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
                            )
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

          <div className='flex-shrink-0 border-t border-gray-200 px-5 py-4 dark:border-gray-700'>
            <div className='flex flex-wrap items-center justify-end gap-2'>
              {submitError ? (
                <p className='mr-auto text-xs text-rose-500 dark:text-rose-300'>{submitError}</p>
              ) : null}
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
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateCreateModal;
