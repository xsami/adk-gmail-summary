import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { OAuth2Client } from 'google-auth-library';

const CREDENTIALS_PATH = process.env.GMAIL_CREDENTIALS_PATH ?? './credentials.json';
const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH ?? './token.json';

/**
 * Builds an authenticated OAuth2Client for the Gmail API using the
 * credentials.json (OAuth client) downloaded from Google Cloud Console
 * and the token.json produced by `npm run auth` (see authorize.ts).
 *
 * Throws a clear error if either file is missing, since both the agent
 * tools and the one-time authorize script rely on this.
 */
export async function getGmailAuthClient(): Promise<OAuth2Client> {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Missing ${CREDENTIALS_PATH}. Download an OAuth Client ID (Desktop app) ` +
        `from Google Cloud Console > APIs & Services > Credentials, and save it here.`
    );
  }

  const raw = await readFile(CREDENTIALS_PATH, 'utf-8');
  const keys = JSON.parse(raw);
  const config = keys.installed ?? keys.web;

  const client = new OAuth2Client(
    config.client_id,
    config.client_secret,
    config.redirect_uris?.[0] ?? 'urn:ietf:wg:oauth:2.0:oob'
  );

  if (!existsSync(TOKEN_PATH)) {
    throw new Error(`Missing ${TOKEN_PATH}. Run "npm run auth" once to authorize Gmail access.`);
  }

  const token = JSON.parse(await readFile(TOKEN_PATH, 'utf-8'));
  client.setCredentials(token);
  return client;
}

export { CREDENTIALS_PATH, TOKEN_PATH };
