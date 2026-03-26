import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error("Invalid Google token payload.");
  }

  return payload;
}

export async function findOrCreateUserFromGooglePayload(payload) {
  const googleSub = payload.sub;
  const email = String(payload.email).toLowerCase();
  const name = payload.name || null;
  const pictureUrl = payload.picture || null;

  const existing = await prisma.user.findUnique({
    where: { googleSub },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { email, name, pictureUrl },
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleSub, name, pictureUrl },
    });
  }

  return prisma.user.create({
    data: { googleSub, email, name, pictureUrl },
  });
}
