
'use server';

import type { Habit, HabitFrequency, HabitLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { addDays, isSameDay as dfIsSameDay, startOfMonth, startOfWeek, subDays, format as formatDateFns, getDay } from 'date-fns';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { awardPoints, checkAndAwardBadges, checkAndAwardCreationBadges } from './gamification'; // Import gamification actions

// --- Helper Functions ---

const isSameDay = (date1: Date | number | string, date2: Date | number | string): boolean => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return dfIsSameDay(d1, d2);
}


const getPeriodStartDate = (frequency: HabitFrequency, date: Date, specificDays?: number[]): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); 
    if (frequency === 'weekly' && specificDays && specificDays.length > 0) {
        return d; 
    }
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
    const userHabitsDocs = await habitsCollection.find({ userId: new ObjectId(userId) }).sort({ createdAt: 1 }).toArray();
    
    return userHabitsDocs.map(habitDoc => ({
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string, // Cast name to string
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
        specificDays: habitDoc.specificDays || undefined, 
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
    const specificDaysString = formData.get('specificDays') as string | null;

    if (!userId) return { success: false, error: 'User ID is required.' };
    if (!name || !frequency) return { success: false, error: 'Name and frequency are required.' };
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) return { success: false, error: 'Invalid frequency.' };

    let specificDays: number[] | undefined = undefined;
    if (frequency === 'weekly' && specificDaysString) {
        specificDays = specificDaysString.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (specificDays.length === 0) specificDays = undefined;
    }

    try {
        const db = await getDb();
        const habitsCollection = db.collection('habits');
        const newHabitDocument: Omit<Habit, 'id' | 'currentStreak'> & { userId: ObjectId; createdAt: Date } = {
            userId: new ObjectId(userId),
            name: name.trim(),
            frequency,
            createdAt: new Date(),
            ...(specificDays && { specificDays }),
        };
        const result = await habitsCollection.insertOne(newHabitDocument);
        
        if (!result.insertedId) return { success: false, error: "Failed to insert habit into database." };
        
        await checkAndAwardCreationBadges(userId); // Check for badges related to habit creation count

        revalidatePath('/');
        return { success: true, habitId: result.insertedId.toHexString() };
    } catch (error) {
        console.error("Error adding habit to MongoDB:", error);
        return { success: false, error: 'An unexpected error occurred while adding the habit.' };
    }
}

export async function updateHabit(habitId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
    const name = formData.get('name') as string;
    const frequency = formData.get('frequency') as HabitFrequency;
    const userId = formData.get('userId') as string; 
    const specificDaysString = formData.get('specificDays') as string | null;

    if (!userId) return { success: false, error: 'User ID is required for update.' };
    if (!name || !frequency) return { success: false, error: 'Name and frequency are required.' };
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) return { success: false, error: 'Invalid frequency.' };

    let specificDaysUpdate: any = { $unset: { specificDays: "" } }; 
    if (frequency === 'weekly' && specificDaysString) {
        const parsedDays = specificDaysString.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (parsedDays.length > 0) {
            specificDaysUpdate = { $set: { specificDays: parsedDays } };
        }
    }
    if (frequency !== 'weekly') {
        specificDaysUpdate = { $unset: { specificDays: "" } };
    }


    try {
        const db = await getDb();
        const habitsCollection = db.collection('habits');
        const result = await habitsCollection.updateOne(
            { _id: new ObjectId(habitId), userId: new ObjectId(userId) },
            { 
                $set: { 
                    name: name.trim(), 
                    frequency,
                    updatedAt: new Date() 
                },
                ...specificDaysUpdate 
            }
        );

        if (result.matchedCount === 0) return { success: false, error: 'Habit not found or user unauthorized.' };
        
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error updating habit in MongoDB:", error);
        return { success: false, error: 'An unexpected error occurred while updating the habit.' };
    }
}

export async function deleteHabit(habitId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || !habitId) return { success: false, error: 'User ID and Habit ID are required.' };

    try {
        const db = await getDb();
        const habitsCollection = db.collection('habits');
        const habitLogsCollection = db.collection('habitLogs');

        const habit = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
        if (!habit) return { success: false, error: 'Habit not found or user unauthorized.' };

        await habitsCollection.deleteOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
        await habitLogsCollection.deleteMany({ habitId: new ObjectId(habitId), userId: new ObjectId(userId) });
        
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting habit from MongoDB:", error);
        return { success: false, error: 'An unexpected error occurred while deleting the habit.' };
    }
}


