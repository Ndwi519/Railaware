# RailAware Deployment Guide

## Production Deployment (Render)

The project is deployed exclusively through Render using Render's native Node.js and Static Site runtimes.

1. Connect the repository to your Render account.
2. **Backend**: Create a new Web Service using the Node.js runtime.
   - Build Command: `npm install`
   - Start Command: `npm run start --prefix server`
   - Set environment variables based on `server/.env.example`.
3. **Frontend**: Create a new Static Site.
   - Build Command: `npm run build --prefix client`
   - Publish Directory: `client/dist`
   - Configure Rewrite rules for SPA routing.

## Environment Variables
Ensure all required variables are securely provisioned in the Render dashboard.
