
'use server';

import { getDb } from '@/lib/mongodb';
import type { UserBadge, Habit, HabitLog } from '@/lib/types';
import { BADGE_DEFINITIONS } from '@/lib/gamification/badge-definitions';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentStreak as getStreakForHabit, getHabits as getAllUserHabits, getHabitLogs as getAllUserLogs } from './habits';
// hasBadge is now imported by badge-definitions.ts criteria functions

async function getUserPoints(userId: string): Promise<number> {
    if (!userId) return 0;
    const db = await getDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { points: 1 } });
    return user?.points ?? 0;
}

export async function awardPoints(userId: string, points: number): Promise<void> {
    if (!userId || points <= 0) return;
    const db = await getDb();
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { points: points } },
        { upsert: true } 
    );
     // Revalidate paths that might display points
    revalidatePath('/');
    revalidatePath('/settings');
}

export async function checkAndAwardBadges(userId: string, newlyCompletedHabit: Habit, completedDate: Date): Promise<string[]> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const awardedBadgeIdsThisCheck: string[] = [];

    const allHabitsForUser = await getAllUserHabits(userId);
    const allLogsForUser = await getAllUserLogs(userId);
    const completedLogCountForUser = allLogsForUser.filter(log => log.completed).length;
    const currentUserPoints = await getUserPoints(userId); // Fetch current points

    const currentStreakForNewlyCompletedHabit = await getStreakForHabit(userId, newlyCompletedHabit.id);

    for (const badgeDef of BADGE_DEFINITIONS) {
        // Special handling for badges like 'habit_master_30' that are dynamic per habit
        if (badgeDef.id === 'habit_master_30') {
            let baseCriteriaMet = false;
            if (typeof badgeDef.criteria === 'function') {
                baseCriteriaMet = await badgeDef.criteria({
                    userId, 
                    habit: newlyCompletedHabit,
                    streak: currentStreakForNewlyCompletedHabit,
                    currentUserPoints, // Pass points
                });
            }

            if (baseCriteriaMet) {
                const dynamicBadgeId = `habit_master_30_on_${newlyCompletedHabit.id}`;
                const alreadyHasThisMasteryBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: dynamicBadgeId });

                if (!alreadyHasThisMasteryBadge) {
                     await userBadgesCollection.insertOne({
                        userId: new ObjectId(userId),
                        badgeId: dynamicBadgeId, 
                        originalBadgeId: badgeDef.id, 
                        awardedAt: new Date(),
                        habitName: newlyCompletedHabit.name, 
                    });
                    if (badgeDef.points) {
                        await awardPoints(userId, badgeDef.points);
                    }
                    awardedBadgeIdsThisCheck.push(dynamicBadgeId);
                }
            }
            continue; 
        }

        // Normal badge processing
        const alreadyHasThisDefinitionBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: badgeDef.id });
        if (alreadyHasThisDefinitionBadge) continue;

        let criteriaMet = false;
        if (typeof badgeDef.criteria === 'function') {
            criteriaMet = await badgeDef.criteria({
                userId,
                habit: newlyCompletedHabit,
                streak: currentStreakForNewlyCompletedHabit,
                habitsCount: allHabitsForUser.length,
                allUserLogs: allLogsForUser,
                completedLogCountForUser: completedLogCountForUser,
                currentUserPoints, // Pass points
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
            badgeId: doc.badgeId as string, 
            awardedAt: new Date(doc.awardedAt),
        };
        
        if (doc.originalBadgeId && typeof doc.originalBadgeId === 'string') {
            const originalDef = BADGE_DEFINITIONS.find(d => d.id === doc.originalBadgeId);
            if (originalDef) {
                // @ts-ignore - Dynamically adding properties for display
                userBadge.name = `${originalDef.name} (${doc.habitName || 'Habit'})`;
                // @ts-ignore
                userBadge.description = originalDef.description;
                // @ts-ignore
                userBadge.icon = originalDef.icon;
                // @ts-ignore
                userBadge.points = originalDef.points;
            }
        }
        return userBadge;
    });
}

export async function checkAndAwardCreationBadges(userId: string): Promise<void> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const allHabitsForUser = await getAllUserHabits(userId);
    const currentUserPoints = await getUserPoints(userId); // Fetch current points
    
    // Filter for badges that might be awarded on creation (e.g., habit_creator_X or point-based)
    const relevantBadgeDefs = BADGE_DEFINITIONS.filter(b => 
        b.id.startsWith('habit_creator_') || b.id.startsWith('point_collector_') || b.id.startsWith('habit_explorer_')
    );


    for (const badgeDef of relevantBadgeDefs) {
        const alreadyHasBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: badgeDef.id });
        if (alreadyHasBadge) continue;

        if (typeof badgeDef.criteria === 'function') {
            const criteriaMet = await badgeDef.criteria({ 
                userId, 
                habitsCount: allHabitsForUser.length,
                currentUserPoints, // Pass points
                // Pass other params with undefined/default if not relevant to creation badges
                allUserLogs: [], 
                completedLogCountForUser: 0,
            });
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

