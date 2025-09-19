# Post-Op Radar MVP

A lean, SMS-first platform for small surgical practices to reduce post-op call volume and catch complications early through automated daily check-ins and intelligent triage.

## 🎯 Key Features

- **SMS-first patient monitoring** - No app downloads required
- **Automated daily check-ins** for 0-14 days post-op
- **Intelligent triage** with Red/Yellow/Green risk levels
- **Single-screen staff dashboard** for efficient patient management
- **Template-based responses** with quick staff actions
- **HIPAA-ready infrastructure** with audit logging
- **CSV patient upload** for easy onboarding
- **Voice note capture** (optional) for detailed patient feedback

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript, Tailwind CSS
- **Backend**: Firebase Functions (Node.js)
- **Database**: Cloud Firestore
- **SMS/Voice**: Twilio Programmable Messaging
- **Authentication**: Firebase Auth (email/OTP)
- **File Storage**: Cloud Storage (for voice recordings)

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Firebase CLI: `npm install -g firebase-tools`
- Twilio account with programmable messaging
- Google Cloud project with Firebase enabled

### 2. Setup Environment

1. Clone and install dependencies:
```bash
git clone <repository>
cd post-op-radar
npm install
cd functions && npm install
```

2. Configure Firebase:
```bash
firebase login
firebase init
# Select: Functions, Firestore, Hosting, Storage
```

3. Set environment variables:
```bash
# Copy and configure
cp .env.local.example .env.local

# Set Firebase config in .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# Set Twilio config for functions
firebase functions:config:set twilio.account_sid="YOUR_SID"
firebase functions:config:set twilio.auth_token="YOUR_TOKEN"
firebase functions:config:set twilio.phone_number="YOUR_PHONE"
firebase functions:config:set twilio.webhook_secret="YOUR_SECRET"
```

### 3. Deploy

```bash
# Build and deploy everything
npm run build
npm run deploy

# Or deploy individually
npm run functions:deploy  # Functions only
firebase deploy --only hosting  # Frontend only
```

### 4. Configure Twilio Webhook

In your Twilio console, set the webhook URL to:
`https://YOUR_PROJECT.cloudfunctions.net/twilioSMSWebhook`

## 📱 Usage

### Staff Dashboard
1. Navigate to the deployed app URL
2. View Red/Yellow/Green patient triage cards
3. Click patients to review details and take actions
4. Send template responses, request photos, or escalate

### Patient Onboarding
1. Go to `/onboard` to upload patient CSV
2. Configure procedure type and check-in schedule
3. Preview and launch monitoring program

### Patient Experience
- Receive daily SMS at configured time
- Respond with pain level, bleeding status, and concerns
- Get immediate auto-reply with guidance
- Option to record voice notes via secure link

## 🔒 HIPAA Compliance

- BAA required with Google Cloud and Twilio
- Encrypted data at rest and in transit
- Minimal PHI in SMS (first name + last initial only)
- Audit logging for all staff actions
- Secure voice note storage with access controls

## 📊 Analytics & Reporting

- Real-time dashboard metrics (response rates, triage distribution)
- CSV export for pilot analysis
- Pilot summary reports with ROI metrics
- Staff action tracking and audit trails

## 🛠️ Development

```bash
# Local development
npm run dev              # Frontend (localhost:3000)
npm run functions:dev    # Functions emulator

# Type checking
npm run type-check

# Testing
npm test                 # Run tests when implemented
```

## 📄 File Structure

```
post-op-radar/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Next.js pages
│   ├── lib/            # Utilities, Firebase config
│   └── types/          # TypeScript definitions
├── functions/src/      # Firebase Functions
│   ├── webhooks/       # Twilio webhook handlers
│   ├── schedulers/     # Daily check-in cron jobs
│   ├── api/           # REST API endpoints
│   └── services/      # External service integrations
└── public/            # Static assets
```

## 🎯 Success Metrics (30-day pilot)

- **30-50% reduction** in inbound post-op calls
- **≥80% daily response rate** from patients
- **≥2 early escalations** caught before ER visits
- **≥8/10 staff satisfaction** ("saves time")

## 💰 Pricing

- **Pilot**: Free for 30-45 days
- **Production**: $500/month per practice
- **SMS costs**: ~$0.05 per patient per day (via Twilio)

## 🚨 Limitations & Future Enhancements

### MVP Limitations
- Single practice support (no multi-tenant)
- Basic rules-based triage (no ML/AI)
- No EHR integration
- Limited voice transcription
- Manual photo review (no computer vision)

### Planned v2 Features
- Multi-practice analytics and benchmarking
- NLP-enhanced triage with medical language models
- Computer vision for wound assessment
- EHR integration (HL7/FHIR)
- Wearables integration (Apple Health, Oura, WHOOP)
- Advanced reporting and outcome predictions

## 📞 Support

For technical issues during pilot:
- Create GitHub issue with "bug" label
- Include error messages and reproduction steps
- Response within 24 hours during business days

For feature requests:
- Create GitHub issue with "enhancement" label
- Provide detailed use case and expected behavior

## 📜 License

Proprietary - All rights reserved. Contact for licensing inquiries.