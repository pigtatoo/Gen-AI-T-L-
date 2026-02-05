# Gen-AI Teaching & Learning Platform - Handover Report

**Document Version:** 1.0  
**Handover Date:** February 3, 2026  
**Project Status:** Production Ready

---

## 1. Executive Summary

### Project Name
**Gen-AI Teaching & Learning Platform (Gen-AI-T-L)**

### Purpose
A comprehensive GenAI-powered application designed to streamline teaching and learning workflows and enhance content creation processes. The platform reduces routine preparation time for educators, allowing them to focus on high-impact teaching, mentoring, and innovation.

### Key Stakeholders
- **Educators/Teachers:** Primary users who create modules, topics, and learning materials
- **Students:** Access curated content, newsletters, and learning resources
- **Staff/Administrators:** Manage platform content, RSS feeds, and newsletters
- **Development Team:** Maintenance and future enhancements

### Handover Context
This handover report provides comprehensive documentation for the Gen-AI Teaching & Learning platform, covering technical architecture, deployment, and operational procedures necessary for ongoing maintenance and development.

---

## 2. Project Overview

### What the System Does
The Gen-AI T&L platform is a full-stack web application that:
- **AI-Powered Content Creation:** Leverages DeepSeek AI for intelligent chat interactions, content generation, and case study retrieval
- **Module & Topic Management:** Enables educators to create and organize learning modules with hierarchical topic structures
- **RSS Feed Curation:** Automatically aggregates and filters technology news from multiple RSS sources
- **Newsletter Generation:** AI-powered weekly newsletter creation and distribution to subscribers
- **Quiz Generation:** Automated quiz creation from learning content
- **User Management:** Role-based access control (Students, Teachers, Staff)
- **Real-time Case Studies:** Fetches latest real-world examples using SerpAPI integration

### Target Users
1. **Teachers/Educators:** Create modules, topics, and educational content
2. **Students:** Consume learning materials and receive newsletters
3. **Staff:** Administrative functions, content curation, and newsletter management

### Key Business Objectives
- Reduce educator preparation time by 40-60% through AI automation
- Provide curated, relevant technology content through automated RSS aggregation
- Enable personalized learning through modular content structure
- Facilitate knowledge dissemination via automated newsletters
- Support educators with AI-powered teaching assistants

---

## 3. System Architecture

### Technology Stack

#### Frontend
- **Framework:** Next.js 16.0.7 (React 19.2.0)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Build Tool:** Next.js built-in (Turbopack)
- **Deployment:** Not specified (likely Vercel)

#### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js 5.2.1
- **Language:** JavaScript (CommonJS)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Sequelize 6.35.0 (with Supabase client for direct queries)
- **Deployment:** Render.com

#### AI & Machine Learning
- **Primary AI:** DeepSeek (via API)
- **Alternative AI:** Google Generative AI (@google/generative-ai)
- **Hugging Face:** @huggingface/inference 4.13.5

#### Third-Party Services
- **Database:** Supabase (PostgreSQL cloud database)
- **Email Service:** 
  - SendGrid (@sendgrid/mail 8.1.6)
  - Nodemailer 7.0.12
  - Resend 6.8.0
- **Search API:** SerpAPI 2.2.1
- **Scheduler:** node-cron 4.2.1

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Landing  │ Modules  │ Topics   │ Chat     │ Quiz     │  │
│  │ Page     │ Page     │ Page     │ Page     │ Page     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Login/   │ Feeds    │Newsletter│ User     │ Staff    │  │
│  │ Signup   │ Page     │ Page     │ Page     │ Page     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Express.js)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Routes                              │   │
│  │  /auth  /modules  /topics  /articles  /quiz         │   │
│  │  /feeds /newsletters /newsletter-subscriptions       │   │
│  │  /admin                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Controllers                             │   │
│  │  Auth | Modules | Topics | Newsletter | Admin       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Services                                │   │
│  │  RSS | Content Analyzer | Quiz | Case Study         │   │
│  │  Scraper Service                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Scheduled Jobs (node-cron)                   │   │
│  │  RSS Sync | Newsletter Sender                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Supabase Client
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Users    │ Modules  │ Topics   │ Articles │ Feeds    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────────────────────────────────────┐   │
│  │Newsletter│ Newsletter Subscriptions | UserFeeds     │   │
│  └──────────┴──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │ DeepSeek │ SerpAPI  │ SendGrid │ RSS Feeds│             │
│  │ AI       │ (Search) │ (Email)  │ (Content)│             │
│  └──────────┴──────────┴──────────┴──────────┘             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         AUTOMATION (GitHub Actions)                          │
│  ┌───────────────┬──────────────────┬─────────────────┐    │
│  │ RSS Sync      │ Newsletter Send  │ Keep Alive      │    │
│  │ (Weekly)      │ (Weekly)         │ (Hourly)        │    │
│  └───────────────┴──────────────────┴─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Key Features & Functionality

