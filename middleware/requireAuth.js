export function requireAuth(req, res, next) {
  if (req.currentUser) return next();
  const returnTo = req.originalUrl || "/";
  req.session.returnTo = returnTo;
  return res.redirect("/");
}
