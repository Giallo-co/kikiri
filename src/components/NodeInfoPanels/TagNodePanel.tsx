import React from 'react';
import { RawNode } from '../../types/graph';

interface TagNodePanelProps {
  node: RawNode;
}

const TagNodePanel: React.FC<TagNodePanelProps> = ({ node }) => {
  return (
    <div className="info-card tag-card" style={{ borderLeft: `4px solid ${node.color}` }}>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Género / Etiqueta</p>
      <h3 style={{ margin: '4px 0 0', color: '#fff' }}>#{node.node_name}</h3>
    </div>
  );
};

export default TagNodePanel;