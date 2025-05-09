# Lighthouse

A monitoring application that checks store SLAs through API endpoints and scheduled cron jobs.

## Project Structure

- `/backend` - Node.js Express backend API
- `/frontend` - React frontend using Ant Design

## Local Development

1. Install dependencies:

   ```
   npm run install-all
   ```

2. Start the development server:
   ```
   npm start
   ```

This will start both the backend server on port 5000 and the frontend development server.

## Store SLA Checking

The application checks store SLAs by:

1. Reading location data from a CSV file (`store_sla.csv`)
2. Calling the API for each location
3. Processing and storing the results

The SLA check runs:

- Every 5 minutes via a cron job
- On-demand via the `/api/internal_store_sla_check` endpoint

## Deployment to Render.com

### Single Server Deployment (Backend + Frontend)

The application is configured to serve both the backend API and frontend from a single server:

1. Create a new account on [Render.com](https://render.com) if you don't have one.

2. Connect your GitHub repository to Render.com:

   - Go to Dashboard
   - Click "New" and select "Blueprint"
   - Connect your GitHub repository
   - Render will detect the `render.yaml` configuration

3. Deploy:
   - Select the repository
   - Render will automatically:
     - Install all dependencies for both backend and frontend
     - Build the React frontend
     - Start the backend server which will serve both the API and frontend

### How It Works

In production mode (`NODE_ENV=production`):

- The Express server serves the static frontend files from the `frontend/build` directory
- All API requests to `/api/*` routes are handled by the backend
- All other requests are routed to the React frontend's index.html (for client-side routing)

### Environment Variables

The following environment variables can be set in Render.com:

- `PORT`: Set by Render automatically
- `NODE_ENV`: Set to "production" by default in the blueprint

## CSV Data File

The application reads location data from `store_sla.csv` in the root directory. This file must be included in your repository to be deployed to Render.com.
