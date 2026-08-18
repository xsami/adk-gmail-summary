# Email Summary Agent (Google ADK for TypeScript)

A small agent that reads your recent Gmail messages and summarizes them,
built on Google's official [Agent Development Kit for TypeScript](https://google.github.io/adk-docs/get-started/typescript/)
(`@google/adk`).

## How it works

- `src/tools/gmail.ts` — two ADK `FunctionTool`s: `list_recent_emails` (subject/sender/date/snippet)
  and `get_email_body` (full plain-text body of one message), both backed by the Gmail API.
- `src/agent.ts` — the `LlmAgent` (Gemini) with instructions on when to call each tool and how
  to format the summary.
- `src/auth.ts` / `src/authorize.ts` — a one-time OAuth setup so the tools can call the Gmail
  API on your behalf, read-only.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a Gemini API key

Create one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), then:

```bash
cp .env.example .env
# edit .env and paste it into GEMINI_API_KEY
```

### 3. Enable the Gmail API and create OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. **APIs & Services > Library** → enable **Gmail API**.
3. **APIs & Services > OAuth consent screen** → configure it (External is fine for personal use;
   add yourself as a test user).
4. **APIs & Services > Credentials > Create Credentials > OAuth client ID** → type **Desktop app**.
5. Download the JSON and save it as `credentials.json` in the project root.

### 4. Authorize Gmail access (one-time)

```bash
npm run auth
```

This prints a URL — open it, approve read-only Gmail access, and paste the code back into the
terminal. It writes `token.json`, which the tools reuse on every future run (it auto-refreshes).

### 5. Run the agent

Interactive terminal:

```bash
npm run run
```

Or the ADK web debugging UI (http://localhost:8000):

```bash
npm run web
```

Try prompts like:
- "Summarize my inbox"
- "Summarize unread emails from today"
- "Any emails from my boss this week that need a reply?"

## Notes

- The Gmail scope used is `gmail.readonly` — this agent cannot send, delete, or modify anything.
- `credentials.json` and `token.json` are secrets — don't commit them. Add them to `.gitignore`.
- Swap `model: 'gemini-flash-latest'` in `src/agent.ts` for a different Gemini model if you want
  more reasoning power for tricky threads, at the cost of speed/price.
