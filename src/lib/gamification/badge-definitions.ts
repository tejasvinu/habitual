// src/lib/gamification/badge-definitions.ts
// NO 'use server' here
import type { BadgeDefinition } from '@/lib/types';
import { hasBadge } from './badges'; // Import hasBadge from the 'use server' file

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: 'first_habit_completed',
        name: 'First Step Taken',
        description: 'Completed your very first habit task!',
        icon: 'Footprints',
        points: 25,
        criteria: async ({ userId, completedLogCountForUser }) => {
            if (await hasBadge(userId, 'first_habit_completed')) return false;
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
            // Check if user specifically has *this* badge definition ID.
            // The gamification action can handle preventing re-awarding if needed more broadly.
            if (await hasBadge(userId, 'daily_streak_7')) return false;
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
        id: 'habit_master_30', // This is the ID of the *definition*.
        name: 'Habit Master',
        description: 'Achieved a 30-period streak on any habit.',
        icon: 'Crown',
        points: 150,
        criteria: async ({ habit, streak }) => { // userId is implicitly available via hasBadge if needed
            if (!habit) return false;
            // This criteria just determines if the base condition (30 period streak) is met.
            // The checkAndAwardBadges function handles the dynamic instance creation and checking.
            return (streak || 0) >= 30;
        }
    }
];
