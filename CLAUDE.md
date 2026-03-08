# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal "Today I Learned" (TIL) repository — a daily learning journal. It contains markdown files organized by month (`YYYY-MM.md`) with daily entries recording what was studied.

## Structure

- `YYYY-MM.md` — Monthly learning log files (e.g., `2026-03.md`). Each entry has a date header and bullet points describing what was learned/done that day.
- `docs/` — Project documentation including `REQUIREMENTS.md` and `TODO.md` for a GitHub Actions commit reminder system.
- `Note.txt` — Miscellaneous development notes (in Japanese).

## Conventions

- Content is written in Japanese.
- Monthly files use the format `YYYY-MM.md`.
- Date entries within files use short format (e.g., `0308` or `02-28`) followed by bullet points.
- "No" or "No study" indicates days with no learning activity.
- Commits follow the pattern `update: YYYY-MM-DD`.

## GitHub Actions

There is a planned (possibly implemented) commit reminder workflow (`.github/workflows/commit-reminder.yml`) that uses Pushover to send notifications when no commits have been made to this repo. See `docs/REQUIREMENTS.md` for full details.
