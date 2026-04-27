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
  const selectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!nodes.length) return
    const svgEl = svgRef.current
    if (!svgEl) return

    const rect = svgEl.getBoundingClientRect()
    const width = rect.width || window.innerWidth
    const height = rect.height || window.innerHeight

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    selectedRef.current = null

    const g = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    )

    const nodesCopy: NodeDatum[] = nodes.map(n => ({ ...n }))
    const indexedLinks = links.map((l, i) => ({ source: l.source, target: l.target, _index: i }))

    const simulation = d3.forceSimulation<NodeDatum>(nodesCopy)
      .force('link', d3.forceLink<NodeDatum, typeof indexedLinks[0]>(indexedLinks)
        .id(d => d.id)
        .strength(config.linkForce)
        .distance(config.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(config.repelForce))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(config.centerForce))

    const link = g.append('g')
      .selectAll<SVGLineElement, typeof indexedLinks[0]>('line')
      .data(indexedLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', LINK_BASE)
      .attr('stroke-width', config.linkThickness)
      .attr('stroke-opacity', 0.7)

    const node = g.append('g')
      .selectAll<SVGCircleElement, NodeDatum>('circle')
      .data(nodesCopy)
      .join('circle')
      .attr('class', 'node')
      .attr('r', config.nodeSize)
      .attr('fill', BASE_COLOR)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        const isSelected = selectedRef.current === d.id
        selectedRef.current = isSelected ? null : d.id
        const selId = selectedRef.current

        const nodeSet = new Set<string>()
        const linkSet = new Set<number>()

        if (selId !== null) {
          nodeSet.add(selId)
          indexedLinks.forEach((l) => {
            const srcId = typeof l.source === 'string' ? l.source : (l.source as NodeDatum).id
            const tgtId = typeof l.target === 'string' ? l.target : (l.target as NodeDatum).id
            if (srcId === selId || tgtId === selId) {
              linkSet.add(l._index)
              nodeSet.add(srcId)
              nodeSet.add(tgtId)
            }
          })
        }

        node.attr('fill', (n) => (selId === null || nodeSet.has(n.id)) ? SELECTED_COLOR : BASE_COLOR)
        link.attr('stroke', (l) => (selId === null || linkSet.has(l._index)) ? LINK_SELECTED : LINK_BASE)
          .attr('stroke-opacity', (l) => (selId === null || linkSet.has(l._index)) ? 1 : 0.3)
      })
      .call(
        d3.drag<SVGCircleElement, NodeDatum>()
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

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeDatum).x ?? 0)
        .attr('y1', d => (d.source as NodeDatum).y ?? 0)
        .attr('x2', d => (d.target as NodeDatum).x ?? 0)
        .attr('y2', d => (d.target as NodeDatum).y ?? 0)

      node
        .attr('cx', d => d.x ?? 0)
        .attr('cy', d => d.y ?? 0)
    })

    return () => { simulation.stop() }
  }, [nodes, links, config])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
