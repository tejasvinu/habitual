// src/ai/flows/suggest-habits.ts
'use server';

/**
 * @fileOverview Suggests new habits for the user to consider.
 *
 * - suggestHabits - A function that generates habit suggestions.
 * - SuggestHabitsInput - The input type for the suggestHabits function (currently empty).
 * - SuggestHabitsOutput - The return type for the suggestHabits function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema is currently empty, but can be expanded later
// e.g., to include user interests, existing habits, goals
const SuggestHabitsInputSchema = z.object({
   existingHabitNames: z.array(z.string()).optional().describe('Optional list of current habit names to avoid suggesting duplicates.')
});
export type SuggestHabitsInput = z.infer<typeof SuggestHabitsInputSchema>;

const SuggestHabitsOutputSchema = z.object({
  suggestions: z.array(
      z.object({
          name: z.string().describe('The suggested habit name.'),
          reason: z.string().describe('A brief reason why this habit is beneficial or relevant.')
      })
  ).describe('An array of 3 suggested habits with names and reasons.')
});
export type SuggestHabitsOutput = z.infer<typeof SuggestHabitsOutputSchema>;

export async function suggestHabits(input: SuggestHabitsInput): Promise<SuggestHabitsOutput> {
  return suggestHabitsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHabitsPrompt',
  input: {schema: SuggestHabitsInputSchema},
  output: {schema: SuggestHabitsOutputSchema},
  prompt: `You are a helpful wellness coach. Suggest 3 new, distinct habits a user could adopt to improve their overall well-being (physical, mental, or emotional).
For each suggestion, provide a concise name for the habit and a brief, compelling reason why it's beneficial.

{{#if existingHabitNames}}Avoid suggesting habits very similar to these existing ones:
{{#each existingHabitNames}}- {{{this}}}
{{/each}}{{/if}}

Focus on common, achievable habits unless specific user goals are provided (currently none). Ensure the suggestions are diverse.`,
});

const suggestHabitsFlow = ai.defineFlow(
  {
    name: 'suggestHabitsFlow',
    inputSchema: SuggestHabitsInputSchema,
    outputSchema: SuggestHabitsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output ?? { suggestions: [] }; // Provide fallback
  }
);
