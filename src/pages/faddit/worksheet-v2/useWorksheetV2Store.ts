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
import { CARD_DEFINITIONS, GRID_CONFIG } from './worksheetV2Constants';

const WORKSHEET_TABS: MenuTab[] = ['diagram', 'basic', 'size', 'cost'];
const GRID_FILL_ROWS = GRID_CONFIG.cols;

type TileRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function sortByGridPosition(a: LayoutItem, b: LayoutItem) {
  if (a.y !== b.y) {
    return a.y - b.y;
  }

  if (a.x !== b.x) {
    return a.x - b.x;
  }

  return a.i.localeCompare(b.i);
}

function normalizeTabLayoutToFill(
  tab: MenuTab,
  layout: LayoutItem[],
  cardVisibilityById: Record<string, boolean>,
  customCardsForTab: CardDefinition[],
): LayoutItem[] {
  const definitions = [...CARD_DEFINITIONS[tab], ...customCardsForTab];
  if (definitions.length === 0) {
    return [];
  }

  const visibleIds = definitions
    .filter((def) => cardVisibilityById[def.id] !== false)
    .map((def) => def.id);

  if (visibleIds.length === 0) {
    return [];
  }

  const visibleIdSet = new Set<string>(visibleIds);
  const orderedLayoutIds = layout
    .filter((item) => visibleIdSet.has(item.i))
    .sort(sortByGridPosition)
    .map((item) => item.i)
    .filter((id, index, array) => array.indexOf(id) === index);

  const seen = new Set(orderedLayoutIds);
  const orderedIds = [...orderedLayoutIds, ...visibleIds.filter((id) => !seen.has(id))];
  if (orderedIds.length === 0) {
    return [];
  }

  const tiles: TileRect[] = [
    {
      id: orderedIds[0],
      x: 0,
      y: 0,
      w: GRID_CONFIG.cols,
      h: GRID_FILL_ROWS,
    },
  ];

  for (const nextId of orderedIds.slice(1)) {
    let targetIndex = 0;
    let maxArea = -1;

    tiles.forEach((tile, index) => {
      const area = tile.w * tile.h;
      if (area > maxArea) {
        maxArea = area;
        targetIndex = index;
      }
    });

    const targetTile = tiles[targetIndex];
    const preferVertical = targetTile.w >= targetTile.h;

    const splitVertically = () => {
      if (targetTile.w <= 1) return null;

      const firstWidth = Math.ceil(targetTile.w / 2);
      const secondWidth = targetTile.w - firstWidth;
      if (secondWidth <= 0) return null;

      return {
        keep: { ...targetTile, w: firstWidth },
        append: {
          id: nextId,
          x: targetTile.x + firstWidth,
          y: targetTile.y,
          w: secondWidth,
          h: targetTile.h,
        },
      };
    };

    const splitHorizontally = () => {
      if (targetTile.h <= 1) return null;

      const firstHeight = Math.ceil(targetTile.h / 2);
      const secondHeight = targetTile.h - firstHeight;
      if (secondHeight <= 0) return null;

      return {
        keep: { ...targetTile, h: firstHeight },
        append: {
          id: nextId,
          x: targetTile.x,
          y: targetTile.y + firstHeight,
          w: targetTile.w,
          h: secondHeight,
        },
      };
    };

    const splitResult =
      (preferVertical ? splitVertically() : splitHorizontally()) ||
      (preferVertical ? splitHorizontally() : splitVertically());

    if (!splitResult) {
      continue;
    }

    tiles.splice(targetIndex, 1, splitResult.keep, splitResult.append);
  }

  return tiles.map((tile) => ({
    i: tile.id,
    x: tile.x,
    y: tile.y,
    w: tile.w,
    h: tile.h,
    minW: 1,
    minH: 1,
  }));
}

function buildInitialLayouts(): TabLayoutsMap {
  const layouts = {} as TabLayoutsMap;
  for (const tab of WORKSHEET_TABS) {
    const tabVisibility: Record<string, boolean> = {};
    const initialLayout = CARD_DEFINITIONS[tab].map((def) => {
      tabVisibility[def.id] = true;
      return {
        i: def.id,
        ...def.defaultLayout,
      };
    });

    layouts[tab] = normalizeTabLayoutToFill(tab, initialLayout, tabVisibility, []);
  }
  return layouts;
}

