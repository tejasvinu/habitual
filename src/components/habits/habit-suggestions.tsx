
"use client";

import * as React from 'react';
import { Lightbulb, Loader2, AlertCircle, RefreshCcw, PlusCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { suggestHabits, type SuggestHabitsOutput } from '@/ai/flows/suggest-habits';
import type { Habit } from '@/lib/types'; // Import Habit type
import { AddHabitDialog } from '@/components/habits/add-habit-dialog'; // Import AddHabitDialog
import { useToast } from '@/hooks/use-toast'; // Import useToast


interface HabitSuggestionsProps {
    existingHabits: Habit[]; // Pass existing habits to avoid duplicates
}

export function HabitSuggestions({ existingHabits }: HabitSuggestionsProps) {
  const [suggestions, setSuggestions] = React.useState<SuggestHabitsOutput['suggestions']>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [triggerFetch, setTriggerFetch] = React.useState(0);
  const [isAddHabitDialogOpen, setIsAddHabitDialogOpen] = React.useState(false);
  const [habitNameToAdd, setHabitNameToAdd] = React.useState("");
  const { toast } = useToast();


  const fetchSuggestions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]); // Clear previous suggestions

    try {
       const existingNames = existingHabits.map(h => h.name);
       const result = await suggestHabits({ existingHabitNames: existingNames });
       setSuggestions(result.suggestions);
    } catch (err) {
      console.error("Failed to fetch habit suggestions:", err);
      let errorMessage = "Could not get suggestions right now.";
       if (err instanceof Error) {
           errorMessage = `${errorMessage} (${err.message})`;
       }
      setError(errorMessage);
      setSuggestions([]); // Ensure suggestions are cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [existingHabits]); // Depend on existingHabits

  // Fetch suggestions on initial load or when retried
  React.useEffect(() => {
      fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerFetch]); // Triggered by retry button

  const handleRetry = () => {
      setError(null);
      setTriggerFetch(prev => prev + 1);
  }

   const handleAddSuggestion = (name: string) => {
     setHabitNameToAdd(name);
     setIsAddHabitDialogOpen(true);
   };

   // Reset habit name when dialog closes
   React.useEffect(() => {
     if (!isAddHabitDialogOpen) {
       setHabitNameToAdd("");
     }
   }, [isAddHabitDialogOpen]);


  return (
    <>
      <Card className="h-full flex flex-col"> {/* Ensure card takes height */}
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
           {isLoading && (
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
           )}
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center"> {/* Center content vertically */}
           {isLoading && (
              <div className="space-y-4 mt-2">
                 <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full mt-1" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-3/5" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full mt-1" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-2/5" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full mt-1" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-4/6" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                 </div>
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
                    >
                       <PlusCircle className="h-4 w-4 text-primary" />
                    </Button>
                </div>
              ))}
            </div>
          )}
           {!isLoading && !error && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">No suggestions available right now.</p>
           )}
        </CardContent>
         <CardContent className="pt-2 pb-4 text-center"> {/* Add padding */}
             <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                 Get New Ideas
             </Button>
         </CardContent>
      </Card>

       {/* Dialog for adding habit */}
      <AddHabitDialog
        open={isAddHabitDialogOpen}
        onOpenChange={setIsAddHabitDialogOpen}
        defaultName={habitNameToAdd} // Pass defaultName to AddHabitDialog
      >
         {/* AddHabitDialog now internally handles the form content */}
         {/* We pass defaultName, and AddHabitDialog uses it in its form */}
         {/* Empty child needed if AddHabitDialog uses `children` for trigger logic */}
         <span />
      </AddHabitDialog>
    </>
  );
}


// Inner form content to handle pre-filling and submission within the dialog context
// This assumes AddHabitDialog structure might not directly take default values easily
// Needs adaptation based on the actual AddHabitDialog implementation
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogClose } from "@/components/ui/dialog"; // Added DialogClose
import { addHabit } from "@/lib/actions/habits";


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Habit name must be at least 2 characters.",
  }).max(50, {
      message: "Habit name must not exceed 50 characters."
  }),
  frequency: z.enum(["daily", "weekly", "monthly"], {
      required_error: "Please select a frequency.",
  }),
});

// This internal component is no longer needed if AddHabitDialog handles the form internally
// Keeping it commented out for reference or if AddHabitDialog structure changes
/*
function AddHabitFormContent({ defaultName, closeDialog }: { defaultName: string; closeDialog: () => void }) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
        name: defaultName || "",
        frequency: undefined,
        },
    });

     // Update default name if it changes while dialog is open (might not be needed)
     React.useEffect(() => {
         form.reset({ name: defaultName, frequency: form.getValues('frequency') });
     }, [defaultName, form]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('frequency', values.frequency);

            const result = await addHabit(formData);
            if (result.success) {
                toast({
                    title: "Habit Added",
                    description: `"${values.name}" has been added successfully.`,
                });
                form.reset();
                closeDialog(); // Close dialog on success
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to add habit.",
                });
            }
        } catch (error) {
            console.error("Failed to add habit:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
        setIsSubmitting(false);
        }
    }

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Habit Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Meditate for 10 minutes" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Frequency</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select how often" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                     </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <DialogClose asChild> // Use DialogClose for Cancel
                         <Button type="button" variant="outline" disabled={isSubmitting}>
                             Cancel
                         </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Habit"
                      )}
                    </Button>
                 </DialogFooter>
            </form>
        </Form>
    )
}
*/
