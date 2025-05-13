
"use client";

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, addWeeks, isSameWeek } from 'date-fns';

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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { Habit, HabitLog } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";


interface HabitProgressChartProps {
    habits: Habit[];
    logs: HabitLog[];
}

// Helper to get week label
const getWeekLabel = (date: Date): string => {
    const start = startOfWeek(date);
    return `Wk ${format(start, 'w')}`; // e.g., Wk 28
};


export function HabitProgressChart({ habits, logs }: HabitProgressChartProps) {
    const [isLoading, setIsLoading] = React.useState(true); // Manage loading state internally

    // Calculate weekly completion percentage for all habits combined
    const weeklyCompletionData = React.useMemo(() => {
        setIsLoading(true);
        if (!habits.length || !logs.length) {
            setIsLoading(false);
            return [];
        }

        const weeklyData: { [weekLabel: string]: { completed: number; total: number } } = {};
        const totalWeeks = 8; // Show last 8 weeks
        const today = new Date();

        // Initialize last N weeks
        for (let i = totalWeeks - 1; i >= 0; i--) {
           const weekStartDate = startOfWeek(subDays(today, i * 7));
           const weekLabel = getWeekLabel(weekStartDate);
           weeklyData[weekLabel] = { completed: 0, total: 0 };
        }


        // Iterate through each habit and its logs
        habits.forEach(habit => {
            const habitLogs = logs.filter(log => log.habitId === habit.id);

            for (let i = totalWeeks - 1; i >= 0; i--) {
                const weekStartDate = startOfWeek(subDays(today, i * 7));
                const weekLabel = getWeekLabel(weekStartDate);

                if (habit.frequency === 'daily') {
                     // For daily habits, count potential completions within the week
                     for(let j = 0; j < 7; j++){
                         const day = new Date(weekStartDate);
                         day.setDate(weekStartDate.getDate() + j);
                         // Only count days after habit creation
                         if(day >= habit.createdAt) {
                            weeklyData[weekLabel].total += 1;
                            const dayLog = habitLogs.find(log => isSameWeek(log.date, weekStartDate, {weekStartsOn: 0}) && log.date.getDay() === day.getDay());
                            if (dayLog?.completed) {
                                weeklyData[weekLabel].completed += 1;
                            }
                         }
                     }
                } else if (habit.frequency === 'weekly') {
                    // For weekly habits, check if created before or during this week
                    if(startOfWeek(habit.createdAt) <= weekStartDate) {
                         weeklyData[weekLabel].total += 1;
                         const weekLog = habitLogs.find(log => isSameWeek(log.date, weekStartDate, { weekStartsOn: 0 }));
                         if (weekLog?.completed) {
                             weeklyData[weekLabel].completed += 1;
                         }
                    }
                }
                 // Monthly habits aggregation is more complex, skipping for this weekly chart example
            }
        });

        const chartData = Object.entries(weeklyData).map(([week, data]) => ({
            week,
            completionPercentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        })).sort((a, b) => { // Ensure correct week order
             const weekA = parseInt(a.week.split(' ')[1]);
             const weekB = parseInt(b.week.split(' ')[1]);
             // Handle year wrap around if necessary, simplified for now
             return weekA - weekB;
        });

        setIsLoading(false);
        return chartData;

    }, [habits, logs]);


  const chartConfig = {
      completionPercentage: {
        label: "Completion %",
        color: "hsl(var(--chart-2))", // Use green color
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

  if (!weeklyCompletionData.length) {
     return (
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Progress</CardTitle>
                    <CardDescription>Completion percentage over the last 8 weeks.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">No data available to display chart.</p>
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
                        // tickFormatter={(value) => value.slice(0, 3)} // Shorten label if needed
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
       {/* Optional Legend if needed */}
       {/*
       <CardFooter>
         <ChartLegend content={<ChartLegendContent />} />
       </CardFooter>
        */}
    </Card>
  );
}
