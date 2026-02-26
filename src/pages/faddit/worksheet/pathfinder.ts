import { ActiveSelection, Canvas, FabricObject, Path } from 'fabric';
import paper from 'paper';

export type PathfinderOp =
  | 'unite'
  | 'minusFront'
  | 'minusBack'
  | 'intersect'
  | 'exclude'
  | 'divide'
  | 'trim'
  | 'merge'
  | 'crop'
  | 'outline';

type ObjWithData = FabricObject & {
  data?: {
    id?: string;
    name?: string;
    kind?: string;
  };
};

type PaperResultEntry = {
  item: paper.Item;
  styleSource: FabricObject;
  splitCompound?: boolean;
  forceOutline?: boolean;
  forceCloseOpenPaths?: boolean;
  stripStroke?: boolean;
};

const OP_RESULT_LABEL: Record<PathfinderOp, string> = {
  unite: '패스 결합',
  minusFront: '패스 앞면빼기',
  minusBack: '패스 뒷면빼기',
  intersect: '패스 교차',
  exclude: '패스 제외',
  divide: '패스 나누기',
  trim: '패스 다듬기',
  merge: '패스 병합',
  crop: '패스 자르기',
  outline: '패스 윤곽선',
};

function getOperationLabel(op: PathfinderOp): string {
  return OP_RESULT_LABEL[op] ?? '패스파인더';
}

function getSingleResultStyleSource(sorted: FabricObject[], op: PathfinderOp): FabricObject {
  if (op === 'minusFront') {
    return sorted[0];
  }
  if (op === 'minusBack') {
    return sorted[sorted.length - 1];
  }
  if (op === 'crop') {
    return sorted[sorted.length - 1];
  }

  return sorted[sorted.length - 1];
}

function getMergeStyleKey(obj: FabricObject, index: number): string {
  const fill = obj.fill;
  if (typeof fill === 'string') {
    return `${fill}`;
  }

  return `__non-mergeable__${index}`;
}

function getFilledStyleSource(sources: FabricObject[]): FabricObject {
  const filled = sources.find((obj) => {
    const fill = obj.fill;
    return typeof fill === 'string' && fill.trim().length > 0 && fill !== 'transparent';
  });

  return filled ?? sources[0];
}

