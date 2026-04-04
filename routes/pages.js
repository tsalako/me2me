import express from "express";
import { prisma } from "../utils/prisma.js";
import { parseTopicId, topicPath } from "../utils/topicUrl.js";
import { formatDateTime, formatDayHeading } from "../utils/time.js";
import { slugify } from "../utils/slugify.js";
import { decryptContent } from "../utils/crypto.js";

const router = express.Router();

function attachDecryptedContent(entries) {
  return entries.map((entry) => ({
    ...entry,
    content: decryptContent(entry),
  }));
}

function groupMinuteEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = entry.entryDate ? new Date(entry.entryDate).toISOString() : "undated";
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: entry.entryDate ? formatDayHeading(entry.entryDate) : "Undated",
        entries: [],
      });
    }
    map.get(key).entries.push({
      ...entry,
      createdAtLabel: formatDateTime(entry.createdAt),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

router.get("/", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.render("landing", {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        appName: "me2me",
      });
    }

    const topics = await prisma.topic.findMany({
      where: { ownerId: req.currentUser.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    res.render("home", {
      appName: "me2me",
      topics,
      topicPath,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/t/:idAndSlug", async (req, res, next) => {
  try {
    const topicId = parseTopicId(req.params.idAndSlug);
    if (!topicId) return res.status(404).send("Topic not found.");

    if (!req.currentUser) {
      req.session.returnTo = req.originalUrl;
      return res.render("landing", {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        appName: "me2me",
        message: "Sign in to view this shared topic.",
      });
    }

    const mode = req.query.mode === "minutes" ? "minutes" : "live";
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { owner: true },
    });

    if (!topic) return res.status(404).send("Topic not found.");

    const isOwner = topic.ownerId === req.currentUser.id;
    const where = {
      topicId: topic.id,
      mode,
      ...(isOwner ? {} : { visibility: "public" }),
    };

    const dbEntries = await prisma.entry.findMany({
      where,
      orderBy: mode === "live" ? [{ createdAt: "asc" }] : [{ entryDate: "asc" }, { createdAt: "asc" }],
    });

    const entries = attachDecryptedContent(dbEntries);

    const canonicalSlug = slugify(topic.title);
    if (topic.slug !== canonicalSlug) {
      await prisma.topic.update({ where: { id: topic.id }, data: { slug: canonicalSlug } });
      topic.slug = canonicalSlug;
    }

    const canonicalPath = topicPath(topic, mode);
    if (`/t/${req.params.idAndSlug}?mode=${mode}` !== canonicalPath) {
      return res.redirect(canonicalPath);
    }

    const ownerTopics = isOwner
      ? await prisma.topic.findMany({
          where: { ownerId: req.currentUser.id },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        })
      : [];

    res.render("topic", {
      appName: "me2me",
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      topic,
      mode,
      isOwner,
      ownerTopics,
      liveEntries: mode === "live" ? entries.map((e) => ({ ...e, createdAtLabel: formatDateTime(e.createdAt) })) : [],
      minuteGroups: mode === "minutes" ? groupMinuteEntries(entries) : [],
      topicPath,
      todayDateInput: new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "America/Los_Angeles" }).format(new Date()),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
