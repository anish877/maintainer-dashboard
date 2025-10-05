# Issue Lifecycle Tracker

## Overview

The Issue Lifecycle Tracker is an AI-powered feature that monitors and analyzes the complete journey of GitHub issues from creation to resolution. It provides insights into issue efficiency, identifies bottlenecks, predicts resolution times, and helps maintainers optimize their issue management processes.

## Features

### 🔄 Issue Journey Tracking
- **Time in Each Status**: Track how long issues spend in different states (Open, In Progress, In Review, In Testing)
- **Status History**: Complete timeline of status changes with timestamps
- **Activity Monitoring**: Track all lifecycle events including comments, labels, assignments, and milestones

### 🤖 AI-Powered Predictions
- **Resolution Time Prediction**: AI predicts how long each issue will take to resolve based on similar historical issues
- **Confidence Scoring**: Provides confidence levels for predictions (0-100%)
- **Similar Issue Analysis**: Finds and compares with similar resolved issues for better predictions

### 🚨 Bottleneck Identification
- **Stuck Issue Detection**: Automatically identifies issues that appear to be stuck in any status
- **Bottleneck Analysis**: AI analyzes common patterns causing delays
- **Efficiency Scoring**: Rates overall issue efficiency (0-100 scale)

### 📊 Efficiency Reports
- **Repository Summary**: Overview of all issues with key metrics
- **Trend Analysis**: Track whether efficiency is improving, declining, or stable
- **Actionable Recommendations**: AI-generated suggestions for improving issue management

## Database Schema

### New Models Added

#### `IssueLifecycle`
```prisma
model IssueLifecycle {
  id                    String                @id @default(cuid())
  issueId               String                @unique
  issue                 Issue                 @relation(fields: [issueId], references: [id], onDelete: Cascade)
  
  // Status tracking
  currentStatus         LifecycleStatus       @default(OPEN)
  statusHistory         Json?                 // Array of status changes with timestamps
  
  // Time tracking
  timeInOpen            Int                   @default(0) // minutes
  timeInProgress        Int                   @default(0) // minutes
  timeInReview          Int                   @default(0) // minutes
  timeInTesting         Int                   @default(0) // minutes
  totalResolutionTime   Int?                  // minutes from open to closed
  
  // AI Predictions
  predictedResolutionTime Int?                // predicted minutes to resolution
  predictionConfidence    Float?              // 0-1 confidence in prediction
  predictionFactors       Json?               // factors used in prediction
  
  // Bottleneck analysis
  bottleneckAnalysis      Json?               // AI analysis of bottlenecks
  stuckIssues            Json?                // issues that appear stuck
  
  // Efficiency metrics
  efficiencyScore        Float?               // overall efficiency score
  lastActivityAt         DateTime?
  isStuck                Boolean              @default(false)
  stuckReason            String?
  stuckSince             DateTime?
  
  // Lifecycle events
  events                 LifecycleEvent[]
  
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt
}
```

#### `LifecycleEvent`
```prisma
model LifecycleEvent {
  id              String          @id @default(cuid())
  lifecycleId     String
  lifecycle       IssueLifecycle  @relation(fields: [lifecycleId], references: [id], onDelete: Cascade)
  
  eventType       LifecycleEventType
  fromStatus      LifecycleStatus?
  toStatus        LifecycleStatus?
  timestamp       DateTime        @default(now())
  
  // Additional context
  triggeredBy     String?         // user, system, webhook, etc.
  metadata        Json?           // additional event data
}
```

#### New Enums
```prisma
enum LifecycleStatus {
  OPEN
  IN_PROGRESS
  IN_REVIEW
  IN_TESTING
  READY_TO_MERGE
  CLOSED
  STUCK
}

enum LifecycleEventType {
  STATUS_CHANGE
  ASSIGNMENT_CHANGE
  COMMENT_ADDED
  LABEL_ADDED
  LABEL_REMOVED
  MILESTONE_CHANGED
  PR_CREATED
  PR_MERGED
  REVIEW_REQUESTED
  REVIEW_COMPLETED
  TESTING_STARTED
  TESTING_COMPLETED
  STUCK_DETECTED
  UNSTUCK_DETECTED
  EFFICIENCY_ANALYSIS
  PREDICTION_UPDATE
}
```

## API Endpoints

### `/api/lifecycle/analyze` (POST)

Analyzes all issues in a repository for lifecycle tracking.

