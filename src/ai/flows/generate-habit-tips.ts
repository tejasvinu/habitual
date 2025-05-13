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
  // Use optional() and describe the case where data might be insufficient
  completionRate: z.number().min(0).max(1).optional().describe('The user habit completion rate (0 to 1) over a recent period (e.g., last 30 days for daily). May be null if insufficient data.'),
  streak: z.number().int().min(0).optional().describe('The current number of consecutive periods (days/weeks/months) the habit has been completed. May be null if insufficient data or streak is 0.'),
});
export type GenerateHabitTipsInput = z.infer<typeof GenerateHabitTipsInputSchema>;

const GenerateHabitTipsOutputSchema = z.object({
  tips: z.array(z.string()).describe('Personalized, actionable tips to improve habit consistency and success.'),
});
export type GenerateHabitTipsOutput = z.infer<typeof GenerateHabitTipsOutputSchema>;

export async function generateHabitTips(input: GenerateHabitTipsInput): Promise<GenerateHabitTipsOutput> {
  // Handle potential null values before passing to the flow if needed,
  // or let the prompt handle the optionality.
  return generateHabitTipsFlow({
      ...input,
      // Provide defaults or indicate absence if null, handled in prompt
      completionRate: input.completionRate ?? undefined, // Pass undefined if null
      streak: input.streak ?? undefined, // Pass undefined if null
  });
}


const prompt = ai.definePrompt({
  name: 'generateHabitTipsPrompt',
  input: {schema: GenerateHabitTipsInputSchema},
  output: {schema: GenerateHabitTipsOutputSchema},
  prompt: `You are a supportive and insightful habit formation coach. Analyze the following habit data and provide 3 personalized, actionable tips to help the user improve or maintain their habit consistency and success. Frame the tips positively and encouragingly.

Habit Name: {{{habitName}}}
Frequency: {{{frequency}}}
{{#if completionRate}}Completion Rate (Recent): {{completionRate}}{{else}}Completion Rate (Recent): Not enough data yet.{{/if}}
{{#if streak}}Current Streak: {{streak}}{{else}}Current Streak: 0 or not enough data yet.{{/if}}

Consider the user's current situation based on completion rate and streak:

*   **Low Completion Rate (< 0.4):** Focus on making it easier to start, breaking it down, identifying obstacles, and setting realistic expectations.
*   **Medium Completion Rate (0.4 - 0.7):** Focus on building consistency, overcoming plateaus, finding motivation, and rewarding progress.
*   **High Completion Rate (> 0.7):** Focus on maintaining momentum, avoiding burnout, celebrating success, protecting the streak, and potentially considering the next level or related habits.
*   **Streak:** Acknowledge the current streak (or lack thereof). If low/zero, encourage restarting without judgment. If high, emphasize maintaining it and celebrating the achievement.

Provide 3 distinct, concise, and actionable tips tailored to this specific habit and the user's progress.`,
});


const generateHabitTipsFlow = ai.defineFlow(
  {
    name: 'generateHabitTipsFlow',
    inputSchema: GenerateHabitTipsInputSchema,
    outputSchema: GenerateHabitTipsOutputSchema,
  },
  async input => {
    // The prompt now handles optional fields directly via Handlebars conditional blocks.
    const {output} = await prompt(input);
    // Ensure output is not null, provide empty array as fallback
    return output ?? { tips: [] };
  }
);
