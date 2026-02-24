import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LayoutItem } from 'react-grid-layout';
import type {
  MenuTab,
  CardDefinition,
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
  customCards: Record<MenuTab, CardDefinition[]>;
  customCardContent: Record<string, string>;
  draggingCardId: string | null;
  sizeSpecUnit: SizeSpecDisplayUnit;
  worksheetTitle: string;
  isLoadingWorksheet: boolean;
  worksheetLoadError: string | null;

  setActiveTab: (tab: MenuTab) => void;
  updateLayout: (tab: MenuTab, layout: LayoutItem[]) => void;
  toggleCardVisibility: (tab: MenuTab, cardId: string) => void;
  removeCard: (tab: MenuTab, cardId: string) => void;
  restoreCard: (tab: MenuTab, cardId: string) => void;
  showCardAt: (
    tab: MenuTab,
    cardId: string,
    position: { x: number; y: number; w?: number; h?: number },
  ) => void;
  addCustomCard: (tab: MenuTab, title: string) => string;
  deleteCustomCard: (tab: MenuTab, cardId: string) => void;
  updateCustomCardContent: (cardId: string, content: string) => void;
  setDraggingCardId: (cardId: string | null) => void;
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
      customCards: { diagram: [], basic: [], size: [], cost: [] },
      customCardContent: {},
      draggingCardId: null,
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
            nextLayouts = {
              ...state.tabLayouts,
              [tab]: state.tabLayouts[tab].filter((l) => l.i !== cardId),
            };
          } else {
            const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
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
          const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
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

      showCardAt: (tab, cardId, position) =>
        set((state) => {
          const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
          if (!def) return state;

          const w = position.w ?? def.defaultLayout.w;
          const h = position.h ?? def.defaultLayout.h;

          return {
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: { ...state.cardVisibility[tab], [cardId]: true },
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: [
                ...state.tabLayouts[tab].filter((layout) => layout.i !== cardId),
                {
                  i: cardId,
                  x: position.x,
                  y: position.y,
                  w,
                  h,
                  minW: def.defaultLayout.minW,
                  minH: def.defaultLayout.minH,
                },
              ],
            },
          };
        }),

      addCustomCard: (tab, title) => {
        const cardId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const nextTitle = title.trim() || '커스텀 웹에디터';

        set((state) => {
          const newCard: CardDefinition = {
            id: cardId,
            title: nextTitle,
            tab,
            defaultLayout: { x: 0, y: Infinity, w: 6, h: 6, minW: 3, minH: 3 },
            isDefault: false,
          };

          return {
            customCards: {
              ...state.customCards,
              [tab]: [...state.customCards[tab], newCard],
            },
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: { ...state.cardVisibility[tab], [cardId]: true },
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: [...state.tabLayouts[tab], { i: newCard.id, ...newCard.defaultLayout }],
            },
            customCardContent: {
              ...state.customCardContent,
              [cardId]: '',
            },
          };
        });

        return cardId;
      },

      deleteCustomCard: (tab, cardId) =>
        set((state) => {
          const target = state.customCards[tab].find((card) => card.id === cardId);
          if (!target) return state;

          const nextContent = { ...state.customCardContent };
          delete nextContent[cardId];

          const nextVisibility = { ...state.cardVisibility[tab] };
          delete nextVisibility[cardId];

          return {
            customCards: {
              ...state.customCards,
              [tab]: state.customCards[tab].filter((card) => card.id !== cardId),
            },
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: state.tabLayouts[tab].filter((layout) => layout.i !== cardId),
            },
            customCardContent: nextContent,
          };
        }),

      updateCustomCardContent: (cardId, content) =>
        set((state) => ({
          customCardContent: {
            ...state.customCardContent,
            [cardId]: content,
          },
        })),

      setDraggingCardId: (cardId) => set({ draggingCardId: cardId }),

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
