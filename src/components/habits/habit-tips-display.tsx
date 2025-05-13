
"use client";

import * as React from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";

import type { Habit } from '@/lib/types';
import { generateHabitTips } from '@/ai/flows/generate-habit-tips';
import { getCompletionRate, getCurrentStreak } from '@/lib/actions/habits';

interface HabitTipsDisplayProps {
  habit: Habit | null;
  userId: string; // Add userId prop
}

export function HabitTipsDisplay({ habit, userId }: HabitTipsDisplayProps) {
  const [tips, setTips] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [triggerFetch, setTriggerFetch] = React.useState(0);

   const fetchTips = React.useCallback(async () => {
    if (!habit || !userId) { // Check for userId
        setTips([]);
        setError(null);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setTips([]); 

    try {
      const completionRate = await getCompletionRate(userId, habit.id);
      const streak = await getCurrentStreak(userId, habit.id);

      const input = {
        habitName: habit.name,
        frequency: habit.frequency,
        completionRate: completionRate !== null && completionRate >= 0 ? completionRate : undefined,
        streak: streak !== null && streak >= 0 ? streak : undefined,
      };

       const result = await generateHabitTips(input);
       setTips(result.tips);
    } catch (err) {
      console.error("Failed to generate habit tips:", err);
      let errorMessage = "Could not generate tips at this time. Please try again later.";
      if (err instanceof Error) errorMessage = `${errorMessage} (${err.message})`;
      setError(errorMessage);
      setTips([]);
    } finally {
      setIsLoading(false);
    }
  }, [habit, userId]); // Add userId to dependency array


  React.useEffect(() => {
      if (habit && userId) {
        fetchTips();
      } else {
          setTips([]);
          setIsLoading(false);
          setError(null);
      }
  }, [habit, userId, triggerFetch, fetchTips]); // Added fetchTips to dependency array

  const handleRetry = () => {
      setError(null); 
      setTriggerFetch(prev => prev + 1); 
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className='space-y-1.5'>
            <CardTitle className="text-lg font-semibold flex items-center">
             <Sparkles className="w-5 h-5 mr-2 text-accent" />
             Personalized Tips
            </CardTitle>
             <CardDescription>
                AI-powered insights{habit ? ` for "${habit.name}"` : ''}.
            </CardDescription>
        </div>
         {error && !isLoading && (
             <Button variant="ghost" size="sm" onClick={handleRetry}>
                 <RefreshCcw className="mr-1.5 h-4 w-4" />
                 Retry
            </Button>
         )}
         {isLoading && (
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
         )}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {isLoading && (
          <div className="space-y-3 mt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        )}
        {!isLoading && error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Generating Tips</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
         {!isLoading && !error && !habit && (
            <p className="text-sm text-muted-foreground mt-2 text-center">Select a habit to get personalized tips.</p>
         )}
         {!isLoading && !error && !userId && habit && ( // Check if userId is missing when habit is present
             <p className="text-sm text-muted-foreground mt-2 text-center">Please log in to get personalized tips.</p>
         )}
        {!isLoading && !error && habit && userId && tips.length > 0 && (
          <ul className="space-y-2 list-disc list-inside text-sm text-foreground mt-2">
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        )}
        {!isLoading && !error && habit && userId && tips.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">No tips generated. Try logging more progress!</p>
         )}
      </CardContent>
    </Card>
  );
}
