
'use server';
import type { BadgeDefinition, Habit, HabitLog } from '@/lib/types';
import { getHabits as getAllUserHabits, getHabitLogs as getAllUserLogs } from '@/lib/actions/habits';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

async function hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const db = await getDb();
    const userBadgesCollection = db.collection('userBadges');
    const existingBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId });
    return !!existingBadge;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: 'first_habit_completed',
        name: 'First Step Taken',
        description: 'Completed your very first habit task!',
        icon: 'Footprints', 
        points: 25,
        criteria: async ({ userId, completedLogCountForUser }) => {
            if (await hasBadge(userId, 'first_habit_completed')) return false;
            // This check happens after the log is recorded and completedLogCountForUser includes the current one
            return completedLogCountForUser === 1;
        }
    },
    {
        id: 'daily_streak_7',
        name: 'Daily Dedication',
        description: 'Maintained a 7-day streak on any daily habit.',
        icon: 'Flame',
        points: 50,
        criteria: async ({ userId, habit, streak }) => {
            if (!habit || habit.frequency !== 'daily') return false;
            if (await hasBadge(userId, 'daily_streak_7')) return false; // Check if user specifically has *this* badge
            // Check if user has any badge that signifies a 7-day daily streak, to prevent re-awarding for different habits
            const db = await getDb();
            const userBadgesCollection = db.collection('userBadges');
            const existingSimilarBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: 'daily_streak_7' });
            if(existingSimilarBadge) return false;

            return (streak || 0) >= 7;
        }
    },
    {
        id: 'weekly_streak_4',
        name: 'Weekly Warrior',
        description: 'Maintained a 4-week streak on any weekly habit.',
        icon: 'ShieldCheck',
        points: 75,
        criteria: async ({ userId, habit, streak }) => {
            if (!habit || habit.frequency !== 'weekly') return false;
             if (await hasBadge(userId, 'weekly_streak_4')) return false;
            const db = await getDb();
            const userBadgesCollection = db.collection('userBadges');
            const existingSimilarBadge = await userBadgesCollection.findOne({ userId: new ObjectId(userId), badgeId: 'weekly_streak_4' });
            if(existingSimilarBadge) return false;
            return (streak || 0) >= 4;
        }
    },
    {
        id: 'habit_creator_3',
        name: 'Habit Architect',
        description: 'Created at least 3 habits.',
        icon: 'ListPlus',
        points: 30,
        criteria: async ({ userId, habitsCount }) => {
            if (await hasBadge(userId, 'habit_creator_3')) return false;
            return (habitsCount || 0) >= 3;
        }
    },
    {
        id: 'habit_master_30', // Generic master badge
        name: 'Habit Master',
        description: 'Achieved a 30-period streak on any habit.',
        icon: 'Crown',
        points: 150,
        criteria: async ({ userId, habit, streak }) => {
            if (!habit) return false;
            // Allow this badge to be earned multiple times for different habits by not checking `hasBadge` here,
            // or implement a more complex check if it should be unique per user.
            // For simplicity, let's make it unique per user for now.
            if (await hasBadge(userId, `habit_master_30_on_${habit.id}`)) return false; // Make it unique per habit
            if ((streak || 0) >= 30) {
                // Award a dynamic badge ID to allow multiple masteries
                const db = await getDb();
                const userBadgesCollection = db.collection('userBadges');
                 await userBadgesCollection.insertOne({
                    userId: new ObjectId(userId),
                    badgeId: `habit_master_30_on_${habit.id}`, // Store with habit ID
                    awardedAt: new Date(),
                    originalBadgeId: 'habit_master_30' // Link to definition
                });
                return true; // The badge record is created here
            }
            return false;
        }
    }
];
