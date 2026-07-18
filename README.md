# review-ai
AI-powered review and analysis platform built with Turborepo, Next.js, Express.js, Prisma, and Gemini AI.

## Local GitHub OAuth

Create a GitHub OAuth App with these local development URLs:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:4000/api/auth/github/callback`

Use the same callback in `.env`:

```env
GITHUB_CALLBACK_URL="http://localhost:4000/api/auth/github/callback"
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
