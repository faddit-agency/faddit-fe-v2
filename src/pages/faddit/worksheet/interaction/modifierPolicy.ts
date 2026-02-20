import type { ModifierIntents } from './types';

export function normalizeModifierIntents(event: KeyboardEvent | MouseEvent): ModifierIntents {
  return {
    preserveAspect: event.shiftKey,
    angleSnap: event.shiftKey,
    fromCenter: event.altKey,
    duplicateOnDrag: event.altKey,
    constrainAxis: event.shiftKey,
    fineAdjust: event.metaKey || event.ctrlKey,
  };
}
