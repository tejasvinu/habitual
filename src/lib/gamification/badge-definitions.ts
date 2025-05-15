
// src/lib/gamification/badge-definitions.ts
// NO 'use server' here
import type { BadgeDefinition } from '@/lib/types';
import { hasBadge } from './badges'; 

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: 'first_habit_completed',
        name: 'First Step Taken',
        description: 'Completed your very first habit task!',
        icon: 'Footprints',
        points: 25,
        criteria: async ({ userId, completedLogCountForUser, currentUserPoints }) => { // Added currentUserPoints
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
        criteria: async ({ userId, habit, streak, currentUserPoints }) => { // Added currentUserPoints
            if (!habit || habit.frequency !== 'daily') return false;
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
        criteria: async ({ userId, habit, streak, currentUserPoints }) => { // Added currentUserPoints
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
        criteria: async ({ userId, habitsCount, currentUserPoints }) => { // Added currentUserPoints
            if (await hasBadge(userId, 'habit_creator_3')) return false;
            return (habitsCount || 0) >= 3;
        }
    },
    {
        id: 'habit_master_30', 
        name: 'Habit Master',
        description: 'Achieved a 30-period streak on any habit.',
        icon: 'Crown',
        points: 150,
        criteria: async ({ userId, habit, streak, currentUserPoints }) => { // Added currentUserPoints, userId for consistency though not strictly for hasBadge for dynamic one
            if (!habit) return false;
            return (streak || 0) >= 30;
        }
    },
    // New Badges
    {
        id: 'habit_explorer_5',
        name: 'Habit Explorer',
        description: "You've branched out and created 5 different habits!",
        icon: 'Compass',
        points: 40,
        criteria: async ({ userId, habitsCount, currentUserPoints }) => { // Added currentUserPoints
            if (await hasBadge(userId, 'habit_explorer_5')) return false;
            return (habitsCount || 0) >= 5;
        }
    },
    {
        id: 'completionist_50',
        name: 'Steady Progress',
        description: 'Logged 50 habit completions. Keep it up!',
        icon: 'TrendingUp', // Was BarChartBig, changed to TrendingUp for more common icon
        points: 60,
        criteria: async ({ userId, completedLogCountForUser, currentUserPoints }) => { // Added currentUserPoints
            if (await hasBadge(userId, 'completionist_50')) return false;
            return (completedLogCountForUser || 0) >= 50;
        }
    },
    {
        id: 'point_collector_250',
        name: 'Point Hoarder',
        description: 'Accumulated 250 points!',
        icon: 'Coins',
        points: 25, // Points awarded *for* achieving this badge
        criteria: async ({ userId, currentUserPoints }) => {
            if (await hasBadge(userId, 'point_collector_250')) return false;
            return (currentUserPoints || 0) >= 250;
        }
    }
];

