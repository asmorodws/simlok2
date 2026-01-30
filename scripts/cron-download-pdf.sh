#!/bin/bash
# =============================================================
# SIMLOK PDF Download Cron Job
# Schedule: Daily at 00:00
# 
# Crontab entry:
# 0 0 * * * /root/simlok2/scripts/cron-download-pdf.sh >> /root/simlok2/logs/cron-stdout.log 2>&1
# =============================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log file for this script's execution
EXEC_LOG="$LOG_DIR/cron-exec-$DATE.log"

log() {
    echo "[$DATE $TIME] $1" | tee -a "$EXEC_LOG"
}

log "=============================================="
log "🚀 Starting SIMLOK PDF Download Cron Job"
log "=============================================="
log "Project Directory: $PROJECT_DIR"
log "Node Version: $(node --version 2>/dev/null || echo 'not found')"

# Change to project directory
cd "$PROJECT_DIR"

# Load NVM if available (for non-interactive shells)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    log "NVM loaded, using Node: $(node --version)"
fi

# Run the TypeScript script with tsx
log "Executing PDF download script..."

# Option 1: Using npx tsx (recommended)
npx tsx scripts/download-pdf-bulk.ts --approved --today 2>&1 | tee -a "$EXEC_LOG"

# Check exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log "✅ PDF Download completed successfully"
else
    log "❌ PDF Download failed with exit code: $EXIT_CODE"
fi

log "=============================================="
log "🏁 Cron Job Finished"
log "=============================================="

exit $EXIT_CODE