export async function recordHabit(userId: string, habitId: string, date: Date, completed: boolean): Promise<{ success: boolean; error?: string, awardedBadgeIds?: string[] }> {
    if (!userId) return { success: false, error: 'User ID is required.' };
    
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitLogsCollection = db.collection('habitLogs');

    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    if (!habitDoc) return { success: false, error: 'Habit not found or does not belong to user.' };
    
    const habit: Habit = {
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string,
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
        specificDays: habitDoc.specificDays || undefined,
    };


    const normalizedDate = new Date(date); 
    normalizedDate.setHours(0,0,0,0);

    const logDateKey = (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0)
        ? normalizedDate 
        : getPeriodStartDate(habit.frequency as HabitFrequency, normalizedDate);

    try {
        const existingLog = await habitLogsCollection.findOne({
            habitId: new ObjectId(habitId),
            userId: new ObjectId(userId),
            date: logDateKey 
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
                date: logDateKey,
                completed,
                loggedAt: new Date(),
            });
        }

        let awardedBadgeIds: string[] = [];
        if (completed) {
            await awardPoints(userId, 10); // Award 10 points for completion
            awardedBadgeIds = await checkAndAwardBadges(userId, habit, normalizedDate);
        }

        revalidatePath('/');
        return { success: true, awardedBadgeIds };
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

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0,0,0,0);

    const logDateKey = (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0)
        ? normalizedDate
        : getPeriodStartDate(habit.frequency as HabitFrequency, normalizedDate);
    
    const log = await habitLogsCollection.findOne({ 
        habitId: new ObjectId(habitId), 
        userId: new ObjectId(userId),
        date: logDateKey
    });
    return log?.completed;
}


export async function getCompletionRate(userId: string, habitId: string, days: number = 30): Promise<number> {
    if (!userId) return -1;
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });

    if (!habitDoc) return -1;
    const habit: Habit = {
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string,
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
        specificDays: habitDoc.specificDays || undefined,
    };

    const logs = await getHabitLogs(userId, habitId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rangeStartDate = subDays(today, days - 1); rangeStartDate.setHours(0, 0, 0, 0);
    
    const habitCreatedAt = new Date(habit.createdAt); habitCreatedAt.setHours(0, 0, 0, 0);
    const effectiveStartDate = rangeStartDate > habitCreatedAt ? rangeStartDate : habitCreatedAt;
    if (effectiveStartDate > today) return -1;

    let completedCount = 0;
    let totalPeriods = 0;

    if (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0) {
        for (let d = new Date(effectiveStartDate); d <= today; d = addDays(d, 1)) {
            if (habit.specificDays.includes(getDay(d))) {
                totalPeriods++;
                const log = logs.find(l => isSameDay(l.date, d) && l.completed);
                if (log) completedCount++;
            }
        }
    } else {
        let currentPeriodStart = getPeriodStartDate(habit.frequency, effectiveStartDate);
        while (currentPeriodStart <= today) {
            if (currentPeriodStart >= habitCreatedAt) {
                totalPeriods++;
                const log = logs.find(l => isSameDay(l.date, currentPeriodStart) && l.completed);
                if (log) completedCount++;
            }
            if (habit.frequency === 'daily') currentPeriodStart = addDays(currentPeriodStart, 1);
            else if (habit.frequency === 'weekly') currentPeriodStart = addDays(currentPeriodStart, 7);
            else currentPeriodStart = new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() + 1, 1);
            currentPeriodStart.setHours(0, 0, 0, 0);
        }
    }
    
    const minPeriodsForRate = habit.frequency === 'daily' ? 3 : (habit.frequency === 'weekly' ? (habit.specificDays && habit.specificDays.length > 0 ? habit.specificDays.length : 1) : 1);
    if (totalPeriods < minPeriodsForRate) return -1;
    return totalPeriods > 0 ? completedCount / totalPeriods : 0;
}

