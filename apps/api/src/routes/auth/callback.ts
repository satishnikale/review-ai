import { Router } from "express";
import axios from "axios";
import { prisma } from "@repo/db";
import { sign } from "jsonwebtoken";

const router: Router = Router();

// GET /auth/github/callback
router.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;

  // 1. Exchange code for access token
  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: "application/json" } },
  );
  const accessToken = tokenRes.data.access_token;

  // 2. Get GitHub user profile
  const userRes = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const ghUser = userRes.data;

  // 3. Upsert user in DB
  const user = await prisma.user.upsert({
    where: { githubId: String(ghUser.id) },
    update: {
      accessToken,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
    },
    create: {
      githubId: String(ghUser.id),
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      accessToken,
    },
  });

  // 4. Sign JWT and redirect to frontend
  const jwt = sign({ sub: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });
  res.redirect(`http://localhost:3000/dashboard?token=${jwt}`);
});
