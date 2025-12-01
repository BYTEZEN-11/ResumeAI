# ResumeRank AI

> AI-powered resume analysis, ATS scoring, and career optimization platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## Demo

**Live URL:** https://resume-rank-ai.vercel.app

| Role  | Email                    | Password       |
|-------|--------------------------|----------------|
| Admin | admin@resumerank.ai      | Admin@123456   |
| Demo  | demo@resumerank.ai       | Demo@123456    |

---

## Features

- **ATS Score** — Detailed breakdown across keywords, formatting, sections, readability
- **Skill Gap Detection** — Critical, important, and nice-to-have missing skills
- **AI Resume Rewrites** — Section-level rewrites with stronger action verbs and metrics
- **Interview Questions** — Behavioral, technical, situational questions tailored to the role
- **Career Recommendations** — AI-driven career path guidance
- **Resume History** — Full analysis history with search, filter, and pagination
- **Dashboard Analytics** — Score trends, top missing skills, recent activity
- **Subscription Plans** — Free, Pro ($19/mo), Team ($49/mo) via Stripe
- **Admin Panel** — User management, platform analytics, feature flags, audit logs
- **Dark Mode** — Full dark/light theme support
- **Responsive** — Mobile-first design

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 15, React 19, TypeScript    |
| Styling       | Tailwind CSS, shadcn/ui, Framer Motion |
| Auth          | Auth.js v5 (credentials + OAuth)    |
| Database      | PostgreSQL via Supabase + Prisma    |
| Storage       | Supabase Storage                    |
| AI            | OpenAI GPT-4o-mini / GPT-4o         |
| Background    | Inngest                             |
| Email         | Resend                              |
| Payments      | Stripe                              |
| Deployment    | Vercel                              |

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/yourname/resume-rank-ai.git
cd resume-rank-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

### 4. Set up database

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated pages
│   ├── (auth)/             # Auth pages
│   ├── (marketing)/        # Public marketing pages
│   └── api/                # API route handlers
├── modules/                # Feature modules (domain logic)
│   ├── auth/
│   ├── resume/
│   ├── analysis/
│   ├── dashboard/
│   ├── billing/
│   ├── notifications/
│   ├── admin/
│   └── settings/
├── shared/                 # Shared utilities and components
│   ├── components/
│   ├── hooks/
│   ├── providers/
│   └── utils/
├── lib/                    # Third-party client setup
├── types/                  # TypeScript type definitions
└── constants/              # App-wide constants
```

---

## Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run type-check    # TypeScript type check
npm run lint          # ESLint
npm run test          # Run unit tests
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E tests
npm run db:migrate    # Run database migrations
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed demo data
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## License

MIT — see [LICENSE](LICENSE).
