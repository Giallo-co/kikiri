import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (_req, _res) => {
  _res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;