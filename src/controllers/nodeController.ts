import { Request, Response, NextFunction } from "express";
import { NodeService } from "../services/nodeService";
import { NodeType } from "../types/graphTypes";

export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  public async getAllNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as NodeType | undefined;
      const nodes = await this.nodeService.getAllNodes(type);
      res.status(200).json({ data: nodes });
    } catch (error) {
      next(error);
    }
  }

  public async getNodeById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ message: "ID is required" });
      }
      const node = await this.nodeService.getNodeById(id);
      res.status(200).json({ data: node });
    } catch (error) {
      next(error);
    }
  }

  public async createNode(req: Request, res: Response, next: NextFunction) {
    try {
      const node = await this.nodeService.createNode(req.body);
      res.status(201).json({ data: node });
    } catch (error) {
      next(error);
    }
  }

  public async createNodeWithEdge(req: Request, res: Response, next: NextFunction) {
    try {
      const sourceId = req.params.sourceId as string;
      const { edgeFieldNext } = req.body;
      if (!sourceId || !edgeFieldNext) {
        return res.status(400).json({ message: "sourceId and edgeFieldNext are required" });
      }
      const node = await this.nodeService.createNodeWithEdge(req.body, sourceId, edgeFieldNext);
      res.status(201).json({ data: node });
    } catch (error) {
      next(error);
    }
  }

  public async linkNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const sourceId = req.params.sourceId as string;
      const targetId = req.params.targetId as string;
      const { sourceEdgeField, targetEdgeField } = req.body;
      if (!sourceId || !targetId || !sourceEdgeField) {
        return res.status(400).json({ message: "sourceId, targetId and sourceEdgeField are required" });
      }
      await this.nodeService.linkNodes(sourceId, targetId, sourceEdgeField, targetEdgeField);
      res.status(200).json({ message: "Nodes linked successfully" });
    } catch (error) {
      next(error);
    }
  }
}
