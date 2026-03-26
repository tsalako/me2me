import express from "express";
import { verifyGoogleIdToken, findOrCreateUserFromGooglePayload } from "../utils/auth.js";

const router = express.Router();

router.post("/auth/google", async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential." });
    }

    const payload = await verifyGoogleIdToken(credential);
    const user = await findOrCreateUserFromGooglePayload(payload);
    req.session.userId = user.id;

    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;

    res.json({ ok: true, redirectTo });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("me2me.sid");
    res.redirect("/");
  });
});

export default router;
