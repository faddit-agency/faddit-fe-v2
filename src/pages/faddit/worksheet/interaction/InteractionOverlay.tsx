import React from 'react';
import type { Canvas } from 'fabric';
import type { OverlayModel } from './types';

interface Props {
  canvas: Canvas | null;
  model: OverlayModel;
}

function sceneToViewport(canvas: Canvas, x: number, y: number): { x: number; y: number } {
  const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  return {
    x: vpt[0] * x + vpt[2] * y + vpt[4],
    y: vpt[1] * x + vpt[3] * y + vpt[5],
  };
}

export default function InteractionOverlay({ canvas, model }: Props) {
  if (!canvas) return null;
  if (model.guides.length === 0 && model.hud.length === 0) return null;

  return (
    <svg className='pointer-events-none absolute inset-0 z-20 h-full w-full'>
      {model.guides.map((guide) => {
        const p1 = sceneToViewport(canvas, guide.x1, guide.y1);
        const p2 = sceneToViewport(canvas, guide.x2, guide.y2);
        return (
          <line
            key={guide.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={guide.kind === 'axis' ? '#2563EB' : '#3B82F6'}
            strokeWidth={1.5}
            strokeDasharray='4 4'
            opacity={0.9}
          />
        );
      })}
      {model.hud.map((hud) => {
        const point = sceneToViewport(canvas, hud.x, hud.y);
        return (
          <g key={hud.id} transform={`translate(${point.x}, ${point.y})`}>
            <rect x={0} y={-16} width={80} height={18} rx={4} fill='#111827' opacity={0.88} />
            <text x={8} y={-4} fill='#ffffff' fontSize={11} fontFamily='sans-serif'>
              {hud.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
