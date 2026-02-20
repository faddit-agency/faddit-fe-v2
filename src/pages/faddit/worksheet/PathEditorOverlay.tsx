import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Path, util } from 'fabric';

type Mat6 = [number, number, number, number, number, number];
type Cmd = Array<string | number>;

export interface NodePoint {
  anchor: { x: number; y: number };
  handleIn: { x: number; y: number } | null;
  handleOut: { x: number; y: number } | null;
  isClose: boolean;
}

type DragTarget =
  | { kind: 'anchor'; idx: number }
  | { kind: 'handleIn'; idx: number }
  | { kind: 'handleOut'; idx: number };

function multiplyMat(m1: Mat6, m2: Mat6): Mat6 {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function invertMat([a, b, c, d, e, f]: Mat6): Mat6 {
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

function parseNodes(commands: Cmd[]): NodePoint[] {
  const nodes: NodePoint[] = [];
  for (const cmd of commands) {
    const type = cmd[0] as string;
    if (type === 'M' || type === 'm') {
      nodes.push({
        anchor: { x: cmd[1] as number, y: cmd[2] as number },
        handleIn: null,
        handleOut: null,
        isClose: false,
      });
    } else if (type === 'L' || type === 'l') {
      nodes.push({
        anchor: { x: cmd[1] as number, y: cmd[2] as number },
        handleIn: null,
        handleOut: null,
        isClose: false,
      });
    } else if (type === 'C' || type === 'c') {
      const prev = nodes[nodes.length - 1];
      if (prev) prev.handleOut = { x: cmd[1] as number, y: cmd[2] as number };
      nodes.push({
        anchor: { x: cmd[5] as number, y: cmd[6] as number },
        handleIn: { x: cmd[3] as number, y: cmd[4] as number },
        handleOut: null,
        isClose: false,
      });
    } else if (type === 'Q' || type === 'q') {
      const prev = nodes[nodes.length - 1];
      if (prev) prev.handleOut = { x: cmd[1] as number, y: cmd[2] as number };
      nodes.push({
        anchor: { x: cmd[3] as number, y: cmd[4] as number },
        handleIn: { x: cmd[1] as number, y: cmd[2] as number },
        handleOut: null,
        isClose: false,
      });
    } else if (type === 'Z' || type === 'z') {
      if (nodes.length > 0) nodes[nodes.length - 1].isClose = true;
    }
  }
  return nodes;
}

function buildCommands(nodes: NodePoint[]): Cmd[] {
  const cmds: Cmd[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (i === 0) {
      cmds.push(['M', node.anchor.x, node.anchor.y]);
    } else {
      const prev = nodes[i - 1];
      if (prev.handleOut || node.handleIn) {
        const cp1 = prev.handleOut ?? prev.anchor;
        const cp2 = node.handleIn ?? node.anchor;
        cmds.push(['C', cp1.x, cp1.y, cp2.x, cp2.y, node.anchor.x, node.anchor.y]);
      } else {
        cmds.push(['L', node.anchor.x, node.anchor.y]);
      }
    }
    if (node.isClose) cmds.push(['Z']);
  }
  return cmds;
}

function commandsToD(cmds: Cmd[]): string {
  return cmds
    .map(([cmd, ...args]) => (args.length ? `${cmd} ${args.join(' ')}` : String(cmd)))
    .join(' ');
}

export function applyNodesToFabric(oldPath: Path, nodes: NodePoint[], canvas: Canvas): Path {
  const cmds = buildCommands(nodes);
  const d = commandsToD(cmds);
  const oldPm = oldPath.calcTransformMatrix() as Mat6;
  const { scaleX, scaleY, angle, skewX, skewY } = util.qrDecompose(oldPm);
  const oldOffset = (oldPath as unknown as { pathOffset?: { x: number; y: number } })
    .pathOffset ?? { x: 0, y: 0 };

  const newPath = new Path(d, {
    scaleX,
    scaleY,
    angle,
    skewX,
    skewY,
    fill: oldPath.fill as string,
    stroke: oldPath.stroke as string,
    strokeWidth: oldPath.strokeWidth,
    opacity: oldPath.opacity,
    selectable: true,
    evented: true,
    originX: 'center',
    originY: 'center',
  });
  (newPath as unknown as { data: unknown }).data = (oldPath as unknown as { data: unknown }).data;

  const newOffset = (newPath as unknown as { pathOffset?: { x: number; y: number } })
    .pathOffset ?? { x: 0, y: 0 };
  const dx = newOffset.x - oldOffset.x;
  const dy = newOffset.y - oldOffset.y;
  newPath.left = oldPm[4] + oldPm[0] * dx + oldPm[2] * dy;
  newPath.top = oldPm[5] + oldPm[1] * dx + oldPm[3] * dy;
  newPath.setCoords();

  const parentGroup = (oldPath as unknown as { group?: { remove: (o: Path) => void } }).group;
  if (parentGroup) {
    parentGroup.remove(oldPath);
  } else {
    canvas.remove(oldPath);
  }
  canvas.add(newPath);
  canvas.setActiveObject(newPath);
  canvas.renderAll();
  return newPath;
}

interface Props {
  canvas: Canvas;
  path: Path;
  onDone: (nodes: NodePoint[]) => void;
}

export default function PathEditorOverlay({ canvas, path, onDone }: Props) {
  const [nodes, setNodes] = useState<NodePoint[]>(() => parseNodes(path.path as Cmd[]));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const dragRef = useRef<{ target: DragTarget } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const composedRef = useRef<Mat6>(
    multiplyMat(canvas.viewportTransform as Mat6, path.calcTransformMatrix() as Mat6),
  );
  const pathOffsetRef = useRef<{ x: number; y: number }>(
    (path as unknown as { pathOffset?: { x: number; y: number } }).pathOffset ?? { x: 0, y: 0 },
  );

  useEffect(() => {
    path.set({ visible: false });
    canvas.renderAll();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone(nodesRef.current);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDone]);

  const localToScreen = useCallback((lx: number, ly: number) => {
    const m = composedRef.current;
    const cx = lx - pathOffsetRef.current.x;
    const cy = ly - pathOffsetRef.current.y;
    return { x: m[0] * cx + m[2] * cy + m[4], y: m[1] * cx + m[3] * cy + m[5] };
  }, []);

  const screenToLocal = useCallback((sx: number, sy: number) => {
    const inv = invertMat(composedRef.current);
    return {
      x: inv[0] * sx + inv[2] * sy + inv[4] + pathOffsetRef.current.x,
      y: inv[1] * sx + inv[3] * sy + inv[5] + pathOffsetRef.current.y,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, target: DragTarget) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { target };
    setSelectedIdx(target.idx);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const local = screenToLocal(e.clientX - rect.left, e.clientY - rect.top);
      const { target } = dragRef.current;
      setNodes((prev) =>
        prev.map((node, i) => {
          if (i !== target.idx) return node;
          const copy = {
            anchor: { ...node.anchor },
            handleIn: node.handleIn ? { ...node.handleIn } : null,
            handleOut: node.handleOut ? { ...node.handleOut } : null,
            isClose: node.isClose,
          };
          if (target.kind === 'anchor') {
            const dx = local.x - copy.anchor.x;
            const dy = local.y - copy.anchor.y;
            copy.anchor = local;
            if (copy.handleIn) copy.handleIn = { x: copy.handleIn.x + dx, y: copy.handleIn.y + dy };
            if (copy.handleOut)
              copy.handleOut = { x: copy.handleOut.x + dx, y: copy.handleOut.y + dy };
          } else if (target.kind === 'handleIn') {
            copy.handleIn = local;
          } else {
            copy.handleOut = local;
          }
          return copy;
        }),
      );
    },
    [screenToLocal],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const m = composedRef.current;
  const ox = pathOffsetRef.current.x;
  const oy = pathOffsetRef.current.y;
  const pathTransform = `matrix(${m.join(' ')}) translate(${-ox} ${-oy})`;
  const pathD = commandsToD(buildCommands(nodes));

  return (
    <>
      <svg
        ref={svgRef}
        className='pointer-events-auto absolute inset-0 h-full w-full'
        style={{ overflow: 'visible', touchAction: 'none', cursor: 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <path
          d={pathD}
          transform={pathTransform}
          fill={(path.fill as string) || 'transparent'}
          stroke={(path.stroke as string) || '#000000'}
          strokeWidth={path.strokeWidth ?? 1}
          pointerEvents='none'
        />
        {nodes.map((node, i) => {
          const a = localToScreen(node.anchor.x, node.anchor.y);
          const isSelected = selectedIdx === i;
          const hIn =
            isSelected && node.handleIn ? localToScreen(node.handleIn.x, node.handleIn.y) : null;
          const hOut =
            isSelected && node.handleOut ? localToScreen(node.handleOut.x, node.handleOut.y) : null;
          return (
            <g key={i}>
              {hIn && (
                <>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={hIn.x}
                    y2={hIn.y}
                    stroke='#2563EB'
                    strokeWidth={1}
                    pointerEvents='none'
                  />
                  <circle
                    cx={hIn.x}
                    cy={hIn.y}
                    r={4.5}
                    fill='white'
                    stroke='#2563EB'
                    strokeWidth={1.5}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => handlePointerDown(e, { kind: 'handleIn', idx: i })}
                  />
                </>
              )}
              {hOut && (
                <>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={hOut.x}
                    y2={hOut.y}
                    stroke='#2563EB'
                    strokeWidth={1}
                    pointerEvents='none'
                  />
                  <circle
                    cx={hOut.x}
                    cy={hOut.y}
                    r={4.5}
                    fill='white'
                    stroke='#2563EB'
                    strokeWidth={1.5}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => handlePointerDown(e, { kind: 'handleOut', idx: i })}
                  />
                </>
              )}
              <rect
                x={a.x - 5}
                y={a.y - 5}
                width={10}
                height={10}
                fill={isSelected ? '#2563EB' : 'white'}
                stroke='#2563EB'
                strokeWidth={1.5}
                rx={1}
                style={{ cursor: 'move' }}
                onClick={() => setSelectedIdx(i)}
                onPointerDown={(e) => handlePointerDown(e, { kind: 'anchor', idx: i })}
              />
            </g>
          );
        })}
      </svg>
      <div className='pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 shadow-md'>
        <span className='text-xs text-white'>경로 편집 중</span>
        <button
          type='button'
          className='pointer-events-auto text-xs font-medium text-blue-300 hover:text-blue-200'
          onClick={() => onDone(nodesRef.current)}
        >
          완료
        </button>
      </div>
    </>
  );
}
