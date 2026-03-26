import { prisma } from "../utils/prisma.js";

export async function loadCurrentUser(req, res, next) {
  res.locals.currentUser = null;
  const userId = req.session?.userId;
  if (!userId) return next();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      req.session.userId = null;
      return next();
    }
    req.currentUser = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
