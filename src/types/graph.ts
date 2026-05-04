export interface NodeDatum {
  id: string
  name?: string
  color?: string
  content?: any
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface RawNode {
  node_id: string
  node_type: 'Tag' | 'Author' | 'Music' | 'Album'
  node_name: string
  node_color: string

  node_music_links_next: string[]
  node_music_links_previous: string[]

  node_tag_links_next: string[]
  node_tag_links_previous: string[]

  node_author_links_next: string[]
  node_author_links_previous: string[]

  node_album_links_next: string[]
  node_album_links_previous: string[]

  // Flattened Music properties (if node_type === 'Music')
  music_id?: string
  music_name?: string
  music_description?: string
  music_author?: string
  music_cover_url?: string
  music_url?: string
  music_album?: string
  likes?: number
  views?: number
  shares?: number
  comments?: number

  // Flattened Author properties (if node_type === 'Author')
  author_id?: string
  author_name?: string
  author_real_name?: string
  author_description?: string
  author_profile_picture?: string

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
  enableMasking: boolean
}
