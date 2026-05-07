import { NodeRepository } from "../repositories/nodeRepository";
import { BaseNode, NodeType } from "../types/graphTypes";
import { v4 as uuidv4 } from "uuid";
import config from "../config/config";

export class NodeService {
  constructor(private readonly nodeRepository: NodeRepository) {}

  public async getAllNodes(type?: NodeType): Promise<BaseNode[]> {
    return await this.nodeRepository.getNodesByType(type);
  }

  public async getNodeById(id: string): Promise<BaseNode> {
    const node = await this.nodeRepository.getNodeById(id);
    if (!node) {
      throw new Error(`Node with ID ${id} not found`);
    }
    return node;
  }

  private buildPublicUrl(key: string): string {
    return `${config.s3PublicBaseUrl}/${key}`;
  }

  private initializeBaseNode(node: Partial<BaseNode>): BaseNode {
    return {
      node_id: node.node_id || uuidv4(),
      node_type: node.node_type || "Tag",
      node_name: node.node_name || "",
      node_color: node.node_color || "#cccccc",
      node_music_links_next: node.node_music_links_next || [],
      node_music_links_previous: node.node_music_links_previous || [],
      node_tag_links_next: node.node_tag_links_next || [],
      node_tag_links_previous: node.node_tag_links_previous || [],
      node_author_links_next: node.node_author_links_next || [],
      node_author_links_previous: node.node_author_links_previous || [],
      node_album_links_next: node.node_album_links_next || [],
      node_album_links_previous: node.node_album_links_previous || [],
      ...node,
    } as BaseNode;
  }

  public async createNode(payload: any): Promise<BaseNode> {
    const nodeData = { ...payload };
    if (nodeData.coverKey) {
      nodeData.music_cover_url = this.buildPublicUrl(nodeData.coverKey);
    }
    if (nodeData.audioKey) {
      nodeData.music_url = this.buildPublicUrl(nodeData.audioKey);
    }
    if (nodeData.profilePictureKey) {
      nodeData.author_profile_picture = this.buildPublicUrl(nodeData.profilePictureKey);
    }

    const newNode = this.initializeBaseNode(nodeData);
    await this.nodeRepository.createNode(newNode);
    return newNode;
  }

  public async createNodeWithEdge(
    payload: any,
    sourceId: string,
    edgeFieldNext: string
  ): Promise<BaseNode> {
    const nodeData = { ...payload };
    if (nodeData.coverKey) {
      nodeData.music_cover_url = this.buildPublicUrl(nodeData.coverKey);
    }
    if (nodeData.audioKey) {
      nodeData.music_url = this.buildPublicUrl(nodeData.audioKey);
    }
    if (nodeData.profilePictureKey) {
      nodeData.author_profile_picture = this.buildPublicUrl(nodeData.profilePictureKey);
    }

    const newNode = this.initializeBaseNode(nodeData);
    await this.nodeRepository.createNodeWithEdge(newNode, sourceId, edgeFieldNext);
    return newNode;
  }

  public async linkNodes(
    sourceId: string,
    targetId: string,
    sourceEdgeField: string,
    targetEdgeField?: string
  ): Promise<void> {
    await this.nodeRepository.addEdgeBetweenNodes(
      sourceId,
      targetId,
      sourceEdgeField,
      targetEdgeField
    );
  }
}