export async function getCurrentStreak(userId: string, habitId: string): Promise<number> {
    if (!userId) return -1;
    const db = await getDb();
    const habitsCollection = db.collection('habits');
    const habitDoc = await habitsCollection.findOne({ _id: new ObjectId(habitId), userId: new ObjectId(userId) });
    
    if (!habitDoc) return -1;
    const habit: Habit = {
        id: habitDoc._id.toHexString(),
        userId: habitDoc.userId.toHexString(),
        name: habitDoc.name as string,
        frequency: habitDoc.frequency as HabitFrequency,
        createdAt: new Date(habitDoc.createdAt),
        specificDays: habitDoc.specificDays || undefined,
    };

    const userLogs = await getHabitLogs(userId, habitId);
    const completedLogs = userLogs
        .filter(l => l.completed)
        .map(l => { const d = new Date(l.date); d.setHours(0,0,0,0); return d; }) 
        .sort((a, b) => b.getTime() - a.getTime());

    if (!completedLogs.length) return 0;

    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let currentDateToCheck = new Date(today);

    if (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0) {
        
        while (currentDateToCheck >= habit.createdAt && !habit.specificDays.includes(getDay(currentDateToCheck))) {
            currentDateToCheck = subDays(currentDateToCheck, 1);
        }

        while (currentDateToCheck >= habit.createdAt) {
            if (habit.specificDays.includes(getDay(currentDateToCheck))) { 
                if (completedLogs.some(logDate => isSameDay(logDate, currentDateToCheck))) {
                    streak++;
                } else {
                    // Check if the "missed" day is today and it just hasn't been logged yet
                    // If it's not today, the streak is broken.
                    if(!isSameDay(currentDateToCheck, today)) {
                         break; 
                    }
                }
            }
            currentDateToCheck = subDays(currentDateToCheck, 1);
            while (currentDateToCheck >= habit.createdAt && !habit.specificDays.includes(getDay(currentDateToCheck))) {
                 currentDateToCheck = subDays(currentDateToCheck, 1);
            }
             if(currentDateToCheck < habit.createdAt && habit.specificDays.includes(getDay(habit.createdAt)) && isSameDay(currentDateToCheck, subDays(habit.createdAt,1)) ) {
                // Edge case: if loop ends exactly one day before creation day which was a target day.
                // if the habit.createdAt was a target day and was completed, it should count.
                if (completedLogs.some(logDate => isSameDay(logDate, habit.createdAt))) {
                    // if already counted, do nothing, otherwise, this logic is complex.
                    // For now, this path implies the loop correctly terminated.
                } else {
                    // If habit.createdAt was a target day but not logged as completed, streak might break here.
                    // This depends on if streak should start from day 1 or after first successful completion.
                    // Current logic: streak starts from most recent consecutive completion.
                }
            }
        }

    } else { 
        let expectedLogDatePeriodStart = getPeriodStartDate(habit.frequency, currentDateToCheck);
        
        const mostRecentCompletedLog = completedLogs[0]; // Already sorted, this is the latest
        if (mostRecentCompletedLog) {
            // If the most recent log is not for the current period,
            // check if it's for the immediately preceding period. If so, start streak check from there.
            // Otherwise, streak is 0 (or based on current day if it's completed).
            const currentPeriodIsCompleted = completedLogs.some(logDate => isSameDay(logDate, expectedLogDatePeriodStart));

            if (!currentPeriodIsCompleted) {
                const previousPeriodStartDate = getPeriodStartDate(habit.frequency, 
                    habit.frequency === 'daily' ? subDays(currentDateToCheck, 1) :
                    habit.frequency === 'weekly' ? subDays(currentDateToCheck, 7) :
                    startOfMonth(subDays(currentDateToCheck, 30)) // Approx for monthly previous
                );
                if (isSameDay(mostRecentCompletedLog, previousPeriodStartDate)) {
                    expectedLogDatePeriodStart = previousPeriodStartDate; // Start checking from this past completed period
                } else {
                     // Not current, not previous, so if today isn't completed, streak is 0.
                    return 0;
                }
            }
        } else { // No completed logs at all
            return 0;
        }


        for (const logDate of completedLogs) { // Iterates from most recent
            if (isSameDay(logDate, expectedLogDatePeriodStart)) {
                streak++;
                // Decrement expectedLogDatePeriodStart to the start of the previous period
                if (habit.frequency === 'daily') {
                    expectedLogDatePeriodStart = subDays(expectedLogDatePeriodStart, 1);
                } else if (habit.frequency === 'weekly') {
                    expectedLogDatePeriodStart = subDays(expectedLogDatePeriodStart, 7);
                } else { // monthly
                    expectedLogDatePeriodStart = startOfMonth(subDays(expectedLogDatePeriodStart, 1)); // Go to previous month's start
                }
                 expectedLogDatePeriodStart.setHours(0,0,0,0);
            } else if (logDate < expectedLogDatePeriodStart) {
                // Found an older log that doesn't match the expected sequence. Streak broken before this.
                break;
            }
            // If logDate > expectedLogDatePeriodStart, it means there's a gap, also break. But sorted logs should prevent this.
        }
    }
    return streak;
}


export async function exportUserData(userId: string): Promise<{ success: boolean; csvData?: string; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User ID is required.' };
    }

    try {
        const habits = await getHabits(userId);
        const logs = await getHabitLogs(userId);

        if (!habits.length && !logs.length) {
            return { success: true, csvData: "No data to export." };
        }

        let csvString = "Habit Name,Habit Frequency,Specific Days (0=Sun),Log Date,Completed,Logged At\n";

        for (const log of logs) {
            const habit = habits.find(h => h.id === log.habitId);
            if (habit) {
                const specificDaysStr = habit.specificDays ? habit.specificDays.join(';') : '';
                const logDateStr = formatDateFns(log.date, "yyyy-MM-dd");
                const loggedAtStr = formatDateFns(log.loggedAt, "yyyy-MM-dd HH:mm:ss");
                
                csvString += `"${habit.name.replace(/"/g, '""')}","${habit.frequency}","${specificDaysStr}","${logDateStr}","${log.completed}","${loggedAtStr}"\n`;
            }
        }
         if (logs.length === 0 && habits.length > 0) {
            csvString += "No logs found for existing habits.\n";
        }


        return { success: true, csvData: csvString };

    } catch (error) {
        console.error("Error exporting user data:", error);
        return { success: false, error: "An unexpected error occurred during data export." };
    }
}
