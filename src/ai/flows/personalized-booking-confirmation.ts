
'use server';

/**
 * @fileOverview Flow for sending personalized booking confirmation emails with relevant service offerings.
 *
 * - personalizedBookingConfirmation - A function that sends a personalized booking confirmation email.
 * - PersonalizedBookingConfirmationInput - The input type for the personalizedBookingConfirmation function.
 * - PersonalizedBookingConfirmationOutput - The return type for the personalizedBookingConfirmation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedBookingConfirmationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  providerName: z.string().describe('The name of the service provider.'),
  serviceType: z.string().describe('The type of service booked (e.g., Online, Shop Visit, Doorstep).'),
  bookingDateTime: z.string().describe('The pre-formatted date and time of the booking. For example: "September 18, 2025 at 2:41 AM".'),
  bookingDetails: z.string().describe('Any additional details about the booking.'),
  timezone: z.string().describe('The IANA timezone string for the booking (e.g., "Asia/Kolkata"). This is for context only, as the bookingDateTime is already formatted.'),
  dateFormat: z.string().describe('The desired date format string (e.g., "MMMM d, yyyy"). This is for context only, as the bookingDateTime is already formatted.'),
});
export type PersonalizedBookingConfirmationInput = z.infer<typeof PersonalizedBookingConfirmationInputSchema>;

const PersonalizedBookingConfirmationOutputSchema = z.object({
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The full HTML body of the personalized booking confirmation email, including relevant service offerings.'),
});
export type PersonalizedBookingConfirmationOutput = z.infer<typeof PersonalizedBookingConfirmationOutputSchema>;

export async function personalizedBookingConfirmation(
  input: PersonalizedBookingConfirmationInput
): Promise<PersonalizedBookingConfirmationOutput> {
  return personalizedBookingConfirmationFlow(input);
}

const personalizedBookingConfirmationPrompt = ai.definePrompt({
  name: 'personalizedBookingConfirmationPrompt',
  input: {schema: PersonalizedBookingConfirmationInputSchema},
  output: {schema: PersonalizedBookingConfirmationOutputSchema},
  prompt: `You are an email marketing specialist for a company called BroBookMe. Your task is to create a personalized booking confirmation email.

The email should be professional, friendly, and formatted in clean HTML. Use paragraphs (<p>) for spacing. Do not use any CSS or <style> tags.

Here is the customer and booking information:
- Customer Name: {{{customerName}}}
- Provider Name: {{{providerName}}}
- Service Type: {{{serviceType}}}
- Booking Date and Time: {{{bookingDateTime}}} (IMPORTANT: Use this exact pre-formatted string. Do not change it.)
- Booking Details: {{{bookingDetails}}}

The email must contain:
1.  **Subject Line:** Create a clear subject line, like "Booking Confirmed with {{{providerName}}}".
2.  **Email Body (HTML):**
    *   Start with a greeting to the customer (e.g., "Hi {{{customerName}}},").
    *   Thank them for booking and confirm the appointment details (provider, service, and the exact date/time string).
    *   Include a creative, personalized section with 2-3 other service offerings or products from {{{providerName}}} that might interest them based on their current booking. Be smart about the suggestions.
    *   End with a professional closing (e.g., "Best regards,<br>The BroBookMe Team").
`,
});

const personalizedBookingConfirmationFlow = ai.defineFlow(
  {
    name: 'personalizedBookingConfirmationFlow',
    inputSchema: PersonalizedBookingConfirmationInputSchema,
    outputSchema: PersonalizedBookingConfirmationOutputSchema,
  },
  async input => {
    const {output} = await personalizedBookingConfirmationPrompt(input);
    return output!;
  }
);
