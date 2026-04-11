import express from "express";
import { prisma } from "../utils/prisma.js";
import { formatDateTime } from "../utils/time.js";
import { encryptContent, decryptContent } from "../utils/crypto.js";
import { renderMarkdown } from "../utils/markdown.js";

const router = express.Router();

function isEdited(entry) {
  return (
    entry.updatedAt &&
    entry.createdAt &&
    new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime() > 1000
  );
}

function serializeEntry(entry, mode) {
  const content = decryptContent(entry);

  return {
    ...entry,
    content,
    renderedContent: renderMarkdown(content),
    createdAtLabel: mode === "live" ? formatDateTime(entry.createdAt) : null,
    isEdited: isEdited(entry),
  };
}

router.post("/api/topics/:topicId/entries", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const topic = await prisma.topic.findUnique({
      where: { id: req.params.topicId },
    });

    if (!topic) {
      return res.status(404).json({ error: "Topic not found." });
    }

    if (topic.ownerId !== req.currentUser.id) {
      return res.status(403).json({ error: "Only the topic owner can post." });
    }

    const content = String(req.body.content || "").trim();
    const mode = req.body.mode === "minutes" ? "minutes" : "live";
    const visibility = req.body.visibility === "private" ? "private" : "public";

    let entryDate = null;
    if (mode === "minutes" && req.body.entryDate) {
      entryDate = new Date(`${req.body.entryDate}T12:00:00.000Z`);
    }

    if (!content) {
      return res.status(400).json({ error: "Post content is required." });
    }

    const encrypted = encryptContent(content);

    const entry = await prisma.entry.create({
      data: {
        topicId: topic.id,
        createdById: req.currentUser.id,
        mode,
        visibility,
        entryDate,
        ...encrypted,
      },
    });

    await prisma.topic.update({
      where: { id: topic.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      ok: true,
      entry: serializeEntry(entry, mode),
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/api/entries/:entryId", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const existing = await prisma.entry.findUnique({
      where: { id: req.params.entryId },
      include: { topic: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Entry not found." });
    }

    if (existing.topic.ownerId !== req.currentUser.id) {
      return res.status(403).json({ error: "Only the topic owner can edit." });
    }

    const content = String(req.body.content || "").trim();
    const visibility = req.body.visibility === "private" ? "private" : "public";

    if (!content) {
      return res.status(400).json({ error: "Post content is required." });
    }

    const encrypted = encryptContent(content);

    const data = {
      visibility,
      ...encrypted,
    };

    if (existing.mode === "minutes") {
      data.entryDate = req.body.entryDate
        ? new Date(`${req.body.entryDate}T12:00:00.000Z`)
        : null;
    }

    if (existing.mode === "live" && req.body.entryDate) {
      const oldCreatedAt = new Date(existing.createdAt);
      const newDate = new Date(`${req.body.entryDate}T00:00:00.000Z`);

      newDate.setUTCHours(
        oldCreatedAt.getUTCHours(),
        oldCreatedAt.getUTCMinutes(),
        oldCreatedAt.getUTCSeconds(),
        oldCreatedAt.getUTCMilliseconds()
      );

      data.createdAt = newDate;
    }

    const updated = await prisma.entry.update({
      where: { id: existing.id },
      data,
    });

    await prisma.topic.update({
      where: { id: existing.topicId },
      data: { updatedAt: new Date() },
    });

    res.json({
      ok: true,
      entry: serializeEntry(updated, existing.mode),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/entries/:entryId", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Sign in required." });
    }

    const existing = await prisma.entry.findUnique({
      where: { id: req.params.entryId },
      include: { topic: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Entry not found." });
    }

    if (existing.topic.ownerId !== req.currentUser.id) {
      return res.status(403).json({ error: "Only the topic owner can delete." });
    }

    await prisma.entry.delete({
      where: { id: existing.id },
    });

    await prisma.topic.update({
      where: { id: existing.topicId },
      data: { updatedAt: new Date() },
    });

    res.json({ ok: true, entryId: existing.id });
  } catch (err) {
    next(err);
  }
});

export default router;