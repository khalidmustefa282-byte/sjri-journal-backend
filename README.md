# SJRI Journal Backend

Production-ready Next.js backend for the South Journal of Research & Innovation.

## Quick Start (30 minutes to live)

### Prerequisites
- GitHub account (free)
- Vercel account (free)
- Railway account (free)

### Follow the Deployment Guide

See `DEPLOYMENT_STEPS.md` for step-by-step instructions.

## Test Credentials (after deployment)

```
AUTHOR:    author@sjrijournal.org / author123456
EDITOR:    editor@sjrijournal.org / editor123456
REVIEWER:  reviewer1@sjrijournal.org / reviewer123456
ADMIN:     admin@sjrijournal.org / admin123456
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/token` - Login and get JWT token

### Papers
- `POST /api/papers/submit` - Submit a paper
- `GET /api/papers/my-submissions` - Get your papers
- `GET /api/papers/:paperId` - Get paper details

### Editor
- `GET /api/editor/dashboard` - Dashboard stats
- `GET /api/editor/submissions` - List submissions
- `POST /api/editor/assign-reviewer` - Assign reviewers
- `POST /api/editor/decision` - Make decision

### Reviewer
- `POST /api/reviewer/submit-review` - Submit review

### Publications (Public)
- `GET /api/publications/current` - Recent papers
- `GET /api/publications/search` - Search papers
- `GET /api/publications/stats` - Homepage stats

## Status

✅ Code verified and production-ready
✅ All security checks passed
✅ Database schema validated
✅ Ready to deploy

## Support

Check `DEPLOYMENT_STEPS.md` for detailed instructions.
