
import type { Habit } from '@/lib/types';
import { HabitItem } from './habit-item';
import { SmilePlus } from 'lucide-react'; 

interface HabitListProps {
  habits: Habit[];
  currentDate: Date;
  userId: string; // Add userId prop
  onHabitClick?: (habit: Habit) => void; // Prop to handle item click
}

export function HabitList({ habits, currentDate, userId, onHabitClick }: HabitListProps) {
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
    <div className="space-y-4"> {/* Increased space-y from 3 to 4 for better separation */}
      {habits.map((habit) => (
        <HabitItem 
            key={habit.id} 
            habit={habit} 
            currentDate={currentDate} 
            userId={userId} // Pass userId
            onHabitClick={onHabitClick} // Pass click handler
        />
      ))}
    </div>
  );
}

