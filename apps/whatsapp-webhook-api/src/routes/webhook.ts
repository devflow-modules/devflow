import { Router, type IRouter } from "express";
import { webhookController } from "../controllers/WebhookController.js";

const router: IRouter = Router();

router.get("/", (req, res) => webhookController.handleVerify(req, res));
router.post("/", (req, res) => webhookController.handleWebhook(req, res));

export default router;
