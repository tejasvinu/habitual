
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

  React.useEffect(() => {
    let isActive = true;
    async function fetchStatus() {
        setStatus('loading');
        try {
          const completed = await getHabitCompletionStatus(habit.id, normalizedCurrentDate);
          if (isActive) {
              setStatus(completed === undefined ? 'pending' : completed ? 'completed' : 'pending');
          }
        } catch (err) {
          console.error(`Failed to fetch status for habit ${habit.id}:`, err);
           if (isActive) {
             setStatus('error');
           }
        }
    }
    fetchStatus();
     return () => { isActive = false; }; // Cleanup function
  }, [habit.id, normalizedCurrentDate]);

  const handleRecordCompletion = async (completed: boolean) => {
    setIsUpdating(true);
    try {
      const result = await recordHabit(habit.id, normalizedCurrentDate, completed);
      if (result.success) {
        setStatus(completed ? 'completed' : 'pending');
        toast({
          title: `Habit ${completed ? 'Completed' : 'Marked Pending'}`,
          description: `"${habit.name}" status updated for today.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Updating Habit',
          description: result.error || 'Could not update habit status.',
        });
         setStatus('error'); // Revert status on error? Or keep old one? Keeping old one for now.
      }
    } catch (error) {
       console.error('Failed to record habit:', error);
       toast({
          variant: 'destructive',
          title: 'Error Updating Habit',
          description: 'An unexpected error occurred.',
       });
        setStatus('error');
    } finally {
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
     return <Minus className="h-4 w-4" />; // Pending or error uses Minus for consistency
   };

   const getButtonVariant = () => {
       if (status === 'completed') return 'secondary'; // Use secondary green color
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
