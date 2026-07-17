# RailAware Deployment Guide

## Production Deployment (Docker Compose)

The easiest way to deploy RailAware is using the provided Docker Compose file.

1. Clone repository to host.
2. Create \`.env\` based on \`.env.example\` and provide production keys.
3. Run \`docker-compose up -d --build\`.

This will start:
- Express API on port 3001
- Next.js Web App on port 3000

## Environment Variables
Ensure all variables defined in \`packages/config/src/env.ts\` are provided.
