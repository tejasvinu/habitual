
import type { Habit } from '@/lib/types';
import { HabitItem } from './habit-item';
import { SmilePlus } from 'lucide-react'; 

interface HabitListProps {
  habits: Habit[];
  currentDate: Date;
  userId: string; 
  onHabitClick?: (habit: Habit) => void;
  onEditHabit: (habit: Habit) => void; // Add prop for editing
  onDeleteHabit: (habit: Habit) => void; // Add prop for deleting
}

export function HabitList({ habits, currentDate, userId, onHabitClick, onEditHabit, onDeleteHabit }: HabitListProps) {
  if (!habits || habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 mt-4 border-2 border-dashed rounded-lg bg-card shadow-md">
        <SmilePlus className="w-16 h-16 text-primary mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Build Some Habits?</h3>
        <p className="text-muted-foreground mb-1">
          It looks like you haven&apos;t added any habits yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Click the &quot;Add Habit&quot; button above or in the sidebar to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4"> 
      {habits.map((habit) => (
        <HabitItem 
            key={habit.id} 
            habit={habit} 
            currentDate={currentDate} 
            userId={userId} 
            onHabitClick={onHabitClick}
            onEditHabit={onEditHabit} // Pass edit handler
            onDeleteHabit={onDeleteHabit} // Pass delete handler
        />
      ))}
    </div>
  );
}

