import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LayoutItem } from 'react-grid-layout';
import type {
  MenuTab,
  CardVisibilityMap,
  TabLayoutsMap,
  SizeSpecDisplayUnit,
} from './worksheetV2Types';
import { CARD_DEFINITIONS } from './worksheetV2Constants';

function buildInitialLayouts(): TabLayoutsMap {
  const tabs: MenuTab[] = ['diagram', 'basic', 'size', 'cost'];
  const layouts = {} as TabLayoutsMap;
  for (const tab of tabs) {
    layouts[tab] = CARD_DEFINITIONS[tab].map((def) => ({
      i: def.id,
      ...def.defaultLayout,
    }));
  }
  return layouts;
}

function buildInitialVisibility(): CardVisibilityMap {
  const tabs: MenuTab[] = ['diagram', 'basic', 'size', 'cost'];
  const vis = {} as CardVisibilityMap;
  for (const tab of tabs) {
    vis[tab] = {};
    for (const def of CARD_DEFINITIONS[tab]) {
      vis[tab][def.id] = true;
    }
  }
  return vis;
}

interface WorksheetV2State {
  activeTab: MenuTab;
  tabLayouts: TabLayoutsMap;
  cardVisibility: CardVisibilityMap;
  sizeSpecUnit: SizeSpecDisplayUnit;
  worksheetTitle: string;
  isLoadingWorksheet: boolean;
  worksheetLoadError: string | null;

  setActiveTab: (tab: MenuTab) => void;
  updateLayout: (tab: MenuTab, layout: LayoutItem[]) => void;
  toggleCardVisibility: (tab: MenuTab, cardId: string) => void;
  removeCard: (tab: MenuTab, cardId: string) => void;
  restoreCard: (tab: MenuTab, cardId: string) => void;
  setSizeSpecUnit: (unit: SizeSpecDisplayUnit) => void;
  setWorksheetTitle: (title: string) => void;
  setWorksheetLoading: (isLoading: boolean) => void;
  setWorksheetLoadError: (message: string | null) => void;
  hydrateWorksheetUiInfo: (uiInfoRaw: string | null | undefined) => void;
}

export const useWorksheetV2Store = create<WorksheetV2State>()(
  devtools(
    (set) => ({
      activeTab: 'diagram',
      tabLayouts: buildInitialLayouts(),
      cardVisibility: buildInitialVisibility(),
      sizeSpecUnit: 'cm',
      worksheetTitle: '작업지시서 명',
      isLoadingWorksheet: false,
      worksheetLoadError: null,

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateLayout: (tab, layout) =>
        set((state) => ({
          tabLayouts: { ...state.tabLayouts, [tab]: layout },
        })),

      toggleCardVisibility: (tab, cardId) =>
        set((state) => {
          const current = state.cardVisibility[tab][cardId];
          const nextVis = {
            ...state.cardVisibility,
            [tab]: { ...state.cardVisibility[tab], [cardId]: !current },
          };

          let nextLayouts = state.tabLayouts;
          if (current) {
            // Hiding: remove from layout
            nextLayouts = {
              ...state.tabLayouts,
              [tab]: state.tabLayouts[tab].filter((l) => l.i !== cardId),
            };
          } else {
            // Showing: restore to layout at bottom
            const def = CARD_DEFINITIONS[tab].find((d) => d.id === cardId);
            if (def) {
              nextLayouts = {
                ...state.tabLayouts,
                [tab]: [...state.tabLayouts[tab], { i: def.id, ...def.defaultLayout, y: Infinity }],
              };
            }
          }

          return { cardVisibility: nextVis, tabLayouts: nextLayouts };
        }),

      removeCard: (tab, cardId) =>
        set((state) => ({
          cardVisibility: {
            ...state.cardVisibility,
            [tab]: { ...state.cardVisibility[tab], [cardId]: false },
          },
          tabLayouts: {
            ...state.tabLayouts,
            [tab]: state.tabLayouts[tab].filter((l) => l.i !== cardId),
          },
        })),

      restoreCard: (tab, cardId) =>
        set((state) => {
          const def = CARD_DEFINITIONS[tab].find((d) => d.id === cardId);
          if (!def) return state;
          return {
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: { ...state.cardVisibility[tab], [cardId]: true },
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: [...state.tabLayouts[tab], { i: def.id, ...def.defaultLayout, y: Infinity }],
            },
          };
        }),

      setSizeSpecUnit: (unit) => set({ sizeSpecUnit: unit }),

      setWorksheetTitle: (title) => set({ worksheetTitle: title || '작업지시서 명' }),

      setWorksheetLoading: (isLoading) => set({ isLoadingWorksheet: isLoading }),

      setWorksheetLoadError: (message) => set({ worksheetLoadError: message }),

      hydrateWorksheetUiInfo: (uiInfoRaw) => {
        if (!uiInfoRaw) return;

        try {
          const parsed = JSON.parse(uiInfoRaw) as {
            activeTab?: MenuTab;
            tabLayouts?: TabLayoutsMap;
            cardVisibility?: CardVisibilityMap;
            sizeSpecUnit?: SizeSpecDisplayUnit;
          };

          set((state) => ({
            activeTab: parsed.activeTab ?? state.activeTab,
            tabLayouts: parsed.tabLayouts ?? state.tabLayouts,
            cardVisibility: parsed.cardVisibility ?? state.cardVisibility,
            sizeSpecUnit: parsed.sizeSpecUnit ?? state.sizeSpecUnit,
          }));
        } catch {
          return;
        }
      },
    }),
    { name: 'worksheet-v2-store' },
  ),
);
