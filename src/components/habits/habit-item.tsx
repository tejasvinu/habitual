
"use client";

import * as React from 'react';
import type { Habit, HabitFrequency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { recordHabit, getHabitCompletionStatus } from '@/lib/actions/habits';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    CircleDashed, CheckCircle2, Loader2, AlertTriangle, CalendarDays, Repeat, Repeat1, Sparkles, Zap, Wind, TrendingUp, Info, RefreshCcw, MoreVertical, Edit3, Trash2, Flame
} from 'lucide-react';
import { startOfDay, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';


interface HabitItemProps {
  habit: Habit;
  currentDate: Date;
  userId: string;
  onHabitClick?: (habit: Habit) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
}

const getHabitTypeIcon = (frequency: HabitFrequency, name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('meditate') || lowerName.includes('mindful')) return <Sparkles className="w-5 h-5" />;
  if (lowerName.includes('exercise') || lowerName.includes('run') || lowerName.includes('gym')) return <Zap className="w-5 h-5" />;
  if (lowerName.includes('read') || lowerName.includes('learn')) return <Info className="w-5 h-5" />;
  if (lowerName.includes('water') || lowerName.includes('hydrate')) return <Wind className="w-5 h-5" />;

  switch (frequency) {
    case 'daily': return <CalendarDays className="w-5 h-5" />;
    case 'weekly': return <Repeat className="w-5 h-5" />;
    case 'monthly': return <Repeat1 className="w-5 h-5" />;
    default: return <TrendingUp className="w-5 h-5" />;
  }
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitItem({ habit, currentDate, userId, onHabitClick, onEditHabit, onDeleteHabit }: HabitItemProps) {
  const [status, setStatus] = React.useState<'completed' | 'pending' | 'loading' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const { toast } = useToast();

  const normalizedDateString = React.useMemo(() => startOfDay(currentDate).toISOString(), [currentDate]);
  const currentDayOfWeek = React.useMemo(() => getDay(currentDate), [currentDate]);

  const isActionableToday = React.useMemo(() => {
    if (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0) {
      return habit.specificDays.includes(currentDayOfWeek);
    }
    return true; // Daily, monthly, and generic weekly are always "actionable" for the given date logic
  }, [habit.frequency, habit.specificDays, currentDayOfWeek]);


  React.useEffect(() => {
    let isActive = true;
    async function fetchStatus() {
      if (!userId) { 
          if (isActive) setStatus('pending'); 
          return;
      }
      setStatus('loading');
      const effectiveDate = new Date(normalizedDateString);
      try {
        // For weekly specific day habits, only fetch status if today is a target day.
        // Otherwise, it's considered 'pending' or non-applicable for direct action on this HabitItem for *today*.
        let completed: boolean | undefined = undefined;
        if (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0) {
            if (habit.specificDays.includes(currentDayOfWeek)) {
                 completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
            } else {
                // Not a target day, so status is 'pending' (or could be a different visual state)
                // For simplicity, treat as pending, action button will be disabled by isActionableToday
                if(isActive) setStatus('pending');
                return;
            }
        } else {
            completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
        }

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
  }, [habit.id, habit.frequency, habit.specificDays, normalizedDateString, userId, currentDayOfWeek]);

  const handleRecordCompletion = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    if (!userId || isUpdating || status === 'loading' || status === 'error' || !isActionableToday) return;

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
         // Potentially update streak here or rely on parent refresh
      } else {
        setStatus(status === 'completed' ? 'completed' : 'pending'); 
        setStatus('error');
        toast({ variant: 'destructive', title: 'Error Updating Habit', description: result.error || 'Could not update habit status.' });
      }
    } catch (error) {
      console.error(`Failed to record habit ${habit.id}:`, error);
      setStatus(status === 'completed' ? 'completed' : 'pending'); 
      setStatus('error');
      toast({ variant: 'destructive', title: 'Error Updating Habit', description: 'An unexpected error occurred.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetryFetchStatus = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!userId) return;
      setStatus('loading'); 
      const effectiveDate = new Date(normalizedDateString);
      async function fetchStatusRetry() {
          try {
            let completed: boolean | undefined = undefined;
             if (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0) {
                if (habit.specificDays.includes(currentDayOfWeek)) {
                    completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
                } else {
                    setStatus('pending'); return;
                }
            } else {
                completed = await getHabitCompletionStatus(userId, habit.id, effectiveDate);
            }
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
    if (!isActionableToday && habit.frequency === 'weekly') return <CircleDashed className="h-5 w-5 text-muted-foreground/50" />
    return <CircleDashed className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
  };

  const cardBaseClasses = "group relative transition-all duration-300 ease-in-out rounded-xl border-2 shadow-md hover:shadow-xl focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden";
  const cardStatusClasses = {
    loading: "opacity-75 cursor-wait border-transparent bg-card",
    pending: "border-transparent bg-card hover:border-primary/30",
    completed: "border-green-500/50 bg-green-500/5 dark:bg-green-700/10 hover:border-green-500/70",
    error: "border-destructive/50 bg-destructive/5 dark:bg-destructive/10 animate-shake-custom",
  };
  const effectiveStatus = (habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0 && !isActionableToday) ? 'pending' : status;


  const formattedSpecificDays = habit.frequency === 'weekly' && habit.specificDays && habit.specificDays.length > 0
    ? habit.specificDays.map(d => dayLabels[d]).join(', ')
    : null;

  const displayFrequency = formattedSpecificDays ? `Weekly: ${formattedSpecificDays}` : habit.frequency;


  return (
    <Card
      className={cn(cardBaseClasses, cardStatusClasses[effectiveStatus])}
      role="button"
      tabIndex={0}
      onClick={() => onHabitClick?.(habit)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHabitClick?.(habit); } }}
      aria-label={`Habit: ${habit.name}. Frequency: ${displayFrequency}. Status for today: ${status}. Click to view details.`}
    >
      <CardContent className="p-4 flex items-start justify-between gap-3 relative z-10">
        <div className={cn("p-2.5 rounded-lg transition-all duration-300 flex-shrink-0 shadow-inner", status === 'completed' && isActionableToday ? 'bg-green-500/20 text-green-600 dark:text-green-300' : 'bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary')}>
          {getHabitTypeIcon(habit.frequency, habit.name)}
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-md font-semibold truncate" title={habit.name}>{habit.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{displayFrequency}</p>
          {habit.currentStreak !== undefined && habit.currentStreak > 0 && (
             <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Flame className="w-3 h-3"/> {habit.currentStreak} day streak
             </span>
          )}
        </div>
        <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9 flex-shrink-0 transition-all duration-300 ease-in-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", 
                    status === 'completed' && isActionableToday ? 'bg-green-500/10 hover:bg-green-500/20 text-green-600' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary', 
                    status === 'error' ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive' : '', 
                    (isUpdating || status === 'loading' || !isActionableToday) ? 'opacity-50 cursor-not-allowed' : '')}
                    onClick={status === 'error' ? handleRetryFetchStatus : handleRecordCompletion}
                    disabled={!userId || isUpdating || status === 'loading' || !isActionableToday}
                    aria-label={status === 'error' ? 'Retry fetching status' : (status === 'completed' && isActionableToday) ? 'Mark as pending' : (!isActionableToday && habit.frequency === 'weekly' ? 'Not applicable today' : 'Mark as complete')}
                >
                    {status === 'error' ? <RefreshCcw className="h-5 w-5"/> : getActionContent()}
                </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p>{status === 'error' ? 'Retry' : (status === 'completed' && isActionableToday) ? 'Mark as Not Done' : (!isActionableToday && habit.frequency === 'weekly' ? 'Not a target day' : 'Mark as Done')}</p></TooltipContent>
            </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="h-5 w-5" />
                        <span className="sr-only">Habit options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onEditHabit(habit)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit Habit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDeleteHabit(habit)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Habit
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

      </CardContent>
      <div className={cn("absolute bottom-0 left-0 h-1 w-full transition-all duration-500 ease-out", 
        (status === 'completed' && isActionableToday) ? 'bg-green-500 scale-x-100' : 'bg-primary scale-x-0', 
        (status === 'pending' || (!isActionableToday && habit.frequency === 'weekly')) && 'scale-x-[0.25]', 
        isUpdating && 'animate-pulse bg-muted-foreground scale-x-50', 
        status === 'error' && 'bg-destructive scale-x-100')} 
        style={{transformOrigin: 'left'}}>
      </div>
    </Card>
  );
}
