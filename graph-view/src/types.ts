export interface NodeDatum {
  id: string
  name?: string
  color?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface RawNode {
  node_id: string
  node_name: string
  color: string
  node_tag_links: string[]
  node_music_links: string[]
  node_author_links: string[]
  node_album_links: string[]
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
}
