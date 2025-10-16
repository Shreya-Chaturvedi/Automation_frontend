import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { webhookPayloadSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Offer letter submission endpoint
  app.post("/api/submit-offer-letter", async (req, res) => {
    try {
      // Validate the request body
      const validationResult = webhookPayloadSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors,
        });
      }

      const payload = validationResult.data;

      // n8n webhook URL - can be configured via environment variable
      const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.srv812138.hstgr.cloud/webhook/a3853102-c01f-4a87-8158-f6ead21a1d37";

      // If no webhook URL is configured, simulate success for demo/testing
      if (!webhookUrl || webhookUrl === "https://your-n8n-url/webhook/offer-letter") {
        console.log("No n8n webhook configured - simulating success for demo");
        console.log("Payload would be sent:", JSON.stringify(payload, null, 2));
        return res.status(200).json({
          success: true,
          message: "Offer letter submitted successfully (demo mode)",
          note: "Configure N8N_WEBHOOK_URL environment variable to send to actual n8n webhook",
        });
      }

      // Forward the payload to the n8n webhook
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("n8n webhook error:", errorText);
          return res.status(response.status).json({
            error: "Failed to submit to n8n webhook",
            details: errorText,
          });
        }

        const result = await response.json().catch(() => ({}));

        return res.status(200).json({
          success: true,
          message: "Offer letter submitted successfully",
          data: result,
        });
      } catch (fetchError) {
        console.error("Error calling n8n webhook:", fetchError);
        return res.status(500).json({
          error: "Failed to connect to n8n webhook",
          message: fetchError instanceof Error ? fetchError.message : "Network error",
        });
      }
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
