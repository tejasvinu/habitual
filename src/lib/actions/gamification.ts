
'use server';

import { getDb } from '@/lib/mongodb';
import type { UserBadge, Habit, HabitLog } from '@/lib/types';
import { BADGE_DEFINITIONS } from '@/lib/gamification/badges';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentStreak as getStreakForHabit, getHabits as getAllUserHabits, getHabitLogs as getAllUserLogs } from './habits';

export async function awardPoints(userId: string, points: number): Promise<void> {
    if (!userId || points <= 0) return;
    const db = await getDb();
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { points: points } },
        { upsert: true } // Upsert in case points field doesn't exist
    );
    // Revalidate relevant paths if points are displayed and server-rendered
    // e.g., revalidatePath('/profile') or revalidatePath('/') if sidebar shows points from server
}

export async function checkAndAwardBadges(userId: string, newlyCompletedHabit: Habit, completedDate: Date): Promise<string[]> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const awardedBadgeIdsThisCheck: string[] = [];

    const allHabitsForUser = await getAllUserHabits(userId);
    const allLogsForUser = await getAllUserLogs(userId);
    const completedLogCountForUser = allLogsForUser.filter(log => log.completed).length;

    const currentStreakForNewlyCompletedHabit = await getStreakForHabit(userId, newlyCompletedHabit.id);

    for (const badgeDef of BADGE_DEFINITIONS) {
        // Special handling for badges like 'habit_master_30' that might be dynamic
        if (badgeDef.id === 'habit_master_30' && (currentStreakForNewlyCompletedHabit || 0) >= 30) {
            const dynamicBadgeId = `habit_master_30_on_${newlyCompletedHabit.id}`;
            const alreadyHasThisMasteryBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: dynamicBadgeId });
            if (!alreadyHasThisMasteryBadge) {
                 await userBadgesCollection.insertOne({
                    userId: new ObjectId(userId),
                    badgeId: dynamicBadgeId,
                    originalBadgeId: badgeDef.id, // Link to definition
                    awardedAt: new Date(),
                    habitName: newlyCompletedHabit.name, // Store habit name for display
                });
                if (badgeDef.points) {
                    await awardPoints(userId, badgeDef.points);
                }
                awardedBadgeIdsThisCheck.push(dynamicBadgeId);
            }
            continue; // Skip normal processing for this special badge
        }

        // Normal badge processing
        const alreadyHasBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: badgeDef.id });
        if (alreadyHasBadge) continue;

        let criteriaMet = false;
        if (typeof badgeDef.criteria === 'function') {
            criteriaMet = await badgeDef.criteria({
                userId,
                habit: newlyCompletedHabit,
                streak: currentStreakForNewlyCompletedHabit,
                habitsCount: allHabitsForUser.length,
                allUserLogs: allLogsForUser,
                completedLogCountForUser: completedLogCountForUser
            });
        }

        if (criteriaMet) {
            await userBadgesCollection.insertOne({
                userId: new ObjectId(userId),
                badgeId: badgeDef.id,
                awardedAt: new Date(),
            });
            if (badgeDef.points) {
                await awardPoints(userId, badgeDef.points);
            }
            awardedBadgeIdsThisCheck.push(badgeDef.id);
        }
    }

    if (awardedBadgeIdsThisCheck.length > 0) {
        revalidatePath('/'); 
        revalidatePath('/settings'); 
    }
    return awardedBadgeIdsThisCheck;
}


export async function getUserBadges(userId: string): Promise<UserBadge[]> {
    if (!userId) return [];
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const badgeDocs = await userBadgesCollection.find({ userId: new ObjectId(userId) }).sort({ awardedAt: -1 }).toArray();
    
    return badgeDocs.map(doc => {
        const userBadge: UserBadge = {
            id: doc._id.toHexString(),
            userId: doc.userId.toHexString(),
            badgeId: doc.badgeId as string, // The specific ID, could be dynamic like "habit_master_30_on_habitXYZ"
            awardedAt: new Date(doc.awardedAt),
        };
        // If it's a dynamic badge, we might want to add more info from the original definition
        if (doc.originalBadgeId && typeof doc.originalBadgeId === 'string') {
            const originalDef = BADGE_DEFINITIONS.find(d => d.id === doc.originalBadgeId);
            if (originalDef) {
                // @ts-ignore
                userBadge.name = `${originalDef.name} (${doc.habitName || 'Habit'})`;
                // @ts-ignore
                userBadge.description = originalDef.description;
                // @ts-ignore
                userBadge.icon = originalDef.icon;
            }
        }
        return userBadge;
    });
}

export async function checkAndAwardCreationBadges(userId: string): Promise<void> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const allHabitsForUser = await getAllUserHabits(userId);
    const creatorBadgeDefs = BADGE_DEFINITIONS.filter(b => b.id.startsWith('habit_creator_'));

    for (const badgeDef of creatorBadgeDefs) {
        const alreadyHasBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: badgeDef.id });
        if (alreadyHasBadge) continue;

        if (typeof badgeDef.criteria === 'function') {
            const criteriaMet = await badgeDef.criteria({ userId, habitsCount: allHabitsForUser.length });
            if (criteriaMet) {
                await userBadgesCollection.insertOne({
                    userId: new ObjectId(userId),
                    badgeId: badgeDef.id,
                    awardedAt: new Date(),
                });
                if (badgeDef.points) {
                    await awardPoints(userId, badgeDef.points);
                }
                revalidatePath('/');
                revalidatePath('/settings');
            }
        }
    }
}
