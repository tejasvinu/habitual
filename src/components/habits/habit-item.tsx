
"use client";

import * as React from 'react';
import type { Habit, HabitFrequency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { recordHabit, getHabitCompletionStatus } from '@/lib/actions/habits';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleDashed, CheckCircle2, Loader2, AlertTriangle, CalendarDays, Repeat, Repeat1, Sparkles, Zap, Wind, TrendingUp, Info, RefreshCcw } from 'lucide-react';
import { startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
// No need to import useAuth here if userId is passed as a prop

interface HabitItemProps {
  habit: Habit;
  currentDate: Date;
  userId: string; // Add userId prop
  onHabitClick?: (habit: Habit) => void;
}

const getHabitTypeIcon = (frequency: HabitFrequency, name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('meditate') || lowerName.includes('mindful')) return <Sparkles className="w-6 h-6" />;
  if (lowerName.includes('exercise') || lowerName.includes('run') || lowerName.includes('gym')) return <Zap className="w-6 h-6" />;
  if (lowerName.includes('read') || lowerName.includes('learn')) return <Info className="w-6 h-6" />;
  if (lowerName.includes('water') || lowerName.includes('hydrate')) return <Wind className="w-6 h-6" />;

  switch (frequency) {
    case 'daily': return <CalendarDays className="w-6 h-6" />;
    case 'weekly': return <Repeat className="w-6 h-6" />;
    case 'monthly': return <Repeat1 className="w-6 h-6" />;
    default: return <TrendingUp className="w-6 h-6" />;
  }
};

