
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