### 4.1 Authentication & User Management
- **User Registration & Login** ([server/routes/auth.js](server/routes/auth.js))
- **JWT-based Authentication** with middleware protection
- **Role-based Access Control:** Student, Teacher, Staff
- **Password Hashing:** bcryptjs for secure password storage

### 4.2 Module & Topic Management
- **Module Creation:** Teachers create learning modules with title and description
- **Topic Hierarchy:** Nested topics under modules with rich content
- **User Association:** Modules are tied to specific users
- **CRUD Operations:** Full create, read, update, delete functionality

### 4.3 AI-Powered Chat Assistant
- **DeepSeek Integration:** Intelligent conversational AI
- **Context-Aware Responses:** Uses module title, description, and selected topics
- **Case Study Retrieval:** Fetches real-world examples via SerpAPI
- **Summary Generation:** Summarizes content from topics

### 4.4 RSS Feed Management
- **Multi-Source Aggregation:** Fetches from 25+ technology RSS feeds
- **Automated Filtering:** Keyword-based relevance filtering
- **Weekly Sync:** Scheduled sync every Monday at 4:00 AM SGT
- **User-Customizable Feeds:** Users can add their own RSS feeds
- **Source Tracking:** Articles tagged with original source

### 4.5 Newsletter System
- **AI-Generated Content:** DeepSeek generates weekly newsletters
- **Email Distribution:** SendGrid/Nodemailer for delivery
- **Subscription Management:** Users can subscribe/unsubscribe
- **Scheduled Sending:** Automated weekly sends via GitHub Actions
- **Newsletter History:** Stored in database for reference

### 4.6 Quiz Generation
- **AI-Powered Quiz Creation:** Generates quizzes from learning content
- **Multiple Question Types:** Support for various quiz formats
- **Automated Grading:** Evaluation and feedback

### 4.7 Content Scraping & Analysis
- **Web Scraping:** Cheerio-based content extraction
- **Content Analysis:** AI-powered content categorization
- **Article Storage:** Persisted to database with metadata

### 4.8 Staff/Admin Features
- **Content Moderation:** Review and manage submitted content
- **Feed Management:** Add/remove global RSS feeds
- **User Management:** View and manage user accounts
- **Newsletter Administration:** Manual newsletter triggers

---

## 5. Technical Setup

### 5.1 Prerequisites
- **Node.js:** Version 20.x or higher
- **npm:** Version 8.x or higher
- **Git:** For version control
- **Supabase Account:** For database access
- **API Keys:** DeepSeek, SerpAPI, SendGrid/Email service

### 5.2 Installation Steps

#### Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file (see section 5.3)
cp .env.example .env
# Edit .env with your API keys and credentials

# Test database connection
npm run db:test

# Start server
npm start
```

#### Frontend Setup
```bash
# Navigate to client directory
cd client/client

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local with backend API URL

# Run development server
npm run dev
```

### 5.3 Environment Variables

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password

# AI Services
DEEPSEEK_KEY=your-deepseek-api-key
HUGGINGFACE_API_KEY=your-huggingface-key (optional)
GOOGLE_AI_KEY=your-google-ai-key (optional)

# SerpAPI (for case studies)
SERPAPI_KEY=your-serpapi-key

# Email Services
EMAIL_FROM=your-email@domain.com
PASS=your-email-password
SENDGRID_API_KEY=your-sendgrid-key (if using SendGrid)
RESEND_API_KEY=your-resend-key (if using Resend)

# JWT Authentication
JWT_SECRET=your-strong-random-secret-key

# Client Configuration
CLIENT_ORIGIN=https://your-frontend-domain.com

# RSS Configuration
RSS_SINCE_DAYS=7
RSS_TIMEOUT=15000
ARTICLE_OUTPUT_DIR=./temp
```

