import express, { type NextFunction, type Response, type Request } from "express";
import userRoutes from "./routes/user-routes.js"
import { ServiceException } from "./errors/serviceException.js";

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

//Error Middleware
app.use((_err: Error, _req: Request, _res: Response, _next: NextFunction) => {
  if (_err instanceof ServiceException) {
    let exception = _err as ServiceException;
    _res.status(400).json({
      "Code": exception.errorCode,
      "message": exception.message
      
    })
  } else {
    _res.status(500).send(_err.stack);
  }
});

export default app;