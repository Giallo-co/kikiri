import express from "express";
import path from "path";
import config from "./config/config";
import { logger } from "./lib/logger";
import { latencyMetric } from "./middlewares/cloudWatchMiddleware";
import { requestLog } from "./middlewares/requestLogMiddleware";
import { errorHandler } from './middlewares/errorHandler';
import userRoutes from './routes/userRoutes';
import feedRoutes from './routes/feedRoutes';
import searchRoutes from './routes/searchRoutes';
import interactionRoutes from './routes/interactionRoutes';
import uploadRoutes from './routes/uploadRoutes';
import userPostRoutes from './routes/userPostRoutes';
import profilePictureRoutes from './routes/profilePicture';
import cors from 'cors';

const app = express();
const PORT = config.port; 

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(latencyMetric);
app.use(requestLog);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, _res) => {
  _res.send("Hello World! :)()::");
});

app.use(config.apiBasePath, userRoutes);
app.use("/api", userRoutes); // Direct compatibility for frontend fetch('/api/login')
app.use(config.apiBasePath, feedRoutes);
app.use(config.apiBasePath, searchRoutes);
app.use(config.apiBasePath, interactionRoutes);
app.use(config.apiBasePath, uploadRoutes);
app.use(config.apiBasePath, userPostRoutes);
app.use("/api/profile-picture", profilePictureRoutes);

app.use(errorHandler); 
export default app;

declare const require: any;
declare const module: any;

if (require.main === module) {
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("unhandled_rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on("uncaughtException", (error: Error) => {
    logger.error("uncaught_exception", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  app.listen(PORT, () => {
    const url = `${config.protocol}://${config.host}:${PORT}`;
    logger.info("Winston probe: servidor en marcha", {
      port: PORT,
      url,
      nodeEnv: config.nodeEnv,
      apiBasePath: config.apiBasePath,
      logLevel: process.env.LOG_LEVEL || (config.nodeEnv === "production" ? "info" : "debug"),
    });
  });
}