#### Frontend (.env.local)
```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

### 5.4 Database Schema

#### Core Tables

**Users**
```sql
- id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- name (STRING, NOT NULL)
- email (STRING, UNIQUE, NOT NULL)
- password (STRING, HASHED, NOT NULL)
- role (ENUM: 'student', 'teacher', 'staff')
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**Modules**
```sql
- module_id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- user_id (INTEGER, FOREIGN KEY -> Users.id)
- title (STRING, NOT NULL)
- description (TEXT)
- created_at (TIMESTAMP)
```

**Topics**
```sql
- topic_id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- module_id (INTEGER, FOREIGN KEY -> Modules.module_id)
- name (STRING, NOT NULL)
- content (TEXT)
- created_at (TIMESTAMP)
```

**Articles** (from RSS feeds)
```sql
- article_id (INTEGER, PRIMARY KEY)
- title (STRING)
- url (STRING, UNIQUE)
- published (TIMESTAMP)
- summary (TEXT)
- source (STRING)
- created_at (TIMESTAMP)
```

**UserFeeds**
```sql
- feed_id (INTEGER, PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY -> Users.id)
- feed_url (STRING, NOT NULL)
- created_at (TIMESTAMP)
```

**Newsletters**
```sql
- newsletter_id (INTEGER, PRIMARY KEY)
- title (STRING)
- content (TEXT)
- sent_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

**UserNewsletterSubscription**
```sql
- subscription_id (INTEGER, PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY -> Users.id)
- subscribed (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 6. Deployment & Infrastructure

### 6.1 Hosting Platforms

#### Backend: Render.com
- **Service Type:** Web Service
- **Runtime:** Node.js
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** 10000
- **Auto-Deploy:** Enabled (on main branch push)

#### Frontend: Vercel (Recommended) or Similar
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

#### Database: Supabase
- **Type:** PostgreSQL (managed)
- **Location:** Cloud-hosted
- **Access:** HTTPS-based client (no direct DB connection)

### 6.2 CI/CD Pipelines (GitHub Actions)

#### 1. Weekly RSS Sync
**File:** `.github/workflows/rss-sync.yml`
- **Schedule:** Every Monday at 4:00 AM Singapore Time (Sunday 20:00 UTC)
- **Trigger:** Cron schedule + Manual dispatch
- **Function:** Fetches articles from 25+ RSS feeds, filters by keywords, stores in Supabase
- **Secrets Required:**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPSEEK_KEY`
  - `SUPABASE_DB_PASSWORD`

#### 2. Weekly Newsletter Sending
**File:** `.github/workflows/send-newsletters.yml`
- **Schedule:** Every Monday at 7:00 AM Singapore Time (Sunday 23:00 UTC)
- **Trigger:** Cron schedule + Manual dispatch
- **Function:** Generates AI-powered newsletters and sends to subscribers
- **Secrets Required:**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPSEEK_KEY`
  - `EMAIL_FROM`
  - `PASS`

#### 3. Keep Server Awake
**File:** `.github/workflows/keep-server-awake.yml`
- **Schedule:** Every hour
- **Function:** Pings Render backend to prevent cold starts
- **Note:** Render free tier spins down after inactivity

### 6.3 Render Cron Jobs
**File:** `render.yaml`
- **Weekly RSS Sync:** Tuesday 4:00 AM SGT (Monday 20:00 UTC)
- **Note:** Duplicates GitHub Actions but provides redundancy

---

## 7. Database & Data

### 7.1 Database Structure
The system uses **Supabase** (PostgreSQL) for all data persistence:
- **Users & Authentication:** User accounts with role-based access
- **Content Management:** Modules, Topics, Articles
- **Subscriptions:** Newsletter subscriptions, User feeds
- **Generated Content:** Quizzes, Newsletters

### 7.2 Data Migration Notes
- **ORM:** Sequelize models defined but primary access via Supabase client
- **No Automatic Sync:** Database sync disabled; tables managed manually in Supabase
- **Migration Scripts:** Located in `server/migrations/` (currently just README)
- **Schema Changes:** Must be applied directly in Supabase dashboard or via SQL

### 7.3 RSS Feed Configuration
**File:** `server/config/rssConfig.js`
- **25+ Tech News Sources:** Including TechCrunch, Wired, The Verge, Ars Technica, etc.
- **Keyword Filtering:** AI, machine learning, cybersecurity, cloud, blockchain, etc.
- **Configurable:** Add/remove feeds by editing rssConfig.js

---

## 8. Third-Party Integrations

### 8.1 AI Services

#### DeepSeek AI (Primary)
- **Purpose:** Chat assistant, content generation, newsletter creation
- **API Key:** `DEEPSEEK_KEY` environment variable
- **Endpoint:** Custom DeepSeek API
- **Usage:** High-volume content generation

#### Google Generative AI (Backup)
- **Purpose:** Alternative AI provider
- **API Key:** `GOOGLE_AI_KEY`
- **Package:** @google/generative-ai

#### Hugging Face (Optional)
- **Purpose:** Additional AI capabilities
- **API Key:** `HUGGINGFACE_API_KEY`

### 8.2 Search & Data Retrieval

#### SerpAPI
- **Purpose:** Real-world case study and incident retrieval
- **API Key:** `SERPAPI_KEY`
- **Usage:** Search Google for latest tech incidents/case studies
- **Cost:** Pay-per-query model

### 8.3 Email Services

#### SendGrid (Recommended)
- **Purpose:** Newsletter distribution
- **API Key:** `SENDGRID_API_KEY`
- **Package:** @sendgrid/mail

#### Nodemailer (Alternative)
- **Purpose:** SMTP-based email sending
- **Configuration:** EMAIL_FROM, PASS
- **Use Case:** Personal email servers

#### Resend (Alternative)
- **Purpose:** Modern email API
- **API Key:** `RESEND_API_KEY`

### 8.4 RSS Feed Sources
Over 25 technology news sources including:
- TechCrunch, Wired, The Verge, Ars Technica
- MIT Technology Review, VentureBeat
- Security-focused: Dark Reading, Krebs on Security
- Developer-focused: GitHub Blog, Dev.to

---

## 9. Known Issues & Limitations

### 9.1 Current Bugs
1. **Sequelize vs Supabase:** Mixed usage of Sequelize models and Supabase client may cause confusion
2. **Email Service Selection:** Multiple email packages installed but no clear selection logic
3. **Error Handling:** Some routes lack comprehensive error handling
4. **RSS Parsing:** Occasional failures on malformed feeds (resolved gracefully)

### 9.2 Technical Debt
1. **Migration System:** No automated migration system; schema changes are manual
2. **Testing:** No automated tests (unit, integration, or e2e)
3. **API Documentation:** No Swagger/OpenAPI documentation
4. **Frontend State Management:** No global state manager (Redux/Zustand)
5. **TypeScript Migration:** Server still uses JavaScript (should migrate to TypeScript)
6. **Logging:** Basic console logging; should implement Winston or similar

### 9.3 Performance Considerations
1. **Cold Starts:** Render free tier has cold start delays (mitigated by keep-alive workflow)
2. **RSS Sync Duration:** Can take 5-10 minutes for full sync of 25+ feeds
3. **AI API Latency:** DeepSeek responses can take 3-5 seconds
4. **Database Queries:** Some N+1 query patterns in module/topic endpoints
5. **Newsletter Generation:** Can be slow for large subscriber lists

### 9.4 Security Considerations
1. **JWT Secret:** Ensure strong, randomly generated JWT_SECRET
2. **API Keys:** Never commit .env files; use GitHub Secrets
3. **CORS:** Currently allows credentials; review for production
4. **Input Validation:** Limited validation on user inputs
5. **Rate Limiting:** No rate limiting on API endpoints

---

## 10. Future Recommendations

### 10.1 High Priority
1. **Implement Automated Testing**
   - Unit tests for services (Jest)
   - Integration tests for API routes (Supertest)
   - E2E tests for critical user flows (Playwright)

2. **Add API Documentation**
   - Swagger/OpenAPI specification
   - Interactive API explorer

3. **Improve Error Handling**
   - Centralized error handling middleware
   - Structured error responses
   - Error logging and monitoring

4. **Database Migration System**
   - Implement proper migration scripts
   - Version control for schema changes
   - Automated migration on deployment

5. **Rate Limiting & Security**
   - Implement rate limiting (express-rate-limit)
   - Add request validation (Zod already installed)
   - Improve authentication middleware

### 10.2 Medium Priority
1. **TypeScript Migration**
   - Migrate server to TypeScript
   - Share types between frontend and backend

2. **Monitoring & Observability**
   - Add application monitoring (Sentry, LogRocket)
   - Implement structured logging
   - Performance monitoring (New Relic, DataDog)

3. **Caching Layer**
   - Redis for session management
   - Cache frequently accessed data
   - Cache AI responses

4. **Email Template System**
   - HTML email templates
   - Template engine (Handlebars, Pug)
   - Preview before sending

5. **Frontend Improvements**
   - Global state management
   - Component library (shadcn/ui)
   - Loading states and skeletons
   - Error boundaries

### 10.3 Low Priority / Nice to Have
1. **Progressive Web App (PWA)**
   - Offline support
   - Mobile app-like experience

2. **Real-time Features**
   - WebSocket for live updates
   - Collaborative editing

3. **Analytics Dashboard**
   - User engagement metrics
   - Content performance tracking
   - Newsletter open rates

4. **Multi-language Support**
   - i18n implementation
   - Multiple language newsletters

5. **Advanced AI Features**
   - Voice input/output
   - Image generation
   - Video summarization

---

## 11. Support & Maintenance

### 11.1 Monitoring & Logs

#### Backend Logs
- **Location:** Render dashboard > Logs tab
- **Access:** Real-time streaming logs
- **Retention:** Last 7 days on free tier

#### GitHub Actions Logs
- **Location:** Repository > Actions tab
- **Access:** Historical run logs
- **Retention:** Permanent (90 days for artifacts)

#### Supabase Logs
- **Location:** Supabase dashboard > Logs section
- **Access:** Database queries, errors
- **Retention:** Based on plan

### 11.2 Common Troubleshooting Steps

#### Server Won't Start
1. Check environment variables in Render dashboard
2. Verify Supabase connection (run `npm run db:test`)
3. Check Render logs for startup errors
4. Verify Node.js version compatibility

#### RSS Sync Failing
1. Check GitHub Actions workflow logs
2. Verify DEEPSEEK_KEY is valid
3. Check individual feed URLs (some may be down)
4. Verify Supabase credentials
5. Check disk space in temp/ directory

#### Newsletter Not Sending
1. Verify email service credentials (SendGrid/Nodemailer)
2. Check subscriber list in database
3. Verify EMAIL_FROM and PASS environment variables
4. Check GitHub Actions workflow logs
5. Test email service with manual script

#### Frontend Not Connecting
1. Verify NEXT_PUBLIC_API_URL in .env.local
2. Check CORS settings in server.js
3. Verify backend is running (health check)
4. Check browser console for errors

#### Database Connection Issues
1. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
2. Check Supabase dashboard for service status
3. Verify IP allowlist (if configured)
4. Test connection with `npm run db:test`

#### Cold Start Issues (Render)
1. Keep-alive workflow should prevent this
2. Manually trigger workflow if needed
3. Consider upgrading to paid Render plan

### 11.3 Maintenance Schedule

#### Daily
- Monitor server uptime (automatic via keep-alive)
- Review error logs for critical issues

#### Weekly
- Verify RSS sync completed successfully (Monday 4 AM SGT)
- Verify newsletters sent successfully (Monday 7 AM SGT)
- Review Render and GitHub Actions logs
- Check database growth/storage

#### Monthly
- Review and update RSS feed list
- Clean up old articles (if storage is limited)
- Review and respond to user feedback
- Security updates for dependencies (`npm audit`)

#### Quarterly
- Dependency updates (`npm update`)
- Review and optimize database queries
- Performance testing and optimization
- Security audit

### 11.4 Key Contacts

#### Technical Support
- **Backend Issues:** Server administrator (Render support)
- **Frontend Issues:** Frontend developer team
- **Database Issues:** Supabase support
- **AI API Issues:** DeepSeek support, SerpAPI support

#### Service Providers
- **Hosting:** Render.com support
- **Database:** Supabase support portal
- **Email:** SendGrid/Nodemailer support
- **AI:** DeepSeek documentation/support

---

## 12. Appendices

### 12.1 Code Repository
- **Repository:** (Insert GitHub repository URL)
- **Branch Strategy:** 
  - `main` - Production branch
  - `develop` - Development branch
  - Feature branches: `feature/feature-name`

### 12.2 Documentation Links
- **Next.js Documentation:** https://nextjs.org/docs
- **Express.js Documentation:** https://expressjs.com/
- **Supabase Documentation:** https://supabase.com/docs
- **DeepSeek AI Documentation:** (Insert DeepSeek docs URL)
- **SerpAPI Documentation:** https://serpapi.com/docs

### 12.3 Additional Resources

#### Configuration Files
- [server/package.json](server/package.json) - Backend dependencies
- [client/client/package.json](client/client/package.json) - Frontend dependencies
- [server/render.yaml](server/render.yaml) - Render deployment config
- [server/config/rssConfig.js](server/config/rssConfig.js) - RSS feed sources

#### Key Scripts
- [server/scripts/run-rss-sync-supabase.js](server/scripts/run-rss-sync-supabase.js) - Manual RSS sync
- [server/scripts/send-all-newsletters.js](server/scripts/send-all-newsletters.js) - Manual newsletter send
- [server/scripts/test-supabase.js](server/scripts/test-supabase.js) - Database connection test

#### API Endpoints Reference

**Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

**Modules**
- `GET /api/modules` - List user's modules
- `POST /api/modules` - Create new module
- `GET /api/modules/:id` - Get module details
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

**Topics**
- `GET /api/modules/:moduleId/topics` - List module topics
- `POST /api/modules/:moduleId/topics` - Create new topic
- `PUT /api/modules/:moduleId/topics/:id` - Update topic
- `DELETE /api/modules/:moduleId/topics/:id` - Delete topic

**Chat**
- `POST /api/chat` - AI chat assistant

**Quiz**
- `POST /api/quiz/generate` - Generate quiz from content

**Articles/RSS**
- `GET /api/articles` - List curated articles
- `GET /api/articles/search` - Search articles

**Newsletters**
- `GET /api/newsletters` - List newsletters
- `POST /api/newsletters/generate` - Generate newsletter (staff only)
- `POST /api/newsletters/send` - Send newsletter (staff only)

**Newsletter Subscriptions**
- `GET /api/user/newsletter-subscriptions` - Get subscription status
- `POST /api/user/newsletter-subscriptions` - Subscribe
- `DELETE /api/user/newsletter-subscriptions` - Unsubscribe

**Feeds**
- `GET /api/feeds` - List user's custom feeds
- `POST /api/feeds` - Add custom feed
- `DELETE /api/feeds/:id` - Remove custom feed

**Admin** (Staff only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - Platform statistics

### 12.4 Dependency Versions Summary

#### Critical Backend Dependencies
```json
{
  "express": "^5.2.1",
  "sequelize": "^6.35.0",
  "@supabase/supabase-js": "^2.87.1",
  "@google/generative-ai": "^0.24.1",
  "axios": "^1.13.2",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0",
  "node-cron": "^4.2.1",
  "@sendgrid/mail": "^8.1.6"
}
```

#### Critical Frontend Dependencies
```json
{
  "next": "^16.0.7",
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

---

## 13. Quick Reference Commands

### Backend Commands
```bash
# Start server
npm start

# Run RSS sync
npm run rss

# Test database connection
npm run db:test

# Send newsletters manually
node scripts/send-all-newsletters.js

# Run RSS sync manually
node scripts/run-rss-sync-supabase.js
```

### Frontend Commands
```bash
# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### GitHub Actions Commands
```bash
# Trigger RSS sync manually
# Go to: Actions > Weekly RSS Sync > Run workflow

# Trigger newsletter send manually
# Go to: Actions > Send Weekly Newsletters > Run workflow

# View workflow logs
# Go to: Actions > Select workflow > Select run
```

---

## Document Control

**Version History:**
- v1.0 - February 3, 2026 - Initial handover report

**Document Owner:** Development Team

**Review Schedule:** Quarterly or upon major system changes

**Last Updated:** February 3, 2026

---

**End of Handover Report**
