import express from "express";
import { prisma } from "../utils/prisma.js";
import { parseTopicId, topicPath } from "../utils/topicUrl.js";
import { formatDateTime, formatDayHeading } from "../utils/time.js";
import { slugify } from "../utils/slugify.js";
import { decryptContent } from "../utils/crypto.js";
import { renderMarkdown } from "../utils/markdown.js";

const router = express.Router();

function decorateEntry(entry, mode) {
  const content = decryptContent(entry);
  const isEdited =
    entry.updatedAt &&
    entry.createdAt &&
    new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime() > 1000;

  return {
    ...entry,
    content,
    renderedContent: renderMarkdown(content),
    createdAtLabel: mode === "live" ? formatDateTime(entry.createdAt) : null,
    isEdited,
    tags: (entry.entryTags || []).map((et) => ({
      id: et.tag.id,
      name: et.tag.name,
      slug: et.tag.slug,
    })),
  };
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

    map.get(key).entries.push(decorateEntry(entry, "minutes"));
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
    const activeTagSlug = String(req.query.tag || "").trim().toLowerCase();

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
      ...(activeTagSlug
        ? {
            entryTags: {
              some: {
                tag: {
                  slug: activeTagSlug,
                  ownerId: topic.ownerId,
                },
              },
            },
          }
        : {}),
    };

    const dbEntries = await prisma.entry.findMany({
      where,
      include: {
        entryTags: {
          include: {
            tag: true,
          },
          orderBy: {
            tag: { name: "asc" },
          },
        },
      },
      orderBy:
        mode === "live"
          ? [{ createdAt: "asc" }]
          : [{ entryDate: "asc" }, { createdAt: "asc" }],
    });

    const availableTags = await prisma.tag.findMany({
      where: {
        ownerId: topic.ownerId,
        entryTags: {
          some: {
            entry: {
              topicId: topic.id,
              mode,
              ...(isOwner ? {} : { visibility: "public" }),
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const canonicalSlug = slugify(topic.title);
    if (topic.slug !== canonicalSlug) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: { slug: canonicalSlug },
      });
      topic.slug = canonicalSlug;
    }

    const canonicalPath = topicPath(topic, mode);
    const expectedCurrentPath = activeTagSlug
      ? `${canonicalPath}&tag=${encodeURIComponent(activeTagSlug)}`
      : canonicalPath;

    if (`${req.path}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}` !== expectedCurrentPath) {
      return res.redirect(expectedCurrentPath);
    }

    const ownerTopics = isOwner
      ? await prisma.topic.findMany({
          where: { ownerId: req.currentUser.id },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        })
      : [];

    const liveEntries =
      mode === "live" ? dbEntries.map((entry) => decorateEntry(entry, "live")) : [];

    const minuteGroups =
      mode === "minutes" ? groupMinuteEntries(dbEntries) : [];

    res.render("topic", {
      appName: "me2me",
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      topic,
      mode,
      isOwner,
      ownerTopics,
      liveEntries,
      minuteGroups,
      availableTags,
      activeTagSlug,
      topicPath,
      todayDateInput: new Intl.DateTimeFormat("en-CA", {
        timeZone: process.env.APP_TIMEZONE || "America/Los_Angeles",
      }).format(new Date()),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
