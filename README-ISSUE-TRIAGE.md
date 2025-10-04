# 🤖 Intelligent Issue Triage & Auto-Labeling System

An AI-powered system for automatically analyzing, categorizing, and labeling GitHub issues to streamline your development workflow.

## 🎯 Features

### Core Capabilities
- **AI-Powered Issue Classification**: Automatically determines issue type (bug, feature, question, documentation, enhancement, task)
- **Priority Assessment**: Analyzes content to assign priority levels (critical, high, medium, low)
- **Component Identification**: Identifies affected components/modules (frontend, backend, database, etc.)
- **Difficulty Estimation**: Detects "good first issues" and estimates complexity levels
- **Auto-Labeling**: Applies appropriate labels based on AI analysis
- **Team Assignment Suggestions**: Recommends assignees based on expertise mapping
- **Issue Clustering**: Groups related issues by similarity using embeddings

### AI Integration
- **OpenAI GPT Integration**: Uses GPT-3.5/GPT-4 for sophisticated content analysis
- **Confidence Scoring**: Provides confidence levels for all predictions
- **Reasoning Explanations**: Explains why each classification was made
- **Embedding-Based Similarity**: Finds related issues using semantic similarity

### Automation
- **GitHub Actions Integration**: Automated triage on issue creation/updates
- **Manual Triggers**: On-demand triage for specific issues
- **Batch Processing**: Triage multiple issues at once
- **Function Call Ready**: Designed for AI assistant integration

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
npm install @octokit/rest openai

# Or with pnpm
pnpm add @octokit/rest openai
```

### 2. Environment Setup

The system uses GitHub OAuth through NextAuth, so no manual GitHub tokens are required! Just set up your OpenAI API key:

```env
# OpenAI API Key (required for AI analysis)
OPEN_AI_KEY=your_openai_api_key

# GitHub OAuth (already configured in NextAuth)
GITHUB_ID=your_github_oauth_app_id
GITHUB_SECRET=your_github_oauth_app_secret

# NextAuth configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Basic Usage

#### **With NextAuth Session (Recommended)**

```typescript
import { createAIEnhancedTriageFromSession } from './lib/ai-enhanced-triage';

// This automatically uses the user's GitHub OAuth session
const triageSystem = await createAIEnhancedTriageFromSession('owner', 'repo');

// Triage a single issue
const analysis = await triageSystem.triageIssueWithAI(123);

// Batch triage multiple issues
const results = await triageSystem.aiTriageIssuesFunction([123, 124, 125]);
```

#### **Via API Route**

```typescript
// POST /api/triage/issues
const response = await fetch('/api/triage/issues', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'microsoft',
    repo: 'vscode',
    issueNumbers: [123, 124, 125],
    includeComments: true
  })
});

const result = await response.json();
```

#### **With React Component**

```tsx
import { IssueTriagePanel } from '@/components/issue-triage-panel';

export default function TriagePage() {
  return <IssueTriagePanel />;
}
```

## 📋 Configuration

### GitHub Repository Setup

**No manual setup required!** The system automatically uses your GitHub OAuth session with the following scopes:
- `read:user` - Read user profile information
- `user:email` - Read user email addresses  
- `repo` - Full access to repositories (for private repos)

1. **Configure Repository Labels** (optional - labels are created automatically):
   ```bash
   # Create labels in your repository
   gh label create "priority: critical" --color "d73a49"
   gh label create "priority: high" --color "ff8c00"
   gh label create "priority: medium" --color "0075ca"
   gh label create "priority: low" --color "7057ff"
   gh label create "good first issue" --color "7057ff"
   gh label create "area: frontend" --color "c5def5"
   gh label create "area: backend" --color "c5def5"
   ```

### GitHub Actions Setup

1. **Add Secrets to Repository**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add `GITHUB_TOKEN` (usually auto-provided)
   - Add `OPEN_AI_KEY` with your OpenAI API key

2. **Workflow Configuration**:
   The workflow file is already created at `.github/workflows/ai-issue-triage.yml`
   - Automatically triggers on new issues
   - Can be manually triggered via GitHub Actions UI
   - Respects rate limits and provides detailed logging

### Team Expertise Mapping

Configure your team's expertise in the config file:

```yaml
team:
  - username: "alice"
    components: ["frontend", "ui"]
    expertise: ["react", "typescript", "css"]
    availability: "available"
    
  - username: "bob"
    components: ["backend", "api"]
    expertise: ["nodejs", "python", "database"]
    availability: "available"
```

## 🔧 Advanced Usage

### Custom AI Models

You can customize the AI analysis by modifying the prompts in `ai-enhanced-triage.ts`:

```typescript
// Customize the analysis prompt
const prompt = `
Analyze this GitHub issue with focus on:
- Security implications
- Performance impact
- User experience considerations
- Technical debt assessment

Issue: "${content}"
...
`;
```

### Function Call Integration

The system is designed for easy integration with AI assistants:

```typescript
// This is how an AI assistant would call the triage function
const result = await triageSystem.aiTriageIssuesFunction([123, 124, 125]);

// Response includes structured data for the AI assistant
console.log(result.summary);
// {
//   totalIssues: 3,
//   successfulTriages: 3,
//   averageConfidence: 87,
//   commonLabels: { "bug": 2, "enhancement": 1 },
//   suggestedAssignees: ["alice", "bob"]
// }
```

### Batch Processing

For large repositories, use batch processing:

