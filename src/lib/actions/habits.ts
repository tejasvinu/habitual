'use server';

import type { Habit, HabitFrequency, HabitLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { addDays, isSameDay as dfIsSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// --- Helper Functions ---

const isSameDay = (date1: Date | number, date2: Date | number): boolean => dfIsSameDay(date1, date2);

const getPeriodStartDate = (frequency: HabitFrequency, date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); 
    switch (frequency) {
        case 'daily':
        return d;
        case 'weekly':
        return startOfWeek(d, { weekStartsOn: 0 });
        case 'monthly':
        return startOfMonth(d);
    }
};

// --- Server Actions for MongoDB ---

export async function getHabits(userId: string): Promise<Habit[]> {
  if (!userId) {
    console.error("getHabits: userId is required");
    return [];
  }
  try {
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    // Ensure find returns documents that match the expected structure for mapping
    const userHabitsDocs = await habitsCollection.find({ userId: new ObjectId(userId) }).sort({ createdAt: 1 }).toArray();
    
    return userHabitsDocs.map(habitDoc => ({
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name,
        frequency: habitDoc.frequency as HabitFrequency, // Assuming frequency is stored correctly
        createdAt: new Date(habitDoc.createdAt),
    })) as Habit[];
  } catch (error) {
    console.error("Error fetching habits from MongoDB:", error);
    return [];
  }
}

export async function addHabit(formData: FormData): Promise<{ success: boolean; error?: string; habitId?: string }> {
    const name = formData.get('name') as string;
    const frequency = formData.get('frequency') as HabitFrequency;
    const userId = formData.get('userId') as string;

    if (!userId) {
        return { success: false, error: 'User ID is required.' };
    }
    if (!name || !frequency) {
        return { success: false, error: 'Name and frequency are required.' };
    }
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        return { success: false, error: 'Invalid frequency.' };
    }

    try {
        const db = await getDb();
        const habitsCollection = db.collection('habits');
        const newHabitDocument = {
            userId: new ObjectId(userId),
            name: name.trim(),
            frequency,
            createdAt: new Date(),
        };
        const result = await habitsCollection.insertOne(newHabitDocument);
        
        if (!result.insertedId) {
            return { success: false, error: "Failed to insert habit into database." };
        }
        revalidatePath('/');
        return { success: true, habitId: result.insertedId.toHexString() };
    } catch (error) {
        console.error("Error adding habit to MongoDB:", error);
        return { success: false, error: 'An unexpected error occurred while adding the habit.' };
    }
}

export async function recordHabit(userId: string, habitId: string, date: Date, completed: boolean): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User ID is required.' };
    }
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitLogsCollection = db.collection('habitLogs');

    const habit = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    if (!habit) {
        return { success: false, error: 'Habit not found or does not belong to user.' };
    }

    const periodStartDate = getPeriodStartDate(habit.frequency as HabitFrequency, date);

    try {
        const existingLog = await habitLogsCollection.findOne({
            habitId: new ObjectId(habitId),
            userId: new ObjectId(userId),
            date: periodStartDate
        });

        if (existingLog) {
            await habitLogsCollection.updateOne(
                { _id: existingLog._id },
                { $set: { completed, loggedAt: new Date() } }
            );
        } else {
            await habitLogsCollection.insertOne({
                userId: new ObjectId(userId),
                habitId: new ObjectId(habitId),
                date: periodStartDate,
                completed,
                loggedAt: new Date(),
            });
        }
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error recording habit to MongoDB:", error);
        return { success: false, error: 'An unexpected error occurred while recording the habit.' };
    }
}

export async function getHabitLogs(userId: string, habitId?: string): Promise<HabitLog[]> {
  if (!userId) {
    console.error("getHabitLogs: userId is required");
    return [];
  }
  try {
    const db = await getDb();
    const habitLogsCollection = db.collection('habitLogs');
    const query: any = { userId: new ObjectId(userId) };
    if (habitId) {
        query.habitId = new ObjectId(habitId);
    }
    // Ensure find returns documents that match the expected structure for mapping
    const logDocs = await habitLogsCollection.find(query).toArray();
    return logDocs.map(logDoc => ({
        id: logDoc._id.toHexString(),
        userId: logDoc.userId.toHexString(),
        habitId: logDoc.habitId.toHexString(),
        date: new Date(logDoc.date),
        completed: logDoc.completed,
        loggedAt: new Date(logDoc.loggedAt),
    })) as HabitLog[];
  } catch (error) {
    console.error("Error fetching habit logs from MongoDB:", error);
    return [];
  }
}

export async function getHabitCompletionStatus(userId: string, habitId: string, date: Date): Promise<boolean | undefined> {
    if (!userId) return undefined;

    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitLogsCollection = db.collection('habitLogs');
    
    const habit = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    if (!habit) return undefined;

    const periodStartDate = getPeriodStartDate(habit.frequency as HabitFrequency, date);
    const log = await habitLogsCollection.findOne({ 
        habitId: new ObjectId(habitId), 
        userId: new ObjectId(userId),
        date: periodStartDate 
    });
    return log?.completed;
}


