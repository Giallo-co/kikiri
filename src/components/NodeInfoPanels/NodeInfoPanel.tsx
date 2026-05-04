import React from 'react';
import { RawNode } from '../../types/graph';
import { Music } from '../../types/music';
import MusicNodePanel from './MusicNodePanel';
import AuthorNodePanel from './AuthorNodePanel';
import TagNodePanel from './TagNodePanel';
import './NodePanels.css';

interface NodeInfoPanelProps {
  selectedNode: RawNode | null;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ selectedNode }) => {
  if (!selectedNode) return null;

  // Intentamos parsear el contenido si es una canción
  let musicData: Music | null = null;
  if (selectedNode.node_type === 'Music') {
    let content = selectedNode.node_content;
    if (typeof content === 'string') {
      try {
        musicData = JSON.parse(content) as Music;
      } catch (e) {
        console.error("Error parseando contenido de música", e);
      }
    } else {
      musicData = content as Music;
    }
  }

  return (
    <div className="node-info-panel-container">
      {/* RENDERIZADO CONDICIONAL AQUÍ */}
      {selectedNode.node_type === 'Music' && musicData && (
        <MusicNodePanel data={musicData} />
      )}
      
      {selectedNode.node_type === 'Author' && (
        <AuthorNodePanel node={selectedNode} />
      )}
      
      {selectedNode.node_type === 'Tag' && (
        <TagNodePanel node={selectedNode} />
      )}
    </div>
  );
};

export default NodeInfoPanel;