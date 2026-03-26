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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

const PgStore = connectPgSimple(session);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

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
