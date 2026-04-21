# Live Server Review Checklist

## Status
- Status: Blocked until a production or preview URL is provided

## What I Need
- Production URL or Vercel preview URL
- Login credentials or session state for each role under review
- Whether the role sessions should be checked as separate accounts or as one shared test account per role

## What I Will Verify
- Page load and console/runtime errors
- Authentication redirects and role gating
- Sensitive route behavior on the live deployment
- Cron-protected route responses
- Map, upload, and admin flows that depend on environment variables or external services
- Guest, authenticated user, agent, and admin views as separate live sessions

## Why This Is Blocked
- This repository-only session cannot confirm live deployment behavior, headers, environment variable scoping, CDN behavior, or production-only secrets.
- Without role sessions, I can only verify public pages and route structure, not role-specific behavior.