export async function getCompletionRate(userId: string, habitId: string, days: number = 30): Promise<number> {
    if (!userId) return -1;
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });

    if (!habitDoc) return -1;
    // Explicitly map to Habit type to ensure serializability if this object were passed around
    const habit: Habit = {
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string,
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
    };

    const logs = await getHabitLogs(userId, habitId); // getHabitLogs already returns sanitized logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = subDays(today, days - 1);
    startDate.setHours(0, 0, 0, 0);
    
    const habitCreatedAt = new Date(habit.createdAt);
    habitCreatedAt.setHours(0, 0, 0, 0);

    const effectiveStartDate = startDate > habitCreatedAt ? startDate : habitCreatedAt;
    if (effectiveStartDate > today) return -1; // Cannot calculate rate if habit started in future or period is entirely in future

    let completedCount = 0;
    let totalPeriods = 0;
    let currentPeriodStart = getPeriodStartDate(habit.frequency, effectiveStartDate);

    while (currentPeriodStart <= today) {
        // Only consider periods that are on or after the habit's creation date.
        if (currentPeriodStart >= habitCreatedAt) {
            totalPeriods++;
            const log = logs.find(l => isSameDay(l.date, currentPeriodStart));
            if (log?.completed) {
                completedCount++;
            }
        }
        // Move to the next period's start date
        if (habit.frequency === 'daily') currentPeriodStart = addDays(currentPeriodStart, 1);
        else if (habit.frequency === 'weekly') currentPeriodStart = addDays(currentPeriodStart, 7);
        else currentPeriodStart = new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() + 1, 1); // Start of next month
        
        currentPeriodStart.setHours(0, 0, 0, 0); // Normalize
    }

    // Require a minimum number of periods to have passed for a meaningful rate
    const minPeriodsForRate = habit.frequency === 'daily' ? 3 : (habit.frequency === 'weekly' ? 1 : 1);
    if (totalPeriods < minPeriodsForRate) return -1; // Indicate insufficient data with -1
    
    return totalPeriods > 0 ? completedCount / totalPeriods : 0;
}

export async function getCurrentStreak(userId: string, habitId: string): Promise<number> {
    if (!userId) return -1;

    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    
    if (!habitDoc) return -1;
    // Explicitly map to Habit type
    const habit: Habit = {
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string,
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
    };

    const userLogs = await getHabitLogs(userId, habitId); // getHabitLogs already returns sanitized logs
    const completedLogs = userLogs
        .filter(l => l.completed)
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent first

    if (!completedLogs.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine the start of the current or most recent relevant period
    let expectedPeriodStart = getPeriodStartDate(habit.frequency, today);
    
    // If today is before the first possible log day for this period (e.g. for weekly habit, today is Mon, period starts Sun)
    // and no log for *this* period, then the streak must be based on *previous* periods.
    // Or, if the habit just started and this period is the first one.
    const mostRecentLogDate = new Date(completedLogs[0].date);
    mostRecentLogDate.setHours(0,0,0,0);

    // Check if the most recent completed log is for the current period
    if (isSameDay(mostRecentLogDate, expectedPeriodStart)) {
        streak++;
    } else {
        // If not, check if it's for the immediately preceding period
        let previousPeriodStart = new Date(expectedPeriodStart);
        if (habit.frequency === 'daily') previousPeriodStart = addDays(previousPeriodStart, -1);
        else if (habit.frequency === 'weekly') previousPeriodStart = addDays(previousPeriodStart, -7);
        else previousPeriodStart = new Date(previousPeriodStart.getFullYear(), previousPeriodStart.getMonth() - 1, 1);
        previousPeriodStart.setHours(0,0,0,0);

        if (isSameDay(mostRecentLogDate, previousPeriodStart)) {
            streak++;
            expectedPeriodStart = previousPeriodStart; // Start counting back from this period
        } else {
            // Most recent log is not for current or immediately preceding period, so streak is 0
            return 0;
        }
    }
    
    // Continue counting backwards from (expectedPeriodStart - 1 period)
    for (let i = 1; i < completedLogs.length; i++) {
        let nextExpectedPeriodStart = new Date(expectedPeriodStart);
        if (habit.frequency === 'daily') nextExpectedPeriodStart = addDays(nextExpectedPeriodStart, -streak); // streak already accounts for 1st one
        else if (habit.frequency === 'weekly') nextExpectedPeriodStart = addDays(nextExpectedPeriodStart, -7 * streak);
        else { // monthly
            nextExpectedPeriodStart = new Date(expectedPeriodStart.getFullYear(), expectedPeriodStart.getMonth() - streak, 1);
        }
        nextExpectedPeriodStart.setHours(0,0,0,0);
        
        const logDate = new Date(completedLogs[i].date);
        logDate.setHours(0,0,0,0);

        if (isSameDay(logDate, nextExpectedPeriodStart)) {
            streak++;
        } else {
            // Streak broken
            break;
        }
    }
    return streak;
}
