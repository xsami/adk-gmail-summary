/**
 * One-time setup script: run `npm run auth`.
 * Walks you through Google's OAuth consent flow and writes token.json,
 * which src/tools/gmail.ts then uses on every agent run.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { OAuth2Client } from 'google-auth-library';
import { CREDENTIALS_PATH, TOKEN_PATH } from './auth.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

async function main() {
  const raw = await readFile(CREDENTIALS_PATH, 'utf-8');
  const keys = JSON.parse(raw);
  const config = keys.installed ?? keys.web;

  const client = new OAuth2Client(
    config.client_id,
    config.client_secret,
    'urn:ietf:wg:oauth:2.0:oob' // out-of-band: paste the code back into the terminal
  );

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // ensures we get a refresh_token even on repeat runs
  });

  console.log('\n1. Open this URL and approve access:\n');
  console.log(authUrl);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = await rl.question('\n2. Paste the authorization code here: ');
  rl.close();

  const { tokens } = await client.getToken(code.trim());
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log(`\nSaved credentials to ${TOKEN_PATH}. You can now run the agent.`);
}

main().catch((err) => {
  console.error('Authorization failed:', err);
  process.exit(1);
});