function computeBoundsUnion(objs: FabricObject[]): { left: number; top: number; width: number; height: number } | null {
  if (objs.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  objs.forEach((obj) => {
    const b = obj.getBoundingRect();
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.left + b.width);
    bottom = Math.max(bottom, b.top + b.height);
  });

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

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

function applyBooleanSequence(
  op: 'unite' | 'minusFront' | 'minusBack' | 'intersect' | 'exclude',
  shapes: paper.PathItem[],
): paper.PathItem | null {
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

  if (op === 'minusBack') {
    let result = shapes[shapes.length - 1].clone({ insert: false }) as paper.PathItem;
    for (let i = shapes.length - 2; i >= 0; i -= 1) {
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

function collectPathDataFromItem(
  item: paper.Item,
  splitCompound = false,
  forceCloseOpenPaths = false,
): string[] {
  if (item instanceof paper.Path) {
    const pathItem = item as paper.Path;
    const exportPath =
      forceCloseOpenPaths && !pathItem.closed
        ? (() => {
            const cloned = pathItem.clone({ insert: false }) as paper.Path;
            cloned.closed = true;
            return cloned;
          })()
        : pathItem;

    const pathData = extractPathData(exportPath);
    if (exportPath !== pathItem) {
      exportPath.remove();
    }

    return pathData ? [pathData] : [];
  }

  if (item instanceof paper.CompoundPath) {
    if (!splitCompound) {
      const pathData = extractPathData(item);
      return pathData ? [pathData] : [];
    }

    return item.children
      .flatMap((child) =>
        collectPathDataFromItem(child as unknown as paper.Item, false, forceCloseOpenPaths),
      )
      .filter((pathData) => pathData.trim().length > 0);
  }

  if (item instanceof paper.Group || item instanceof paper.Layer) {
    return item.children
      .flatMap((child) =>
        collectPathDataFromItem(child as unknown as paper.Item, splitCompound, forceCloseOpenPaths),
      )
      .filter((pathData) => pathData.trim().length > 0);
  }

  return [];
}

function applyDivideSequence(shapes: paper.PathItem[]): paper.PathItem | null {
  if (shapes.length < 2) return null;

  const hasOpenContour = (item: paper.PathItem): boolean => {
    if (item instanceof paper.Path) {
      return !item.closed;
    }

    if (item instanceof paper.CompoundPath) {
      return item.children.some((child) => {
        const pathLike = child as unknown as { closed?: boolean };
        return pathLike.closed === false;
      });
    }

    return false;
  };

  let result = shapes[0].clone({ insert: false }) as paper.PathItem;
  for (let i = 1; i < shapes.length; i += 1) {
    const cutter = shapes[i];
    const useStrokeSplit = hasOpenContour(result) || hasOpenContour(cutter);
    const next = result.divide(
      cutter,
      useStrokeSplit
        ? ({ insert: false, stroke: true, trace: false } as unknown as object)
        : ({ insert: false } as unknown as object),
    ) as paper.PathItem;
    result.remove();
    result = next;
  }

  return result;
}

function applyTrimSequence(shapes: paper.PathItem[]): Array<{ item: paper.PathItem; sourceIndex: number }> {
  const results: Array<{ item: paper.PathItem; sourceIndex: number }> = [];

  for (let i = 0; i < shapes.length; i += 1) {
    let result = shapes[i].clone({ insert: false }) as paper.PathItem;
    for (let j = i + 1; j < shapes.length; j += 1) {
      const next = result.subtract(shapes[j], { insert: false }) as paper.PathItem;
      result.remove();
      result = next;
    }
    results.push({ item: result, sourceIndex: i });
  }

  return results;
}

function applyCropSequenceBySource(
  shapes: paper.PathItem[],
): Array<{ item: paper.PathItem; sourceIndex: number }> {
  if (shapes.length < 2) return [];

  const mask = shapes[shapes.length - 1];
  const results: Array<{ item: paper.PathItem; sourceIndex: number }> = [];

  for (let i = 0; i < shapes.length - 1; i += 1) {
    const clipped = shapes[i].intersect(mask, { insert: false }) as paper.PathItem;
    results.push({ item: clipped, sourceIndex: i });
  }

  return results;
}

function applyMergeFromTrim(
  trimEntries: Array<{ item: paper.PathItem; sourceIndex: number }>,
  sorted: FabricObject[],
): Array<{ item: paper.PathItem; styleSource: FabricObject }> {
  const groups = new Map<string, Array<{ item: paper.PathItem; sourceIndex: number }>>();

  trimEntries.forEach((entry) => {
    const key = getMergeStyleKey(sorted[entry.sourceIndex], entry.sourceIndex);
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  });

  const merged: Array<{ item: paper.PathItem; styleSource: FabricObject }> = [];
  groups.forEach((entries) => {
    if (entries.length === 0) return;

    let current = entries[0].item;
    for (let i = 1; i < entries.length; i += 1) {
      const next = current.unite(entries[i].item, { insert: false }) as paper.PathItem;
      current.remove();
      current = next;
    }

    merged.push({ item: current, styleSource: sorted[entries[0].sourceIndex] });
  });

  return merged;
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
    const prepared: Array<{ source: FabricObject; shape: paper.PathItem }> = [];

    sorted.forEach((obj) => {
      const imported = toPaperItem(scope, obj);
      if (!imported) return;
      const shape = toBooleanShape(imported);
      if (!shape) {
        imported.remove();
        return;
      }

      prepared.push({ source: obj, shape });
      if (shape !== imported) {
        imported.remove();
      }
    });

    if (prepared.length < 2) {
      return false;
    }

    const shapes = prepared.map((entry) => entry.shape);
    const sources = prepared.map((entry) => entry.source);
    const resultEntries: PaperResultEntry[] = [];

    if (op === 'unite' || op === 'minusFront' || op === 'minusBack' || op === 'intersect' || op === 'exclude') {
      const singleResult = applyBooleanSequence(op, shapes);
      if (singleResult) {
        resultEntries.push({
          item: singleResult,
          styleSource: getSingleResultStyleSource(sources, op),
        });
      }
    } else if (op === 'divide') {
      const divided = applyDivideSequence(shapes);
      if (divided) {
        resultEntries.push({
          item: divided,
          styleSource: getFilledStyleSource(sources),
          splitCompound: true,
          forceCloseOpenPaths: true,
        });
      }
    } else if (op === 'trim') {
      const trimmed = applyTrimSequence(shapes);
      trimmed.forEach((entry) => {
        resultEntries.push({
          item: entry.item,
          styleSource: sources[entry.sourceIndex],
          splitCompound: true,
          stripStroke: true,
        });
      });
    } else if (op === 'merge') {
      const trimmed = applyTrimSequence(shapes);
      const merged = applyMergeFromTrim(trimmed, sources);
      merged.forEach((entry) => {
        resultEntries.push({
          item: entry.item,
          styleSource: entry.styleSource,
          splitCompound: true,
          stripStroke: true,
        });
      });
    } else if (op === 'crop') {
      const cropped = applyCropSequenceBySource(shapes);
      cropped.forEach((entry) => {
        resultEntries.push({
          item: entry.item,
          styleSource: sources[entry.sourceIndex],
          splitCompound: true,
          stripStroke: true,
        });
      });
    } else if (op === 'outline') {
      const outlined = applyDivideSequence(shapes) ?? applyBooleanSequence('unite', shapes);
      if (outlined) {
        resultEntries.push({
          item: outlined,
          styleSource: sources[sources.length - 1],
          splitCompound: true,
          forceOutline: true,
        });
      }
    }

    if (resultEntries.length === 0) {
      return false;
    }

    const now = Date.now();
    const createdObjects: Path[] = [];
    resultEntries.forEach((entry, entryIndex) => {
      const pathDataList = collectPathDataFromItem(
        entry.item,
        entry.splitCompound ?? false,
        entry.forceCloseOpenPaths ?? false,
      );
      const sourceData = (entry.styleSource as ObjWithData).data;
      const sourceStrokeWidth =
        typeof entry.styleSource.strokeWidth === 'number' ? entry.styleSource.strokeWidth : 1;

      pathDataList.forEach((pathData, pathIndex) => {
        if (!pathData.trim()) return;

        const strokeForOutline =
          typeof entry.styleSource.stroke === 'string' && entry.styleSource.stroke.trim().length > 0
            ? entry.styleSource.stroke
            : '#111827';

        const next = new Path(pathData, {
          fill: entry.forceOutline ? '' : entry.styleSource.fill,
          stroke: entry.stripStroke ? '' : entry.forceOutline ? strokeForOutline : entry.styleSource.stroke,
          strokeWidth: Math.max(1, sourceStrokeWidth),
          strokeUniform: true,
          objectCaching: false,
          originX: 'left',
          originY: 'top',
        });

        (next as ObjWithData).data = {
          id: `pathfinder-${op}-${now}-${entryIndex}-${pathIndex}`,
          name: getOperationLabel(op),
          kind: sourceData?.kind,
        };

        createdObjects.push(next);
      });
    });

    if (createdObjects.length === 0) {
      return false;
    }

    const sourceBounds = computeBoundsUnion(sorted);
    const resultBounds = computeBoundsUnion(createdObjects);
    if (sourceBounds && resultBounds) {
      const dx = sourceBounds.left - resultBounds.left;
      const dy = sourceBounds.top - resultBounds.top;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        createdObjects.forEach((obj) => {
          obj.set({
            left: (obj.left ?? 0) + dx,
            top: (obj.top ?? 0) + dy,
          });
          obj.setCoords();
        });
      }
    }

    canvas.discardActiveObject();
    sorted.forEach((obj) => canvas.remove(obj));

    createdObjects.forEach((obj) => {
      obj.setCoords();
      canvas.add(obj);
    });

    if (createdObjects.length === 1) {
      canvas.setActiveObject(createdObjects[0]);
    } else {
      canvas.setActiveObject(new ActiveSelection(createdObjects, { canvas }));
    }

    canvas.renderAll();
    return true;
  } finally {
    scope.project.clear();
  }
}
