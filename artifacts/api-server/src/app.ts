import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve dashboard static files (built by Vite)
// Essaie plusieurs chemins possibles selon l'environnement (Replit, Render, etc.)
const candidatePaths = [
  path.resolve(process.cwd(), "artifacts/dashboard/dist/public"),
  path.resolve(__dirname, "../../dashboard/dist/public"),
  path.resolve(__dirname, "../../../artifacts/dashboard/dist/public"),
];
const dashboardDist = candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0];
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  // SPA fallback: toutes les routes non-API renvoient index.html (Express 5 syntax)
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(dashboardDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "API running. Dashboard not built." });
  });
}

export default app;
