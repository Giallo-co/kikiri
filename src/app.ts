import express from "express";
import path from "path";
import config from "./config/config";
import { logger } from "./lib/logger";
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

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://TU-APP.amplifyapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, _res) => {
  _res.send("Hello World!");
});

app.use(config.apiBasePath, userRoutes);
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
  app.listen(PORT, () => {
    const url = `${config.protocol}://${config.host}:${PORT}`;
    logger.info("Winston probe: servidor en marcha");
    logger.info(`Server running on ${url}`, { port: PORT });
  });
}
