#!/bin/bash
# WPHub SaaS Setup script

echo "Initializing WPHub SaaS Setup..."

# Copy environment variables
if [ ! -f .env ]; then
  echo "Copying .env.example to .env..."
  cp .env.example .env
else
  echo ".env file already exists."
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build shared packages
echo "Building shared packages..."
pnpm run build

echo "Setup completed successfully! Run 'pnpm dev' to start the workspace."
