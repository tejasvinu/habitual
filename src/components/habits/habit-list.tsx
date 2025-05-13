
import type { Habit } from '@/lib/types';
import { HabitItem } from './habit-item';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HabitListProps {
  habits: Habit[];
  currentDate: Date;
}

export function HabitList({ habits, currentDate }: HabitListProps) {
  if (!habits || habits.length === 0) {
    return (
       <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Habits Yet!</AlertTitle>
        <AlertDescription>
          Click the 'Add Habit' button to start tracking your goals.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <HabitItem key={habit.id} habit={habit} currentDate={currentDate} />
      ))}
    </div>
  );
}
