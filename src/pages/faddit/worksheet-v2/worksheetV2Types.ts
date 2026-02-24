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
}

export type CardVisibilityMap = Record<MenuTab, Record<CardId, boolean>>;
export type TabLayoutsMap = Record<MenuTab, LayoutItem[]>;

export type SizeSpecDisplayUnit = 'cm' | 'inch';
