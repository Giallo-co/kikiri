import express from "express";
import config from "./config/config"; 
import { errorHandler } from './middlewares/errorHandler';
import userRoutes from './routes/userRoutes'; 

const app = express();
const PORT = config.port; 

app.use(express.json());

app.get("/", (_req, _res) => {
  _res.send("Hello World!");
});

app.use('/user', userRoutes);

app.use(errorHandler); 
export default app;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

