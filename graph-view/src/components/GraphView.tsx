import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { NodeDatum, LinkDatum, GraphConfig } from '../types'

interface Props {
  nodes: NodeDatum[]
  links: LinkDatum[]
  config: GraphConfig
}

const BASE_COLOR = '#2a2a2a'
const SELECTED_COLOR = '#ab90df'
const LINK_BASE = '#b0aca6'
const LINK_SELECTED = '#ab90df'

export default function GraphView({ nodes, links, config }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<NodeDatum, undefined> | null>(null)
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<SVGCircleElement, NodeDatum, SVGGElement, unknown> | null>(null)
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null>(null)
  const selectedRef = useRef<string | null>(null)

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  // Initialize SVG and Simulation
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const rect = svgEl.getBoundingClientRect()
    const width = rect.width || window.innerWidth
    const height = rect.height || window.innerHeight

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const g = svg.append('g')
    gRef.current = g

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform))
    
    zoomRef.current = zoom
    svg.call(zoom)

    const simulation = d3.forceSimulation<NodeDatum>()
      .force('link', d3.forceLink<NodeDatum, any>().id(d => d.id))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))

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
    })

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [])

  // Update Data and Configuration
  useEffect(() => {
    const simulation = simulationRef.current
    const g = gRef.current
    if (!simulation || !g || !nodes.length) return

    // 1. Update Simulation Forces with Config
    const linkForce = simulation.force<d3.ForceLink<NodeDatum, any>>('link')
    if (linkForce) {
      linkForce.strength(config.linkForce).distance(config.linkDistance)
    }
    const chargeForce = simulation.force<d3.ForceManyBody<NodeDatum>>('charge')
    if (chargeForce) {
      chargeForce.strength(config.repelForce)
    }
    const centerForce = simulation.force<d3.ForceCenter<NodeDatum>>('center')
    if (centerForce) {
      centerForce.strength(config.centerForce)
    }

    // 2. Process Nodes (Preserve existing positions)
    const oldNodes = simulation.nodes()
    const nodeMap = new Map(oldNodes.map(n => [n.id, n]))
    const newNodes = nodes.map(n => {
      const old = nodeMap.get(n.id)
      return old ? { ...old, ...n } : { ...n }
    })

    // 3. Process Links
    const newLinks = links.map(l => ({ ...l }))

    // 4. Update Selections
    if (!g.select('.links-group').size()) {
      g.append('g').attr('class', 'links-group')
    }
    if (!g.select('.nodes-group').size()) {
      g.append('g').attr('class', 'nodes-group')
    }

    const linkGroup = g.select<SVGGElement>('.links-group')
    const nodeGroup = g.select<SVGGElement>('.nodes-group')

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
      const selId = selectedRef.current
      const nodeSet = new Set<string>()
      const linkSet = new Set<string>()

      if (selId !== null) {
        nodeSet.add(selId)
        newLinks.forEach((l: any) => {
          const srcId = typeof l.source === 'object' ? l.source.id : l.source
          const tgtId = typeof l.target === 'object' ? l.target.id : l.target
          if (srcId === selId || tgtId === selId) {
            linkSet.add(`${srcId}-${tgtId}`)
            nodeSet.add(srcId)
            nodeSet.add(tgtId)
          }
        })
      }

      if (nodeSelectionRef.current) {
        nodeSelectionRef.current.attr('fill', (n) => (selId === null || nodeSet.has(n.id)) ? SELECTED_COLOR : BASE_COLOR)
      }
      if (linkSelectionRef.current) {
        linkSelectionRef.current
          .attr('stroke', (l: any) => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target
            return (selId === null || linkSet.has(`${srcId}-${tgtId}`)) ? LINK_SELECTED : LINK_BASE
          })
          .attr('stroke-opacity', (l: any) => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target
            return (selId === null || linkSet.has(`${srcId}-${tgtId}`)) ? 1 : 0.3
          })
      }
    }

    nodeSelectionRef.current = nodeGroup
      .selectAll<SVGCircleElement, NodeDatum>('circle')
      .data(newNodes, d => d.id)
      .join(
        enter => enter.append('circle')
          .attr('r', config.nodeSize)
          .attr('fill', BASE_COLOR)
          .attr('cursor', 'pointer')
          .call(d3.drag<SVGCircleElement, NodeDatum>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (event, d) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            })
          )
          .on('click', (_event, d) => {
            const isSelected = selectedRef.current === d.id
            selectedRef.current = isSelected ? null : d.id
            updateHighlight()

            if (selectedRef.current && svgRef.current && zoomRef.current) {
              const svg = d3.select(svgRef.current)
              const rect = svgRef.current.getBoundingClientRect()
              const width = rect.width
              const height = rect.height
              
              // Smoothly transition to center the node
              svg.transition()
                .duration(750)
                .call(
                  zoomRef.current.transform,
                  d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(1.5) // Adjust zoom level on focus
                    .translate(-(d.x ?? 0), -(d.y ?? 0))
                )
            }
          }),
        update => update.attr('r', config.nodeSize),
        exit => exit.remove()
      )

    // Apply simulation updates
    simulation.nodes(newNodes)
    const linkF = simulation.force<d3.ForceLink<NodeDatum, any>>('link')
    if (linkF) linkF.links(newLinks)

    simulation.alpha(0.3).restart()
    updateHighlight()

  }, [nodes, links, config])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

