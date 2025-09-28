
'use server';

import { google } from 'googleapis';
import { getAdminSettings, getProviderByUsername, updateProvider } from './data';
import { revalidatePath } from 'next/cache';
import type { Booking, CalendarTokens, Provider } from './types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// --- Google Calendar ---

async function getGoogleOAuth2Client() {
    const settings = await getAdminSettings();
    if (!settings?.googleApi?.clientId || !settings.googleApi.clientSecret || !settings.googleApi.redirectUri) {
        throw new Error('Google API settings are not configured in admin panel.');
    }
    return new google.auth.OAuth2(
        settings.googleApi.clientId,
        settings.googleApi.clientSecret,
        settings.googleApi.redirectUri
    );
}

export async function getGoogleAuthUrl(username: string) {
    try {
        const oauth2Client = await getGoogleOAuth2Client();
        const scopes = [
            'https://www.googleapis.com/auth/calendar.events'
        ];
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: scopes,
            state: username, // Pass the username in the state parameter
        });
        return { success: true, url };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function handleGoogleCallback(code: string, username: string) {
    try {
        const oauth2Client = await getGoogleOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
            throw new Error('Failed to retrieve complete tokens from Google.');
        }

        const calendarTokens: CalendarTokens = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
        };

        await updateProvider(username, { googleCalendar: calendarTokens });
        revalidatePath('/calendar-setup');
        return { success: true };
    } catch (error: any) {
        console.error('Google callback error:', error);
        return { success: false, error: 'Failed to process Google authorization.' };
    }
}

export async function createGoogleCalendarEvent(provider: Provider, booking: Booking): Promise<{ eventId: string | null, meetLink: string | null }> {
    if (!provider.googleCalendar?.accessToken) {
        console.log("Provider does not have Google Calendar connected.");
        return { eventId: null, meetLink: null };
    }

    try {
        const oauth2Client = await getGoogleOAuth2Client();
        oauth2Client.setCredentials({
            access_token: provider.googleCalendar.accessToken,
            refresh_token: provider.googleCalendar.refreshToken,
            expiry_date: provider.googleCalendar.expiryDate,
        });

        // Handle token refresh if necessary
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                // A new refresh token is sometimes issued. Store it.
                console.log("Received new refresh token from Google.");
                provider.googleCalendar!.refreshToken = tokens.refresh_token;
            }
            provider.googleCalendar!.accessToken = tokens.access_token!;
            provider.googleCalendar!.expiryDate = tokens.expiry_date!;

            await updateProvider(provider.username, { googleCalendar: provider.googleCalendar });
        });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const startTime = booking.dateTime;
        const endTime = new Date(startTime.getTime() + (provider.settings.slotDuration || 60) * 60 * 1000);

        const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === booking.serviceType);
        
        const event: any = {
            summary: `Booking: ${booking.customerName} - ${booking.serviceType}`,
            location: booking.address || 'Online',
            description: `Appointment with ${booking.customerName} (${booking.customerEmail}, ${booking.customerPhone}) for service: ${booking.serviceType}.`,
            start: {
                dateTime: formatInTimeZone(startTime, provider.settings.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
                timeZone: provider.settings.timezone,
            },
            end: {
                dateTime: formatInTimeZone(endTime, provider.settings.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
                timeZone: provider.settings.timezone,
            },
            organizer: {
                email: provider.contact.email,
                displayName: provider.name,
            },
            attendees: [
                { email: provider.contact.email, displayName: provider.name, organizer: true, responseStatus: 'accepted' },
                { email: booking.customerEmail, displayName: booking.customerName, responseStatus: 'needsAction' },
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', 'minutes': 24 * 60 },
                    { method: 'popup', 'minutes': 60 },
                ],
            },
        };
        
        // Add Google Meet link creation for 'Online' services
        if (serviceTypeSetting?.id === 'online') {
            event.conferenceData = {
                createRequest: {
                    requestId: `booking-${booking.id}-${uuidv4()}`, // Ensure a unique ID
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                    }
                }
            };
        }


        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1, // Required to get conference data in the response
            sendNotifications: true, // This is crucial to send invites to attendees
        });
        
        const eventId = res.data.id || null;
        const meetLink = res.data.hangoutLink || null;
        
        console.log(`Google Calendar event created: ${eventId}, Meet link: ${meetLink}`);
        return { eventId, meetLink };

    } catch (error: any) {
        console.error('Error creating Google Calendar event:', error.response ? error.response.data : error.message);
        // If token is invalid, you might want to disconnect the calendar for the user
        if (error.code === 401 || (error.response && error.response.status === 401)) {
            console.log(`Invalid credentials for ${provider.username}. Disconnecting Google Calendar.`);
            await disconnectCalendar(provider.username, 'google');
        }
        throw new Error('Failed to create Google Calendar event.');
    }
}


// --- Outlook Calendar (Placeholder) ---

export async function getOutlookAuthUrl() {
    // This is a placeholder. A real implementation requires the MSAL library.
    const settings = await getAdminSettings();
    if (!settings?.outlookApi?.clientId) {
        return { success: false, error: 'Outlook API is not configured.' };
    }
    // const msalConfig = { auth: { clientId: settings.outlookApi.clientId, authority: '...', clientSecret: '...' }};
    // const authUrl = await pca.getAuthCodeUrl(...);
    return { success: false, error: 'Outlook Calendar integration is not yet implemented.' };
}


// --- General Actions ---
export async function disconnectCalendar(username: string, type: 'google' | 'outlook') {
    try {
        if (type === 'google') {
            await updateProvider(username, { googleCalendar: null });
        } else if (type === 'outlook') {
            await updateProvider(username, { outlookCalendar: null });
        }
        revalidatePath('/calendar-setup');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Failed to disconnect calendar.' };
    }
}
