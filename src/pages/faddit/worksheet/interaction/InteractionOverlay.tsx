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

function getGuideStroke(kind: 'grid' | 'align' | 'distance' | 'axis'): string {
  if (kind === 'distance') return '#F59E0B';
  if (kind === 'axis') return '#0EA5E9';
  if (kind === 'grid') return '#94A3B8';
  return '#2563EB';
}

function getGuideDash(kind: 'grid' | 'align' | 'distance' | 'axis'): string {
  if (kind === 'distance') return '2 3';
  if (kind === 'axis') return '3 3';
  if (kind === 'grid') return '1 4';
  return '5 3';
}

function getHudStyle(kind?: 'grid' | 'align' | 'distance' | 'axis'): {
  fill: string;
  text: string;
} {
  if (kind === 'distance') {
    return { fill: '#92400E', text: '#FEF3C7' };
  }

  if (kind === 'align') {
    return { fill: '#1E3A8A', text: '#DBEAFE' };
  }

  if (kind === 'axis') {
    return { fill: '#0C4A6E', text: '#E0F2FE' };
  }

  return { fill: '#111827', text: '#ffffff' };
}

export default function InteractionOverlay({ canvas, model }: Props) {
  if (!canvas) return null;
  if (model.guides.length === 0 && model.hud.length === 0) return null;

  return (
    <svg className='pointer-events-none absolute inset-0 z-20 h-full w-full'>
      {model.guides.map((guide) => {
        const p1 = sceneToViewport(canvas, guide.x1, guide.y1);
        const p2 = sceneToViewport(canvas, guide.x2, guide.y2);
        const stroke = getGuideStroke(guide.kind);
        const strokeDasharray = getGuideDash(guide.kind);
        return (
          <g key={guide.id}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={strokeDasharray}
              opacity={0.92}
            />
            {guide.kind === 'align' && (
              <>
                <circle cx={p1.x} cy={p1.y} r={2.2} fill={stroke} opacity={0.95} />
                <circle cx={p2.x} cy={p2.y} r={2.2} fill={stroke} opacity={0.95} />
              </>
            )}
          </g>
        );
      })}
      {model.hud.map((hud) => {
        const point = sceneToViewport(canvas, hud.x, hud.y);
        const style = getHudStyle(hud.kind);
        const hudWidth = Math.max(38, hud.label.length * 8 + 12);
        return (
          <g key={hud.id} transform={`translate(${point.x}, ${point.y})`}>
            <rect x={0} y={-16} width={hudWidth} height={18} rx={4} fill={style.fill} opacity={0.88} />
            <text x={6} y={-4} fill={style.text} fontSize={11} fontFamily='sans-serif'>
              {hud.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
