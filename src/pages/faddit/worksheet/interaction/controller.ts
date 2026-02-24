import {
  controlsUtils,
  type Canvas,
  type FabricObject,
  type TPointerEventInfo,
  type TPointerEvent,
} from 'fabric';
import { createDefaultControlRegistry } from './defaultRegistry';
import { getElementCapabilities, inferElementKind } from './elementCapabilities';
import { normalizeModifierIntents } from './modifierPolicy';
import { computeSnap } from './snapEngine';
import type { InteractionControllerApi, OverlayModel } from './types';

function getScenePointFromEvent(canvas: Canvas, opt: TPointerEventInfo<TPointerEvent>) {
  return canvas.getScenePoint(opt.e);
}

export function createInteractionController(canvas: Canvas): InteractionControllerApi {
  const registry = createDefaultControlRegistry();
  let overlayModel: OverlayModel = { guides: [], hud: [] };

  const applyCanvaBoxControlStyle = (obj: FabricObject) => {
    obj.set({
      hasBorders: true,
      hasControls: true,
      borderColor: '#2563EB',
      cornerColor: '#2563EB',
      cornerStrokeColor: '#ffffff',
      cornerStyle: 'circle',
      transparentCorners: false,
      cornerSize: 10,
      borderScaleFactor: 1,
      padding: 8,
      hoverCursor: 'move',
      moveCursor: 'move',
    });
  };

  const applyObjectControls = (obj: FabricObject) => {
    const ctx = {
      object: obj,
      kind: inferElementKind(obj),
      capabilities: getElementCapabilities(obj),
    };
    const descriptors = registry.resolve(ctx);
    if (descriptors.length === 0) return;

    const hasEndpointControls = descriptors.some((d) => d.id === 'endpoint-controls');
    const hasBoxControls = descriptors.some((d) => d.id === 'box-controls');

    if (hasBoxControls && !hasEndpointControls) {
      obj.controls = controlsUtils.createObjectDefaultControls();
      applyCanvaBoxControlStyle(obj);
      obj.setCoords();
    }
  };

  const getActiveContext = () => {
    const active = canvas.getActiveObject();
    if (!active) return null;
    return {
      object: active,
      kind: inferElementKind(active),
      capabilities: getElementCapabilities(active),
    };
  };

  return {
    onMouseDown: () => false,
    onMouseMove: (opt) => {
      const ctx = getActiveContext();
      if (!ctx) {
        overlayModel = { guides: [], hud: [] };
        return false;
      }

      const descriptors = registry.resolve(ctx);
      if (descriptors.length === 0) {
        overlayModel = { guides: [], hud: [] };
        return false;
      }

      const point = getScenePointFromEvent(canvas, opt);
      const intents = normalizeModifierIntents(opt.e as MouseEvent);
      const snap = computeSnap({ point, intents });
      overlayModel = { guides: snap.guides, hud: snap.hud };
      return false;
    },
    onMouseUp: () => {
      overlayModel = { guides: [], hud: [] };
      return false;
    },
    applyObjectControls,
    getOverlayModel: () => overlayModel,
  };
}
