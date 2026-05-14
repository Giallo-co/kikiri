import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { NodeDatum, LinkDatum, GraphConfig } from '../types/graph'
import type { Music } from '../types/music'
import './GraphView.css'
import './Login/Login.css'

interface Props {
  nodes: NodeDatum[]
  links: LinkDatum[]
  config: GraphConfig
  selectedId?: string | null
  playingNodeId?: string | null
  fixedNodeId?: string | null
  shouldFocus?: boolean
  showComment?: boolean
  isLoggedIn?: boolean
  centerBackground?: boolean
  searchQuery?: string
  showSearchBar?: boolean
  searchTrigger?: number
  onNodeClick: (nodeId: string, content: any) => void
  onDeselect?: () => void
  /** Return true when the graph should pull back to overview zoom (2+ matches). Single/empty → false (node focus or unchanged). */
  onSearch?: (query: string) => boolean
}

const BASE_COLOR = '#2a2a2a'
const SELECTED_COLOR = '#ab90df'
const LINK_BASE = '#b0aca6'
const LINK_SELECTED = '#ab90df'
const FOCUS_ZOOM_LEVEL = 1.5
const SEARCH_FOCUS_ZOOM = 1.0
const DESELECT_ZOOM_LEVEL = 0.4
const ZOOM_TRANSITION_MS = 750
const LINK_EXCLUSION_OPACITY = 0.2
const EXCLUSION_TRANSITION_SPEED = 200
const OUTER_EXCLUSION_TRANSITION_SPEED = 1000

