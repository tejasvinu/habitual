
import { Suspense } from 'react';
import { getHabits, getHabitLogs } from '@/lib/actions/habits';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { HabitList } from '@/components/habits/habit-list';
import { HabitProgressChart } from '@/components/habits/habit-progress-chart';
import { HabitTipsDisplay } from '@/components/habits/habit-tips-display';
import { Skeleton } from "@/components/ui/skeleton";
import { AddHabitDialog } from '@/components/habits/add-habit-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';

async function DashboardContent() {
  // Fetch data in parallel
  const [habits, logs] = await Promise.all([getHabits(), getHabitLogs()]);
  const currentDate = new Date(); // Get current date for status checks

  // Determine a habit for AI tips (e.g., the first daily habit or most recently added)
  // This logic can be more sophisticated based on user interaction later
  const habitForTips = habits.find(h => h.frequency === 'daily') || habits[0] || null;


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column (Habits) */}
      <div className="lg:w-1/2 space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Habits</h2>
        <HabitList habits={habits} currentDate={currentDate} />
      </div>

      {/* Right Column (Progress & Tips) */}
      <div className="lg:w-1/2 space-y-6">
         <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
        <HabitProgressChart habits={habits} logs={logs} />
        <HabitTipsDisplay habit={habitForTips} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column Skeleton */}
            <div className="lg:w-1/2 space-y-6">
                <Skeleton className="h-8 w-1/2 mb-4" /> {/* Title */}
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
            {/* Right Column Skeleton */}
            <div className="lg:w-1/2 space-y-6">
                 <Skeleton className="h-8 w-1/3 mb-4" /> {/* Title */}
                 {/* Chart Skeleton */}
                 <Skeleton className="h-[340px] w-full" />
                 {/* Tips Skeleton */}
                 <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
    )
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
           <SidebarTrigger className="md:hidden" /> {/* Mobile Trigger */}
          <h1 className="flex-1 text-xl font-semibold tracking-tight">Dashboard</h1>
           {/* Add Habit Button for smaller screens or as primary action */}
           <div className="ml-auto">
             <AddHabitDialog>
               <Button size="sm">
                 <PlusCircle className="mr-1.5 h-4 w-4" />
                 Add Habit
               </Button>
             </AddHabitDialog>
           </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
           <Suspense fallback={<DashboardSkeleton />}>
             {/* @ts-expect-error Async Server Component */}
            <DashboardContent />
          </Suspense>
        </main>
      </SidebarInset>
    </div>
  );
}
