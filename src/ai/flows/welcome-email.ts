
'use server';

/**
 * @fileOverview Flow for generating a personalized welcome email.
 * - generateWelcomeEmail - A function that creates a welcome email.
 * - WelcomeEmailInput - The input type for the generateWelcomeEmail function.
 * - WelcomeEmailOutput - The return type for the generateWelcomeEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WelcomeEmailInputSchema = z.object({
  name: z.string().describe("The name of the new user."),
});
export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

const WelcomeEmailOutputSchema = z.object({
  subject: z.string().describe("The subject line for the welcome email."),
  body: z.string().describe("The full HTML body of the welcome email."),
});
export type WelcomeEmailOutput = z.infer<typeof WelcomeEmailOutputSchema>;


export async function generateWelcomeEmail(
  input: WelcomeEmailInput
): Promise<WelcomeEmailOutput> {
  return welcomeEmailFlow(input);
}


const prompt = ai.definePrompt({
  name: 'welcomeEmailPrompt',
  input: {schema: WelcomeEmailInputSchema},
  output: {schema: WelcomeEmailOutputSchema},
  prompt: `You are an email copywriter for a company called BroBookMe. Your task is to generate a friendly and professional welcome email in HTML format.

Use paragraphs (<p>) for spacing. Do not use any CSS or <style> tags.

Here is the user's name:
- User Name: {{{name}}}

Your response must include:
1.  **Subject Line:** "Welcome to BroBookMe!"
2.  **Email Body (HTML):**
    *   Start with a personal greeting (e.g., "Hi {{{name}}},").
    *   Write a short, welcoming paragraph thanking them for signing up.
    *   Explain that their account is ready and they can log in to set up their profile and availability.
    *   Include a call-to-action button that links to their dashboard.
    *   End with a friendly closing (e.g., "If you have any questions, feel free to reply to this email. We're happy to help!").
`,
});


const welcomeEmailFlow = ai.defineFlow(
  {
    name: 'welcomeEmailFlow',
    inputSchema: WelcomeEmailInputSchema,
    outputSchema: WelcomeEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
