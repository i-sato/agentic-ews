import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleApiRoute } from "./server/api/router.ts";

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          const method = req.method || "GET";

          let body: any = null;
          if (method === "POST" || method === "PUT" || method === "PATCH") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            const rawBody = Buffer.concat(chunks).toString("utf8");
            if (rawBody.trim()) {
              try {
                body = JSON.parse(rawBody);
              } catch {
                body = rawBody;
              }
            }
          }

          const response = await handleApiRoute(method, url.pathname, url.searchParams, body);

          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(response.data));
        } catch (err: any) {
          console.error("[Middleware Error]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "Internal server error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
  },
});
