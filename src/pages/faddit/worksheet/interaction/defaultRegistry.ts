import { ControlRegistry } from './controlRegistry';

export function createDefaultControlRegistry(): ControlRegistry {
  const registry = new ControlRegistry();

  registry.register((ctx) => {
    if (!ctx.capabilities.endpointEdit) return [];
    return [
      {
        id: 'endpoint-controls',
        appliesTo: () => true,
        handles: [
          { id: 'start', role: 'endpoint' },
          { id: 'end', role: 'endpoint' },
        ],
      },
    ];
  });

  registry.register((ctx) => {
    if (!ctx.capabilities.resize) return [];
    return [
      {
        id: 'box-controls',
        appliesTo: () => true,
        handles: [
          { id: 'tl', role: 'corner' },
          { id: 'tr', role: 'corner' },
          { id: 'br', role: 'corner' },
          { id: 'bl', role: 'corner' },
        ],
      },
    ];
  });

  return registry;
}
