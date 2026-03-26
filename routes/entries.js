import express from "express";
import { prisma } from "../utils/prisma.js";
import { formatDateTime } from "../utils/time.js";

const router = express.Router();

router.post("/api/topics/:topicId/entries", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const topic = await prisma.topic.findUnique({ where: { id: req.params.topicId } });
    if (!topic) {
      return res.status(404).json({ error: "Topic not found." });
    }
    if (topic.ownerId !== req.currentUser.id) {
      return res.status(403).json({ error: "Only the topic owner can post." });
    }

    const content = String(req.body.content || "").trim();
    const mode = req.body.mode === "minutes" ? "minutes" : "live";
    const visibility = req.body.visibility === "private" ? "private" : "public";
    const entryDate = mode === "minutes" && req.body.entryDate ? new Date(`${req.body.entryDate}T12:00:00.000Z`) : null;

    if (!content) {
      return res.status(400).json({ error: "Post content is required." });
    }

    const entry = await prisma.entry.create({
      data: {
        topicId: topic.id,
        createdById: req.currentUser.id,
        content,
        mode,
        visibility,
        entryDate,
      },
    });

    await prisma.topic.update({
      where: { id: topic.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      ok: true,
      entry: {
        ...entry,
        createdAtLabel: formatDateTime(entry.createdAt),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
