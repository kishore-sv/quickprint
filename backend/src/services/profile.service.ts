import { eq } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema";

export async function ensureProfile(userId: string) {
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(profiles).values({ id: userId }).returning();
  return created;
}
