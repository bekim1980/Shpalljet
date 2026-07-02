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

/** Dev-only: serve /api/ai/generate-listing and /api/auth/* (NextAuth) via Vite. */
export function apiDevPlugin(): Plugin {
  return {
    name: "shpalljet-api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      if (env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
      }
      for (const key of [
        "AUTH_SECRET",
        "NEXTAUTH_SECRET",
        "AUTH_URL",
        "NEXTAUTH_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
      ] as const) {
        if (env[key]) process.env[key] = env[key];
      }
      if (!process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
        const port = server.config.server.port ?? 8080;
        process.env.NEXTAUTH_URL = `http://localhost:${port}`;
      } else if (!process.env.NEXTAUTH_URL && env.AUTH_URL) {
        process.env.NEXTAUTH_URL = env.AUTH_URL;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        if (url?.startsWith("/api/auth")) {
          try {
            const { createNextAuthHandler } = await import("../../api/_lib/createNextAuthHandler.ts");
            const handler = createNextAuthHandler();
            return handler(req as never, res as never);
          } catch (e) {
            console.error("[api-dev] nextauth:", e);
            res.statusCode = 500;
            res.end("Auth handler error");
            return;
          }
        }

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
