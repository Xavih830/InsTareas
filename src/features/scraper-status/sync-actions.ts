"use server";

import { requireUser } from "@/server/actions/auth";

export async function triggerSync() {
  await requireUser();

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GH_ACTIONS_TOKEN;

  if (!owner || !repo || !token) {
    return { error: "La sincronización manual no está configurada (faltan variables de GitHub)" };
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/sync.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "instareas",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  if (!res.ok) {
    return { error: `GitHub respondió ${res.status}` };
  }
  return { ok: true };
}
