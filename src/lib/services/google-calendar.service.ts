import { google } from 'googleapis';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

interface MeetLinkResult {
  meetLink: string;
  googleEventId: string;
  htmlLink: string;
}

interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
  organizerEmail?: string;
}

function buildAuth() {
  const raw = env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!raw) return null;

  try {
    const credentials = JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL,
    });
    return auth;
  } catch {
    logger.warn({ service: 'google-calendar' }, 'Failed to parse GOOGLE_CALENDAR_CREDENTIALS');
    return null;
  }
}

export async function createGoogleMeetLink(params: CreateEventParams): Promise<MeetLinkResult | null> {
  const auth = buildAuth();
  if (!auth) {
    logger.info({ service: 'google-calendar' }, 'Google Calendar not configured — skipping Meet link generation');
    return null;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startTime.toISOString(), timeZone: 'Asia/Riyadh' },
        end: { dateTime: params.endTime.toISOString(), timeZone: 'Asia/Riyadh' },
        conferenceData: {
          createRequest: {
            requestId: `ots-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: (params.attendeeEmails ?? []).map((email) => ({ email })),
      },
    });

    const data = event.data;
    const meetLink = data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;
    const googleEventId = data.id;
    const htmlLink = data.htmlLink;

    if (!meetLink || !googleEventId) {
      logger.warn({ service: 'google-calendar', eventId: googleEventId }, 'Event created but no Meet link returned');
      return null;
    }

    logger.info({ service: 'google-calendar', googleEventId }, 'Google Meet link created');
    return { meetLink, googleEventId, htmlLink: htmlLink ?? '' };
  } catch (err) {
    logger.error({ service: 'google-calendar', err }, 'Failed to create Google Calendar event');
    return null;
  }
}

export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<void> {
  const auth = buildAuth();
  if (!auth) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
    logger.info({ service: 'google-calendar', googleEventId }, 'Google Calendar event deleted');
  } catch (err) {
    logger.warn({ service: 'google-calendar', googleEventId, err }, 'Failed to delete Google Calendar event');
  }
}
