#!/usr/bin/env bash
# YapTalks enhancement daemon — runs every 10 minutes in the background.
# Start with:  nohup bash /home/user/YapTalks/enhance-daemon.sh &
# Stop with:   kill $(cat /home/user/YapTalks/.enhance.pid)

REPO="/home/user/YapTalks"
BRANCH="claude/advance-progression-Yaeos"
LOG="$REPO/.enhance.log"
INTERVAL=600   # 10 minutes

echo $$ > "$REPO/.enhance.pid"
echo "[$(date -u +%FT%TZ)] Daemon started (PID $$, interval ${INTERVAL}s)" >> "$LOG"

while true; do
  LOCK="$REPO/.enhance.lock"

  # ── Skip if previous run still active ──────────────────────────────
  if [ -f "$LOCK" ]; then
    echo "[$(date -u +%FT%TZ)] SKIP — lock active" >> "$LOG"
    sleep "$INTERVAL"
    continue
  fi

  touch "$LOCK"

  {
    echo ""
    echo "════════════════════════════════════════════"
    echo "[$(date -u +%FT%TZ)] Enhancement run started"

    cd "$REPO"
    git fetch origin "$BRANCH" --quiet 2>&1 || true
    git checkout "$BRANCH" --quiet 2>&1
    git pull origin "$BRANCH" --ff-only --quiet 2>&1 || true

    RECENT=$(git log --oneline -10)
    echo "Recent commits:"
    echo "$RECENT"
    echo ""

    PROMPT_FILE=$(mktemp /tmp/yap-enhance-XXXXX.txt)
    cat > "$PROMPT_FILE" <<PROMPT
You are working on the YapTalks random-video-chat app at /home/user/YapTalks on branch $BRANCH.

Recent git history (do NOT repeat these):
$RECENT

Task: Pick ONE improvement area not yet covered, implement it FULLY, commit, and push to origin/$BRANCH.

Priority list (choose the first not yet done):
1. Advanced CSS animations or micro-interactions in styles.css
2. New UX/socket features in script.js (keyboard a11y, live regions, better error states)
3. server.js: rate-limit tuning, response caching headers, metrics
4. auth.js: UX polish, better error copy, loading states
5. Mobile responsiveness — touch targets, swipe gestures, viewport fixes
6. Accessibility: ARIA live regions, skip links, focus traps in modals
7. Performance: preload/prefetch hints, lazy images, font-display
8. SEO: JSON-LD structured data, Open Graph refinements
9. Privacy.html or README enhancements
10. Developer tooling: .editorconfig, .nvmrc, lint config

Rules:
- Implement completely — no stubs or TODOs.
- Read relevant files before editing them.
- Commit message format: feat(pass-N): <concise what + why>
- Push to origin/$BRANCH with: git push -u origin $BRANCH
- Never blindly add emojis.
- End your response with: DONE: <one-line summary of what you implemented>
PROMPT

    claude \
      --print \
      --allowedTools "Bash,Edit,Read,Write" \
      < "$PROMPT_FILE"
    rm -f "$PROMPT_FILE"

    echo "[$(date -u +%FT%TZ)] Enhancement run complete"
  } >> "$LOG" 2>&1

  rm -f "$LOCK"

  echo "[$(date -u +%FT%TZ)] Sleeping ${INTERVAL}s until next run" >> "$LOG"
  sleep "$INTERVAL"
done
