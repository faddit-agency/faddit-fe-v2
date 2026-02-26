import { Canvas, FabricObject, Path } from 'fabric';
import paper from 'paper';

export type PathfinderOp = 'unite' | 'minusFront' | 'intersect' | 'exclude';

type ObjWithData = FabricObject & {
  data?: {
    id?: string;
    name?: string;
    kind?: string;
  };
};

function canBooleanTarget(obj: FabricObject): boolean {
  if (!obj.visible) return false;
  if (!obj.evented && !obj.selectable) return false;
  if (obj.type === 'i-text' || obj.type === 'image') return false;
  return true;
}

function getObjectZIndex(canvas: Canvas, obj: FabricObject): number {
  const objects = canvas.getObjects();
  const idx = objects.indexOf(obj);
  return idx >= 0 ? idx : -1;
}

function toPaperItem(scope: paper.PaperScope, obj: FabricObject): paper.Item | null {
  try {
    const objectSvg = obj.toSVG();
    const wrapper = `<svg xmlns="http://www.w3.org/2000/svg">${objectSvg}</svg>`;
    const imported = scope.project.importSVG(wrapper, {
      expandShapes: true,
      insert: false,
    });
    if (!imported) return null;
    return imported;
  } catch {
    return null;
  }
}

function toBooleanShape(item: paper.Item): paper.PathItem | null {
  if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
    return item;
  }

  if (item instanceof paper.Group || item instanceof paper.Layer) {
    const children = item.getItems({
      recursive: true,
      class: paper.PathItem,
    }) as paper.PathItem[];
    if (children.length === 0) return null;

    if (children.length === 1) {
      return children[0].clone({ insert: false }) as paper.PathItem;
    }

    const compound = new paper.CompoundPath({ insert: false });
    children.forEach((child) => {
      const clone = child.clone({ insert: false }) as paper.PathItem;
      if (clone instanceof paper.Path) {
        compound.addChild(clone);
      } else if (clone instanceof paper.CompoundPath) {
        clone.children.forEach((nested) => compound.addChild(nested.clone({ insert: false }) as paper.Path));
      }
    });
    return compound;
  }

  return null;
}

function applyBooleanSequence(op: PathfinderOp, shapes: paper.PathItem[]): paper.PathItem | null {
  if (shapes.length < 2) return null;

  if (op === 'minusFront') {
    let result = shapes[0].clone({ insert: false }) as paper.PathItem;
    for (let i = 1; i < shapes.length; i += 1) {
      const next = result.subtract(shapes[i], { insert: false }) as paper.PathItem;
      result.remove();
      result = next;
    }
    return result;
  }

  let result = shapes[0].clone({ insert: false }) as paper.PathItem;
  for (let i = 1; i < shapes.length; i += 1) {
    const current = shapes[i];
    const next =
      op === 'unite'
        ? (result.unite(current, { insert: false }) as paper.PathItem)
        : op === 'intersect'
          ? (result.intersect(current, { insert: false }) as paper.PathItem)
          : (result.exclude(current, { insert: false }) as paper.PathItem);
    result.remove();
    result = next;
  }

  return result;
}

function extractPathData(item: paper.PathItem): string {
  if (typeof item.pathData === 'string' && item.pathData.trim().length > 0) {
    return item.pathData;
  }

  const exported = item.exportSVG({ asString: true, precision: 3 });
  if (typeof exported !== 'string') {
    return '';
  }

  const matched = exported.match(/d="([^"]+)"/);
  return matched?.[1] ?? '';
}

export function applyPathfinderOperation(canvas: Canvas, op: PathfinderOp): boolean {
  const active = canvas.getActiveObject();
  if (!active) return false;

  const selected =
    active.type === 'activeselection'
      ? (active as unknown as { getObjects: () => FabricObject[] }).getObjects()
      : [active];

  const candidates = selected.filter(canBooleanTarget);
  if (candidates.length < 2) return false;

  const sorted = [...candidates].sort((a, b) => getObjectZIndex(canvas, a) - getObjectZIndex(canvas, b));

  const scope = new paper.PaperScope();
  scope.setup(new scope.Size(1, 1));

  try {
    const shapes: paper.PathItem[] = [];

    sorted.forEach((obj) => {
      const imported = toPaperItem(scope, obj);
      if (!imported) return;
      const shape = toBooleanShape(imported);
      if (shape) {
        shapes.push(shape);
      }
      imported.remove();
    });

    if (shapes.length < 2) {
      shapes.forEach((shape) => shape.remove());
      return false;
    }

    const result = applyBooleanSequence(op, shapes);
    shapes.forEach((shape) => shape.remove());
    if (!result) return false;

    const pathData = extractPathData(result);
    result.remove();
    if (!pathData) return false;

    const styleSource = op === 'minusFront' ? sorted[0] : sorted[sorted.length - 1];
    const sourceData = (styleSource as ObjWithData).data;
    const sourceStrokeWidth =
      typeof styleSource.strokeWidth === 'number' ? styleSource.strokeWidth : 1;

    const next = new Path(pathData, {
      fill: styleSource.fill,
      stroke: styleSource.stroke,
      strokeWidth: sourceStrokeWidth,
      strokeUniform: true,
      objectCaching: false,
    });

    (next as ObjWithData).data = {
      id: `pathfinder-${op}-${Date.now()}`,
      name:
        op === 'unite'
          ? '패스 결합'
          : op === 'minusFront'
            ? '패스 앞면빼기'
            : op === 'intersect'
              ? '패스 교차'
              : '패스 제외',
      kind: sourceData?.kind,
    };

    canvas.discardActiveObject();
    sorted.forEach((obj) => canvas.remove(obj));
    next.setCoords();
    canvas.add(next);
    canvas.setActiveObject(next);
    canvas.renderAll();

    return true;
  } finally {
    scope.project.clear();
  }
}
