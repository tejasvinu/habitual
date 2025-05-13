
'use client'; // Make this a client component to use hooks

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHabits, getHabitLogs } from '@/lib/actions/habits';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { HabitList } from '@/components/habits/habit-list';
import { HabitProgressChart } from '@/components/habits/habit-progress-chart';
import { HabitTipsDisplay } from '@/components/habits/habit-tips-display';
import { HabitSuggestions } from '@/components/habits/habit-suggestions';
import { Skeleton } from "@/components/ui/skeleton";
import { AddHabitDialog } from '@/components/habits/add-habit-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Habit, HabitLog } from '@/lib/types';

// DashboardContent remains a Server Component conceptually, but called from client component
// We will fetch data within DashboardPage now that it's a client component
// Or, create a new client component that wraps the data fetching logic and DashboardContent display logic.
// For simplicity, let's adapt DashboardPage and its content fetching.

function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <div className="space-y-3">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                </div>
                 <Skeleton className="h-[280px] w-full rounded-lg" />
            </div>
            <div className="space-y-6">
                 <Skeleton className="h-8 w-1/3 mb-4" />
                 <Skeleton className="h-[340px] w-full rounded-lg" />
                 <Skeleton className="h-[240px] w-full rounded-lg" />
            </div>
        </div>
    );
}

export default function DashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [dataIsLoading, setDataIsLoading] = useState(true);
  const [selectedHabitForTips, setSelectedHabitForTips] = useState<Habit | null>(null);


  useEffect(() => {
    if (!authIsLoading && !user) {
      router.push('/login');
    }
  }, [authIsLoading, user, router]);

  useEffect(() => {
    async function fetchData() {
      if (user) {
        setDataIsLoading(true);
        try {
          const [userHabits, userLogs] = await Promise.all([
            getHabits(user.id),
            getHabitLogs(user.id) // Fetch all logs for the user
          ]);
          setHabits(userHabits);
          setLogs(userLogs);
          // Determine a habit for AI tips
          const habitForTips = userHabits.find(h => h.frequency === 'daily') || userHabits[0] || null;
          setSelectedHabitForTips(habitForTips);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          // Handle error (e.g., show toast)
        } finally {
          setDataIsLoading(false);
        }
      } else if (!authIsLoading && !user) {
        setDataIsLoading(false); // Not fetching if no user
      }
    }
    fetchData();
  }, [user, authIsLoading]);

  if (authIsLoading || (!user && !authIsLoading)) { // Show loader if auth is loading or redirecting
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // This function will be called by HabitList when a habit is clicked
  const handleHabitItemClick = (habit: Habit) => {
    setSelectedHabitForTips(habit);
  };


  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
           <SidebarTrigger className="md:hidden" />
          <h1 className="flex-1 text-xl font-semibold tracking-tight">Dashboard</h1>
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
            {dataIsLoading ? <DashboardSkeleton /> : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Habits</h2>
                        {user && <HabitList habits={habits} currentDate={new Date()} userId={user.id} onHabitClick={handleHabitItemClick} />}
                        {user && <HabitSuggestions existingHabits={habits} userId={user.id} />}
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
                        {user && <HabitProgressChart habits={habits} logs={logs} userId={user.id} />}
                        {user && selectedHabitForTips && <HabitTipsDisplay habit={selectedHabitForTips} userId={user.id} />}
                        {user && !selectedHabitForTips && habits.length > 0 && (
                            <div className="p-4 text-center text-muted-foreground bg-card rounded-lg shadow-sm">
                                Click on a habit to see personalized tips.
                            </div>
                        )}
                    </div>
                </div>
            )}
          </Suspense>
        </main>
      </SidebarInset>
    </div>
  );
}
