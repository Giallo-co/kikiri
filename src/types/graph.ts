export interface NodeDatum {
  id: string
  name?: string
  color?: string
  content?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface RawNode {
  node_id: string
  node_name: string
  color: string
  node_tag_links: {
    next: string[]
    previous: string[]
  }
  node_music_links: {
    next: string[]
    previous: string[]
  }
  node_author_links: {
    next: string[]
    previous: string[]
  }
  node_album_links: {
    next: string[]
    previous: string[]
  }
  [key: string]: any
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
  repelForcePercentage: number
  linkForce: number
  linkDistance: number
  showLabels: boolean
  innerExclusionRadius: number
  outerExclusionRadius: number
  enableOuterExclusion: boolean
  isOuterBoundaryDynamic: boolean
}
