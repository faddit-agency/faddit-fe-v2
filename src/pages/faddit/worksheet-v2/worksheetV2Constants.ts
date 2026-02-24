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
      isDefault: true,
    },
    {
      id: 'notice',
      title: '작업 시 주의사항',
      tab: 'diagram',
      defaultLayout: { x: 7, y: 0, w: 5, h: 8, minW: 3, minH: 3 },
      isDefault: true,
    },
  ],
  basic: [
    {
      id: 'fabric-info',
      title: '원단',
      tab: 'basic',
      defaultLayout: { x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
      isDefault: true,
    },
    {
      id: 'rib-fabric-info',
      title: '시보리 원단',
      tab: 'basic',
      defaultLayout: { x: 6, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
      isDefault: true,
    },
    {
      id: 'label-sheet',
      title: '라벨',
      tab: 'basic',
      defaultLayout: { x: 0, y: 8, w: 6, h: 6, minW: 3, minH: 4 },
      isDefault: true,
    },
    {
      id: 'trim-sheet',
      title: '부자재',
      tab: 'basic',
      defaultLayout: { x: 6, y: 8, w: 6, h: 6, minW: 3, minH: 4 },
      isDefault: true,
    },
  ],
  size: [
    {
      id: 'size-spec',
      title: 'Size Spec',
      tab: 'size',
      defaultLayout: { x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
      isDefault: true,
    },
    {
      id: 'color-size-qty',
      title: '색상/사이즈 별 수량',
      tab: 'size',
      defaultLayout: { x: 6, y: 0, w: 6, h: 8, minW: 3, minH: 3 },
      isDefault: true,
    },
  ],
  cost: [],
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

export const FABRIC_INFO_STATE = {
  headers: ['원단명', '색상', '사이즈/단가', '혼용률', '요척', '코드'],
  rows: [
    ['코튼 트윌', 'Black', 'M / 8,500', '면 100%', '1.4yd', 'BK-01'],
    ['헤비 쭈리', 'Melange', 'L / 7,300', '면 70 폴리 30', '1.2yd', 'MG-09'],
  ],
};

export const RIB_FABRIC_INFO_STATE = {
  headers: ['원단명', '색상', '사이즈/단가', '혼용률', '요척', '코드'],
  rows: [
    ['폴리 립', 'Navy', 'L / 6,200', '폴리 95 스판 5', '0.8yd', 'NV-04'],
    ['코튼 립', 'White', 'M / 5,900', '면 98 스판 2', '0.7yd', 'WH-03'],
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
