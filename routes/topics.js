import express from "express";
import { prisma } from "../utils/prisma.js";
import { slugify } from "../utils/slugify.js";
import { topicPath } from "../utils/topicUrl.js";

const router = express.Router();

router.post("/api/topics", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const title = String(req.body.title || "").trim();
    if (!title) {
      return res.status(400).json({ error: "Topic title is required." });
    }

    const topic = await prisma.topic.create({
      data: {
        ownerId: req.currentUser.id,
        title,
        slug: slugify(title),
      },
    });

    res.json({ ok: true, topic, path: topicPath(topic, "live") });
  } catch (err) {
    next(err);
  }
});

router.get("/api/my-topics", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const topics = await prisma.topic.findMany({
      where: { ownerId: req.currentUser.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    res.json({ topics });
  } catch (err) {
    next(err);
  }
});

export default router;