function buildInitialVisibility(): CardVisibilityMap {
  const vis = {} as CardVisibilityMap;
  for (const tab of WORKSHEET_TABS) {
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
  updateCustomCardTitle: (tab: MenuTab, cardId: string, title: string) => void;
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

          let nextTabLayout = state.tabLayouts[tab];
          if (current) {
            nextTabLayout = state.tabLayouts[tab].filter((l) => l.i !== cardId);
          } else {
            const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
            if (def) {
              nextTabLayout = [...state.tabLayouts[tab], { i: def.id, ...def.defaultLayout, y: Infinity }];
            }
          }

          const normalizedTabLayout = normalizeTabLayoutToFill(
            tab,
            nextTabLayout,
            nextVis[tab],
            state.customCards[tab],
          );

          return {
            cardVisibility: nextVis,
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizedTabLayout,
            },
          };
        }),

      removeCard: (tab, cardId) =>
        set((state) => {
          const nextTabVisibility = { ...state.cardVisibility[tab], [cardId]: false };
          const nextTabLayout = state.tabLayouts[tab].filter((layoutItem) => layoutItem.i !== cardId);

          return {
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextTabVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizeTabLayoutToFill(
                tab,
                nextTabLayout,
                nextTabVisibility,
                state.customCards[tab],
              ),
            },
          };
        }),

      restoreCard: (tab, cardId) =>
        set((state) => {
          const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
          if (!def) return state;

          const nextTabVisibility = { ...state.cardVisibility[tab], [cardId]: true };
          const nextTabLayout = [...state.tabLayouts[tab], { i: def.id, ...def.defaultLayout, y: Infinity }];

          return {
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextTabVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizeTabLayoutToFill(
                tab,
                nextTabLayout,
                nextTabVisibility,
                state.customCards[tab],
              ),
            },
          };
        }),

      showCardAt: (tab, cardId, position) =>
        set((state) => {
          const def = [...CARD_DEFINITIONS[tab], ...state.customCards[tab]].find((d) => d.id === cardId);
          if (!def) return state;

          const w = position.w ?? def.defaultLayout.w;
          const h = position.h ?? def.defaultLayout.h;

          const nextTabVisibility = { ...state.cardVisibility[tab], [cardId]: true };
          const nextTabLayout = [
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
          ];

          return {
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextTabVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizeTabLayoutToFill(
                tab,
                nextTabLayout,
                nextTabVisibility,
                state.customCards[tab],
              ),
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

          const nextCustomCardsForTab = [...state.customCards[tab], newCard];
          const nextTabVisibility = { ...state.cardVisibility[tab], [cardId]: true };
          const nextTabLayout = [...state.tabLayouts[tab], { i: newCard.id, ...newCard.defaultLayout }];

          return {
            customCards: {
              ...state.customCards,
              [tab]: nextCustomCardsForTab,
            },
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextTabVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizeTabLayoutToFill(
                tab,
                nextTabLayout,
                nextTabVisibility,
                nextCustomCardsForTab,
              ),
            },
            customCardContent: {
              ...state.customCardContent,
              [cardId]: '',
            },
          };
        });

        return cardId;
      },

      updateCustomCardTitle: (tab, cardId, title) =>
        set((state) => {
          const nextTitle = title.trim();
          if (!nextTitle) {
            return state;
          }

          let changed = false;
          const updatedCards = state.customCards[tab].map((card) => {
            if (card.id !== cardId) {
              return card;
            }

            changed = true;
            return {
              ...card,
              title: nextTitle,
            };
          });

          if (!changed) {
            return state;
          }

          return {
            customCards: {
              ...state.customCards,
              [tab]: updatedCards,
            },
          };
        }),

      deleteCustomCard: (tab, cardId) =>
        set((state) => {
          const target = state.customCards[tab].find((card) => card.id === cardId);
          if (!target) return state;

          const nextContent = { ...state.customCardContent };
          delete nextContent[cardId];

          const nextTabVisibility = { ...state.cardVisibility[tab] };
          delete nextTabVisibility[cardId];

          const nextCustomCardsForTab = state.customCards[tab].filter((card) => card.id !== cardId);
          const nextTabLayout = state.tabLayouts[tab].filter((layout) => layout.i !== cardId);

          return {
            customCards: {
              ...state.customCards,
              [tab]: nextCustomCardsForTab,
            },
            cardVisibility: {
              ...state.cardVisibility,
              [tab]: nextTabVisibility,
            },
            tabLayouts: {
              ...state.tabLayouts,
              [tab]: normalizeTabLayoutToFill(
                tab,
                nextTabLayout,
                nextTabVisibility,
                nextCustomCardsForTab,
              ),
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

          set((state) => {
            const nextCardVisibility = parsed.cardVisibility ?? state.cardVisibility;
            const nextTabLayouts = parsed.tabLayouts ?? state.tabLayouts;
            const normalizedLayouts = {} as TabLayoutsMap;

            for (const tab of WORKSHEET_TABS) {
              normalizedLayouts[tab] = normalizeTabLayoutToFill(
                tab,
                nextTabLayouts[tab] ?? [],
                nextCardVisibility[tab] ?? {},
                state.customCards[tab],
              );
            }

            return {
              activeTab: parsed.activeTab ?? state.activeTab,
              tabLayouts: normalizedLayouts,
              cardVisibility: nextCardVisibility,
              sizeSpecUnit: parsed.sizeSpecUnit ?? state.sizeSpecUnit,
            };
          });
        } catch {
          return;
        }
      },
    }),
    { name: 'worksheet-v2-store' },
  ),
);
