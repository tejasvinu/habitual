"use client";

import type { Habit, HabitFrequency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Keep for potential future use, though card is main click target
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle, CardDescription as we customize layout
import { recordHabit, getHabitCompletionStatus } from '@/lib/actions/habits';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Keep if needed for specific elements

// Icons for habit states and types
import { CircleDashed, CheckCircle2, Loader2, AlertTriangle, CalendarDays, Repeat, Repeat1, ListChecksIcon as ListChecks } from 'lucide-react';
import { startOfDay } from 'date-fns';

interface HabitItemProps {
  habit: Habit;
  currentDate: Date; // Pass the current date to check status against
}

// Helper to get a habit type icon
const getHabitTypeIcon = (frequency: HabitFrequency) => {
  switch (frequency) {
    case 'daily':
      return <CalendarDays className="w-5 h-5" />;
    case 'weekly':
      return <Repeat className="w-5 h-5" />;
    case 'monthly':
      return <Repeat1 className="w-5 h-5" />;
    default:
      return <ListChecks className="w-5 h-5" />;
  }
};

export function HabitItem({ habit, currentDate }: HabitItemProps) {
  const [status, setStatus] = React.useState<'completed' | 'pending' | 'loading' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  const { toast } = useToast();

  // Memoize the normalized date string to stabilize useEffect dependency
  const normalizedDateString = React.useMemo(() => startOfDay(currentDate).toISOString(), [currentDate]);

  React.useEffect(() => {
    let isActive = true;
    // console.log(`Habit ${habit.id} [useEffect runs] for date: ${normalizedDateString}`);
    setStatus('loading'); // Explicitly set to loading

    const effectiveDate = new Date(normalizedDateString);

    async function fetchStatus() {
        try {
          // console.log(`Habit ${habit.id} [fetchStatus START] for date: ${effectiveDate.toISOString()}`);
          const completed = await getHabitCompletionStatus(habit.id, effectiveDate);
          if (isActive) {
              const newStatus = completed === undefined ? 'pending' : completed ? 'completed' : 'pending';
              // console.log(`Habit ${habit.id} [fetchStatus SUCCESS] - isActive: true, New status: ${newStatus}`);
              setStatus(newStatus);
          } else {
            // console.log(`Habit ${habit.id} [fetchStatus SUCCESS] - isActive: false, Status not set.`);
          }
        } catch (err) {
          console.error(`Habit ${habit.id} [fetchStatus ERROR] for date: ${effectiveDate.toISOString()}`, err);
           if (isActive) {
             // console.log(`Habit ${habit.id} [fetchStatus ERROR] - isActive: true, Setting status to 'error'`);
             setStatus('error');
           } else {
            // console.log(`Habit ${habit.id} [fetchStatus ERROR] - isActive: false, Status not set.`);
           }
        }
    }
    fetchStatus();
     return () => {
       isActive = false;
       // console.log(`Habit ${habit.id} [useEffect CLEANUP] for date: ${effectiveDate.toISOString()}`);
     };
  }, [habit.id, normalizedDateString]);

  const handleRecordCompletion = async (markCompleted: boolean) => {
    // console.log(`Habit ${habit.id} [handleRecordCompletion START] - Mark as: ${markCompleted}`);
    setIsUpdating(true);
    setStatus('loading'); // Visually indicate loading state for the action icon
    const effectiveDate = new Date(normalizedDateString);
    try {
      const result = await recordHabit(habit.id, effectiveDate, markCompleted);
      if (result.success) {
        const newStatus = markCompleted ? 'completed' : 'pending';
        // console.log(`Habit ${habit.id} [handleRecordCompletion SUCCESS] - recordHabit success. Setting status to: ${newStatus}`);
        setStatus(newStatus);
        toast({
          title: `Habit ${markCompleted ? 'Completed' : 'Marked Pending'}`,
          description: `"${habit.name}" status updated.`,
        });
      } else {
        // console.warn(`Habit ${habit.id} [handleRecordCompletion ERROR] - recordHabit failed: ${result.error}`);
        setStatus('error');
        toast({
          variant: 'destructive',
          title: 'Error Updating Habit',
          description: result.error || 'Could not update habit status.',
        });
      }
    } catch (error) {
       console.error(`Habit ${habit.id} [handleRecordCompletion CATCH ERROR] - Failed to record habit:`, error);
       setStatus('error');
       toast({
          variant: 'destructive',
          title: 'Error Updating Habit',
          description: 'An unexpected error occurred.',
       });
    } finally {
      // console.log(`Habit ${habit.id} [handleRecordCompletion FINALLY] - Setting isUpdating to false.`);
      setIsUpdating(false);
      // If it was loading due to this action and resulted in an error, keep error status.
      // Otherwise, fetchStatus effect will eventually set the correct 'pending' or 'completed' if needed.
      // For now, if an error occurred, it remains 'error'. If successful, it's 'completed' or 'pending'.
      // If the status was 'loading' from the action, and it didn't become 'error', it should become 'pending' or 'completed'.
      if (status === 'loading' && !isUpdating) { // check isUpdating to ensure finally has run
        // Re-fetch status to be sure, or trust the optimistic update.
        // For simplicity, we trust the optimistic update from above. If error, it's already set.
      }
    }
  };

   const getActionIcon = () => {
     if (isUpdating || status === 'loading') return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
     if (status === 'completed') return <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />;
     if (status === 'error') return <AlertTriangle className="h-6 w-6 text-destructive" />;
     return <CircleDashed className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />;
   };

   const cardBaseClasses = "group transition-all duration-300 ease-in-out rounded-lg border shadow-sm hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
   const cardStatusClasses = {
     loading: "opacity-70 cursor-wait",
     pending: "border-border bg-card hover:border-primary/50",
     completed: "border-green-500/50 bg-green-500/10 dark:bg-green-600/10 hover:border-green-500/80",
     error: "border-destructive/50 bg-destructive/10 dark:bg-destructive/5 animate-shake-custom",
   };

  return (
    <Card
      className={cn(
        cardBaseClasses,
        cardStatusClasses[status],
      )}
      onClick={() => {
          if (!isUpdating && status !== 'loading' && status !== 'error') {
            handleRecordCompletion(status !== 'completed');
          } else if (status === 'error') {
            setShowErrorDetails(!showErrorDetails);
          }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent page scroll on spacebar
            if (!isUpdating && status !== 'loading' && status !== 'error') {
                handleRecordCompletion(status !== 'completed');
            } else if (status === 'error') {
                setShowErrorDetails(!showErrorDetails);
            }
        }
      }}
      aria-pressed={status === 'completed'}
      aria-label={`Habit: ${habit.name}. Frequency: ${habit.frequency}. Status: ${status}. Click to ${status === 'completed' ? 'mark as pending' : 'mark as complete'}.`}
    >
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className={cn(
            "p-2.5 rounded-lg transition-colors flex-shrink-0",
            status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-secondary text-secondary-foreground'
        )}>
            {getHabitTypeIcon(habit.frequency)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-md font-medium truncate" title={habit.name}>{habit.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{habit.frequency}</p>
        </div>

        <div className="flex-shrink-0 ml-2">
            {getActionIcon()}
        </div>
      </CardContent>
      {status === 'error' && showErrorDetails && (
        <div className="px-4 pb-3 text-xs text-destructive border-t border-destructive/20 pt-2">
            <p>Failed to update habit. Please try again. If the issue persists, check the console for more details.</p>
        </div>
      )}
    </Card>
  );
}
