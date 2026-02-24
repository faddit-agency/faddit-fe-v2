import type { MenuTab, MenuTabConfig, CardDefinition } from './worksheetV2Types';

export const MENU_TABS: MenuTabConfig[] = [
  { key: 'diagram', label: '도식화 & 패턴' },
  { key: 'basic', label: '기본 정보' },
  { key: 'size', label: '사이즈 정보' },
  { key: 'cost', label: '원가계산서' },
];

export const CARD_DEFINITIONS: Record<MenuTab, CardDefinition[]> = {
  diagram: [
    {
      id: 'diagram-view',
      title: '도식화 / 패턴',
      tab: 'diagram',
      defaultLayout: { x: 0, y: 0, w: 7, h: 8, minW: 3, minH: 4 },
    },
    {
      id: 'notice',
      title: '작업 시 주의사항',
      tab: 'diagram',
      defaultLayout: { x: 7, y: 0, w: 5, h: 8, minW: 3, minH: 3 },
    },
  ],
  basic: [
    {
      id: 'basic-info',
      title: '기본 정보',
      tab: 'basic',
      defaultLayout: { x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
    },
    {
      id: 'additional-info',
      title: '추가 정보',
      tab: 'basic',
      defaultLayout: { x: 6, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
    },
  ],
  size: [
    {
      id: 'size-spec',
      title: 'Size Spec',
      tab: 'size',
      defaultLayout: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 4 },
    },
    {
      id: 'label-sheet',
      title: '라벨',
      tab: 'size',
      defaultLayout: { x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'trim-sheet',
      title: '부자재',
      tab: 'size',
      defaultLayout: { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'color-size-qty',
      title: '색상/사이즈 별 수량',
      tab: 'size',
      defaultLayout: { x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'fabric-info',
      title: '원단 정보',
      tab: 'size',
      defaultLayout: { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    },
  ],
  cost: [
    {
      id: 'cost-calc',
      title: '원가계산서',
      tab: 'cost',
      defaultLayout: { x: 0, y: 0, w: 12, h: 8, minW: 4, minH: 4 },
    },
  ],
};

export const SIZE_UNIT_OPTIONS = [
  { id: 1, period: 'cm/단면' },
  { id: 2, period: 'inch/단면' },
];

export const LABEL_SHEET_STATE = {
  headers: ['품명', '컬러', '규격', '수량'],
  rows: [
    ['브랜드 라벨', 'Black', '직조 / 넥 중앙', '1EA'],
    ['사이즈 라벨', 'White', '인쇄 / 브랜드 라벨 하단', '1EA'],
    ['케어 라벨', 'White', '세탁 기호 / 좌측 옆선', '1EA'],
  ],
};

export const TRIM_SHEET_STATE = {
  headers: ['품명', '컬러', '규격', '수량'],
  rows: [
    ['지퍼', 'Black', 'YKK #3', '1EA'],
    ['단추', 'Navy', '18L', '6EA'],
    ['심지', 'White', 'Non-woven', '0.4M'],
  ],
};

export const COLOR_SIZE_QTY_STATE = {
  headers: ['컬러', 'XS', 'S', 'M', 'L', 'XL'],
  rows: [
    ['Black', '12', '18', '24', '18', '10'],
    ['White', '8', '14', '20', '16', '9'],
    ['Navy', '10', '16', '22', '17', '11'],
  ],
};

export const GRID_CONFIG = {
  cols: 12,
  rowHeight: 60,
  margin: [8, 8] as [number, number],
};
