export interface NodeDatum {
  id: string
  color?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface LinkDatum {
  source: string | NodeDatum
  target: string | NodeDatum
}

export interface GraphConfig {
  nodeSize: number
  linkThickness: number
  centerForce: number
  repelForce: number
  linkForce: number
  linkDistance: number
}
