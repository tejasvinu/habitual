
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  createdAt: Date;
  // Add userId if implementing multi-user support later
  // userId: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: Date; // The date the log entry corresponds to (e.g., start of the day/week/month)
  completed: boolean;
  loggedAt: Date; // Timestamp when the log was actually recorded
}
