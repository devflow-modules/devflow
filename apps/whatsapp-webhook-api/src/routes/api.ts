import { Router, type IRouter } from "express";
import { resolveTenant } from "../middleware/resolveTenant.js";
import type { RequestWithTenant } from "../middleware/resolveTenant.js";
import { conversationService } from "../services/ConversationService.js";
import { messageService } from "../services/MessageService.js";

const router: IRouter = Router();

router.use(resolveTenant);

router.get("/conversations", async (req, res) => {
  const tenant = (req as RequestWithTenant).tenant;
  try {
    const conversations = await conversationService.listByTenant(tenant.id, 100);
    return res.json({ conversations, total: conversations.length });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const tenant = (req as unknown as RequestWithTenant).tenant;
  const conversationId = req.params.id;
  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversation id" });
  }
  try {
    const messages = await messageService.listByConversation(conversationId, {
      tenantId: tenant.id,
      limit: 100,
    });
    return res.json({ messages });
  } catch (err) {
    console.error("[GET /api/conversations/:id/messages]", err);
    return res.status(500).json({ error: "Failed to list messages" });
  }
});

export default router;
