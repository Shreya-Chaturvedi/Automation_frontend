import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { webhookPayloadSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Offer letter submission endpoint
  app.post("/api/submit-offer-letter", async (req, res) => {
  try {
    const validationResult = webhookPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const payload = validationResult.data;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    // Demo mode if webhook not configured
    if (!webhookUrl || webhookUrl === "https://your-n8n-url/webhook/offer-letter") {
      console.log("Demo mode - payload would be sent:", payload);
      return res.status(200).json({
        success: true,
        message: "Offer letter submitted successfully (demo mode)",
      });
    }

    // Fire-and-forget n8n webhook call
    (async () => {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("n8n webhook error:", errorText);
        } else {
          console.log("n8n webhook success");
        }
      } catch (err) {
        console.error("Error calling n8n webhook:", err);
      }
    })();

    // Immediately return success
    return res.status(200).json({
      success: true,
      message: "Offer letter submitted successfully",
      note: "Webhook triggered asynchronously",
    });
  } catch (error) {
    console.error("Error submitting offer letter:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
