import "dotenv/config";
import express, { Request, Response } from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import { createObject, listObjects, deleteObject } from "./crud";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

app.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }

  const { originalname, buffer, mimetype, size } = req.file;
  const folder = (req.body.folder || "uploads").replace(/\/$/, "");
  const s3Key = `${folder}/${Date.now()}-${originalname}`;

  try {
    await createObject(s3Key, buffer, mimetype);
    res.json({
      success: true,
      key: s3Key,
      name: originalname,
      size,
      mimetype,
      bucket: process.env.S3_BUCKET_NAME,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

app.get("/list", async (req: Request, res: Response): Promise<void> => {
  const prefix = (req.query.prefix as string) || "";
  try {
    const objects = await listObjects(prefix);
    res.json({ objects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/delete", async (req: Request, res: Response): Promise<void> => {
  const { key } = req.body;
  if (!key) {
    res.status(400).json({ error: "key is required" });
    return;
  }
  try {
    await deleteObject(key);
    res.json({ success: true, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Bucket: ${process.env.S3_BUCKET_NAME}`);
});