**Request Body:**
```json
{
  "owner": "username",
  "repo": "repository-name"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "issueNumber": 123,
      "title": "Issue Title",
      "currentStatus": "IN_PROGRESS",
      "timeInEachStatus": {
        "open": 1440,
        "inProgress": 720,
        "inReview": 0,
        "inTesting": 0
      },
      "totalTimeOpen": 2160,
      "predictedResolutionTime": 2880,
      "predictionConfidence": 0.85,
      "isStuck": false,
      "stuckReason": null,
      "efficiencyScore": 75,
      "bottleneckAnalysis": "Issue is progressing normally...",
      "suggestedActions": [
        "Continue current progress",
        "Consider breaking into smaller tasks"
      ],
      "similarIssues": [
        {
          "issueNumber": 120,
          "title": "Similar Issue",
          "resolutionTime": 2880,
          "similarity": 85
        }
      ]
    }
  ],
  "summary": {
    "totalIssues": 25,
    "averageResolutionTime": 4320,
    "stuckIssues": 3,
    "efficiencyTrend": "improving",
    "bottleneckInsights": [
      "3 issues are currently stuck",
      "Average resolution time: 72 hours"
    ],
    "recommendations": [
      "Review stuck issues and provide additional resources"
    ]
  }
}
```

### `/api/lifecycle/update` (POST)

Updates issue lifecycle status or applies actions.

**Request Body:**
```json
{
  "owner": "username",
  "repo": "repository-name",
  "issueNumber": 123,
  "action": "mark_stuck|update_status|add_comment|apply_labels",
  "metadata": {
    "reason": "Issue appears stuck in review",
    "suggestedActions": ["Request additional reviewer", "Break into smaller tasks"]
  }
}
```

## Usage

### 1. Access the Feature

Navigate to any repository dashboard and click the **"📊 Lifecycle Tracker"** button.

### 2. Run Analysis

Click **"🚀 Analyze Lifecycle"** to start the AI analysis of all issues in the repository.

### 3. Review Results

The analysis will show:
- **Summary Dashboard**: Overall repository metrics and insights
- **Individual Issue Analysis**: Detailed breakdown for each issue
- **Stuck Issues**: Issues that need immediate attention
- **Efficiency Scores**: Performance ratings for each issue

### 4. Take Action

For each issue, you can:
- **Mark as Stuck**: Flag issues that appear to be stuck
- **Add Analysis Comment**: Post AI-generated insights directly to GitHub
- **Apply Labels**: Automatically apply relevant labels based on analysis

## AI Analysis Process

### 1. Data Collection
- Fetches all issues from the repository
- Retrieves issue activities, comments, and labels
- Analyzes historical resolution patterns

### 2. Similarity Analysis
- Compares current issues with historically resolved issues
- Uses issue type, priority, difficulty, and labels for similarity matching
- Calculates similarity scores based on multiple factors

### 3. AI Prediction
- Uses GPT-4 to analyze issue lifecycle patterns
- Considers time spent in each status
- Provides resolution time predictions with confidence scores

### 4. Bottleneck Detection
- Identifies common patterns causing delays
- Analyzes efficiency across different issue types
- Provides specific recommendations for improvement

## Configuration

### Environment Variables
- `OPEN_AI_KEY`: Required for AI analysis functionality

### Database Migration
Run the following to apply the new schema:
```bash
npx prisma db push
```

## Integration with Existing Flows

The Issue Lifecycle Tracker integrates seamlessly with existing repository management features:

- **Triage**: Lifecycle analysis complements issue triage by providing ongoing status tracking
- **Duplicate Detection**: Similar issue analysis helps with lifecycle predictions
- **Spam Detection**: Efficiency analysis can identify patterns in low-quality issues

## Benefits

### For Maintainers
- **Visibility**: Complete view of issue progression and bottlenecks
- **Efficiency**: Identify and resolve stuck issues quickly
- **Planning**: Predict resolution times for better project planning
- **Optimization**: Data-driven insights for improving processes

### For Contributors
- **Transparency**: Clear visibility into issue status and expected resolution
- **Guidance**: AI-generated suggestions for issue resolution
- **Feedback**: Automated analysis comments provide helpful insights

### For Projects
- **Quality**: Improved issue management leads to better software quality
- **Velocity**: Faster issue resolution through bottleneck identification
- **Metrics**: Comprehensive data for project health monitoring

## Future Enhancements

- **Automated Status Updates**: Integration with GitHub webhooks for real-time updates
- **Team Performance Analytics**: Individual and team efficiency metrics
- **Custom Workflows**: Support for custom issue lifecycle stages
- **Integration APIs**: Webhook endpoints for external tool integration
- **Advanced Predictions**: Machine learning models for more accurate predictions

## Troubleshooting

### Common Issues

1. **Analysis Fails**: Check OpenAI API key configuration
2. **No Issues Found**: Ensure repository has issues in the database
3. **Permission Errors**: Verify GitHub token has repository access
4. **Slow Analysis**: Large repositories may take several minutes to analyze

### Support

For issues or questions regarding the Issue Lifecycle Tracker, please refer to the main project documentation or create an issue in the repository.

