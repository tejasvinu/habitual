
'use server';

import type { Habit, HabitFrequency, HabitLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { differenceInCalendarDays, isSameDay as dfIsSameDay, startOfWeek, startOfMonth, subDays, getDay, isWithinInterval, addDays } from 'date-fns';


// --- Mock Data Store ---
// In a real app, replace this with database interactions (e.g., Firestore)
let habits: Habit[] = [
  { id: '1', name: 'Drink 8 Glasses Water', frequency: 'daily', createdAt: new Date(2024, 6, 1) }, // July 1st
  { id: '2', name: '30 min Exercise', frequency: 'daily', createdAt: new Date(2024, 6, 8) }, // July 8th
  { id: '3', name: 'Weekly Review', frequency: 'weekly', createdAt: new Date(2024, 6, 1) },
  { id: '4', name: 'Read 1 Chapter', frequency: 'daily', createdAt: new Date(2024, 5, 15) }, // June 15th
];
let habitLogs: HabitLog[] = [
   // Add more logs for better testing data
   // Habit 1 (Water)
   { id: 'l1', habitId: '1', date: new Date(2024, 6, 10), completed: true, loggedAt: new Date() }, // Wed
   { id: 'l2', habitId: '1', date: new Date(2024, 6, 11), completed: true, loggedAt: new Date() }, // Thu
   { id: 'l3', habitId: '1', date: new Date(2024, 6, 12), completed: false, loggedAt: new Date() },// Fri (Missed)
   { id: 'l7', habitId: '1', date: new Date(2024, 6, 13), completed: true, loggedAt: new Date() }, // Sat
   { id: 'l8', habitId: '1', date: new Date(2024, 6, 14), completed: true, loggedAt: new Date() }, // Sun
   { id: 'l9', habitId: '1', date: new Date(2024, 6, 15), completed: true, loggedAt: new Date() }, // Mon (Today if July 15th)


   // Habit 2 (Exercise) - Started July 8th
   { id: 'l10', habitId: '2', date: new Date(2024, 6, 9), completed: true, loggedAt: new Date() },
   { id: 'l11', habitId: '2', date: new Date(2024, 6, 11), completed: true, loggedAt: new Date() },
   { id: 'l12', habitId: '2', date: new Date(2024, 6, 13), completed: true, loggedAt: new Date() },
   { id: 'l13', habitId: '2', date: new Date(2024, 6, 14), completed: false, loggedAt: new Date() },


   // Habit 3 (Weekly Review) - Week starts Sunday
   { id: 'l4', habitId: '3', date: startOfWeek(new Date(2024, 6, 7)), completed: true, loggedAt: new Date() }, // Week of July 7th
   { id: 'l14', habitId: '3', date: startOfWeek(new Date(2024, 6, 14)), completed: true, loggedAt: new Date() }, // Week of July 14th


   // Habit 4 (Read) - Started June 15th
   { id: 'l5', habitId: '4', date: new Date(2024, 6, 11), completed: true, loggedAt: new Date() },
   { id: 'l6', habitId: '4', date: new Date(2024, 6, 1), completed: true, loggedAt: new Date() },
   { id: 'l15', habitId: '4', date: new Date(2024, 6, 13), completed: true, loggedAt: new Date() },
   { id: 'l16', habitId: '4', date: new Date(2024, 6, 14), completed: true, loggedAt: new Date() },

];
let nextHabitId = 5;
let nextLogId = 17; // Update next ID

// --- Helper Functions ---

// Use date-fns for reliable date comparisons
const isSameDay = (date1: Date | number, date2: Date | number): boolean => dfIsSameDay(date1, date2);

// Get the start of the relevant period (day, week, or month)
const getPeriodStartDate = (frequency: HabitFrequency, date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize to start of day
    switch (frequency) {
        case 'daily':
        return d; // Start of the day
        case 'weekly':
        // Assuming week starts on Sunday (locale-aware would be better)
        return startOfWeek(d, { weekStartsOn: 0 });
        case 'monthly':
        return startOfMonth(d);
    }
};

// --- Server Actions ---

export async function getHabits(): Promise<Habit[]> {
  // Simulate DB fetch delay
  await new Promise(resolve => setTimeout(resolve, 50)); // Shorter delay
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
    await new Promise(resolve => setTimeout(resolve, 100));
    habits.push(newHabit);

    revalidatePath('/'); // Revalidate the page to show the new habit
    return { success: true };
}

export async function recordHabit(habitId: string, date: Date, completed: boolean): Promise<{ success: boolean; error?: string }> {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
        return { success: false, error: 'Habit not found.' };
    }

    // Use the start date of the period (day, week, month) as the canonical date for the log
    const periodStartDate = getPeriodStartDate(habit.frequency, date);

    // Find if a log already exists for this habit for this specific period start date
    const existingLogIndex = habitLogs.findIndex(log =>
        log.habitId === habitId && isSameDay(log.date, periodStartDate)
    );

    // Simulate DB operation delay
    await new Promise(resolve => setTimeout(resolve, 80)); // Shorter delay

    if (existingLogIndex !== -1) {
        // Update existing log
        habitLogs[existingLogIndex].completed = completed;
        habitLogs[existingLogIndex].loggedAt = new Date();
         console.log(`Updated Log: ID ${habitLogs[existingLogIndex].id}, Habit ${habitId}, Date ${periodStartDate.toISOString().split('T')[0]}, Completed: ${completed}`);
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
         console.log(`Created Log: ID ${newLog.id}, Habit ${habitId}, Date ${periodStartDate.toISOString().split('T')[0]}, Completed: ${completed}`);
    }

    revalidatePath('/'); // Revalidate the page to show the updated status
    // console.log('Current Logs:', habitLogs.filter(l => l.habitId === habitId).map(l => ({ date: l.date.toISOString().split('T')[0], completed: l.completed })));
    return { success: true };
}


