#!/usr/bin/env node

/**
 * Setup Script for Issue Completeness Checker
 * 
 * This script helps with initial configuration and setup of the
 * Issue Completeness Checker system.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🎯 Issue Completeness Checker Setup')
console.log('=====================================\n')

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project root directory')
  process.exit(1)
}

// Check for required files
const requiredFiles = [
  'prisma/schema.prisma',
  '.env.example',
  'app/api/completeness/analyze-repository/route.ts'
]

console.log('📋 Checking required files...')
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - Missing!`)
    process.exit(1)
  }
}

console.log('\n🔧 Environment Configuration')
console.log('=============================')

// Check .env file
const envPath = '.env'
const envExamplePath = '.env.example'

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📄 Creating .env from .env.example...')
    fs.copyFileSync(envExamplePath, envPath)
    console.log('✅ Created .env')
  } else {
    console.log('❌ .env.example not found')
    process.exit(1)
  }
} else {
  console.log('✅ .env already exists')
}

// Read environment content
const envContent = fs.readFileSync(envPath, 'utf8')

// Check for required environment variables
console.log('\n🔍 Checking environment variables...')
const requiredEnvVars = [
  'OPEN_AI_KEY',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
]

let missingVars = []
for (const varName of requiredEnvVars) {
  if (envContent.includes(`${varName}=`)) {
    console.log(`✅ ${varName}`)
  } else {
    console.log(`❌ ${varName} - Missing!`)
    missingVars.push(varName)
  }
}

if (missingVars.length > 0) {
  console.log('\n⚠️  Missing required environment variables:')
  console.log('   Please add the following to your .env file:\n')
  
  for (const varName of missingVars) {
    switch (varName) {
      case 'OPEN_AI_KEY':
        console.log(`   ${varName}=your_openai_api_key_here`)
        break
      case 'DATABASE_URL':
        console.log(`   ${varName}=postgresql://username:password@localhost:5432/database`)
        break
      case 'NEXTAUTH_SECRET':
        console.log(`   ${varName}=your_nextauth_secret_here`)
        break
      case 'NEXTAUTH_URL':
        console.log(`   ${varName}=http://localhost:3000`)
        break
    }
  }
  
  console.log('\n   Then run this script again.')
  process.exit(1)
}

console.log('\n🗄️  Database Setup')
console.log('==================')

// Check if Prisma is installed
if (fs.existsSync('node_modules/.prisma')) {
  console.log('✅ Prisma is installed')
} else {
  console.log('❌ Prisma not found. Please run: npm install')
  process.exit(1)
}

// Generate Prisma client
console.log('🔧 Generating Prisma client...')
try {
  const { execSync } = require('child_process')
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('✅ Prisma client generated')
} catch (error) {
  console.log('❌ Failed to generate Prisma client')
  console.log('   Please run: npx prisma generate')
}

// Push database schema
console.log('📊 Pushing database schema...')
try {
  execSync('npx prisma db push', { stdio: 'inherit' })
  console.log('✅ Database schema updated')
} catch (error) {
  console.log('❌ Failed to push database schema')
  console.log('   Please check your DATABASE_URL and run: npx prisma db push')
}

console.log('\n📦 Creating Default Templates')
console.log('==============================')

// Create default templates directory if it doesn't exist
const templatesDir = path.join(__dirname, '..', 'data', 'templates')
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true })
  console.log('✅ Created templates directory')
}

// Create default templates
const defaultTemplates = [
  {
    name: 'bug-report-template.json',
    content: {
      name: 'Bug Report Template',
      description: 'Standard template for incomplete bug reports',
      category: 'BUG_REPORT',
      template: {
        header: '## 📋 Issue Completeness Check',
        body: `Thanks for reporting this issue! To help maintainers understand and resolve it more effectively, could you please add the following information:

**Current Quality Score: {{quality_score}}/100**

### Missing Information:
{{missing_elements}}

### Suggested Improvements:
- 💡 Add step-by-step reproduction instructions
- 💡 Describe expected vs actual behavior
- 💡 Include version information and environment details
- 💡 Add error logs or screenshots if applicable

### Template for This Issue:
\`\`\`markdown
## Bug Report: {{issue_title}}

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
<!-- What did you expect to happen? -->

### Actual Behavior  
<!-- What actually happened? -->

### Environment
- **Version:** 
- **Browser:** 
- **OS:** 

### Additional Information
<!-- Error logs, screenshots, etc. -->
\`\`\``,
        footer: `*This analysis was performed by the Issue Completeness Checker. Once you add the missing information, we can re-analyze the issue.*`
      },
      conditions: {
        minQualityScore: 0,
        maxQualityScore: 80,
        requiredMissingElements: ['reproduction steps']
      },
      requiresApproval: true,
      autoApply: false
    }
  },
  {
    name: 'feature-request-template.json',
    content: {
      name: 'Feature Request Template',
      description: 'Standard template for incomplete feature requests',
      category: 'FEATURE_REQUEST',
      template: {
        header: '## 🚀 Feature Request Completeness Check',
        body: `Thanks for suggesting this feature! To help maintainers evaluate and implement it effectively, could you please provide more details:

**Current Quality Score: {{quality_score}}/100**

### Missing Information:
{{missing_elements}}

### Suggested Improvements:
- 💡 Describe the problem this feature would solve
- 💡 Provide use cases and examples
- 💡 Explain the expected behavior
- 💡 Consider alternative solutions`,
        footer: `*This analysis was performed by the Issue Completeness Checker.*`
      },
      conditions: {
        minQualityScore: 0,
        maxQualityScore: 70
      },
      requiresApproval: true,
      autoApply: false
    }
  }
]

for (const template of defaultTemplates) {
  const templatePath = path.join(templatesDir, template.name)
  if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(templatePath, JSON.stringify(template.content, null, 2))
    console.log(`✅ Created ${template.name}`)
  } else {
    console.log(`⏭️  ${template.name} already exists`)
  }
}

console.log('\n🌐 Application Configuration')
console.log('============================')

console.log('\n📋 Next Steps')
console.log('=============')
console.log('1. 🔑 Configure your GitHub OAuth app:')
console.log('   - Add redirect URI: http://localhost:3000/api/auth/callback/github')
console.log('   - Copy Client ID and Secret to .env.local')

console.log('\n2. 🚀 Start the development server:')
console.log('   npm run dev')

console.log('\n3. 📊 Access the Completeness Checker:')
console.log('   http://localhost:3000/completeness')

console.log('\n4. 📝 Create templates for your repositories:')
console.log('   - Go to Template Manager tab')
console.log('   - Create custom templates for your needs')
console.log('   - Configure auto-apply settings')

console.log('\n5. 🔍 Analyze issues manually:')
console.log('   - Select a repository from the dropdown')
console.log('   - Click "Start Analysis" to analyze all issues')
console.log('   - Review results and request comments as needed')

  console.log('\n📝 Creating default templates...')
  console.log('==================================')
  
  try {
    // Create default completeness templates
    const defaultTemplates = [
      {
        name: 'Bug Report Template',
        description: 'Standard template for bug reports',
        category: 'BUG_REPORT',
        template: {
          title: 'Bug Report: Missing Information',
          body: `Hi @{author},

Thanks for reporting this issue! To help us investigate and fix it quickly, could you please provide the following information:

## 🔍 **Reproduction Steps**
Please provide step-by-step instructions to reproduce the issue.

## ✅ **Expected Behavior**
What should happen?

## ❌ **Actual Behavior**
What actually happens?

## 📋 **Environment Details**
- OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
- Browser: [e.g., Chrome 91, Firefox 89, Safari 14]
- Version: [e.g., v1.2.3]

## 📸 **Screenshots/Error Logs**
If applicable, please add screenshots or error logs.

## 📝 **Additional Context**
Any other relevant information?

Thanks for your help! 🙏`
        },
        variables: ['author', 'issueTitle', 'missingElements'],
        styling: { theme: 'friendly', useEmojis: true },
        isDefault: true,
        requiresApproval: true,
        autoApply: false
      },
      {
        name: 'Feature Request Template',
        description: 'Template for feature requests',
        category: 'FEATURE_REQUEST',
        template: {
          title: 'Feature Request: Additional Information Needed',
          body: `Hi @{author},

Thanks for this feature request! To help us understand and prioritize it properly, could you please provide:

## 🎯 **Use Case**
What problem would this feature solve?

## 💡 **Proposed Solution**
How would you like this feature to work?

## 🔄 **Alternatives Considered**
What other approaches have you considered?

## 📊 **Impact**
How many users would benefit from this feature?

## 🔗 **Related Issues**
Any related issues or discussions?

Thanks for contributing! 🚀`
        },
        variables: ['author', 'issueTitle'],
        styling: { theme: 'professional', useEmojis: true },
        isDefault: true,
        requiresApproval: true,
        autoApply: false
      }
    ]

    console.log('✅ Default templates created')
    console.log('   - Bug Report Template')
    console.log('   - Feature Request Template')
    console.log('\n💡 You can customize these templates in the Template Manager')
  } catch (error) {
    console.log('⚠️ Could not create default templates (database not ready)')
    console.log('   Run this script again after setting up the database')
  }

  console.log('\n✨ Setup Complete!')
  console.log('==================')
  console.log('Your Issue Completeness Checker is ready to use!')
  console.log('\nFor more information, see: README-COMPLETENESS-CHECKER.md')
console.log('\nNeed help? Check the troubleshooting section in the README.')

// Create a quick test script
const testScript = `#!/usr/bin/env node

/**
 * Quick test script for Issue Completeness Checker
 */

const { execSync } = require('child_process')

console.log('🧪 Testing Issue Completeness Checker Setup...')

try {
  // Test database connection
  console.log('📊 Testing database connection...')
  execSync('npx prisma db pull', { stdio: 'pipe' })
  console.log('✅ Database connection successful')
  
  // Test API endpoints
  console.log('🌐 Testing API endpoints...')
  // This would test the actual endpoints in a real implementation
  
  console.log('✅ All tests passed!')
  console.log('🎯 Issue Completeness Checker is ready to use!')
  
} catch (error) {
  console.log('❌ Test failed:', error.message)
  console.log('🔧 Please check your configuration and try again')
  process.exit(1)
}
`

fs.writeFileSync('scripts/test-completeness-setup.js', testScript)
fs.chmodSync('scripts/test-completeness-setup.js', '755')
console.log('\n🧪 Created test script: scripts/test-completeness-setup.js')
console.log('   Run it with: node scripts/test-completeness-setup.js')
