// src/ai/flows/generate-habit-tips.ts
'use server';

/**
 * @fileOverview Generates personalized habit tips based on user habit data.
 *
 * - generateHabitTips - A function that generates habit tips.
 * - GenerateHabitTipsInput - The input type for the generateHabitTips function.
 * - GenerateHabitTipsOutput - The return type for the generateHabitTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHabitTipsInputSchema = z.object({
  habitName: z.string().describe('The name of the habit.'),
  frequency: z.string().describe('The frequency of the habit (daily, weekly, monthly).'),
  completionRate: z.number().describe('The user habit completion rate (0 to 1).'),
  streak: z.number().describe('The number of consecutive days/weeks/months the habit has been completed.'),
});
export type GenerateHabitTipsInput = z.infer<typeof GenerateHabitTipsInputSchema>;

const GenerateHabitTipsOutputSchema = z.object({
  tips: z.array(z.string()).describe('Personalized tips to improve habit consistency and success.'),
});
export type GenerateHabitTipsOutput = z.infer<typeof GenerateHabitTipsOutputSchema>;

export async function generateHabitTips(input: GenerateHabitTipsInput): Promise<GenerateHabitTipsOutput> {
  return generateHabitTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHabitTipsPrompt',
  input: {schema: GenerateHabitTipsInputSchema},
  output: {schema: GenerateHabitTipsOutputSchema},
  prompt: `You are a habit formation expert. Analyze the following habit data and provide personalized tips to improve consistency and success.

Habit Name: {{{habitName}}}
Frequency: {{{frequency}}}
Completion Rate: {{{completionRate}}}
Streak: {{{streak}}}

Provide 3 actionable tips to help the user improve their habit completion rate and streak.`,
});

const generateHabitTipsFlow = ai.defineFlow(
  {
    name: 'generateHabitTipsFlow',
    inputSchema: GenerateHabitTipsInputSchema,
    outputSchema: GenerateHabitTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
