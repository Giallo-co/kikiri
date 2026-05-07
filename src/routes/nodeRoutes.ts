import { Router } from "express";
import { NodeController } from "../controllers/nodeController";
import { NodeService } from "../services/nodeService";
import { NodeRepository } from "../repositories/nodeRepository";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();
const nodeRepository = new NodeRepository();
const nodeService = new NodeService(nodeRepository);
const nodeController = new NodeController(nodeService);

router.get("/v1/nodes", authenticateToken, (req, res, next) =>
  nodeController.getAllNodes(req, res, next)
);
router.get("/v1/nodes/:id", authenticateToken, (req, res, next) =>
  nodeController.getNodeById(req, res, next)
);
router.post("/v1/nodes", authenticateToken, (req, res, next) =>
  nodeController.createNode(req, res, next)
);
router.post("/v1/nodes/:sourceId/edges", authenticateToken, (req, res, next) =>
  nodeController.createNodeWithEdge(req, res, next)
);
router.put("/v1/nodes/:sourceId/edges/:targetId", authenticateToken, (req, res, next) =>
  nodeController.linkNodes(req, res, next)
);

export default router;
