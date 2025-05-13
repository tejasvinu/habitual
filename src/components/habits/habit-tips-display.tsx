
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
      // These functions should handle their own potential errors or return null/0 if data is insufficient
      const completionRate = await getCompletionRate(habit.id);
      const streak = await getCurrentStreak(habit.id);

      console.log(`Fetching tips for ${habit.name}: Rate=${completionRate}, Streak=${streak}`);


      const input = {
        habitName: habit.name,
        frequency: habit.frequency,
        // Pass null if the value indicates insufficient data (e.g., -1 or null from the action)
        completionRate: completionRate !== null && completionRate >= 0 ? completionRate : undefined,
        streak: streak !== null && streak >= 0 ? streak : undefined,
      };

       const result = await generateHabitTips(input);
       setTips(result.tips);
    } catch (err) {
      console.error("Failed to generate habit tips:", err);
      let errorMessage = "Could not generate tips at this time. Please try again later.";
      if (err instanceof Error) {
          // Check for specific Genkit/API errors if possible
          errorMessage = `${errorMessage} (${err.message})`;
      }
      setError(errorMessage);
      setTips([]); // Ensure tips are cleared on error
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit, triggerFetch]); // Keep fetchTips out of deps array if it causes infinite loops, manage triggers manually

  const handleRetry = () => {
      setError(null); // Clear error before retrying
      setTriggerFetch(prev => prev + 1); // Increment trigger to refetch
  }

  return (
    <Card className="h-full flex flex-col"> {/* Ensure card takes height */}
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
         {error && !isLoading && ( // Show retry only on error and not loading
             <Button variant="ghost" size="sm" onClick={handleRetry}>
                 <RefreshCcw className="mr-1.5 h-4 w-4" />
                 Retry
            </Button>
         )}
         {isLoading && (
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
         )}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center"> {/* Center content vertically */}
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
        {!isLoading && !error && habit && tips.length > 0 && (
          <ul className="space-y-2 list-disc list-inside text-sm text-foreground mt-2">
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        )}
        {!isLoading && !error && habit && tips.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">No tips generated. Try logging more progress!</p>
         )}
      </CardContent>
    </Card>
  );
}
