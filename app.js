import express from "express";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

import authRoutes from "./routes/auth.js";
import pageRoutes from "./routes/pages.js";
import topicRoutes from "./routes/topics.js";
import entryRoutes from "./routes/entries.js";
import { loadCurrentUser } from "./middleware/loadCurrentUser.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const keepAliveUrl = process.env.KEEP_ALIVE_URL;

setInterval(async () => {
  try {
    const res = await fetch(`${keepAliveUrl}/healthz`);
    console.log(`[healthz] Ping success: ${res.status}`);
  } catch (err) {
    console.error("[healthz] Ping failed:", err);
  }
}, 14 * 60 * 1000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pgPool = new pg.Pool({
  connectionString: process.env.SESSION_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PgStore = connectPgSimple(session);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    name: "me2me.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  })
);

app.use(loadCurrentUser);

app.use(authRoutes);
app.use(topicRoutes);
app.use(entryRoutes);
app.use(pageRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
    return res.status(500).json({ error: err.message || "Server error." });
  }
  res.status(500).send(err.message || "Server error.");
});

app.listen(PORT, () => {
  console.log(`me2me listening on http://localhost:${PORT}`);
});
