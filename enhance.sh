#!/usr/bin/env bash
# YapTalks — automated 10-minute enhancement runner
# Invoked by crontab; each run picks the next unpicked improvement area,
# implements it fully, commits, and pushes to claude/advance-progression-Yaeos.

set -euo pipefail

REPO="/home/user/YapTalks"
BRANCH="claude/advance-progression-Yaeos"
LOG="$REPO/.enhance.log"
LOCK="$REPO/.enhance.lock"

# ── Guard: prevent overlapping runs ──────────────────────────────────────────
if [ -f "$LOCK" ]; then
  echo "[$(date -u +%FT%TZ)] SKIP — previous run still active (lock: $LOCK)" >> "$LOG"
  exit 0
fi
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

echo "" >> "$LOG"
echo "════════════════════════════════════════════" >> "$LOG"
echo "[$(date -u +%FT%TZ)] Enhancement run started" >> "$LOG"

cd "$REPO"

# ── Ensure we're on the right branch and up-to-date ──────────────────────────
git fetch origin "$BRANCH" --quiet 2>> "$LOG" || true
git checkout "$BRANCH" --quiet 2>> "$LOG"
git pull origin "$BRANCH" --ff-only --quiet 2>> "$LOG" || true

# ── Run Claude non-interactively with a rich prompt ──────────────────────────
PROMPT='You are working on the YapTalks random-video-chat project at /home/user/YapTalks on branch claude/advance-progression-Yaeos.

Your job: pick ONE high-impact improvement area that has NOT been done yet in the recent git log, implement it completely, commit it with a descriptive message, and push.

Rules:
- Read `git log --oneline -10` first to see what was already done.
- Then choose the next best area from this priority list (skip any already done):
  1. Advanced CSS animations / micro-interactions
  2. New UX features in script.js (socket events, UI feedback, accessibility)
  3. server.js hardening (rate limiting, caching, metrics)
  4. auth.js polish (UX, validation, security)
  5. SEO / meta / structured data improvements
  6. Mobile responsiveness and touch interactions
  7. Performance: lazy loading, code splitting hints, resource hints
  8. Accessibility: ARIA roles, live regions, keyboard nav
  9. Privacy.html or README improvements
  10. New utility functions or developer experience

- Implement FULLY — no stubs, no "TODO" comments.
- Commit with format: `feat(pass-N): <what and why>`
- Push to origin claude/advance-progression-Yaeos
- Never repeat something already in the last 10 commits.
- Never add emojis unless they genuinely aid comprehension.
- Output a one-line summary of what you did at the very end.'

claude \
  --print \
  --dangerously-skip-permissions \
  "$PROMPT" >> "$LOG" 2>&1

echo "[$(date -u +%FT%TZ)] Enhancement run complete" >> "$LOG"
