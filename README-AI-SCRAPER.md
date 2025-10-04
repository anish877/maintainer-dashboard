# 🚀 AI Auto-Scraper System

A production-ready AI-powered web scraping system that automatically discovers, classifies, and manages bug reports from Reddit, Twitter, and Stack Overflow without requiring expensive APIs.

## ✨ Features

### 🔍 **Multi-Platform Scraping**
- **Reddit**: JSON endpoint scraping + Playwright browser automation
- **Twitter/X**: GraphQL API interception with stealth techniques
- **Stack Overflow**: HTML scraping with keyword filtering

### 🤖 **AI-Powered Classification**
- **OpenAI GPT-4o-mini** for cost-efficient analysis
- **Automatic bug detection** with confidence scoring
- **Duplicate detection** using embeddings and cosine similarity
- **Severity classification** (Critical, High, Medium, Low, Info)
- **Technical area identification** (UI, API, Database, etc.)

### 📊 **Real-Time Dashboard**
- **Live monitoring** of scraped posts and AI classifications
- **Filtering and search** by source, status, and severity
- **Manual approval workflow** for quality control
- **Performance metrics** and system health monitoring

### 🔄 **GitHub Integration**
- **Automatic issue creation** from approved classifications
- **Rich issue formatting** with source attribution
- **Label management** and metadata preservation
- **Bulk synchronization** capabilities

### 🛡️ **Production Ready**
- **Anti-detection measures** (user agent rotation, delays, stealth mode)
- **Error handling and retry logic** with exponential backoff
- **Rate limiting** to respect platform policies
- **Health monitoring** with automated alerts
- **Cron job automation** with Vercel deployment

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│   Tier 1: Intelligent Scrapers              │
│   (No APIs - Pure Web Scraping)             │
├─────────────────────────────────────────────┤
│   • Reddit (JSON + Playwright)              │
│   • Twitter (GraphQL Interception)          │
│   • Stack Overflow (HTML Parsing)           │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│   Tier 2: AI Processing Engine              │
│   (OpenAI GPT-4o-mini)                      │
├─────────────────────────────────────────────┤
│   • Classification & Analysis               │
│   • Duplicate Detection (Embeddings)        │
│   • Confidence Scoring                      │
│   • Technical Detail Extraction             │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│   Tier 3: Dashboard + GitHub Integration    │
│   (PostgreSQL + GitHub API)                 │
├─────────────────────────────────────────────┤
│   • Real-time Dashboard                     │
│   • Approval Workflow                       │
│   • GitHub Issue Creation                   │
│   • Health Monitoring                       │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd maintainer-dashboard

# Install dependencies
npm install

# Install additional scraping dependencies
npm install playwright puppeteer-core cheerio axios user-agents openai @octokit/rest
```

### 2. **Environment Setup**

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/maintainer_dashboard"

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# GitHub
GITHUB_TOKEN="ghp_your-github-token"

# Cron Security
CRON_SECRET="your-secure-cron-secret"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. **Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. **Development Server**

```bash
npm run dev
```

Visit `http://localhost:3000/scraper-dashboard` to access the AI Auto-Scraper dashboard.

## 📊 Usage

### **Manual Scraping**

```bash
# Trigger individual scrapers
curl -X POST http://localhost:3000/api/cron/scrape \
  -H "Content-Type: application/json" \
  -d '{"source": "reddit"}'

# Process AI classifications
curl -X POST http://localhost:3000/api/cron/scrape \
  -H "Content-Type: application/json" \
  -d '{"source": "ai"}'
```

### **Automated Scraping**

The system runs automatically every 6 hours via Vercel cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### **GitHub Integration**

```bash
# Sync approved issues to GitHub
curl -X POST http://localhost:3000/api/github/sync \
  -H "Content-Type: application/json" \
  -d '{"owner": "your-org", "repo": "your-repo", "limit": 10}'
```

## 🔧 Configuration

### **Scraper Configuration**

```typescript
// Reddit Configuration
const DEFAULT_REDDIT_CONFIG = {
  subreddits: ['bugs', 'programming', 'webdev', 'javascript', 'reactjs', 'nextjs'],
  searchTerms: ['error', 'not working', 'crash', 'broken', 'issue', 'bug', 'problem'],
  maxPostsPerSubreddit: 50
};

// Twitter Configuration
const DEFAULT_TWITTER_CONFIG = {
  searchQueries: [
    'error javascript react',
    'bug nextjs',
    'not working webdev',
    'crash programming',
    'help coding'
  ],
  maxTweetsPerQuery: 20
};

// Stack Overflow Configuration
const DEFAULT_STACKOVERFLOW_CONFIG = {
  tags: ['javascript', 'reactjs', 'nextjs', 'node.js', 'typescript'],
  keywords: ['error', 'bug', 'crash', 'not working', 'broken', 'issue', 'problem'],
  maxQuestionsPerTag: 25
};
```

### **AI Classification Settings**

