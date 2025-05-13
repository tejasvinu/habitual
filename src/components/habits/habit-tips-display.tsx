
"use client";

import * as React from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";

import type { Habit } from '@/lib/types';
import { generateHabitTips } from '@/ai/flows/generate-habit-tips';
import { getCompletionRate, getCurrentStreak } from '@/lib/actions/habits'; // Assuming these exist

interface HabitTipsDisplayProps {
  habit: Habit | null; // Can be null if no habit is selected or suitable for tips
}

export function HabitTipsDisplay({ habit }: HabitTipsDisplayProps) {
  const [tips, setTips] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [triggerFetch, setTriggerFetch] = React.useState(0); // State to manually trigger fetch

   const fetchTips = React.useCallback(async () => {
    if (!habit) return;

    setIsLoading(true);
    setError(null);
    setTips([]); // Clear previous tips

    try {
      // Fetch necessary data for the AI model
      // In a real app, ensure these calculations are robust and handle different frequencies
      const completionRate = await getCompletionRate(habit.id); // Example: last 30 days completion for daily
      const streak = await getCurrentStreak(habit.id); // Example: current daily streak

      const input = {
        habitName: habit.name,
        frequency: habit.frequency,
        completionRate: completionRate,
        streak: streak,
      };

      const result = await generateHabitTips(input);
      setTips(result.tips);
    } catch (err) {
      console.error("Failed to generate habit tips:", err);
      setError("Could not generate tips at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [habit]);


  // Fetch tips when the selected habit changes or when triggered manually
  React.useEffect(() => {
      if (habit) {
        fetchTips();
      } else {
          // Clear state if no habit is selected
          setTips([]);
          setIsLoading(false);
          setError(null);
      }
  }, [habit, triggerFetch, fetchTips]); // Depend on habit and triggerFetch

  const handleRetry = () => {
      setTriggerFetch(prev => prev + 1); // Increment trigger to refetch
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className='space-y-1.5'>
            <CardTitle className="text-lg font-semibold flex items-center">
             <Sparkles className="w-5 h-5 mr-2 text-accent" />
             Personalized Tips
            </CardTitle>
             <CardDescription>
                AI-powered insights{habit ? ` for "${habit.name}"` : ''}.
            </CardDescription>
        </div>
         {error && (
             <Button variant="ghost" size="sm" onClick={handleRetry}>Retry</Button>
         )}
      </CardHeader>
      <CardContent>
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
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
         {!isLoading && !error && !habit && (
            <p className="text-sm text-muted-foreground mt-2">Select a habit or add habits to get personalized tips.</p>
         )}
        {!isLoading && !error && habit && tips.length > 0 && (
          <ul className="space-y-2 list-disc list-inside text-sm text-foreground mt-2">
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        )}
        {!isLoading && !error && habit && tips.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No tips available for this habit yet. Keep logging your progress!</p>
         )}
      </CardContent>
    </Card>
  );
}
