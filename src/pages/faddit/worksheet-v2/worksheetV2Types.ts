import type { LayoutItem } from 'react-grid-layout';

export type MenuTab = 'diagram' | 'basic' | 'size' | 'cost';

export interface MenuTabConfig {
  key: MenuTab;
  label: string;
}

export type CardId = string;

export interface CardDefinition {
  id: CardId;
  title: string;
  tab: MenuTab;
  defaultLayout: Omit<LayoutItem, 'i'>;
  isDefault?: boolean;
}

export type CardVisibilityMap = Record<MenuTab, Record<CardId, boolean>>;
export type TabLayoutsMap = Record<MenuTab, LayoutItem[]>;

export type SizeSpecDisplayUnit = 'cm' | 'inch';

export const WORKSHEET_ELEMENT_CATEGORIES = ['원단', '시보리원단', '라벨', '부자재'] as const;

export type WorksheetElementCategory = (typeof WORKSHEET_ELEMENT_CATEGORIES)[number];

export type WorksheetElementSource = 'workspace' | 'upload';

export type WorksheetElementItem = {
  id: string;
  name: string;
  category: WorksheetElementCategory;
  thumbnailUrl: string | null;
  source?: WorksheetElementSource;
  path?: string | null;
  tag?: string | null;
};