export async function getHabitLogs(habitId?: string): Promise<HabitLog[]> {
    // Simulate DB fetch delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (habitId) {
        // Make sure to return copies to avoid mutation issues if objects are modified later
        return habitLogs.filter(log => log.habitId === habitId).map(log => ({...log}));
    }
     // Return copies
    return habitLogs.map(log => ({...log}));
}

export async function getHabitCompletionStatus(habitId: string, date: Date): Promise<boolean | undefined> {
    // Simulate DB fetch delay to make loading states more visible
    await new Promise(resolve => setTimeout(resolve, 50));
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return undefined;

    const periodStartDate = getPeriodStartDate(habit.frequency, date);
    const log = habitLogs.find(l => l.habitId === habitId && isSameDay(l.date, periodStartDate));

    return log?.completed;
}

// --- Data Aggregation for Charts/AI (Refined) ---

/**
 * Calculates completion rate for a habit over a specified period.
 * Returns a rate between 0 and 1, or -1 if insufficient data.
 */
export async function getCompletionRate(habitId: string, days: number = 30): Promise<number> {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return -1; // Habit not found

    const logs = await getHabitLogs(habitId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = subDays(today, days - 1); // Start date for the period
    startDate.setHours(0, 0, 0, 0);
    const habitCreatedAt = new Date(habit.createdAt);
    habitCreatedAt.setHours(0, 0, 0, 0);

    // Determine the effective start date for calculation (later of period start or habit creation)
    const effectiveStartDate = startDate > habitCreatedAt ? startDate : habitCreatedAt;

    if (effectiveStartDate > today) return -1; // Habit created after the period ended

    let completedCount = 0;
    let totalPeriods = 0;

    // Iterate through each *period* within the requested range, starting from effectiveStartDate
    let currentPeriodStart = getPeriodStartDate(habit.frequency, effectiveStartDate);

    while (currentPeriodStart <= today) {
        // Only count periods that start on or after the habit was created
        if (currentPeriodStart >= habitCreatedAt) {
            totalPeriods++;
            const log = logs.find(l => isSameDay(l.date, currentPeriodStart));
            if (log?.completed) {
                completedCount++;
            }
        }

        // Move to the next period start date
        if (habit.frequency === 'daily') {
            currentPeriodStart = addDays(currentPeriodStart, 1);
        } else if (habit.frequency === 'weekly') {
             currentPeriodStart = addDays(currentPeriodStart, 7); // Assumes weekly logs align with period start
        } else { // monthly
             currentPeriodStart = new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() + 1, 1);
        }
         currentPeriodStart.setHours(0, 0, 0, 0); // Normalize next start
    }


    // Require a minimum number of periods to have passed for a meaningful rate
    const minPeriodsForRate = habit.frequency === 'daily' ? 3 : 1;
    if (totalPeriods < minPeriodsForRate) {
        return -1; // Not enough data
    }

    return completedCount / totalPeriods;
}


