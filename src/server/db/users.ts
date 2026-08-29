import { clerkClient } from '@clerk/express';
import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { users } from './schema';

/**
 * Provisions a local row for a Clerk user the first time we see them, so study
 * data has a foreign key to reference. Profile fields are pulled from Clerk
 * once on creation rather than on every request; Clerk stays the source of
 * truth for identity.
 */
export async function ensureUser(userId: string): Promise<void> {
  const db = getDb();

  const inserted = await db
    .insert(users)
    .values({ id: userId })
    .onConflictDoNothing()
    .returning({ id: users.id });

  if (inserted.length === 0) {
    return;
  }

  try {
    const profile = await clerkClient.users.getUser(userId);
    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || null;

    await db
      .update(users)
      .set({
        email: profile.primaryEmailAddress?.emailAddress ?? null,
        displayName,
      })
      .where(eq(users.id, userId));
  } catch (error) {
    // A missing profile must not block the request; the row already exists.
    console.warn(`[makini] Could not load Clerk profile for ${userId}:`, error);
  }
}
