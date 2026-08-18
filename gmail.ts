import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGmailAuthClient } from '../auth.js';

/** Decodes Gmail's URL-safe base64 body parts into plain text. */
function decodeBody(data?: string | null): string {
  if (!data) return '';
  return Buffer.from(data, 'base64url').toString('utf-8');
}

/** Walks a Gmail message payload to pull out the best plain-text body it can find. */
function extractPlainText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  // Fall back to HTML body, stripped of tags, if no plain-text part exists.
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBody(payload.body.data).replace(/<[^>]+>/g, ' ');
  }
  return '';
}

function header(headers: any[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export const listRecentEmails = new FunctionTool({
  name: 'list_recent_emails',
  description:
    'Lists recent Gmail messages with sender, subject, date, and a short snippet. ' +
    'Use this first to see what is in the inbox before deciding which messages to summarize in detail.',
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(25)
      .default(10)
      .describe('How many recent messages to list.'),
    query: z
      .string()
      .optional()
      .describe(
        "Optional Gmail search query, using normal Gmail search syntax, e.g. " +
          "'is:unread', 'newer_than:1d', 'from:boss@company.com'."
      ),
  }),
  execute: async ({ maxResults, query }) => {
    const auth = await getGmailAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    const messages = list.data.messages ?? [];
    if (messages.length === 0) {
      return { status: 'success', emails: [] };
    }

    const emails = await Promise.all(
      messages.map(async (m) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });
        const headers = msg.data.payload?.headers ?? [];
        return {
          id: m.id,
          from: header(headers, 'From'),
          subject: header(headers, 'Subject'),
          date: header(headers, 'Date'),
          snippet: msg.data.snippet ?? '',
        };
      })
    );

    return { status: 'success', emails };
  },
});

export const getEmailBody = new FunctionTool({
  name: 'get_email_body',
  description:
    'Fetches the full plain-text body of a single Gmail message by its id. ' +
    'Use this when a snippet from list_recent_emails is not enough to write a good summary.',
  parameters: z.object({
    messageId: z.string().describe('The Gmail message id, from list_recent_emails.'),
  }),
  execute: async ({ messageId }) => {
    const auth = await getGmailAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = msg.data.payload?.headers ?? [];
    const body = extractPlainText(msg.data.payload).trim();

    return {
      status: 'success',
      from: header(headers, 'From'),
      subject: header(headers, 'Subject'),
      date: header(headers, 'Date'),
      // Cap length so a huge email doesn't blow out the model's context.
      body: body.slice(0, 6000),
    };
  },
});