```typescript
// Process issues in batches of 10
const issueNumbers = [123, 124, 125, 126, 127, 128, 129, 130, 131, 132];
const results = await triageSystem.triageMultipleIssuesWithAI(issueNumbers);
```

## 📊 Analysis Results

Each issue analysis includes:

```typescript
interface EnhancedIssueAnalysis {
  type: IssueType;              // bug, feature, question, etc.
  priority: Priority;           // critical, high, medium, low
  component: string;            // frontend, backend, database, etc.
  difficulty: Difficulty;       // good first issue, intermediate, advanced, expert
  confidence: number;           // Overall confidence (0-1)
  aiConfidence: {               // Individual confidence scores
    type: number;
    priority: number;
    component: number;
    difficulty: number;
  };
  aiReasoning: {                // AI explanations
    type: string;
    priority: string;
    component: string;
    difficulty: string;
  };
  suggestedLabels: string[];    // Labels to apply
  suggestedAssignees: string[]; // Recommended assignees
  similarIssues?: {             // Related issues
    issueNumber: number;
    similarity: number;
    reason: string;
  }[];
}
```

## 🎛️ Customization

### Custom Label Mappings

Modify the label mappings in your configuration:

```typescript
const customLabelMappings = {
  type: {
    [IssueType.BUG]: '🐛 bug',
    [IssueType.FEATURE]: '✨ feature',
    [IssueType.QUESTION]: '❓ question',
    // ... custom labels
  },
  priority: {
    [Priority.CRITICAL]: '🚨 critical',
    [Priority.HIGH]: '🔥 high',
    // ... custom priority labels
  }
};
```

### Custom Component Detection

Add project-specific components:

```typescript
const componentPatterns = {
  'authentication': ['auth', 'login', 'signin', 'jwt', 'token'],
  'payment-system': ['payment', 'billing', 'stripe', 'paypal'],
  'mobile-app': ['mobile', 'ios', 'android', 'react-native'],
  // Add your custom components
};
```

## 🔍 Monitoring & Debugging

### Logs and Monitoring

The system provides detailed logging:

```bash
# Check GitHub Actions logs
gh run list --workflow="ai-issue-triage.yml"

# View specific run logs
gh run view <run-id> --log
```

### Confidence Thresholds

Adjust confidence thresholds based on your needs:

```typescript
const config = {
  confidenceThreshold: 0.7, // Only apply labels if confidence > 70%
  // ... other config
};
```

### Manual Override

If AI classification is incorrect, you can:

1. **Remove incorrect labels** manually
2. **Adjust the confidence threshold** to be more conservative
3. **Customize the AI prompts** for better accuracy
4. **Provide feedback** to improve future classifications

## 🤝 Contributing

### Adding New Features

1. **Extend the analysis types**:
   ```typescript
   enum AdditionalAnalysis {
     SECURITY_IMPACT = 'security_impact',
     PERFORMANCE_IMPACT = 'performance_impact',
     // Add new analysis types
   }
   ```

2. **Add new AI prompts**:
   ```typescript
   private async analyzeSecurityImpact(content: string) {
     // Custom security analysis logic
   }
   ```

3. **Update the configuration**:
   ```yaml
   features:
     security_analysis: true
     performance_analysis: true
   ```

### Testing

```bash
# Run the example
npm run example:issue-triage

# Test with specific issues
node scripts/ai-triage.js "123,124,125"
```

## 📈 Performance & Limits

### Rate Limits

- **GitHub API**: 5000 requests/hour for authenticated users
- **OpenAI API**: Depends on your plan and model
- **Built-in delays**: 2-second delays between requests to respect limits

### Optimization Tips

1. **Batch processing**: Process multiple issues together
2. **Confidence filtering**: Skip low-confidence analyses
3. **Label caching**: Cache existing labels to avoid API calls
4. **Selective triage**: Only triage new issues or those without labels

## 🆘 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `GITHUB_TOKEN` and `OPEN_AI_KEY` are set
   - Check repository permissions

2. **"Failed to apply labels"**
   - Verify GitHub token has write permissions
   - Check if labels exist in the repository
   - Ensure issue isn't already closed

3. **"Low confidence analysis"**
   - Adjust confidence threshold
   - Improve issue descriptions
   - Customize AI prompts for your domain

4. **"Rate limit exceeded"**
   - Increase delays between requests
   - Use batch processing
   - Implement exponential backoff

### Getting Help

- Check the GitHub Actions logs for detailed error messages
- Review the example usage in `examples/issue-triage-example.ts`
- Test with a single issue first before batch processing

## 🔮 Future Enhancements

### Planned Features

- **Multi-language support**: Support for issues in different languages
- **Custom AI models**: Fine-tuned models for specific domains
- **Integration with project management**: Jira, Linear, Asana integration
- **Advanced clustering**: Topic modeling and trend analysis
- **Performance metrics**: Triage accuracy and time-to-resolution tracking

### AI Assistant Integration

The system is designed for seamless integration with AI assistants:

```typescript
// Future AI assistant integration
const assistant = new AIAssistant({
  functions: [
    {
      name: 'triageIssues',
      description: 'Analyze and categorize GitHub issues',
      parameters: { issueNumbers: 'array' },
      handler: triageSystem.aiTriageIssuesFunction
    }
  ]
});
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- GitHub API for issue management
- OpenAI for AI analysis capabilities
- The open-source community for inspiration and feedback

---

**Ready to streamline your issue triage?** Start by setting up the configuration and running your first automated triage! 🚀