/**
 * Calculates the current streak for a habit.
 * Returns the streak count (>= 0), or -1 if habit not found.
 */
export async function getCurrentStreak(habitId: string): Promise<number> {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return -1;

    const logs = (await getHabitLogs(habitId))
        .filter(l => l.completed) // Only completed logs
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent completed period start date

    if (!logs.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the start date of the *current* or *immediately preceding* period
    let expectedPeriodStart = getPeriodStartDate(habit.frequency, today);
    if (expectedPeriodStart > today) { // e.g., for weekly/monthly if today is before the calculated start
        if (habit.frequency === 'weekly') expectedPeriodStart = addDays(expectedPeriodStart, -7);
        else if (habit.frequency === 'monthly') expectedPeriodStart = new Date(expectedPeriodStart.getFullYear(), expectedPeriodStart.getMonth() - 1, 1);
        expectedPeriodStart.setHours(0, 0, 0, 0);
    }


    // Check if the most recent completed log corresponds to the current/last period
    const mostRecentLogDate = new Date(logs[0].date);
    mostRecentLogDate.setHours(0,0,0,0);

    if (!isSameDay(mostRecentLogDate, expectedPeriodStart)) {
        // If not completed in the *immediately preceding* period, check if it was completed in the one before that
        let previousExpectedPeriodStart = new Date(expectedPeriodStart);
        if (habit.frequency === 'daily') previousExpectedPeriodStart.setDate(previousExpectedPeriodStart.getDate() - 1);
        else if (habit.frequency === 'weekly') previousExpectedPeriodStart.setDate(previousExpectedPeriodStart.getDate() - 7);
        else previousExpectedPeriodStart.setMonth(previousExpectedPeriodStart.getMonth() - 1);
         previousExpectedPeriodStart.setHours(0, 0, 0, 0);

        if (!isSameDay(mostRecentLogDate, previousExpectedPeriodStart)) {
           return 0; // Streak broken if not completed in the last relevant period or the one before it.
        } else {
             // Completed in the previous period, but not the current one. Start checking from previous.
             expectedPeriodStart = previousExpectedPeriodStart;
        }

    }


    // Iterate through sorted logs to count consecutive periods
    for (const log of logs) {
        const logDate = new Date(log.date);
        logDate.setHours(0,0,0,0);

        if (isSameDay(logDate, expectedPeriodStart)) {
            streak++;
            // Calculate the start of the next expected *previous* period
            if (habit.frequency === 'daily') {
                expectedPeriodStart.setDate(expectedPeriodStart.getDate() - 1);
            } else if (habit.frequency === 'weekly') {
                 expectedPeriodStart.setDate(expectedPeriodStart.getDate() - 7);
            } else { // monthly
                 expectedPeriodStart.setMonth(expectedPeriodStart.getMonth() - 1);
            }
             expectedPeriodStart.setHours(0, 0, 0, 0); // Normalize
        } else if (logDate < expectedPeriodStart) {
            // Found a completed log, but it's older than the next expected one -> gap detected
            break;
        }
        // Ignore logs newer than expectedPeriodStart (shouldn't happen with sorting, but safe)
    }

    return streak;
}
```