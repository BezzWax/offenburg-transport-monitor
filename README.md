# Offenburg Transport Monitor

A small, stateless TypeScript job that checks official transport notices for Offenburg and can send a daily Telegram digest.

## Current scope

- Stadtbus Offenburg official website
- SWEG official website
- Daily GitHub Actions run at 07:00 Europe/Berlin
- No server and no database

This first prototype checks public notice pages. It does **not** query every individual departure in real time, and it does not yet provide full coverage of all DB Regio / long-distance trains. A green result means no serious disruption was detected in the checked notices, not a guarantee that every service is running normally.

## Local setup

Requirements: Node.js 22+

```bash
npm install
cp .env.example .env
npm run typecheck
npm run check
```

The default `DRY_RUN=true` prints the report and does not send Telegram messages.

## Telegram setup

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Obtain your Telegram chat ID (send the bot a message, then inspect `getUpdates`).
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS`.
4. For local sending, set `DRY_RUN=false`.

For GitHub Actions, add repository Actions secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_IDS`

The chat ID list may contain comma-separated IDs.

## GitHub Actions

The workflow is in `.github/workflows/daily-transport-check.yml`.

It runs at 07:00 using `Europe/Berlin`, including daylight-saving changes. GitHub may delay scheduled runs during periods of high load. Scheduled workflows run only from the repository's default branch.

## Important limitations

- HTML layouts can change; collectors may need maintenance.
- Notices are currently classified using simple German keyword rules.
- Date ranges and old notices are not yet fully normalized. Review the extracted notices before relying on the digest.
- A failed source is reported as unknown, never as proof that transport is operating normally.
- The first version is a monitoring prototype, not a real-time timetable or journey planner.