export function HabitItem({ habit, currentDate, userId, onHabitClick }: HabitItemProps) {
  const [status, setStatus] = React.useState<'completed' | 'pending' | 'loading' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showErrorDetails, setShowErrorDetails] = React.useState(false); // Not currently used, but kept for potential future use
  const { toast } = useToast();

  const normalizedDateString = React.useMemo(() => startOfDay(currentDate).toISOString(), [currentDate]);

  React.useEffect(() => {
    let isActive = true;
    async function fetchStatus() {
      if (!userId) { // Don't fetch if no userId
          if (isActive) setStatus('pending'); // Default to pending if no user to avoid error state
          return;
      }
      setStatus('loading');
      const effectiveDate = new Date(normalizedDateString);
      try {
        const completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
        if (isActive) {
          const newStatus = completed === undefined ? 'pending' : completed ? 'completed' : 'pending';
          setStatus(newStatus);
        }
      } catch (err) {
        console.error(`Error fetching status for habit ${habit.id} on ${effectiveDate.toISOString()}:`, err);
        if (isActive) setStatus('error');
      }
    }
    fetchStatus();
    return () => { isActive = false; };
  }, [habit.id, normalizedDateString, userId]); // Add userId to dependency array

  const handleRecordCompletion = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!userId || isUpdating || status === 'loading' || status === 'error') return;

    setIsUpdating(true);
    const optimisticStatus = status === 'completed' ? 'pending' : 'completed';
    setStatus(optimisticStatus);

    const effectiveDate = new Date(normalizedDateString);
    try {
      const result = await recordHabit(userId, habit.id, effectiveDate, optimisticStatus === 'completed');
      if (result.success) {
        toast({
          title: `Habit ${optimisticStatus === 'completed' ? 'Completed' : 'Marked Pending'}`,
          description: `"${habit.name}" status updated.`,
        });
      } else {
        setStatus(status === 'completed' ? 'completed' : 'pending'); // Revert optimistic
        setStatus('error');
        toast({ variant: 'destructive', title: 'Error Updating Habit', description: result.error || 'Could not update habit status.' });
      }
    } catch (error) {
      console.error(`Failed to record habit ${habit.id}:`, error);
      setStatus(status === 'completed' ? 'completed' : 'pending'); // Revert optimistic
      setStatus('error');
      toast({ variant: 'destructive', title: 'Error Updating Habit', description: 'An unexpected error occurred.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetryFetchStatus = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!userId) return;
      setShowErrorDetails(false);
      setStatus('loading'); 
      // Re-trigger useEffect by re-calling the fetch logic or changing a dep slightly
      // For now, just setting status to loading will re-run effect if deps are stable
      // Explicitly calling fetchStatus logic here might be cleaner
      const effectiveDate = new Date(normalizedDateString);
      async function fetchStatusRetry() {
          try {
            const completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
            const newStatus = completed === undefined ? 'pending' : completed ? 'completed' : 'pending';
            setStatus(newStatus);
          } catch (err) {
            console.error(`Error fetching status for habit ${habit.id} on ${effectiveDate.toISOString()}:`, err);
            setStatus('error');
          }
        }
      fetchStatusRetry();
  }

  const getActionContent = () => {
    if (isUpdating || status === 'loading') return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />;
    if (status === 'error') return <AlertTriangle className="h-5 w-5 text-destructive" />;
    return <CircleDashed className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
  };

  const cardBaseClasses = "group relative transition-all duration-300 ease-in-out rounded-xl border-2 shadow-md hover:shadow-xl focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden";
  const cardStatusClasses = {
    loading: "opacity-75 cursor-wait border-transparent bg-card",
    pending: "border-transparent bg-card hover:border-primary/30",
    completed: "border-green-500/50 bg-green-500/5 dark:bg-green-700/10 hover:border-green-500/70",
    error: "border-destructive/50 bg-destructive/5 dark:bg-destructive/10 animate-shake-custom",
  };

  return (
    <Card
      className={cn(cardBaseClasses, cardStatusClasses[status])}
      role="button"
      tabIndex={0}
      onClick={() => onHabitClick?.(habit)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHabitClick?.(habit); } }}
      aria-label={`Habit: ${habit.name}. Frequency: ${habit.frequency}. Status: ${status}. Click to view details.`}
    >
      <CardContent className="p-4 flex items-center justify-between gap-4 relative z-10">
        <div className={cn("p-3 rounded-lg transition-all duration-300 flex-shrink-0 shadow-inner", status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-300' : 'bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary')}>
          {getHabitTypeIcon(habit.frequency, habit.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold truncate" title={habit.name}>{habit.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{habit.frequency}</p>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("rounded-full w-10 h-10 flex-shrink-0 transition-all duration-300 ease-in-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", status === 'completed' ? 'bg-green-500/10 hover:bg-green-500/20 text-green-600' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary', status === 'error' ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive' : '', isUpdating || status === 'loading' ? 'opacity-50 cursor-not-allowed' : '')}
                onClick={status === 'error' ? handleRetryFetchStatus : handleRecordCompletion}
                disabled={!userId || isUpdating || status === 'loading'}
                aria-label={status === 'error' ? 'Retry fetching status' : status === 'completed' ? 'Mark as pending' : 'Mark as complete'}
              >
                {status === 'error' ? <RefreshCcw className="h-5 w-5"/> : getActionContent()}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>{status === 'error' ? 'Retry' : status === 'completed' ? 'Mark as Not Done' : 'Mark as Done'}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
      <div className={cn("absolute bottom-0 left-0 h-1 w-full transition-all duration-500 ease-out", status === 'completed' ? 'bg-green-500 scale-x-100' : 'bg-primary scale-x-0', status === 'pending' && 'scale-x-[0.25]', isUpdating && 'animate-pulse bg-muted-foreground scale-x-50', status === 'error' && 'bg-destructive scale-x-100')} style={{transformOrigin: 'left'}}></div>
      {status === 'error' && showErrorDetails && (
        <div className="px-4 pb-3 text-xs text-destructive border-t border-destructive/20 pt-2">
          <p>Failed to update habit. Please try again or check console.</p>
        </div>
      )}
    </Card>
  );
}
