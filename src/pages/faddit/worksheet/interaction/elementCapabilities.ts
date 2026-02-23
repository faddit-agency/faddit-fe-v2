import { IText, Line, Path, type FabricObject } from 'fabric';
import type { ElementCapabilities, ElementKind } from './types';

interface ObjWithData {
  data?: {
    id?: string;
    kind?: string;
    name?: string;
  };
}

function inferKindFromData(obj: FabricObject): ElementKind {
  const data = (obj as ObjWithData).data;
  if (data?.kind === 'arrow') return 'arrow';
  if (data?.id?.startsWith('arrow-')) return 'arrow';
  if (obj instanceof Line) return 'line';
  if (obj instanceof IText) return 'text';
  if (obj instanceof Path) {
    if (data?.id?.startsWith('path-') || data?.name === '펜') return 'path';
    return 'path';
  }
  switch (obj.type) {
    case 'rect':
      return 'rect';
    case 'ellipse':
      return 'ellipse';
    case 'triangle':
      return 'triangle';
    case 'image':
      return 'image';
    default:
      return 'unknown';
  }
}

export function inferElementKind(obj: FabricObject): ElementKind {
  return inferKindFromData(obj);
}

export function getElementCapabilities(obj: FabricObject): ElementCapabilities {
  const kind = inferElementKind(obj);
  if (kind === 'line' || kind === 'arrow') {
    return {
      move: true,
      resize: false,
      rotate: false,
      endpointEdit: true,
      pathEdit: false,
      textEdit: false,
    };
  }
  if (kind === 'path') {
    return {
      move: true,
      resize: true,
      rotate: true,
      endpointEdit: false,
      pathEdit: true,
      textEdit: false,
    };
  }
  if (kind === 'text') {
    return {
      move: true,
      resize: true,
      rotate: true,
      endpointEdit: false,
      pathEdit: false,
      textEdit: true,
    };
  }
  return {
    move: true,
    resize: true,
    rotate: true,
    endpointEdit: false,
    pathEdit: false,
    textEdit: false,
  };
}
