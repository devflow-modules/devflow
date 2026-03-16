import express from "express";
import webhookRoutes from "./routes/webhook.js";
import apiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT ?? 3005;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/webhooks/whatsapp", webhookRoutes);
app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log(`WhatsApp Webhook API listening on port ${PORT}`);
});
