import type { Habit } from '@/lib/types';
import { HabitItem } from './habit-item';
import { SmilePlus } from 'lucide-react'; // For a more engaging empty state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Keep for consistency if used elsewhere

interface HabitListProps {
  habits: Habit[];
  currentDate: Date;
}

export function HabitList({ habits, currentDate }: HabitListProps) {
  if (!habits || habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 mt-4 border-2 border-dashed rounded-lg bg-card shadow">
        <SmilePlus className="w-16 h-16 text-primary mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Build Some Habits?</h3>
        <p className="text-muted-foreground mb-1">
          It looks like you haven&apos;t added any habits yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Click the &quot;Add Habit&quot; button in the sidebar or header to get started!
        </p>
      </div>
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
