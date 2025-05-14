
'use client'; 

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getHabits, getHabitLogs, getCurrentStreak } from '@/lib/actions/habits';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { HabitList } from '@/components/habits/habit-list';
import { HabitProgressChart } from '@/components/habits/habit-progress-chart';
import { HabitTipsDisplay } from '@/components/habits/habit-tips-display';
import { HabitSuggestions } from '@/components/habits/habit-suggestions';
import { UserBadgesList } from '@/components/gamification/user-badges-list'; // Import UserBadgesList
import { Skeleton } from "@/components/ui/skeleton";
import { AddHabitDialog } from '@/components/habits/add-habit-dialog';
import { EditHabitDialog } from '@/components/habits/edit-habit-dialog';
import { DeleteHabitDialog } from '@/components/habits/delete-habit-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Habit, HabitLog } from '@/lib/types';


function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                <div className="pb-2 mb-4 border-b">
                    <Skeleton className="h-7 w-1/2" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl" /> 
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                 <Skeleton className="h-[280px] w-full rounded-lg" /> 
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <div className="pb-2 mb-4 border-b">
                    <Skeleton className="h-7 w-1/3" />
                </div>
                 <Skeleton className="h-[300px] w-full rounded-lg" />
                 <Skeleton className="h-[240px] w-full rounded-lg" /> 
                 <Skeleton className="h-[200px] w-full rounded-lg" /> {/* Skeleton for badges */}
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
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 


  const fetchData = useCallback(async () => {
    if (user) {
      setDataIsLoading(true);
      try {
        const [userHabitsData, userLogs] = await Promise.all([
          getHabits(user.id),
          getHabitLogs(user.id)
        ]);

        const habitsWithStreaks = await Promise.all(
            userHabitsData.map(async (habit) => {
                const streak = await getCurrentStreak(user.id, habit.id);
                return { ...habit, currentStreak: streak >= 0 ? streak : 0 };
            })
        );

        setHabits(habitsWithStreaks);
        setLogs(userLogs);
        
        if (selectedHabitForTips) {
             const updatedSelectedHabit = habitsWithStreaks.find(h => h.id === selectedHabitForTips.id);
             setSelectedHabitForTips(updatedSelectedHabit || null);
        } else {
            const habitForTips = habitsWithStreaks.find(h => h.frequency === 'daily') || habitsWithStreaks[0] || null;
            setSelectedHabitForTips(habitForTips);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataIsLoading(false);
      }
    } else if (!authIsLoading && !user) {
      setDataIsLoading(false); 
    }
  }, [user, authIsLoading, selectedHabitForTips?.id]); 

  useEffect(() => {
    if (!authIsLoading && !user) {
      router.push('/login');
    }
  }, [authIsLoading, user, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]); 

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (authIsLoading || (!user && !authIsLoading)) { 
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleHabitItemClick = (habit: Habit) => {
    setSelectedHabitForTips(habit);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
  };

  const handleDeleteHabit = (habit: Habit) => {
    setDeletingHabit(habit);
  };


  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background/80 px-4 backdrop-blur-md">
           <SidebarTrigger className="md:hidden" />
          <h1 className="flex-1 text-xl font-semibold tracking-tight">Dashboard</h1>
           <div className="ml-auto">
             <AddHabitDialog onOpenChange={(isOpen) => { if(!isOpen) handleRefreshData(); }}>
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
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="pb-2 mb-4 border-b">
                            <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Habits</h2>
                        </div>
                        {user && <HabitList 
                                    habits={habits} 
                                    currentDate={new Date()} 
                                    userId={user.id} 
                                    onHabitClick={handleHabitItemClick} 
                                    onEditHabit={handleEditHabit}
                                    onDeleteHabit={handleDeleteHabit}
                                    onHabitUpdated={handleRefreshData} // Pass refresh handler
                                />}
                        {user && <HabitSuggestions existingHabits={habits} userId={user.id} />}
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                         <div className="pb-2 mb-4 border-b">
                            <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
                        </div>
                        {user && <HabitProgressChart habits={habits} logs={logs} userId={user.id} />}
                        {user && selectedHabitForTips && <HabitTipsDisplay habit={selectedHabitForTips} userId={user.id} key={selectedHabitForTips.id} />}
                        {user && !selectedHabitForTips && habits.length > 0 && (
                            <div className="p-6 text-center text-muted-foreground bg-card rounded-lg shadow-sm border border-dashed border-border flex flex-col items-center gap-2">
                                <Info className="w-6 h-6 text-primary"/>
                                <span>Click on a habit to see personalized tips.</span>
                            </div>
                        )}
                        {user && <UserBadgesList userId={user.id} refreshTrigger={refreshTrigger} />} {/* Add UserBadgesList */}
                         {!user && habits.length === 0 && !dataIsLoading && ( 
                            <div className="p-6 text-center text-muted-foreground bg-card rounded-lg shadow-sm border border-dashed border-border flex flex-col items-center gap-2">
                                 <Info className="w-6 h-6 text-primary"/>
                                <span>Login to track habits and see insights.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </Suspense>
        </main>
      </SidebarInset>

      {editingHabit && user && (
        <EditHabitDialog
          habit={editingHabit}
          open={!!editingHabit}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingHabit(null);
          }}
          onHabitUpdated={() => {
            setEditingHabit(null);
            handleRefreshData();
          }}
        />
      )}

      {deletingHabit && user && (
        <DeleteHabitDialog
          habit={deletingHabit}
          open={!!deletingHabit}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeletingHabit(null);
          }}
          onHabitDeleted={() => {
            setDeletingHabit(null);
            handleRefreshData();
            if (selectedHabitForTips?.id === deletingHabit.id) {
                setSelectedHabitForTips(null);
            }
          }}
        />
      )}
    </div>
  );
}
