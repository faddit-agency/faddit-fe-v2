import type { SnapRequest, SnapResult } from './types';

const GRID_SIZE = 10;

function snapToGrid(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}

export function computeSnap(request: SnapRequest): SnapResult {
  const hudX = Math.round(request.point.x);
  const hudY = Math.round(request.point.y);

  if (!request.intents.fineAdjust) {
    const snapped = snapToGrid(request.point);
    return {
      point: snapped,
      guides: [
        {
          id: 'snap-axis-x',
          kind: 'axis',
          x1: snapped.x,
          y1: snapped.y - 16,
          x2: snapped.x,
          y2: snapped.y + 16,
        },
        {
          id: 'snap-axis-y',
          kind: 'axis',
          x1: snapped.x - 16,
          y1: snapped.y,
          x2: snapped.x + 16,
          y2: snapped.y,
        },
      ],
      hud: [
        {
          id: 'snap-hud',
          x: request.point.x + 10,
          y: request.point.y - 12,
          label: `${hudX}, ${hudY}`,
          kind: 'axis',
        },
      ],
    };
  }

  return {
    point: request.point,
    guides: [],
    hud: [
      {
        id: 'snap-hud',
        x: request.point.x + 10,
        y: request.point.y - 12,
        label: `${hudX}, ${hudY}`,
        kind: 'axis',
      },
    ],
  };
}
