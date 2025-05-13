
'use server';

import type { Habit, HabitFrequency, HabitLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// --- Mock Data Store ---
// In a real app, replace this with database interactions (e.g., Firestore)
let habits: Habit[] = [
  { id: '1', name: 'Drink Water', frequency: 'daily', createdAt: new Date(2024, 0, 1) },
  { id: '2', name: 'Exercise', frequency: 'weekly', createdAt: new Date(2024, 0, 1) },
  { id: '3', name: 'Read Book', frequency: 'daily', createdAt: new Date(2024, 0, 15) },
  { id: '4', name: 'Review Budget', frequency: 'monthly', createdAt: new Date(2024, 1, 1) },
];
let habitLogs: HabitLog[] = [
   // Example logs (add more for testing charts)
   { id: 'l1', habitId: '1', date: new Date(2024, 6, 10), completed: true, loggedAt: new Date() },
   { id: 'l2', habitId: '1', date: new Date(2024, 6, 11), completed: true, loggedAt: new Date() },
   { id: 'l3', habitId: '1', date: new Date(2024, 6, 12), completed: false, loggedAt: new Date() },
   { id: 'l4', habitId: '2', date: new Date(2024, 6, 8), completed: true, loggedAt: new Date() }, // Week starting July 8th
   { id: 'l5', habitId: '3', date: new Date(2024, 6, 11), completed: true, loggedAt: new Date() },
   { id: 'l6', habitId: '4', date: new Date(2024, 6, 1), completed: true, loggedAt: new Date() }, // July
];
let nextHabitId = 5;
let nextLogId = 7;

// --- Helper Functions ---

// Simple date comparison (ignoring time)
const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

// Get the start of the week (assuming Sunday is the first day)
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// Get the start of the month
const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Get the relevant date period start based on frequency
const getPeriodStartDate = (frequency: HabitFrequency, date: Date): Date => {
  switch (frequency) {
    case 'daily':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // Start of the day
    case 'weekly':
      return getStartOfWeek(date);
    case 'monthly':
      return getStartOfMonth(date);
  }
};


// --- Server Actions ---

export async function getHabits(): Promise<Habit[]> {
  // Simulate DB fetch delay
  await new Promise(resolve => setTimeout(resolve, 100));
  // In real app: fetch from database
  return [...habits].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addHabit(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const name = formData.get('name') as string;
    const frequency = formData.get('frequency') as HabitFrequency;

    if (!name || !frequency) {
        return { success: false, error: 'Name and frequency are required.' };
    }
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        return { success: false, error: 'Invalid frequency.' };
    }

    const newHabit: Habit = {
        id: String(nextHabitId++),
        name: name.trim(),
        frequency,
        createdAt: new Date(),
    };

    // Simulate DB insert delay
    await new Promise(resolve => setTimeout(resolve, 200));
    habits.push(newHabit);

    revalidatePath('/'); // Revalidate the page to show the new habit
    return { success: true };
}

export async function recordHabit(habitId: string, date: Date, completed: boolean): Promise<{ success: boolean; error?: string }> {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
        return { success: false, error: 'Habit not found.' };
    }

    const periodStartDate = getPeriodStartDate(habit.frequency, date);

    // Find if a log already exists for this habit in this period
    const existingLogIndex = habitLogs.findIndex(log =>
        log.habitId === habitId && isSameDay(log.date, periodStartDate) // Compare based on period start date
    );

    // Simulate DB operation delay
    await new Promise(resolve => setTimeout(resolve, 150));

    if (existingLogIndex !== -1) {
        // Update existing log
        habitLogs[existingLogIndex].completed = completed;
        habitLogs[existingLogIndex].loggedAt = new Date();
    } else {
        // Create new log
        const newLog: HabitLog = {
            id: String(nextLogId++),
            habitId,
            date: periodStartDate, // Store the period start date
            completed,
            loggedAt: new Date(),
        };
        habitLogs.push(newLog);
    }

    revalidatePath('/'); // Revalidate the page to show the updated status
    console.log('Updated Logs:', habitLogs);
    return { success: true };
}


export async function getHabitLogs(habitId?: string): Promise<HabitLog[]> {
    // Simulate DB fetch delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (habitId) {
        return habitLogs.filter(log => log.habitId === habitId);
    }
    return [...habitLogs];
}

export async function getHabitCompletionStatus(habitId: string, date: Date): Promise<boolean | undefined> {
    // Simulate DB fetch delay to make loading states more visible
    await new Promise(resolve => setTimeout(resolve, 100));
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return undefined;

    const periodStartDate = getPeriodStartDate(habit.frequency, date);
    const log = habitLogs.find(l => l.habitId === habitId && isSameDay(l.date, periodStartDate));

    return log?.completed;
}

// --- Data Aggregation for Charts/AI (Example) ---

// Calculate completion rate for a habit over a period (e.g., last 30 days for daily)
export async function getCompletionRate(habitId: string, days: number = 30): Promise<number> {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || habit.frequency !== 'daily') return 0; // Simplified: only daily for now

    const logs = await getHabitLogs(habitId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    let completedCount = 0;
    let totalDays = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d >= habit.createdAt) { // Only count days from habit creation
            totalDays++;
            const log = logs.find(l => isSameDay(l.date, d));
            if (log?.completed) {
                completedCount++;
            }
        }
    }

    return totalDays > 0 ? completedCount / totalDays : 0;
}

// Calculate current streak (simplified for daily habits)
export async function getCurrentStreak(habitId: string): Promise<number> {
    const habit = habits.find(h => h.id === habitId);
     if (!habit || habit.frequency !== 'daily') return 0; // Simplified: only daily for now

    const logs = (await getHabitLogs(habitId))
        .filter(l => l.completed && l.date <= new Date()) // Only completed logs up to today
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent completed

    if (!logs.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Check if the most recent log is for today or yesterday
    const mostRecentLogDate = new Date(logs[0].date);
    mostRecentLogDate.setHours(0,0,0,0);

    if (!isSameDay(mostRecentLogDate, today) && !isSameDay(mostRecentLogDate, yesterday)) {
        return 0; // Streak is broken if not completed today or yesterday
    }

    let currentDate = new Date(mostRecentLogDate); // Start from the most recent completed day

    for (const log of logs) {
        const logDate = new Date(log.date);
        logDate.setHours(0,0,0,0);

        if (isSameDay(logDate, currentDate)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1); // Expect completion for the previous day
        } else if (logDate < currentDate) {
            // A day was missed before this log entry, streak broken before this log
            break;
        }
        // If logDate > currentDate, it means multiple logs for the same day or future logs, skip (handled by sorting)
    }
    return streak;
}

