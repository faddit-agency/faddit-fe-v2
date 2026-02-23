import type { ElementInteractionContext, InteractionControlDescriptor } from './types';

type ControlFactory = (ctx: ElementInteractionContext) => InteractionControlDescriptor[];

export class ControlRegistry {
  private factories: ControlFactory[] = [];

  register(factory: ControlFactory): void {
    this.factories.push(factory);
  }

  resolve(ctx: ElementInteractionContext): InteractionControlDescriptor[] {
    return this.factories
      .flatMap((factory) => factory(ctx))
      .filter((descriptor) => descriptor.appliesTo(ctx));
  }
}
