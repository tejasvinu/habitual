
"use client";

import * as React from 'react';
import { Check, Minus, Loader2 } from 'lucide-react';
import { startOfDay } from 'date-fns';

import type { Habit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { recordHabit, getHabitCompletionStatus } from '@/lib/actions/habits';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HabitItemProps {
  habit: Habit;
  currentDate: Date; // Pass the current date to check status against
}

export function HabitItem({ habit, currentDate }: HabitItemProps) {
  const [status, setStatus] = React.useState<'completed' | 'pending' | 'loading' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const { toast } = useToast();
  const normalizedCurrentDate = startOfDay(currentDate); // Ensure we compare dates consistently

  // Log status changes for debugging
  React.useEffect(() => {
    console.log(`Habit ${habit.id} [Status Change]: ${status}, isUpdating: ${isUpdating}, Date: ${normalizedCurrentDate.toISOString()}`);
  }, [status, habit.id, isUpdating, normalizedCurrentDate]);


  React.useEffect(() => {
    let isActive = true;
    console.log(`Habit ${habit.id} [useEffect runs] for date: ${normalizedCurrentDate.toISOString()}`);
    setStatus('loading'); // Explicitly set to loading when effect runs for new date/id

    async function fetchStatus() {
        try {
          console.log(`Habit ${habit.id} [fetchStatus START] for date: ${normalizedCurrentDate.toISOString()}`);
          const completed = await getHabitCompletionStatus(habit.id, normalizedCurrentDate);
          if (isActive) {
              const newStatus = completed === undefined ? 'pending' : completed ? 'completed' : 'pending';
              console.log(`Habit ${habit.id} [fetchStatus SUCCESS] - isActive: true, New status: ${newStatus}`);
              setStatus(newStatus);
          } else {
            console.log(`Habit ${habit.id} [fetchStatus SUCCESS] - isActive: false, Status not set.`);
          }
        } catch (err) {
          console.error(`Habit ${habit.id} [fetchStatus ERROR] for date: ${normalizedCurrentDate.toISOString()}`, err);
           if (isActive) {
             console.log(`Habit ${habit.id} [fetchStatus ERROR] - isActive: true, Setting status to 'error'`);
             setStatus('error');
           } else {
            console.log(`Habit ${habit.id} [fetchStatus ERROR] - isActive: false, Status not set.`);
           }
        }
    }
    fetchStatus();
     return () => {
       isActive = false;
       console.log(`Habit ${habit.id} [useEffect CLEANUP] for date: ${normalizedCurrentDate.toISOString()}`);
     };
  }, [habit.id, normalizedCurrentDate]);

  const handleRecordCompletion = async (markCompleted: boolean) => {
    console.log(`Habit ${habit.id} [handleRecordCompletion START] - Mark as: ${markCompleted}`);
    setIsUpdating(true);
    try {
      const result = await recordHabit(habit.id, normalizedCurrentDate, markCompleted);
      if (result.success) {
        const newStatus = markCompleted ? 'completed' : 'pending';
        console.log(`Habit ${habit.id} [handleRecordCompletion SUCCESS] - recordHabit success. Setting status to: ${newStatus}`);
        setStatus(newStatus);
        toast({
          title: `Habit ${markCompleted ? 'Completed' : 'Marked Pending'}`,
          description: `"${habit.name}" status updated.`,
        });
      } else {
        console.warn(`Habit ${habit.id} [handleRecordCompletion ERROR] - recordHabit failed: ${result.error}`);
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
      console.log(`Habit ${habit.id} [handleRecordCompletion FINALLY] - Setting isUpdating to false.`);
      setIsUpdating(false);
    }
  };

   const getTooltipText = () => {
     switch (status) {
       case 'completed':
         return 'Mark as pending';
       case 'pending':
         return 'Mark as complete';
       default:
         return 'Record status';
     }
   };

   const getButtonIcon = () => {
     if (isUpdating || status === 'loading') return <Loader2 className="h-4 w-4 animate-spin" />;
     if (status === 'completed') return <Check className="h-4 w-4" />;
     return <Minus className="h-4 w-4" />;
   };

   const getButtonVariant = () => {
       if (status === 'completed') return 'secondary';
       return 'outline';
   }


  return (
    <Card className={cn(
        "transition-colors duration-300 ease-in-out",
        status === 'completed' ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700' : '',
        status === 'error' ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700' : ''
      )}>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex-1 mr-4">
          <CardTitle className="text-base font-medium">{habit.name}</CardTitle>
          <CardDescription className="text-xs capitalize">{habit.frequency}</CardDescription>
        </div>
         <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button
                        variant={getButtonVariant()}
                        size="icon"
                        className={cn(
                            "rounded-full w-9 h-9 shrink-0",
                            status === 'completed' ? 'bg-chart-2 hover:bg-chart-2/90 text-white' : '',
                            status === 'error' ? 'border-destructive text-destructive hover:bg-destructive/10' : ''
                        )}
                        onClick={() => handleRecordCompletion(status !== 'completed')}
                        disabled={isUpdating || status === 'loading' || status === 'error'}
                        aria-label={getTooltipText()}
                    >
                       {getButtonIcon()}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                 <p>{getTooltipText()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
