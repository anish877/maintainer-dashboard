# 🔍 Simple Repository Analyzer

A user-friendly tool that allows developers to easily analyze their repositories for bugs and complaints from Reddit and Stack Overflow using AI-generated keywords.

## ✨ Features

### 🎯 **Simple Repository Selection**
- **One-click repository selection** from your GitHub repositories
- **Visual repository cards** with stars, language, and description
- **GitHub integration** with automatic authentication

### 🤖 **AI-Powered Keyword Generation**
- **Automatic keyword generation** based on repository name, description, and language
- **Smart keyword selection** for finding bugs, errors, and user complaints
- **Confidence scoring** to show AI reasoning and reliability

### 🔍 **Intelligent Scraping**
- **Reddit scraping** with AI-generated keywords
- **Stack Overflow scraping** with technology-specific tags
- **Real-time progress** with visual feedback
- **Anti-detection measures** to ensure reliable scraping

### 🐛 **Bug Detection & Analysis**
- **AI classification** of posts as bugs, complaints, or issues
- **Severity assessment** (Critical, High, Medium, Low)
- **Confidence scoring** for each detection
- **Technical area identification** (UI, API, Database, etc.)

### 📝 **Issue Generation & Posting**
- **AI-generated GitHub issues** from community posts
- **Editable issue templates** with user customization
- **Source attribution** with links to original posts
- **One-click GitHub posting** with proper formatting

## 🚀 How to Use

### 1. **Select Repository**
- Navigate to the Simple Analyzer
- Choose from your connected GitHub repositories
- View repository details and AI-generated keywords

### 2. **Analyze Repository**
- Click "Analyze Repository" to start the process
- AI generates relevant keywords automatically
- System scrapes Reddit and Stack Overflow
- Results are classified and filtered for relevance

### 3. **Review Results**
- View detected bugs and complaints
- See confidence scores and severity levels
- Filter by source (Reddit/Stack Overflow)
- Review technical details and user impact

### 4. **Create Issues**
- Click "Create Issue" on any relevant result
- Edit the AI-generated issue content
- Customize title, description, labels, and severity
- Post directly to GitHub with source links

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│   Simple Repository Analyzer                 │
├─────────────────────────────────────────────┤
│   Repository Selection                       │
│   ↓                                         │
│   AI Keyword Generation                      │
│   ↓                                         │
│   Reddit + Stack Overflow Scraping          │
│   ↓                                         │
│   AI Classification & Analysis               │
│   ↓                                         │
│   Issue Generation & GitHub Posting          │
└─────────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### **Frontend Components**
- **Repository Selection**: Visual cards with GitHub integration
- **Analysis Dashboard**: Real-time progress and results display
- **Issue Editor**: Modal for editing generated issues
- **Results List**: Filterable and sortable results

### **Backend Services**
- **AI Keyword Generator**: OpenAI-powered keyword generation with repository analysis
- **Scraper Services**: Reddit and Stack Overflow scrapers with smart targeting
- **AI Classifier**: Bug detection and severity assessment
- **GitHub Integration**: Issue creation and posting

### **API Endpoints**
- `/api/ai/generate-keywords` - Generate repository-specific keywords with GitHub API integration
- `/api/simple-scraper/analyze` - Run full analysis pipeline
- `/api/simple-scraper/generate-issue` - Create GitHub issue from result
- `/api/simple-scraper/post-issue` - Post issue to GitHub

### **Smart Keyword Generation**
- **Repository Analysis**: Fetches GitHub repository details (description, language, topics)
- **AI-Powered Identification**: Determines what the repository is (framework, library, tool, etc.)
- **Repository Name Inclusion**: Ensures repository name is always included in keywords
- **Technology-Specific Terms**: Generates keywords based on the technology stack
- **Comprehensive Coverage**: 25-35 keywords covering bugs, errors, complaints, and issues

## 🎨 User Experience

### **Simple & Intuitive**
- **One-click repository selection**
- **Automatic keyword generation**
- **Visual progress indicators**
- **Clear result presentation**

### **Powerful & Flexible**
- **AI-powered analysis**
- **Customizable issue generation**
- **Source attribution**
- **GitHub integration**

## 🔒 Security & Privacy

- **GitHub OAuth integration** for secure authentication
- **Rate limiting** to respect platform policies
- **Anti-detection measures** for reliable scraping
- **Data privacy** with no storage of personal information

## ⚙️ Environment Setup

### **Required Environment Variables**

```env
# OpenAI API Key (Required for AI keyword generation)
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL=your_database_url

# GitHub Integration
GITHUB_TOKEN=your_github_token

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### **Testing the Setup**

Run the test script to verify everything is working:

```bash
node test-simple-analyzer.js
```

This will test:
- ✅ Keyword generation with repository analysis
- ✅ AI-powered repository identification
- ✅ Repository name inclusion in keywords
- ✅ Analysis pipeline functionality

## 📊 Results & Analytics

### **Analysis Statistics**
- **Total posts analyzed**
- **Bugs detected**
- **User complaints identified**
- **Confidence scores**

### **Source Attribution**
- **Original post links**
- **Author information**
- **Community engagement metrics**
- **Timestamp data**

## 🚀 Getting Started

1. **Connect GitHub**: Authenticate with your GitHub account
2. **Select Repository**: Choose the repository to analyze
3. **Run Analysis**: Click "Analyze Repository" to start
4. **Review Results**: Browse detected issues and complaints
5. **Create Issues**: Generate and post GitHub issues

## 💡 Best Practices

### **Repository Selection**
- Choose repositories with active communities
- Select projects with clear documentation
- Consider repositories with known issues

### **Issue Management**
- Review AI-generated issues before posting
- Customize titles and descriptions for clarity
- Use appropriate labels and severity levels
- Include source attribution for transparency

### **Regular Analysis**
- Run analysis periodically for active repositories
- Monitor new issues and complaints
- Track community sentiment over time
- Update issue priorities based on findings

## 🔮 Future Enhancements

- **Automated scheduling** for regular analysis
- **Slack/Discord integration** for notifications
- **Advanced filtering** and search capabilities
- **Team collaboration** features
- **Analytics dashboard** for trend analysis

---

**Simple Repository Analyzer** - Making community feedback accessible and actionable for developers! 🚀
