import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { NodeDatum, LinkDatum, GraphConfig } from '../types/graph'
import type { Music } from '../types/music'

interface Props {
  nodes: NodeDatum[]
  links: LinkDatum[]
  config: GraphConfig
  selectedId?: string | null
  onNodeClick: (nodeId: string, content: any) => void
  onDeselect?: () => void
}

const BASE_COLOR = '#2a2a2a'
const SELECTED_COLOR = '#ab90df'
const LINK_BASE = '#b0aca6'
const LINK_SELECTED = '#ab90df'
const FOCUS_ZOOM_LEVEL = 3.5 // variable to control zoom depth
const DESELECT_ZOOM_LEVEL = 0.4 // variable to control zoom when deselecting
const CENTER_EXCLUSION_RADIUS = 400 // radius of the "invisible wall" in the center
const EXCLUSION_ACTIVATION_DELAY = 2000 // ms to wait before activating the exclusion zone
const LINK_EXCLUSION_OPACITY = 0.3 // opacity of links when passing through the center (0 to 1)



export default function GraphView({ nodes, links, config, selectedId, onNodeClick, onDeselect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<NodeDatum, undefined> | null>(null)
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<SVGCircleElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const labelSelectionRef = useRef<d3.Selection<SVGTextElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const exclusionActiveRef = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      exclusionActiveRef.current = true
      if (simulationRef.current) simulationRef.current.alpha(0.1).restart()
    }, EXCLUSION_ACTIVATION_DELAY)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    onNodeClickRef.current = onNodeClick
  }, [onNodeClick])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const rect = svgEl.getBoundingClientRect()
    const width = rect.width || window.innerWidth
    const height = rect.height || window.innerHeight
    
    // Adjust visual center to account for PlayerBar (approx 100px)
    const playerBarHeight = 100
    const visualCenterY = (height - playerBarHeight) / 2

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    // Add mask definition
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
    mask.append('circle')
      .attr('cx', width / 2)
      .attr('cy', visualCenterY)
      .attr('r', CENTER_EXCLUSION_RADIUS)
      .attr('fill', maskColor)

    const g = svg.append('g')
    gRef.current = g

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform))

    zoomRef.current = zoom
    svg.call(zoom)

    // Set initial zoom level
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
      .force('center', d3.forceCenter(width / 2, visualCenterY))
      .force('exclusion', () => {
        if (!exclusionActiveRef.current) return
        const cx = width / 2
        const cy = visualCenterY
        const currentNodes = simulation.nodes()
        for (let i = 0, n = currentNodes.length; i < n; ++i) {
          const node = currentNodes[i]
          const dx = (node.x || 0) - cx
          const dy = (node.y || 0) - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CENTER_EXCLUSION_RADIUS) {
            const ratio = CENTER_EXCLUSION_RADIUS / (dist || 1)
            node.x = cx + dx * ratio
            node.y = cy + dy * ratio
          }
        }
      })

    simulation.on('tick', () => {
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
          .attr('y', d => (d.y ?? 0) + (config.nodeSize + 12))
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
    if (chargeForce) chargeForce.strength(config.repelForce * config.repelForcePercentage)

    const centerForce = simulation.force<d3.ForceCenter<NodeDatum>>('center')
    if (centerForce) centerForce.strength(config.centerForce)

    const oldNodes = simulation.nodes()
    const nodeMap = new Map(oldNodes.map(n => [n.id, n]))
    const newNodes = nodes.map(n => {
      const old = nodeMap.get(n.id)
      return old ? { ...old, ...n } : { ...n }
    })

    const newLinks = links.map(l => ({ ...l }))

    if (!g.select('.links-group').size()) {
      g.append('g')
        .attr('class', 'links-group')
        .attr('mask', 'url(#exclusion-mask)')
    }
    if (!g.select('.nodes-group').size()) g.append('g').attr('class', 'nodes-group')
    if (!g.select('.labels-group').size()) g.append('g').attr('class', 'labels-group')

    const linkGroup = g.select<SVGGElement>('.links-group')
    const nodeGroup = g.select<SVGGElement>('.nodes-group')
    const labelGroup = g.select<SVGGElement>('.labels-group')

    labelGroup.style('display', config.showLabels ? 'inline' : 'none')

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

        const x = node.x ?? width / 2
        const y = node.y ?? height / 2

        svg.transition().duration(750).call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(FOCUS_ZOOM_LEVEL)
            .translate(-x, -y)
        )
      }
    }

    nodeSelectionRef.current = nodeGroup
      .selectAll<SVGCircleElement, NodeDatum>('circle')
      .data(newNodes, d => d.id)
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
          }),
        update => update.attr('r', config.nodeSize),
        exit => exit.remove()
      )

    labelSelectionRef.current = labelGroup
      .selectAll<SVGTextElement, NodeDatum>('text')
      .data(newNodes, d => d.id)
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

    d3.select(svgRef.current).on('click', () => {
      onDeselect?.()
      if (zoomRef.current && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        d3.select(svgRef.current).transition().duration(750)
          .call(
            zoomRef.current.transform, 
            d3.zoomIdentity
              .translate(rect.width / 2, rect.height / 2)
              .scale(DESELECT_ZOOM_LEVEL)
              .translate(-rect.width / 2, -rect.height / 2)
          )
      }
    })

    simulation.nodes(newNodes)
    const linkF = simulation.force<d3.ForceLink<NodeDatum, any>>('link')
    if (linkF) linkF.links(newLinks)

    simulation.alpha(0.3).restart()
    updateHighlight()

    if (selectedId) {
      setTimeout(() => zoomToNode(selectedId), 50)
    }

  }, [nodes, links, config, selectedId])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
