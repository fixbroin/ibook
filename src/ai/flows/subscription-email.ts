
'use server';

/**
 * @fileOverview Flow for generating a subscription confirmation/renewal email.
 * - generateSubscriptionEmail - A function that creates a subscription email.
 * - SubscriptionEmailInput - The input type for the generateSubscriptionEmail function.
 * - SubscriptionEmailOutput - The return type for the generateSubscriptionEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SubscriptionEmailInputSchema = z.object({
  name: z.string().describe("The name of the user."),
  planName: z.string().describe("The name of the subscription plan."),
  expiryDate: z.string().describe("The pre-formatted expiry date of the plan (e.g., 'January 1, 2025')."),
  isRenewal: z.boolean().describe("True if this is a plan renewal, false if it's a new subscription."),
});
export type SubscriptionEmailInput = z.infer<typeof SubscriptionEmailInputSchema>;

const SubscriptionEmailOutputSchema = z.object({
  subject: z.string().describe("The subject line for the email."),
  body: z.string().describe("The full HTML body of the email."),
});
export type SubscriptionEmailOutput = z.infer<typeof SubscriptionEmailOutputSchema>;


export async function generateSubscriptionEmail(
  input: SubscriptionEmailInput
): Promise<SubscriptionEmailOutput> {
  return subscriptionEmailFlow(input);
}


const prompt = ai.definePrompt({
  name: 'subscriptionEmailPrompt',
  input: {schema: SubscriptionEmailInputSchema},
  output: {schema: SubscriptionEmailOutputSchema},
  prompt: `You are an email writer for BroBookMe. Your task is to generate a subscription confirmation email in HTML format.

The tone should be positive and professional. Use paragraphs (<p>) for spacing. Do not use any CSS or <style> tags.

Here is the information:
- User Name: {{{name}}}
- Plan Name: {{{planName}}}
- Expiry Date: {{{expiryDate}}}
- Is Renewal: {{{isRenewal}}}

Your response must include:
1.  **Subject Line:** Based on whether it's a renewal or a new subscription.
    *   New: "Your BroBookMe Subscription is Active!"
    *   Renewal: "Your BroBookMe Subscription has been Renewed"
2.  **Email Body (HTML):**
    *   Start with a greeting (e.g., "Hello {{{name}}},").
    *   If it's a new subscription, say "Congratulations! Your subscription to the {{{planName}}} plan is now active."
    *   If it's a renewal, say "Thank you for renewing your subscription. Your {{{planName}}} plan has been extended."
    *   State the expiry date clearly: "Your plan is valid until: <strong>{{{expiryDate}}}</strong>".
    *   If the plan is 'Lifetime', use a different message like: "You now have lifetime access to BroBookMe. Thank you for your support!"
    *   Include a call-to-action button to go to the dashboard.
    *   End with a closing like "Thank you for choosing BroBookMe!".
`,
});


const subscriptionEmailFlow = ai.defineFlow(
  {
    name: 'subscriptionEmailFlow',
    inputSchema: SubscriptionEmailInputSchema,
    outputSchema: SubscriptionEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
