import { useEffect, useRef, useCallback } from 'react'
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
  const simulationRef = useRef<d3.Simulation<NodeDatum, LinkDatum> | null>(null)
  const selectedRef = useRef<string | null>(null)

  const applySelection = useCallback((svgEl: SVGSVGElement, selectedId: string | null) => {
    const nodeSet = new Set<string>()
    const linkSet = new Set<number>()

    if (selectedId !== null) {
      nodeSet.add(selectedId)
      links.forEach((l, i) => {
        const srcId = typeof l.source === 'string' ? l.source : l.source.id
        const tgtId = typeof l.target === 'string' ? l.target : l.target.id
        if (srcId === selectedId || tgtId === selectedId) {
          linkSet.add(i)
          nodeSet.add(srcId)
          nodeSet.add(tgtId)
        }
      })
    }

    d3.select(svgEl).selectAll<SVGCircleElement, NodeDatum>('circle.node')
      .attr('fill', d => (selectedId === null || nodeSet.has(d.id)) ? SELECTED_COLOR : BASE_COLOR)

    d3.select(svgEl).selectAll<SVGLineElement, LinkDatum & { _index: number }>('line.link')
      .attr('stroke', d => (selectedId === null || linkSet.has(d._index)) ? LINK_SELECTED : LINK_BASE)
      .attr('stroke-opacity', d => (selectedId === null || linkSet.has(d._index)) ? 1 : 0.4)
  }, [links])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const { width, height } = svgEl.getBoundingClientRect()
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const g = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    )

    const indexedLinks = links.map((l, i) => ({ ...l, _index: i }))

    const simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(indexedLinks)
        .id(d => d.id)
        .strength(config.linkForce)
        .distance(config.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(config.repelForce))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(config.centerForce))

    simulationRef.current = simulation

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
      .data(nodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', config.nodeSize)
      .attr('fill', BASE_COLOR)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        if (selectedRef.current === d.id) {
          selectedRef.current = null
          applySelection(svgEl, null)
        } else {
          selectedRef.current = d.id
          applySelection(svgEl, d.id)
        }
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

    return () => {
      simulation.stop()
    }
  }, [nodes, links, config, applySelection])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
