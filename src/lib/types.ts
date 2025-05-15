
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  userId: string; // Added userId
  name: string;
  frequency: HabitFrequency;
  createdAt: Date;
  specificDays?: number[]; // Optional: array of 0-6 (Sun-Sat), for 'weekly' frequency
  currentStreak?: number; // Optional: for displaying current streak
}

export interface HabitLog {
  id: string;
  userId: string; // Added userId
  habitId: string;
  date: Date; // The date the log entry corresponds to (e.g., start of the day/week/month or specific day for weekly specific)
  completed: boolean;
  loggedAt: Date; // Timestamp when the log was actually recorded
}

// For data export
export interface UserDataExport {
  habits: Habit[];
  logs: HabitLog[];
}

// Gamification Types
export interface BadgeDefinition {
  id: string; // e.g., "first_steps", "daily_streak_7"
  name: string;
  description: string;
  icon: string; // Lucide icon name or SVG path
  criteria: (params: {
    userId: string;
    habit?: Habit; // The habit related to the event, if applicable
    streak?: number; // Current streak for the related habit
    habitsCount?: number; // Total number of habits for the user
    allUserLogs?: HabitLog[]; // All logs for the user
    completedLogCountForUser?: number; // Total completed logs for the user
    currentUserPoints?: number; // User's current points total
  }) => Promise<boolean> | boolean;
  points?: number; // Points awarded for this badge
}

export interface UserBadge {
  id: string; // document id
  userId: string; // Stored as string in this type, ObjectId in DB
  badgeId: string; // Corresponds to BadgeDefinition.id
  awardedAt: Date;
}

