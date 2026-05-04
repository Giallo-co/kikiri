import type { GraphConfig } from './types/graph'

export const graphConfig: GraphConfig = {
  nodeSize: 6,
  linkThickness: 1,
  centerForce: 1,
  repelForce: -1000,
  repelForcePercentage: 1.0,
  linkForce: 0.4,
  linkDistance: 60,
  showLabels: true,
  innerExclusionRadius: 0,
  outerExclusionRadius: 600,
  enableOuterExclusion: true,
  isOuterBoundaryDynamic: false, // Cámbialo a false para que la frontera sea permanente
  enableMasking: false,
  }
