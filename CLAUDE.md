# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal "Today I Learned" (TIL) repository — a daily learning journal. It contains markdown files organized by month (`logs/YYYY/YYYY-MM.md`) with daily entries recording what was studied.

## Structure

- `logs/YYYY/YYYY-MM.md` — Monthly learning log files (e.g., `logs/2026/2026-03.md`). Each entry has a date header and bullet points describing what was learned/done that day.
- `reminder/` — Cloudflare Worker that sends the LINE reminder and appends replies to the logs (TypeScript, Wrangler, Vitest).
- `docs/` — Project documentation: `REQUIREMENTS.md` (reminder requirements) and `DEPLOYMENT.md` (deployment / migration steps).
- `Note.txt` — Miscellaneous development notes (in Japanese).

## Conventions

- Content is written in Japanese.
- Monthly files use the format `logs/YYYY/YYYY-MM.md`.
- Date entries within files use short format (e.g., `0308` or `02-28`) followed by bullet points.
- "No" or "No study" indicates days with no learning activity.
- Commits follow the pattern `update: YYYY-MM-DD`.

## Reminder

The reminder runs as a Cloudflare Worker in `reminder/`. It fires at 20:00 / 21:00 / 22:00 JST, notifies over LINE when the day's header is missing from the monthly file, and commits replies back to `logs/YYYY/YYYY-MM.md`. See `docs/REQUIREMENTS.md` for the requirements and `docs/DEPLOYMENT.md` for deployment.

`.github/workflows/reminder.yml` typechecks and tests `reminder/`, then deploys on push to `main`.

The old Pushover workflow (`.github/workflows/commit-reminder.yml`) is still in place and runs alongside the Worker until the LINE path is confirmed stable.
