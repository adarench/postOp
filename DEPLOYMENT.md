# Deployment Guide - Post-Op Radar MVP

## 🎯 Production Deployment Checklist

### Pre-Deployment

- [ ] **Google Cloud Project Setup**
  - [ ] Create new GCP project with billing enabled
  - [ ] Enable Firebase APIs (Firestore, Functions, Auth, Storage)
  - [ ] Request Twilio HIPAA BAA and enable HIPAA features
  - [ ] Enable Google Cloud Healthcare API (if using advanced features)

- [ ] **Security Configuration**
  - [ ] Configure Firestore security rules (already in `firestore.rules`)
  - [ ] Set up Firebase Auth with appropriate user roles
  - [ ] Configure CORS for production domains
  - [ ] Set up error reporting and monitoring
  - [ ] Enable audit logging for all Firebase services

### Environment Setup

1. **Firebase Configuration**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and select project
firebase login
firebase use --add  # Select your production project
```

2. **Set Production Environment Variables**
```bash
# Twilio Configuration (HIPAA-enabled account)
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your_auth_token"
firebase functions:config:set twilio.phone_number="+1xxxxxxxxxx"
firebase functions:config:set twilio.webhook_secret="your_webhook_secret"

# App Configuration
firebase functions:config:set app.environment="production"
firebase functions:config:set app.domain="your-domain.com"
```

3. **Frontend Environment (.env.local)**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Deployment Steps

1. **Build and Deploy Functions**
```bash
cd functions
npm run build
firebase deploy --only functions
```

2. **Deploy Firestore Rules & Indexes**
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

3. **Deploy Storage Rules**
```bash
firebase deploy --only storage
```

4. **Build and Deploy Frontend**
```bash
npm run build
firebase deploy --only hosting
```

5. **Full Deployment (all at once)**
```bash
npm run deploy
```

### Post-Deployment Configuration

1. **Twilio Webhook Setup**
   - Go to Twilio Console > Phone Numbers
   - Select your Post-Op Radar phone number
   - Set webhook URL: `https://your-project-id.cloudfunctions.net/twilioSMSWebhook`
   - Set HTTP method to `POST`
   - Enable webhook signature validation

2. **Firebase Auth Setup**
   - Enable Email/Password and Email Link sign-in
   - Configure authorized domains
   - Set up user management (create initial staff accounts)

3. **Custom Domain (Optional)**
   - Add custom domain in Firebase Hosting
   - Configure DNS records
   - SSL certificates are automatically provisioned

### Monitoring & Alerting

1. **Error Monitoring**
```bash
# Enable error reporting
firebase functions:config:set monitoring.error_reporting="true"

# Set up Slack/email alerts (optional)
firebase functions:config:set alerts.slack_webhook="your_webhook_url"
```

2. **Performance Monitoring**
   - Enable Firebase Performance Monitoring
   - Set up Cloud Monitoring dashboards
   - Configure uptime checks for critical endpoints

### Security Hardening

1. **Firestore Security**
   - Review and test security rules with Firebase emulator
   - Enable audit logs for database access
   - Set up VPC firewall rules (if using VPC)

2. **Functions Security**
   - Use least-privilege service accounts
   - Enable secret management for sensitive config
   - Set up rate limiting for webhooks

3. **Authentication**
   - Configure MFA for staff accounts
   - Set session timeouts appropriately
   - Review user roles and permissions

### Backup & Recovery

1. **Automated Backups**
```bash
# Schedule Firestore backups
gcloud firestore operations list
gcloud firestore export gs://your-backup-bucket
```

2. **Recovery Testing**
   - Test backup restoration procedures
   - Document recovery time objectives (RTO)
   - Set up monitoring for backup success/failure

## 🔧 Environment-Specific Configurations

### Development
- Firebase emulators for local testing
- Mock SMS sending (log instead of actual SMS)
- Relaxed security rules for development

### Staging
- Separate Firebase project
- Limited SMS quota for testing
- Production-like security rules
- Automated deployment from main branch

### Production
- HIPAA-compliant infrastructure
- Full SMS sending enabled
- Strict security rules
- Manual deployment approval required

## 📊 Post-Deployment Verification

### Functional Testing
- [ ] CSV patient upload works
- [ ] Daily check-ins are scheduled correctly
- [ ] SMS sending and receiving works
- [ ] Triage classification functions properly
- [ ] Staff dashboard loads and updates
- [ ] Template responses send correctly
- [ ] Voice notes upload and store securely
- [ ] Export functionality generates correct data

### Performance Testing
- [ ] Dashboard loads in <3 seconds
- [ ] SMS webhooks respond in <5 seconds
- [ ] File uploads complete successfully
- [ ] Database queries perform efficiently
- [ ] No memory leaks in long-running processes

### Security Testing
- [ ] Unauthorized access blocked
- [ ] CORS configured correctly
- [ ] Webhook signatures validated
- [ ] PHI properly encrypted
- [ ] Audit logs capturing all actions

## 🚨 Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check Twilio account balance and phone number verification
   - Verify webhook configuration and authentication
   - Check function logs for errors

2. **Dashboard not loading**
   - Verify Firestore indexes are deployed
   - Check browser console for errors
   - Verify authentication configuration

3. **Functions timing out**
   - Increase function timeout in Firebase config
   - Optimize database queries
   - Check for infinite loops or blocking operations

4. **CORS errors**
   - Update CORS configuration in functions
   - Verify domain allowlist
   - Check preflight request handling

### Log Analysis
```bash
# View function logs
firebase functions:log

# Stream real-time logs
firebase functions:log --only=twilioSMSWebhook

# View specific error patterns
firebase functions:log | grep "ERROR"
```

### Performance Optimization
- Enable Firestore offline persistence
- Implement pagination for large datasets
- Use Cloud CDN for static assets
- Optimize bundle size with code splitting

## 📞 Production Support

### Monitoring Checklist
- [ ] Uptime monitoring configured
- [ ] Error rate alerts set up
- [ ] SMS delivery monitoring active
- [ ] Database performance tracked
- [ ] Function execution metrics monitored

### Maintenance Schedule
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and rotate API keys/secrets
- **Annually**: Security audit and penetration testing

### Emergency Contacts
- Technical Lead: [contact info]
- Firebase Admin: [contact info]
- Twilio Support: [contact info]
- Practice Manager: [contact info]

## 📈 Scaling Considerations

### Multi-Practice Setup
When ready to scale beyond single practice:

1. **Database Schema Updates**
   - Add practice_id to all collections
   - Implement proper data isolation
   - Update security rules for multi-tenancy

2. **Authentication Changes**
   - Implement practice-based user roles
   - Add practice selection UI
   - Update API authorization logic

3. **Cost Optimization**
   - Implement SMS usage quotas per practice
   - Add billing/subscription management
   - Optimize database queries for scale

### Infrastructure Scaling
- Consider Cloud Run for compute-intensive tasks
- Implement database sharding if needed
- Use Cloud Load Balancer for high availability
- Set up multi-region deployments for disaster recovery