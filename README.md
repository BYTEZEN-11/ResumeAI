# Resume AI Pro

> AI-powered resume builder, ATS score optimization, real-time keyword matching, and professional career tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748)](https://prisma.io)

---

## Overview

**Resume AI Pro** is a modern full-stack web application designed to help job seekers generate, optimize, and export high-converting resumes tailored to specific job postings. Powered by Next.js 15, Auth.js, Prisma, and OpenAI, it provides real-time ATS keyword analysis, section-by-section AI content rewriting, multi-template rendering, and high-resolution PDF exports.

---

## Key Features

- **ATS Scoring Engine** — Instant scoring breakdown analyzing keyword alignment, section formatting, readability, and impact metrics.
- **AI Content Enhancer** — Transform weak bullet points into high-impact, action-oriented achievements with quantifiable results.
- **Live Resume Preview** — Real-time rendering with interactive layout customization, font selection, line spacing, and theme colors.
- **Multiple Modern Templates** — Professionally designed templates optimized for technical, corporate, creative, and academic roles.
- **Target Job Matcher** — Compare your resume directly against target job descriptions to discover missing critical skills.
- **Cover Letter & Interview Generator** — Automatically generate matching cover letters and tailored behavioral interview questions.
- **Export Options** — Instant exports to clean PDF, Markdown, JSON backup, or raw text format.
- **User Dashboard** — Manage multiple resume variations, track view analytics, duplicate drafts, and organize with custom tags.
- **Subscription Tier Ready** — Integrated Stripe checkout and subscription management architecture.
- **Dark Mode Support** — Seamless light and dark mode design system across all application pages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Vanilla CSS, Tailwind CSS, Framer Motion, Radix UI |
| **Authentication** | Auth.js v5 (OAuth & Credentials) |
| **Database** | PostgreSQL via Supabase & Prisma ORM |
| **AI Integration** | OpenAI API (GPT-4o / GPT-4o-mini) |
| **Background Tasks** | Inngest |
| **Email Service** | Resend |
| **Payment Gateway** | Stripe Checkout & Webhooks |
| **Deployment** | Vercel |

---

## Getting Started

### Prerequisites

- **Node.js**: v18.17 or higher
- **npm**: v9 or higher
- **PostgreSQL**: Local instance or Supabase cloud database

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/BYTEZEN-11/ResumeAI.git
   cd ResumeAI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your local environment keys in `.env.local`. Refer to [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for details.

4. **Initialize the database**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Project Architecture

```
src/
├── app/                    # Next.js App Router routes & API endpoints
│   ├── (app)/              # Authenticated user dashboard & builder pages
│   ├── (auth)/             # Authentication flows (login, register)
│   ├── (marketing)/        # Landing page and marketing content
│   └── api/                # REST API route handlers
├── modules/                # Domain-driven feature modules
│   ├── auth/               # Session & user provider logic
│   ├── resume/             # Resume editor & data structures
│   ├── analysis/           # ATS scoring & AI enhancement engine
│   ├── dashboard/          # Analytics & document grid views
│   ├── billing/            # Stripe subscription integrations
│   └── settings/           # Profile & account configuration
├── shared/                 # Reusable UI components & custom hooks
│   ├── components/         # Shared Radix & Tailwind UI elements
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Formatting & date helper functions
├── lib/                    # SDK initializers (Prisma, OpenAI, Stripe)
└── types/                  # Shared TypeScript type definitions
```

---

## Available Scripts

```bash
npm run dev           # Run development server
npm run build         # Build production application bundle
npm run start         # Start production build server
npm run type-check    # Run TypeScript compiler checks
npm run lint          # Run ESLint validation rules
npm run test          # Execute unit tests with Vitest
npm run test:e2e      # Execute end-to-end tests with Playwright
npm run db:migrate    # Run Prisma database migrations
npm run db:studio     # Open interactive Prisma Studio GUI
```

---

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Environment Configuration](docs/ENVIRONMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
