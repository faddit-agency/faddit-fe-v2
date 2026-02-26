import type { FabricObject, TPointerEventInfo, TPointerEvent } from 'fabric';

export type ElementKind =
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'path'
  | 'text'
  | 'image'
  | 'unknown';

export interface ElementCapabilities {
  move: boolean;
  resize: boolean;
  rotate: boolean;
  endpointEdit: boolean;
  pathEdit: boolean;
  textEdit: boolean;
}

export interface ModifierIntents {
  preserveAspect: boolean;
  angleSnap: boolean;
  fromCenter: boolean;
  duplicateOnDrag: boolean;
  constrainAxis: boolean;
  fineAdjust: boolean;
}

export interface DragHandleDescriptor {
  id: string;
  role: 'corner' | 'edge' | 'endpoint' | 'node' | 'rotate' | 'custom';
}

export interface OverlayGuideLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'grid' | 'align' | 'distance' | 'axis';
}

export interface OverlayHud {
  id: string;
  x: number;
  y: number;
  label: string;
  kind?: 'grid' | 'align' | 'distance' | 'axis';
}

export interface OverlayModel {
  guides: OverlayGuideLine[];
  hud: OverlayHud[];
}

export interface ElementInteractionContext {
  object: FabricObject;
  kind: ElementKind;
  capabilities: ElementCapabilities;
}

export interface InteractionControlDescriptor {
  id: string;
  appliesTo: (ctx: ElementInteractionContext) => boolean;
  handles: DragHandleDescriptor[];
}

export interface SnapRequest {
  point: { x: number; y: number };
  intents: ModifierIntents;
}

export interface SnapResult {
  point: { x: number; y: number };
  guides: OverlayGuideLine[];
  hud: OverlayHud[];
}

export interface InteractionControllerApi {
  onMouseDown: (opt: TPointerEventInfo<TPointerEvent>) => boolean;
  onMouseMove: (opt: TPointerEventInfo<TPointerEvent>) => boolean;
  onMouseUp: (opt: TPointerEventInfo<TPointerEvent>) => boolean;
  applyObjectControls: (obj: FabricObject) => void;
  getOverlayModel: () => OverlayModel;
}
