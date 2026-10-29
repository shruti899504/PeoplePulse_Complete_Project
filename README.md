# PeoplePulse — Multi-HR Performance Management

PeoplePulse is a React, Express, and MongoDB project for employee performance management. It includes employee records, measurable goals, automatic achievement calculations, performance reviews, role-based HR accounts, department insights, PulseAI rule-based prompts, recognition badges, CSV reports, and an Admin HR audit-history view.

## Requirements
- Node.js 20 or newer
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Setup
1. Extract the ZIP and open the `PeoplePulse_Full_Project` folder in VS Code.
2. Run `npm install`.
3. Run `npm run install:all`.
4. Copy `backend/.env.example` to `backend/.env`.
5. Set `MONGODB_URI`, a random `JWT_SECRET` of at least 24 characters, and a private `ADMIN_PASSWORD` of at least 10 characters. Change the initial admin email/password to your own values before sharing the project.
6. Keep `PORT=5001` to avoid the common port 5000 conflict. `FRONTEND_ORIGIN` lists the usual Vite development ports.
7. Start both applications from the project root with `npm run dev`.
8. Open the frontend URL Vite prints, normally `http://localhost:5173`.

The backend API is normally at `http://localhost:5001`. A first Admin HR account is created when the server starts if the configured email does not already exist.

## Access model
- Admin HR can manage all departments and HR accounts.
- Department HR can manage employees and performance data within their assigned department.
- Employees have limited access to their own employee workspace and can view their goals and reviews.
- Backend routes enforce permissions; hiding a navigation item is not treated as authorization.

## Feature notes
- Goal completion is calculated from achieved amount / target amount. Dashboard visuals should be treated as operational indicators, not as an automatic employment decision.
- PulseAI currently provides transparent rule-based prompts based on stored goal and review data; it does not call an external AI service.
- 360° review records support self-assessment text, skill ratings, and review type in the database. The current review form primarily captures manager feedback; the additional fields can be exposed in the UI as a follow-up enhancement.
- The audit page shows recorded administrative events. Recognition creation is currently logged; add audit writes to other mutation routes before using this as a production compliance log.

## Troubleshooting
- `EADDRINUSE`: stop the old project terminal with Ctrl+C and inspect port usage with `netstat -ano | findstr :5001` and `netstat -ano | findstr :5173`. Only stop a PID after identifying it.
- MongoDB connection errors: verify MongoDB is running and `MONGODB_URI` is correct.
- Login/API errors: inspect the browser Developer Tools Console and backend terminal.

This is an academic project starter. Test all role permissions and flows with separate test accounts before presenting it as production-ready.
