
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
    const userHabits = await habitsCollection.find({ userId: new ObjectId(userId) }).sort({ createdAt: 1 }).toArray();
    
    return userHabits.map(habit => ({
        ...habit,
        id: habit._id.toHexString(),
        userId: habit.userId.toHexString(), // Ensure userId is string
        createdAt: new Date(habit.createdAt), // Ensure createdAt is a Date object
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
    const logs = await habitLogsCollection.find(query).toArray();
    return logs.map(log => ({
        ...log,
        id: log._id.toHexString(),
        userId: log.userId.toHexString(),
        habitId: log.habitId.toHexString(),
        date: new Date(log.date),
        loggedAt: new Date(log.loggedAt),
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
    const habit = { ...habitDoc, id: habitDoc._id.toString(), userId: habitDoc.userId.toString(), createdAt: new Date(habitDoc.createdAt) } as Habit;


    const logs = await getHabitLogs(userId, habitId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = subDays(today, days - 1);
    startDate.setHours(0, 0, 0, 0);
    
    const habitCreatedAt = new Date(habit.createdAt);
    habitCreatedAt.setHours(0, 0, 0, 0);

    const effectiveStartDate = startDate > habitCreatedAt ? startDate : habitCreatedAt;
    if (effectiveStartDate > today) return -1;

    let completedCount = 0;
    let totalPeriods = 0;
    let currentPeriodStart = getPeriodStartDate(habit.frequency, effectiveStartDate);

    while (currentPeriodStart <= today) {
        if (currentPeriodStart >= habitCreatedAt) {
            totalPeriods++;
            const log = logs.find(l => isSameDay(l.date, currentPeriodStart));
            if (log?.completed) {
                completedCount++;
            }
        }
        if (habit.frequency === 'daily') currentPeriodStart = addDays(currentPeriodStart, 1);
        else if (habit.frequency === 'weekly') currentPeriodStart = addDays(currentPeriodStart, 7);
        else currentPeriodStart = new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() + 1, 1);
        currentPeriodStart.setHours(0, 0, 0, 0);
    }

    const minPeriodsForRate = habit.frequency === 'daily' ? 3 : 1;
    if (totalPeriods < minPeriodsForRate) return -1;
    return totalPeriods > 0 ? completedCount / totalPeriods : 0;
}

export async function getCurrentStreak(userId: string, habitId: string): Promise<number> {
    if (!userId) return -1;

    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    
    if (!habitDoc) return -1;
    const habit = { ...habitDoc, id: habitDoc._id.toString(), userId: habitDoc.userId.toString(), createdAt: new Date(habitDoc.createdAt) } as Habit;


    const userLogs = await getHabitLogs(userId, habitId);
    const completedLogs = userLogs
        .filter(l => l.completed)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (!completedLogs.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expectedPeriodStart = getPeriodStartDate(habit.frequency, today);
    if (expectedPeriodStart > today) {
        if (habit.frequency === 'weekly') expectedPeriodStart = addDays(expectedPeriodStart, -7);
        else if (habit.frequency === 'monthly') expectedPeriodStart = new Date(expectedPeriodStart.getFullYear(), expectedPeriodStart.getMonth() - 1, 1);
        expectedPeriodStart.setHours(0, 0, 0, 0);
    }
    
    const mostRecentLogDate = new Date(completedLogs[0].date);
    mostRecentLogDate.setHours(0,0,0,0);

    if (!isSameDay(mostRecentLogDate, expectedPeriodStart)) {
        let previousExpectedPeriodStart = new Date(expectedPeriodStart);
        if (habit.frequency === 'daily') previousExpectedPeriodStart.setDate(previousExpectedPeriodStart.getDate() - 1);
        else if (habit.frequency === 'weekly') previousExpectedPeriodStart.setDate(previousExpectedPeriodStart.getDate() - 7);
        else previousExpectedPeriodStart.setMonth(previousExpectedPeriodStart.getMonth() - 1);
        previousExpectedPeriodStart.setHours(0, 0, 0, 0);

        if (!isSameDay(mostRecentLogDate, previousExpectedPeriodStart)) {
           return 0; 
        } else {
             expectedPeriodStart = previousExpectedPeriodStart;
        }
    }

    for (const log of completedLogs) {
        const logDate = new Date(log.date);
        logDate.setHours(0,0,0,0);

        if (isSameDay(logDate, expectedPeriodStart)) {
            streak++;
            if (habit.frequency === 'daily') expectedPeriodStart.setDate(expectedPeriodStart.getDate() - 1);
            else if (habit.frequency === 'weekly') expectedPeriodStart.setDate(expectedPeriodStart.getDate() - 7);
            else expectedPeriodStart.setMonth(expectedPeriodStart.getMonth() - 1);
            expectedPeriodStart.setHours(0, 0, 0, 0);
        } else if (logDate < expectedPeriodStart) {
            break;
        }
    }
    return streak;
}
