# Google Calendar API Setup Guide

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" dropdown at the top
   - Click "New Project"
   - Enter project name: `scheduler-lite-calendar`
   - Click "Create"

## Step 2: Enable Google Calendar API

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services"
   - Click "Library"

2. **Enable Calendar API**
   - Search for "Google Calendar API"
   - Click on "Google Calendar API"
   - Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Click "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"

2. **Configure OAuth Consent Screen** (if first time)
   - Choose "External" user type
   - Fill in required fields:
     - App name: `Scheduler-Lite`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip "Scopes" for now
   - Add test users (your email)
   - Click "Save and Continue"

3. **Create OAuth Client ID**
   - Application type: "Web application"
   - Name: `Scheduler-Lite Web Client`
   - Authorized JavaScript origins:
     ```
     https://your-domain.com
     https://your-replit-url.replit.dev
     ```
   - Authorized redirect URIs:
     ```
     https://your-domain.com/auth/google/callback
     https://your-replit-url.replit.dev/auth/google/callback
     ```
   - Click "Create"

## Step 4: Get Your Credentials

After creating the OAuth client, you'll see a popup with:
- **Client ID**: Something like `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-AbCdEf123456`

## Step 5: Configure Your Application

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## Step 6: Configure OAuth Consent Screen (CRITICAL!)

**This step is required to fix "access blocked" errors!**

1. **Go to OAuth Consent Screen**
   - In Google Cloud Console, navigate to "APIs & Services" → "OAuth consent screen"

2. **Choose User Type**
   - For development/testing: Choose "External" 
   - Click "Create"

3. **App Information**
   - App name: "Scheduler-Lite" (or your preferred name)
   - User support email: Your email address
   - Developer contact information: Your email address

4. **App Domain (Important for "access blocked" fix)**
   - Application home page: `https://sociolisten.com`
   - Leave privacy policy and terms of service blank for testing

5. **Authorized Domains**
   - Add your production domain: `sociolisten.com`
   - For development, also add: `da75aa59-c975-4259-869b-52eaf716cfb6-00-p2e6vabv0mg7.picard.replit.dev`
   - **Important**: Do not include `https://` - just the domain

6. **Scopes**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Click "Update"

7. **Test Users (REQUIRED for External apps)**
   - Add your Google account email as a test user
   - This is required to avoid "access blocked" errors
   - Click "Add Users" and enter your email

8. **Summary**
   - Review and click "Back to Dashboard"

## Step 7: Update Authorized Redirect URIs

Go back to your OAuth client credentials and add:

### For Production Deployment:
```
https://sociolisten.com/auth/google/callback
```

### For Development/Testing:
```
https://da75aa59-c975-4259-869b-52eaf716cfb6-00-p2e6vabv0mg7.picard.replit.dev/auth/google/callback
```

### For Local Development:
```
http://localhost:3000/auth/google/callback
```

## Step 7: Required Scopes

The application requests these Google Calendar scopes:
- `https://www.googleapis.com/auth/calendar` - Read/write calendar access
- `https://www.googleapis.com/auth/calendar.events` - Read/write calendar events

## Step 8: Testing the Integration

1. **Start your application**
2. **Go to Calendar Settings** in your app
3. **Click "Add Integration"**
4. **Choose "Google Calendar"**
5. **Click "Create Integration"**
6. **Authorize with Google** when redirected

## Common Issues and Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Make sure your redirect URI in Google Cloud Console exactly matches your application URL.

### Issue: "access_denied"
**Solution**: 
- Check if your app is in "Testing" mode
- Add your email as a test user
- Ensure all required scopes are requested

### Issue: "invalid_client"
**Solution**: 
- Verify your Client ID and Secret are correct
- Check that the OAuth client is for "Web application"

## Production Considerations

### OAuth Consent Screen Verification
For production use, you'll need to:
1. **Complete OAuth consent screen** with privacy policy and terms of service
2. **Submit for verification** by Google (can take 1-2 weeks)
3. **Add your domain** to authorized domains

### Security Best Practices
- Never expose client secrets in frontend code
- Use environment variables for credentials
- Implement proper error handling for expired tokens
- Store refresh tokens securely

## Scopes Required by Scheduler-Lite

```javascript
const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];
```

## Example Environment Variables

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=123456789-abcdef123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEf123456789
```

## Testing Your Setup

You can test your credentials with this curl command:

```bash
curl -X GET "http://localhost:5000/auth/google?team_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This should redirect you to Google's OAuth consent screen.

## Troubleshooting Checklist

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Web application OAuth client created
- [ ] Correct redirect URIs added
- [ ] Client ID and Secret added to .env
- [ ] Application restarted after adding credentials
- [ ] Test user added (for testing mode)

## Cost Information

Google Calendar API is free for most use cases:
- **Free quota**: 1,000,000 requests per day
- **Rate limits**: 100 requests per 100 seconds per user
- **Cost**: Free for normal usage

Your Google Calendar integration is now ready to use!