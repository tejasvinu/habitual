
"use client";

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek } from 'date-fns'; // Removed addWeeks, isSameWeek as they are not used here

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  // ChartLegend, // Removed unused legend
  // ChartLegendContent, // Removed unused legend
} from "@/components/ui/chart";
import type { Habit, HabitLog } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";


interface HabitProgressChartProps {
    habits: Habit[];
    logs: HabitLog[];
    userId: string; // Add userId prop for consistency, though not directly used in this component's calculations yet
}

const getWeekLabel = (date: Date): string => {
    const start = startOfWeek(date, { weekStartsOn: 0 }); // Specify week starts on Sunday
    return `Wk ${format(start, 'w')}`; 
};


export function HabitProgressChart({ habits, logs, userId }: HabitProgressChartProps) {
    const [isLoading, setIsLoading] = React.useState(true);

    const weeklyCompletionData = React.useMemo(() => {
        setIsLoading(true);
        if (!userId || !habits.length) { // Check for userId
            setIsLoading(false);
            return [];
        }

        const weeklyData: { [weekLabel: string]: { completed: number; total: number } } = {};
        const totalWeeks = 8; 
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today to start of day

        for (let i = totalWeeks - 1; i >= 0; i--) {
           const weekStartDate = startOfWeek(subDays(today, i * 7), { weekStartsOn: 0 });
           const weekLabel = getWeekLabel(weekStartDate);
           weeklyData[weekLabel] = { completed: 0, total: 0 };
        }

        habits.forEach(habit => {
            // Filter logs for the current habit AND ensure logs belong to the user (though 'logs' prop should already be filtered)
            const habitLogs = logs.filter(log => log.habitId === habit.id && log.userId === userId);
            const habitCreatedAt = new Date(habit.createdAt);
            habitCreatedAt.setHours(0,0,0,0);


            for (let i = totalWeeks - 1; i >= 0; i--) {
                const currentIterationWeekStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 0 });
                const weekLabel = getWeekLabel(currentIterationWeekStart);

                // Ensure the habit was created before or during this week's start
                if (habitCreatedAt > addDays(currentIterationWeekStart, 6)) { // if created after this week ends
                    continue;
                }
                
                if (habit.frequency === 'daily') {
                     for(let j = 0; j < 7; j++){
                         const dayInWeek = addDays(currentIterationWeekStart, j);
                         dayInWeek.setHours(0,0,0,0);
                         // Only count days from habit creation onwards and within the current week
                         if(dayInWeek >= habitCreatedAt && dayInWeek <= today) {
                            weeklyData[weekLabel].total += 1;
                            const dayLog = habitLogs.find(log => dfIsSameDay(log.date, dayInWeek));
                            if (dayLog?.completed) {
                                weeklyData[weekLabel].completed += 1;
                            }
                         }
                     }
                } else if (habit.frequency === 'weekly') {
                    // Ensure the week we are calculating for is on or after habit creation week
                    if (currentIterationWeekStart >= startOfWeek(habitCreatedAt, { weekStartsOn: 0 }) && currentIterationWeekStart <= today) {
                         weeklyData[weekLabel].total += 1;
                         // Log date for weekly habits should be the start of the week
                         const weekLog = habitLogs.find(log => dfIsSameDay(log.date, currentIterationWeekStart));
                         if (weekLog?.completed) {
                             weeklyData[weekLabel].completed += 1;
                         }
                    }
                }
            }
        });

        const chartData = Object.entries(weeklyData).map(([week, data]) => ({
            week,
            completionPercentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        })).sort((a, b) => { 
             const weekNumA = parseInt(a.week.substring(3)); // "Wk 28" -> 28
             const weekNumB = parseInt(b.week.substring(3));
             // This simple sort works if all weeks are in the same year or wrap around correctly
             // For more robust multi-year, a date object comparison for week start would be better.
             return weekNumA - weekNumB;
        });

        setIsLoading(false);
        return chartData;

    }, [habits, logs, userId]);


  const chartConfig = {
      completionPercentage: {
        label: "Completion %",
        color: "hsl(var(--chart-2))", 
      },
    } satisfies import("@/components/ui/chart").ChartConfig;


  if (isLoading) {
      return (
           <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                 <Skeleton className="h-[250px] w-full" />
            </CardContent>
            </Card>
      )
  }

  if (!weeklyCompletionData.length && !habits.length) { // Modified condition
     return (
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Progress</CardTitle>
                    <CardDescription>Overall completion percentage over the last 8 weeks.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">No habits tracked yet. Add some habits to see your progress!</p>
                </CardContent>
            </Card>
        );
  }
  
  if (!weeklyCompletionData.length && habits.length > 0) {
     return (
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Progress</CardTitle>
                    <CardDescription>Overall completion percentage over the last 8 weeks.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">Not enough data to display chart. Keep tracking your habits!</p>
                </CardContent>
            </Card>
        );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Progress</CardTitle>
        <CardDescription>Overall completion percentage over the last 8 weeks.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCompletionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis
                        dataKey="week"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                     />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                        dataKey="completionPercentage"
                        fill="var(--color-completionPercentage)"
                        radius={4}
                        barSize={30}
                    />
                </BarChart>
           </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
