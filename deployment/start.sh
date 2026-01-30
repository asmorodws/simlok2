#!/bin/bash

# SIMLOK Production Start Script
# This script starts the Next.js application in production mode

set -e  # Exit on error

# Load NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

echo "========================================="
echo "Starting SIMLOK Application"
echo "Project Directory: $PROJECT_DIR"
echo "Time: $(date)"
echo "========================================="

# Load environment variables if .env.production exists
if [ -f .env.production ]; then
    echo "Loading environment variables from .env.production"
    set -a  # automatically export all variables
    source <(grep -v '^#' .env.production | grep -v '^[[:space:]]*$' | sed 's/#.*//')
    set +a
elif [ -f .env ]; then
    echo "Loading environment variables from .env"
    set -a  # automatically export all variables
    source <(grep -v '^#' .env | grep -v '^[[:space:]]*$' | sed 's/#.*//')
    set +a
else
    echo "Warning: No .env file found"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Error: node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Check if .next directory exists
if [ ! -d ".next" ]; then
    echo "Error: .next directory not found. Please run 'npm run build' first."
    exit 1
fi

# Set NODE_ENV to production
export NODE_ENV=production

# Start the application
echo "Starting Next.js application..."
exec npm start
