
'use server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// BADGE_DEFINITIONS array has been moved to badge-definitions.ts

export async function hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const existingBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId });
    return !!existingBadge;
}