export default function GraphView({ nodes, links, config, selectedId, playingNodeId, fixedNodeId, shouldFocus = true, showComment = false, isLoggedIn, centerBackground = false, searchQuery, showSearchBar, searchTrigger, onNodeClick, onDeselect, onSearch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<NodeDatum, undefined> | null>(null)
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<SVGCircleElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const labelSelectionRef = useRef<d3.Selection<SVGTextElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null>(null)
  const commentSelectionRef = useRef<d3.Selection<SVGForeignObjectElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  const onDeselectRef = useRef(onDeselect)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const exclusionActiveRef = useRef(false)
  const currentExclusionRadiusRef = useRef(0)
  const currentOuterExclusionRadiusRef = useRef(10000)
  const isSelectedRef = useRef(false)
  const isRadiusSuppressedRef = useRef(false)
  const maskCircleRef = useRef<d3.Selection<SVGCircleElement, unknown, null, undefined> | null>(null)
  const maskOuterCircleRef = useRef<d3.Selection<SVGCircleElement, unknown, null, undefined> | null>(null)
  const configRef = useRef(config)
  const fixedNodeIdRef = useRef(fixedNodeId)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [hideOverlay, setHideOverlay] = useState(false)

  useEffect(() => {
    if (showSearchBar) {
      if (searchQuery) {
        setHideOverlay(true)
      } else {
        setHideOverlay(false)
      }
      
      if (svgRef.current && zoomRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const visualCenterY = centerBackground ? (height / 2) : ((height - 72) / 2)

        const targetX = width / 2
        const targetY = visualCenterY

        d3.select(svgRef.current)
          .transition()
          .duration(ZOOM_TRANSITION_MS)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity
              .translate(width / 2, visualCenterY)
              .scale(DESELECT_ZOOM_LEVEL)
              .translate(-targetX, -targetY)
          )
        
        configRef.current = {
          ...configRef.current,
          innerExclusionRadius: 600,
          outerExclusionRadius: 600,
        }
        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart()
        }

        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 100)
      }
    } else {
      configRef.current = {
        ...configRef.current,
        innerExclusionRadius: 0,
        outerExclusionRadius: 600,
      }
      if (simulationRef.current) {
        simulationRef.current.alpha(0.3).restart()
      }
    }
  }, [showSearchBar, searchTrigger, searchQuery, centerBackground])

  useEffect(() => {
    configRef.current = config
    fixedNodeIdRef.current = fixedNodeId
  }, [config, fixedNodeId])

  useEffect(() => {
    const wasSelected = isSelectedRef.current
    isSelectedRef.current = !!selectedId

    if (selectedId || !isLoggedIn) {
      isRadiusSuppressedRef.current = true
    } else {
      isRadiusSuppressedRef.current = false
    }

    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart()
    }
  }, [selectedId, isLoggedIn])

  useEffect(() => {
    exclusionActiveRef.current = true
    if (simulationRef.current) simulationRef.current.alpha(0.1).restart()
  }, [])

  useEffect(() => {
    onNodeClickRef.current = onNodeClick
    onDeselectRef.current = onDeselect
  }, [onNodeClick, onDeselect])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const rect = svgEl.getBoundingClientRect()
    const width = rect.width || window.innerWidth
    const height = rect.height || window.innerHeight
    
    const playerBarHeight = 72
    const visualCenterY = centerBackground ? (height / 2) : ((height - playerBarHeight) / 2)

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')
    const mask = defs.append('mask')
      .attr('id', 'exclusion-mask')
      .attr('maskUnits', 'userSpaceOnUse')
      .attr('x', -5000)
      .attr('y', -5000)
      .attr('width', 10000)
      .attr('height', 10000)

    mask.append('rect')
      .attr('x', -5000)
      .attr('y', -5000)
      .attr('width', 10000)
      .attr('height', 10000)
      .attr('fill', 'white')

    const v = Math.floor(LINK_EXCLUSION_OPACITY * 255)
    const maskColor = `rgb(${v},${v},${v})`
    maskCircleRef.current = mask.append('circle')
      .attr('cx', width / 2)
      .attr('cy', visualCenterY)
      .attr('r', 0)
      .attr('fill', maskColor)

    maskOuterCircleRef.current = mask.append('circle')
      .attr('cx', width / 2)
      .attr('cy', visualCenterY)
      .attr('r', config.outerExclusionRadius + 5000)
      .attr('stroke-width', 10000)
      .attr('stroke', maskColor)
      .attr('fill', 'none')

    const g = svg.append('g')
    gRef.current = g

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform))

    zoomRef.current = zoom
    svg.call(zoom)
    svg.on("dblclick.zoom", null)

    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, visualCenterY)
        .scale(DESELECT_ZOOM_LEVEL)
        .translate(-width / 2, -visualCenterY)
    )

    const simulation = d3.forceSimulation<NodeDatum>()
      .force('link', d3.forceLink<NodeDatum, any>().id(d => d.id))
      .force('charge', d3.forceManyBody())
      .force('collide', d3.forceCollide<NodeDatum>().radius(d => configRef.current.nodeSize + 4).iterations(2))
      .force('center', d3.forceCenter(width / 2, visualCenterY))
      .force('exclusion', () => {
        if (!exclusionActiveRef.current) return
        
        const targetRadius = !isRadiusSuppressedRef.current ? configRef.current.innerExclusionRadius : 0
        const targetOuterRadius = (configRef.current.isOuterBoundaryDynamic && isRadiusSuppressedRef.current) 
          ? 10000 
          : configRef.current.outerExclusionRadius
        
        if (!isRadiusSuppressedRef.current && currentExclusionRadiusRef.current === 0) {
          currentExclusionRadiusRef.current = 10 
        }

        if (currentExclusionRadiusRef.current < targetRadius) {
          currentExclusionRadiusRef.current = Math.min(targetRadius, currentExclusionRadiusRef.current + EXCLUSION_TRANSITION_SPEED)
        } else if (currentExclusionRadiusRef.current > targetRadius) {
          currentExclusionRadiusRef.current = Math.max(targetRadius, currentExclusionRadiusRef.current - EXCLUSION_TRANSITION_SPEED)
        }

        if (currentOuterExclusionRadiusRef.current < targetOuterRadius) {
          currentOuterExclusionRadiusRef.current = Math.min(targetOuterRadius, currentOuterExclusionRadiusRef.current + OUTER_EXCLUSION_TRANSITION_SPEED)
        } else if (currentOuterExclusionRadiusRef.current > targetOuterRadius) {
          currentOuterExclusionRadiusRef.current = Math.max(targetOuterRadius, currentOuterExclusionRadiusRef.current - OUTER_EXCLUSION_TRANSITION_SPEED)
        }

        if (maskCircleRef.current) {
          maskCircleRef.current.attr('r', isRadiusSuppressedRef.current ? 0 : currentExclusionRadiusRef.current)
        }
        if (maskOuterCircleRef.current) {
          const shouldHideMask = configRef.current.isOuterBoundaryDynamic && isRadiusSuppressedRef.current
          const visualOuterR = shouldHideMask ? 0 : currentOuterExclusionRadiusRef.current
          maskOuterCircleRef.current.attr('r', visualOuterR > 0 ? visualOuterR + 5000 : 0)
        }

        const cx = width / 2
        const cy = visualCenterY
        const currentNodes = simulation.nodes()
        const innerRadius = currentExclusionRadiusRef.current
        const outerRadius = currentOuterExclusionRadiusRef.current

        for (let i = 0, n = currentNodes.length; i < n; ++i) {
          const node = currentNodes[i]
          if (node.isComment) continue

          if (fixedNodeIdRef.current && node.id === fixedNodeIdRef.current) {
            node.x = cx
            node.y = cy
            node.fx = cx
            node.fy = cy
            continue
          }

          let dx = (node.x || 0) - cx
          let dy = (node.y || 0) - cy
          let dist = Math.sqrt(dx * dx + dy * dy)

          if (dist === 0) {
            node.x = cx + (Math.random() - 0.5) * 2
            node.y = cy + (Math.random() - 0.5) * 2
            continue
          }

          if (innerRadius > 0 && dist < innerRadius) {
            const ratio = innerRadius / dist
            node.x = cx + dx * ratio
            node.y = cy + dy * ratio
          }

          if (configRef.current.enableOuterExclusion && outerRadius < 10000 && dist > outerRadius) {
            const ratio = outerRadius / dist
            node.x = cx + dx * ratio
            node.y = cy + dy * ratio
          }
        }
      })

    simulation.on('tick', () => {
      const time = Date.now() / 1000
      const oscillation = 1 + Math.sin(time * 2) * 0.1
      const centerForce = simulation.force<d3.ForceCenter<NodeDatum>>('center')
      if (centerForce) centerForce.strength(configRef.current.centerForce * oscillation)

      if (linkSelectionRef.current) {
        linkSelectionRef.current
          .attr('x1', d => (d.source as any).x ?? 0)
          .attr('y1', d => (d.source as any).y ?? 0)
          .attr('x2', d => (d.target as any).x ?? 0)
          .attr('y2', d => (d.target as any).y ?? 0)
      }
      if (nodeSelectionRef.current) {
        nodeSelectionRef.current
          .attr('cx', d => d.x ?? 0)
          .attr('cy', d => d.y ?? 0)
      }
      if (labelSelectionRef.current) {
        labelSelectionRef.current
          .attr('x', d => d.x ?? 0)
          .attr('y', d => (d.y ?? 0) + (configRef.current.nodeSize + 12))
      }
      if (commentSelectionRef.current && svgRef.current) {
        const transform = d3.zoomTransform(svgRef.current)
        const padding = 20
        const w = 220
        const h = 160

        commentSelectionRef.current
          .attr('x', d => {
            const lx = (d.x ?? 0) - w / 2
            const minLx = (padding - transform.x) / transform.k
            const maxLx = (width - padding - transform.x) / transform.k - w
            return Math.max(minLx, Math.min(maxLx, lx))
          })
          .attr('y', d => {
            const ly = (d.y ?? 0) - h / 2
            const minLy = (padding - transform.y) / transform.k
            const maxLy = (height - 72 - padding - transform.y) / transform.k - h
            return Math.max(minLy, Math.min(maxLy, ly))
          })
      }
    })

    simulationRef.current = simulation
    return () => { simulation.stop() }
  }, [])

  useEffect(() => {
    const simulation = simulationRef.current
    const g = gRef.current
    if (!simulation || !g || !nodes.length) return

    const linkForce = simulation.force<d3.ForceLink<NodeDatum, any>>('link')
    if (linkForce) linkForce.strength(config.linkForce).distance(config.linkDistance)

    const chargeForce = simulation.force<d3.ForceManyBody<NodeDatum>>('charge')
    if (chargeForce) {
      chargeForce.strength(config.repelForce * config.repelForcePercentage)
      chargeForce.theta(0.85)
    }

    const centerForce = simulation.force<d3.ForceCenter<NodeDatum>>('center')
    if (centerForce) centerForce.strength(config.centerForce)

    const collideForce = simulation.force<d3.ForceCollide<NodeDatum>>('collide')
    if (collideForce) collideForce.radius(d => config.nodeSize + 4)

    const oldNodes = simulation.nodes()
    const nodeMap = new Map(oldNodes.map(n => [n.id, n]))
    let newNodes = nodes.map(n => {
      const old = nodeMap.get(n.id)
      return old ? { ...old, ...n } : { ...n }
    })

    let newLinks = links.map(l => ({ ...l }))

    if (showComment && selectedId) {
      const selectedNode = newNodes.find(n => n.id === selectedId)
      if (selectedNode) {
        const description = selectedNode.content?.music_description || selectedNode.content?.author_description || 'No description available'
        const commentNode: NodeDatum = nodeMap.get('comment-node') || {
          id: 'comment-node',
          name: 'Comment',
          x: (selectedNode.x || 0) + 50,
          y: (selectedNode.y || 0) + 50,
        }
        commentNode.content = { ...selectedNode.content, display_description: description }
        commentNode.isComment = true
        
        newNodes.push(commentNode)
        newLinks.push({
          source: selectedId,
          target: 'comment-node'
        })
      }
    }

    if (!g.select('.links-group').size()) {
      g.append('g')
        .attr('class', 'links-group')
    }
    
    g.select('.links-group')
      .attr('mask', config.enableMasking ? 'url(#exclusion-mask)' : null)

    if (!g.select('.nodes-group').size()) g.append('g').attr('class', 'nodes-group')
    if (!g.select('.labels-group').size()) g.append('g').attr('class', 'labels-group')
    if (!g.select('.comments-group').size()) g.append('g').attr('class', 'comments-group')

    const linkGroup = g.select<SVGGElement>('.links-group')
    const nodeGroup = g.select<SVGGElement>('.nodes-group')
    const labelGroup = g.select<SVGGElement>('.labels-group')
    const commentGroup = g.select<SVGGElement>('.comments-group')

    labelGroup.style('display', config.showLabels ? 'inline' : 'none')

    commentSelectionRef.current = commentGroup
      .selectAll<SVGForeignObjectElement, NodeDatum>('foreignObject')
      .data(newNodes.filter(n => n.isComment), d => d.id)
      .join(
        enter => enter.append('foreignObject')
          .attr('width', 220)
          .attr('height', 160)
          .call(d3.drag<SVGForeignObjectElement, NodeDatum>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x; d.fy = d.y
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null; d.fy = null
            })
          )
          .html(d => `
            <div class="login-card" style="padding: 20px; width: 100%; height: 100%; box-sizing: border-box; background: rgba(255,255,255,0.01); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: none; pointer-events: auto; font-family: 'Inter', -apple-system, sans-serif; display: flex; flex-direction: column;">
              <div class="login-card-inner" style="position: relative; height: 100%; display: flex; flex-direction: column;">
                <div class="login-header" style="margin-bottom: 12px;">
                  <h2 style="font-size: 0.9rem; font-weight: 400; letter-spacing: 0.5px; margin: 0; color: #000;">[ Description ]</h2>
                </div>
                <div style="font-size: 0.75rem; color: #666; line-height: 1.4; overflow-y: auto; flex: 1; padding-right: 4px;">
                  ${d.content?.display_description || ''}
                </div>
              </div>
            </div>
          `),
        update => update.html(d => `
            <div class="login-card" style="padding: 20px; width: 100%; height: 100%; box-sizing: border-box; background: rgba(255,255,255,0.01); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: none; pointer-events: auto; font-family: 'Inter', -apple-system, sans-serif; display: flex; flex-direction: column;">
              <div class="login-card-inner" style="position: relative; height: 100%; display: flex; flex-direction: column;">
                <div class="login-header" style="margin-bottom: 12px;">
                  <h2 style="font-size: 0.9rem; font-weight: 400; letter-spacing: 0.5px; margin: 0; color: #000;">[ Description ]</h2>
                </div>
                <div style="font-size: 0.75rem; color: #666; line-height: 1.4; overflow-y: auto; flex: 1; padding-right: 4px;">
                  ${d.content?.display_description || ''}
                </div>
              </div>
            </div>
        `),
        exit => exit.remove()
      )

    linkSelectionRef.current = linkGroup
      .selectAll<SVGLineElement, any>('line')
      .data(newLinks, (l: any) => `${l.source.id || l.source}-${l.target.id || l.target}`)
      .join(
        enter => enter.append('line')
          .attr('stroke', LINK_BASE)
          .attr('stroke-width', config.linkThickness)
          .attr('stroke-opacity', 0.7),
        update => update.attr('stroke-width', config.linkThickness),
        exit => exit.remove()
      )

    const updateHighlight = () => {
      const selId = selectedId ?? null
      const nodeSet = new Set<string>()

      if (selId !== null) {
        nodeSet.add(selId)
        newLinks.forEach((l: any) => {
          const srcId = typeof l.source === 'object' ? l.source.id : l.source
          const tgtId = typeof l.target === 'object' ? l.target.id : l.target
          if (srcId === selId || tgtId === selId) {
            nodeSet.add(srcId)
            nodeSet.add(tgtId)
          }
        })
      }

      if (nodeSelectionRef.current) {
        nodeSelectionRef.current
          .transition().duration(300)
          .attr('fill', (n) => {
            if (selId === null || nodeSet.has(n.id)) return n.color || (selId === null ? BASE_COLOR : SELECTED_COLOR)
            return BASE_COLOR
          })
          .attr('opacity', (n) => (selId === null || nodeSet.has(n.id)) ? 1 : 0.3)
      }

      if (labelSelectionRef.current) {
        labelSelectionRef.current
          .transition().duration(300)
          .attr('opacity', (n) => (selId === null || nodeSet.has(n.id)) ? 1 : 0.1)
      }

      if (linkSelectionRef.current) {
        linkSelectionRef.current
          .transition().duration(300)
          .attr('stroke', (l: any) => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target
            return selId !== null && (srcId === selId || tgtId === selId) ? LINK_SELECTED : LINK_BASE
          })
          .attr('stroke-opacity', (l: any) => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target
            const isRelated = selId !== null && (srcId === selId || tgtId === selId)
            if (selId === null) return 0.7
            return isRelated ? 1 : 0.1
          })
      }
    }

    const zoomToNode = (id: string) => {
      const node = newNodes.find(n => n.id === id)
      if (node && svgRef.current && zoomRef.current) {
        const svg = d3.select(svgRef.current)
        const rect = svgRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const visualCenterY = centerBackground ? (height / 2) : ((height - 72) / 2)

        const x = node.x ?? width / 2
        const y = node.y ?? visualCenterY

        svg.transition().duration(ZOOM_TRANSITION_MS).call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(width / 2, visualCenterY)
            .scale(FOCUS_ZOOM_LEVEL)
            .translate(-x, -y)
        )
      }
    }

    nodeSelectionRef.current = nodeGroup
      .selectAll<SVGCircleElement, NodeDatum>('circle')
      .data(newNodes.filter(n => !n.isComment), d => d.id)
      .join(
        enter => enter.append('circle')
          .attr('r', config.nodeSize)
          .attr('fill', d => d.color || BASE_COLOR)
          .attr('cursor', 'pointer')
          .call(d3.drag<SVGCircleElement, NodeDatum>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x; d.fy = d.y
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null; d.fy = null
            })
          )
          .on('click', (event, d) => {
            event.stopPropagation()
            let content = d.content
            if (typeof content === 'string') {
              try { content = JSON.parse(content) } catch {}
            }
            onNodeClickRef.current(d.id, content)
            fetch('/api/node-selected', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: d.id, name: d.name, content })
            }).catch(err => console.error('Failed to notify backend:', err))
          })
          .on('dblclick', (event, d) => {
            event.stopPropagation()
            zoomToNode(d.id)
          }),
        update => update.attr('r', config.nodeSize),
        exit => exit.remove()
      )

    labelSelectionRef.current = labelGroup
      .selectAll<SVGTextElement, NodeDatum>('text')
      .data(newNodes.filter(n => !n.isComment), d => d.id)
      .join(
        enter => enter.append('text')
          .text(d => d.name || d.id)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', LINK_BASE)
          .attr('pointer-events', 'none')
          .attr('font-family', 'sans-serif'),
        update => update.text(d => d.name || d.id),
        exit => exit.remove()
      )

    const svgS = d3.select(svgRef.current)
    svgS.on('click', null)
    svgS.on('dblclick', null)

    let clickTimer: any = null
    svgS.on('click', (event) => {
      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
        return
      }

      clickTimer = setTimeout(() => {
        if (!event.defaultPrevented) {
          onDeselectRef.current?.()
          onSearch?.('')
          
          if (zoomRef.current && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect()
            const visualCenterY = centerBackground ? (rect.height / 2) : ((rect.height - 72) / 2)
            d3.select(svgRef.current).transition().duration(ZOOM_TRANSITION_MS)
              .call(
                zoomRef.current.transform, 
                d3.zoomIdentity
                  .translate(rect.width / 2, visualCenterY)
                  .scale(DESELECT_ZOOM_LEVEL)
                  .translate(-rect.width / 2, -visualCenterY)
              )
          }
        }
        clickTimer = null
      }, 250)
    })

    svgS.on('dblclick', (event) => {
      event.preventDefault()
      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
      }
      
      const targetId = selectedId || playingNodeId
      if (targetId) {
        const node = newNodes.find(n => n.id === targetId)
        if (node) {
          onNodeClickRef.current(node.id, node.content)
          zoomToNode(targetId)
        }
      }
    })

    simulation.nodes(newNodes)
    const linkF = simulation.force<d3.ForceLink<NodeDatum, any>>('link')
    if (linkF) linkF.links(newLinks)

    simulation.alpha(0.3).restart()
    updateHighlight()

    if (selectedId && shouldFocus) {
      setTimeout(() => zoomToNode(selectedId), 50)
    } else if (!selectedId && !searchQuery && svgRef.current && zoomRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const visualCenterY = centerBackground ? (rect.height / 2) : ((rect.height - 72) / 2)
      d3.select(svgRef.current).transition().duration(ZOOM_TRANSITION_MS).call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(rect.width / 2, visualCenterY)
          .scale(DESELECT_ZOOM_LEVEL)
          .translate(-rect.width / 2, -visualCenterY)
      )
    }
  }, [nodes, links, config, selectedId, playingNodeId, shouldFocus, showComment, searchQuery])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {showSearchBar && !hideOverlay && (
        <div 
          className="search-bar-container" 
          style={{ width: config.searchBarWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="search-input-wrapper">
            <input 
              ref={searchInputRef}
              type="text" 
              className="search-input" 
              placeholder="Search"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value
                  const useOverviewZoom = onSearch?.(val) === true
                  setHideOverlay(true)
                  configRef.current = {
                    ...configRef.current,
                    innerExclusionRadius: 0
                  }
                  if (simulationRef.current) {
                    simulationRef.current.alpha(0.3).restart()
                  }
                  if (useOverviewZoom && svgRef.current && zoomRef.current) {
                    const rect = svgRef.current.getBoundingClientRect()
                    const width = rect.width
                    const height = rect.height
                    const visualCenterY = centerBackground ? (height / 2) : ((height - 72) / 2)
                    d3.select(svgRef.current)
                      .transition()
                      .duration(ZOOM_TRANSITION_MS)
                      .call(
                        zoomRef.current.transform,
                        d3.zoomIdentity
                          .translate(width / 2, visualCenterY)
                          .scale(SEARCH_FOCUS_ZOOM)
                          .translate(-width / 2, -visualCenterY)
                      )
                  }
                }
              }}
            />
            <div className="search-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
          <div className="search-subtitle">
            Type keyword to search
          </div>
        </div>
      )}
    </div>
  )
}
