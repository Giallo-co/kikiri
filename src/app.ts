import express from "express";
import userRoutes from "./routes/user-routes.js"

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (_req, _res) => {
  _res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use('/user', userRoutes);

export default app;