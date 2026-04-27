import { useMemo } from 'react'
import GraphView from './components/GraphView'
import { graphConfig } from './graphConfig'
import type { NodeDatum, LinkDatum } from './types'

const RAW_NODES: { id: string }[] = [
  { id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }, { id: 'n5' },
  { id: 'n6' }, { id: 'n7' }, { id: 'n8' }, { id: 'n9' }, { id: 'n10' },
  { id: 'n11' }, { id: 'n12' }, { id: 'n13' }, { id: 'n14' }, { id: 'n15' },
  { id: 'n16' }, { id: 'n17' }, { id: 'n18' }, { id: 'n19' }, { id: 'n20' },
  { id: 'n21' }, { id: 'n22' }, { id: 'n23' }, { id: 'n24' }, { id: 'n25' },
  { id: 'n26' }, { id: 'n27' }, { id: 'n28' }, { id: 'n29' }, { id: 'n30' }, { id: 'n31' },
]

const RAW_LINKS: { source: string; target: string }[] = [
  { source: 'n1', target: 'n2' }, { source: 'n1', target: 'n3' },
  { source: 'n2', target: 'n4' }, { source: 'n2', target: 'n5' },
  { source: 'n3', target: 'n5' }, { source: 'n3', target: 'n6' },
  { source: 'n4', target: 'n7' }, { source: 'n5', target: 'n7' },
  { source: 'n5', target: 'n8' }, { source: 'n6', target: 'n8' },
  { source: 'n6', target: 'n9' }, { source: 'n7', target: 'n10' },
  { source: 'n8', target: 'n10' }, { source: 'n8', target: 'n11' },
  { source: 'n9', target: 'n11' }, { source: 'n9', target: 'n12' },
  { source: 'n10', target: 'n13' }, { source: 'n11', target: 'n13' },
  { source: 'n11', target: 'n14' }, { source: 'n12', target: 'n14' },
  { source: 'n13', target: 'n15' }, { source: 'n14', target: 'n15' },
  { source: 'n15', target: 'n16' }, { source: 'n16', target: 'n17' },
  { source: 'n16', target: 'n18' }, { source: 'n17', target: 'n19' },
  { source: 'n18', target: 'n19' }, { source: 'n18', target: 'n20' },
  { source: 'n19', target: 'n21' }, { source: 'n20', target: 'n21' },
  { source: 'n20', target: 'n22' }, { source: 'n21', target: 'n23' },
  { source: 'n22', target: 'n23' }, { source: 'n22', target: 'n24' },
  { source: 'n23', target: 'n25' }, { source: 'n24', target: 'n25' },
  { source: 'n25', target: 'n26' }, { source: 'n26', target: 'n27' },
  { source: 'n1', target: 'n28' }, { source: 'n28', target: 'n29' },
  { source: 'n29', target: 'n30' }, { source: 'n10', target: 'n16' },
  { source: 'n4', target: 'n8' }, { source: 'n7', target: 'n13' },
]

export default function App() {
  const nodes = useMemo<NodeDatum[]>(() => RAW_NODES.map(n => ({ ...n })), [])
  const links = useMemo<LinkDatum[]>(() => RAW_LINKS.map(l => ({ ...l })), [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphView nodes={nodes} links={links} config={graphConfig} />
    </div>
  )
}
