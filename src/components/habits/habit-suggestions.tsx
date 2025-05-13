
"use client";

import * as React from 'react';
import { Lightbulb, Loader2, AlertCircle, RefreshCcw, PlusCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { suggestHabits, type SuggestHabitsOutput } from '@/ai/flows/suggest-habits';
import type { Habit } from '@/lib/types';
import { AddHabitDialog } from '@/components/habits/add-habit-dialog';
import { useToast } from '@/hooks/use-toast';


interface HabitSuggestionsProps {
    existingHabits: Habit[];
    userId: string; // Add userId prop
}

export function HabitSuggestions({ existingHabits, userId }: HabitSuggestionsProps) {
  const [suggestions, setSuggestions] = React.useState<SuggestHabitsOutput['suggestions']>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [triggerFetch, setTriggerFetch] = React.useState(0);
  const [isAddHabitDialogOpen, setIsAddHabitDialogOpen] = React.useState(false);
  const [habitNameToAdd, setHabitNameToAdd] = React.useState("");
  const { toast } = useToast();


  const fetchSuggestions = React.useCallback(async () => {
    if (!userId) { // Don't fetch if no user
        setSuggestions([]);
        setError(null);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestions([]); 

    try {
       const existingNames = existingHabits.map(h => h.name);
       // Potentially pass userId to suggestHabits in future if AI flow is updated
       const result = await suggestHabits({ existingHabitNames: existingNames });
       setSuggestions(result.suggestions);
    } catch (err) {
      console.error("Failed to fetch habit suggestions:", err);
      let errorMessage = "Could not get suggestions right now.";
       if (err instanceof Error) errorMessage = `${errorMessage} (${err.message})`;
      setError(errorMessage);
      setSuggestions([]); 
    } finally {
      setIsLoading(false);
    }
  }, [existingHabits, userId]); // Add userId to dependency array

  React.useEffect(() => {
      if (userId) fetchSuggestions(); // Fetch only if userId is present
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerFetch, userId]); // Add userId to dependency for initial fetch with user

  const handleRetry = () => {
      setError(null);
      setTriggerFetch(prev => prev + 1);
  }

   const handleAddSuggestion = (name: string) => {
     setHabitNameToAdd(name);
     setIsAddHabitDialogOpen(true);
   };

   React.useEffect(() => {
     if (!isAddHabitDialogOpen) setHabitNameToAdd("");
   }, [isAddHabitDialogOpen]);


  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
              Habit Ideas
            </CardTitle>
            <CardDescription>
              AI-powered suggestions to inspire you.
            </CardDescription>
          </div>
           {error && !isLoading && (
               <Button variant="ghost" size="sm" onClick={handleRetry}>
                   <RefreshCcw className="mr-1.5 h-4 w-4" />
                   Retry
              </Button>
           )}
           {isLoading && ( <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> )}
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center">
           {isLoading && (
              <div className="space-y-4 mt-2">
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded-full mt-1" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-5 w-3/5" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                 ))}
              </div>
            )}
          {!isLoading && error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Fetching Suggestions</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && suggestions.length > 0 && (
             <div className="space-y-4 mt-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3 group">
                    <div className="flex-shrink-0 pt-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                            {index + 1}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={suggestion.name}>
                          {suggestion.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAddSuggestion(suggestion.name)}
                      aria-label={`Add habit ${suggestion.name}`}
                      disabled={!userId} // Disable if no user
                    >
                       <PlusCircle className="h-4 w-4 text-primary" />
                    </Button>
                </div>
              ))}
            </div>
          )}
           {!isLoading && !error && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                  {userId ? "No suggestions available right now. Try refreshing!" : "Log in to get habit ideas."}
              </p>
           )}
        </CardContent>
         <CardContent className="pt-2 pb-4 text-center">
             <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={isLoading || !userId}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                 Get New Ideas
             </Button>
         </CardContent>
      </Card>

      <AddHabitDialog
        open={isAddHabitDialogOpen}
        onOpenChange={setIsAddHabitDialogOpen}
        defaultName={habitNameToAdd}
      >
         <span />
      </AddHabitDialog>
    </>
  );
}
// Removed internal AddHabitFormContent as AddHabitDialog handles its own form logic
