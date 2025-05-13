
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  userId: string; // Added userId
  name: string;
  frequency: HabitFrequency;
  createdAt: Date;
}

export interface HabitLog {
  id: string;
  userId: string; // Added userId
  habitId: string;
  date: Date; // The date the log entry corresponds to (e.g., start of the day/week/month)
  completed: boolean;
  loggedAt: Date; // Timestamp when the log was actually recorded
}
