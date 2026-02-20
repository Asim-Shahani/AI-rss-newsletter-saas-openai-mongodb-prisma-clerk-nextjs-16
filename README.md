<div align="center">

# 📰 AI Content Automation Pipeline — Newsletter Generator

[![Next.js 16](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![OpenAI GPT-4](https://img.shields.io/badge/OpenAI%20GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.dev)

> **Automated AI newsletter pipeline** — Monitor RSS feeds, synthesize content with GPT-4, deduplicate articles, stream previews in real-time, and send beautifully formatted newsletters on schedule. Built for content creators who want to publish consistently without burnout.

</div>

---

## ✨ Features

- **📡 RSS Feed Monitoring** — Watch unlimited RSS feeds, auto-detect new articles on configurable intervals
- **🤖 GPT-4 Content Synthesis** — Intelligent summarization and editorial rewriting, not just aggregation
- **🔄 Smart Deduplication** — Hash-based and semantic deduplication prevents the same article appearing twice
- **⚡ Streaming Preview** — Real-time GPT-4 token streaming for instant newsletter preview before sending
- **📧 Scheduled Delivery** — Cron-based scheduling: daily, weekly, or custom intervals
- **🔐 Clerk Auth** — Multi-user support with email/password and social OAuth
- **🗄️ MongoDB + Prisma** — Flexible document storage with type-safe ORM
- **📱 Responsive Email Templates** — HTML email templates that render beautifully across all email clients

---

## 🏗️ Architecture

```
RSS Feeds (cron job)
     ↓
[Feed Fetcher] → Parse articles → Hash deduplication check
     ↓                                    ↓
New Articles                        Skip (seen)
     ↓
[GPT-4 Synthesizer] ← System prompt for newsletter editorial style
     ↓                  (streaming: ReadableStream → SSE)
Synthesized Content
     ↓
[Newsletter Builder] → HTML template rendering
     ↓
[Scheduler] → Send on schedule OR manual trigger
     ↓
Subscribers' Inboxes (Resend/SendGrid)
     ↓
MongoDB: articles, newsletters, users, subscriptions (via Prisma)
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/UI |
| **AI** | OpenAI GPT-4 (streaming), text-embedding-ada-002 (deduplication) |
| **Database** | MongoDB Atlas + Prisma ORM |
| **Auth** | Clerk (email, Google OAuth, Magic Link) |
| **Email Delivery** | Resend API (or SendGrid) |
| **RSS Parsing** | rss-parser, cheerio |
| **Scheduling** | Vercel Cron Jobs / GitHub Actions |
| **Deployment** | Vercel (Edge Runtime) |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Asim-Shahani/AI-rss-newsletter-saas-openai-mongodb-prisma-clerk-nextjs-16.git
cd AI-rss-newsletter-saas-openai-mongodb-prisma-clerk-nextjs-16

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Initialize Prisma
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

## 🔑 Environment Variables

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# OpenAI
OPENAI_API_KEY=

# MongoDB
DATABASE_URL=mongodb+srv://...

# Email (Resend)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=  # For protecting cron endpoints
```

## 💡 Key Implementation Details

### GPT-4 Streaming Newsletter Generation

The newsletter synthesis uses **OpenAI streaming** with the Vercel AI SDK:

```typescript
// /api/newsletter/generate/route.ts
const stream = OpenAIStream(
  await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [
      { role: 'system', content: NEWSLETTER_SYSTEM_PROMPT },
      { role: 'user', content: articlesContext }
    ]
  })
);
return new StreamingTextResponse(stream);
```

### Deduplication Strategy
1. **Exact match**: SHA-256 hash of article URL + title
2. **Semantic match**: Cosine similarity of `text-embedding-ada-002` embeddings (threshold: 0.92)
3. **Time window**: Skip articles older than configured window (default: 7 days)

### Cron Schedule
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/fetch-feeds",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/send-newsletters",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

---

<div align="center">

Built with ❤️ by [Asim Shahani](https://github.com/Asim-Shahani) | AI Engineer

⭐ Star this repo if it helps automate your content pipeline!

</div>
