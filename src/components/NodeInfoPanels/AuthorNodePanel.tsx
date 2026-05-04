import React from 'react';
import { RawNode } from '../../types/graph';

interface AuthorNodePanelProps {
  node: RawNode;
}

const AuthorNodePanel: React.FC<AuthorNodePanelProps> = ({ node }) => {
  // Asumimos que node.node_name es el nombre del autor
  return (
    <div className="info-card author-card">
      <div className="author-avatar-placeholder">
        {node.node_name.substring(0, 1).toUpperCase()}
      </div>
      <div>
        <h3>{node.node_name}</h3>
        <p>Autor / Artista</p>
      </div>
    </div>
  );
};

export default AuthorNodePanel;