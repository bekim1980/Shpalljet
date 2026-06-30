import type { IncomingMessage } from "node:http";
import { loadEnv, type Plugin } from "vite";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

/** Dev-only: serve /api/ai/generate-listing via Vite (GEMINI_API_KEY in .env). */
export function apiDevPlugin(): Plugin {
  return {
    name: "shpalljet-api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      if (env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/ai/generate-listing") return next();

        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };

        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.statusCode = 204;
          return res.end();
        }

        if (req.method !== "POST") {
          return send(405, { error: "Method not allowed" });
        }

        try {
          const { generateListingFromGemini } = await import(
            "../api/_lib/generateListingCore.ts"
          );
          const body = (await readJsonBody(req)) as {
            images?: string[];
            mimeTypes?: string[];
            userText?: string;
          };
          const images = body.images ?? [];
          const listing = await generateListingFromGemini({
            images: images.map((data, i) => ({
              data,
              mimeType: body.mimeTypes?.[i] ?? "image/jpeg",
            })),
            userText: body.userText,
          });
          send(200, { listing });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          if (msg === "rate_limit") return send(429, { error: "Rate limit exceeded" });
          if (msg.includes("GEMINI_API_KEY")) {
            return send(503, { error: "AI service not configured" });
          }
          console.error("[api-dev] generate-listing:", e);
          send(500, { error: "Failed to generate listing" });
        }
      });
    },
  };
}
