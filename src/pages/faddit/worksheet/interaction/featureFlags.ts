const envFlag = import.meta.env.VITE_CANVA_INTERACTION_ENGINE;

export const ENABLE_CANVA_INTERACTION_ENGINE =
  envFlag === undefined ? true : envFlag === '1' || envFlag === 'true';