```typescript
// OpenAI Model Configuration
const AI_CONFIG = {
  model: 'gpt-4o-mini',        // Cost-efficient model
  temperature: 0.3,            // Consistent results
  maxTokens: 1024,             // Reasonable response size
  embeddingModel: 'text-embedding-3-small'  // For duplicate detection
};

// Classification Thresholds
const CLASSIFICATION_THRESHOLDS = {
  duplicateSimilarity: 0.85,   // 85% similarity for duplicates
  minConfidence: 0.7,          // Minimum confidence for approval
  maxRetries: 3                // Retry failed classifications
};
```

## 📈 Monitoring & Analytics

### **Health Monitoring**

Access system health at `/api/monitoring/health`:

```json
{
  "overall": "healthy",
  "scrapers": [
    {
      "source": "reddit",
      "status": "healthy",
      "successRate": 95.2,
      "avgDuration": 12450,
      "lastRun": "2024-01-15T10:30:00Z"
    }
  ],
  "ai": {
    "status": "healthy",
    "avgConfidence": 0.87,
    "processingRate": 15.2
  },
  "database": {
    "totalPosts": 1247,
    "processedPosts": 1189,
    "pendingPosts": 58
  }
}
```

### **Performance Metrics**

- **Scraping Success Rate**: >90% target
- **AI Classification Accuracy**: >85% target
- **Processing Speed**: <3 seconds per post
- **Duplicate Detection**: <5% false positives

## 💰 Cost Analysis

### **Monthly Operating Costs**

| Service | Usage | Cost |
|---------|-------|------|
| **OpenAI GPT-4o-mini** | 15M tokens/month | ~$10-15 |
| **Embeddings** | 1M tokens/month | ~$0.02 |
| **Vercel Pro** | Hosting + Functions | $20 |
| **Neon Postgres** | Database | $19 |
| **Total** | | **~$50/month** |

### **vs Traditional API Costs**

| Platform | API Cost | Our Solution | Savings |
|----------|----------|--------------|---------|
| Reddit API | $5,000/month | Free scraping | 100x cheaper |
| Twitter API | $5,000/month | Free scraping | 100x cheaper |
| Stack Overflow API | Limited (300/day) | Unlimited scraping | 100% coverage |

**Total Savings: $10,000+ per month**

## 🛡️ Anti-Detection Strategies

### **Stealth Measures**

```typescript
// User Agent Rotation
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
];

// Request Delays
await randomDelay(1000, 3000);

// Viewport Randomization
await context.setViewportSize({
  width: 1920 + Math.floor(Math.random() * 100),
  height: 1080 + Math.floor(Math.random() * 100)
});

// Headers Spoofing
await context.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive'
});
```

### **Rate Limiting**

- **Reddit**: 2-second delays between subreddits
- **Twitter**: 5-second delays between queries
- **Stack Overflow**: 3-second delays between tags
- **AI Processing**: 1-second delays between requests

## 🔧 Troubleshooting

### **Common Issues**

1. **Scraper Failures**
   ```bash
   # Check scraper health
   curl http://localhost:3000/api/monitoring/health
   
   # View recent runs
   # Check database: ScraperRun table
   ```

2. **AI Classification Errors**
   ```bash
   # Check OpenAI API key
   # Verify model availability
   # Check rate limits
   ```

3. **Database Connection Issues**
   ```bash
   # Test connection
   npx prisma db pull
   
   # Reset if needed
   npx prisma db push --force-reset
   ```

### **Performance Optimization**

1. **Increase Concurrency**
   ```typescript
   // Process multiple posts in parallel
   const batchSize = 5;
   await Promise.all(batch.map(post => classifyPost(post.id)));
   ```

2. **Database Indexing**
   ```sql
   -- Add indexes for better performance
   CREATE INDEX idx_scraped_posts_source_processed ON ScrapedPost(source, processed);
   CREATE INDEX idx_processed_issues_status ON ProcessedIssue(status);
   ```

3. **Caching**
   ```typescript
   // Cache embeddings for duplicate detection
   const embedding = await redis.get(`embedding:${postId}`);
   ```

## 🚀 Deployment

### **Vercel Deployment**

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL
   vercel env add OPENAI_API_KEY
   vercel env add GITHUB_TOKEN
   vercel env add CRON_SECRET
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### **Database Migration**

```bash
# Generate migration
npx prisma migrate dev --name init

# Deploy to production
npx prisma migrate deploy
```

## 📚 API Reference

### **Scraping Endpoints**

```typescript
// Manual scraper trigger
POST /api/cron/scrape
{
  "source": "reddit" | "twitter" | "stackoverflow" | "ai"
}

// Get scraped posts
GET /api/scraper/posts?filter=all&source=reddit&limit=50

// Update issue status
PATCH /api/scraper/issues/{id}
{
  "status": "approved" | "rejected" | "duplicate"
}
```

### **GitHub Integration**

```typescript
// Sync to GitHub
POST /api/github/sync
{
  "owner": "organization",
  "repo": "repository",
  "limit": 10
}
```

### **Monitoring**

```typescript
// System health
GET /api/monitoring/health

// Statistics
GET /api/scraper/stats
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the AI classification models
- **Playwright** for browser automation capabilities
- **Prisma** for database management
- **Vercel** for serverless deployment platform

---

**Built with ❤️ for the developer community**

*Save 10+ hours per week on manual bug monitoring while reducing costs by 100x compared to traditional API solutions.*
