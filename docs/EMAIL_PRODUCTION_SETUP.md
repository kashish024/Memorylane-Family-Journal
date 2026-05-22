# Email Production Setup Guide

This guide explains how to configure emails for production use.

## Current Email Configuration

### Email Services Used

1. **Monthly Summary Emails** (`utils/emailService.js`)
   - Current "from" address: `MemoryLane <onboarding@resend.dev>`
   - Status: ⚠️ **Test email - Limited in production**

2. **Invitation Emails** (`utils/invitations.js`)
   - Current "from" address: `MemoryLane <invitations@mymemorlylane.com>`
   - Status: ⚠️ **Needs domain verification**

## ⚠️ Production Issues

### Issue 1: Test Email Domain (`onboarding@resend.dev`)

**Problem:**
- `onboarding@resend.dev` is Resend's test email domain
- **Limitations:**
  - Only works for first 100 emails
  - May be blocked by spam filters
  - Not suitable for production use
  - May have rate limits

**Solution:**
- Use a verified custom domain
- Example: `MemoryLane <noreply@yourdomain.com>`

### Issue 2: Domain Verification

**Problem:**
- `invitations@mymemorlylane.com` may not be verified in Resend
- Unverified domains will cause email sending to fail

**Solution:**
- Verify the domain in Resend dashboard
- Or use a verified domain

## ✅ Production Setup Steps

### Step 1: Choose Your Email Domain

You have two options:

**Option A: Use a Custom Domain (Recommended)**
- Example: `noreply@yourdomain.com` or `hello@yourdomain.com`
- More professional
- Better deliverability
- No rate limits

**Option B: Use Resend's Verified Domain**
- If you've verified a domain in Resend, use that
- Example: `MemoryLane <noreply@yourverifieddomain.com>`

### Step 2: Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the required DNS records:
   - **SPF Record**: `v=spf1 include:resend.com ~all`
   - **DKIM Record**: (provided by Resend)
   - **DMARC Record**: (optional but recommended)
5. Wait for verification (usually takes a few minutes to 24 hours)

### Step 3: Update Email "From" Addresses

#### Update Monthly Summary Emails

**File:** `utils/emailService.js` (line 22)

**Change from:**
```javascript
from: 'MemoryLane <onboarding@resend.dev>', // Resend's test email
```

**Change to:**
```javascript
from: 'MemoryLane <noreply@yourdomain.com>', // Your verified domain
```

#### Update Invitation Emails

**File:** `utils/invitations.js` (line 688)

**Change from:**
```javascript
from: 'MemoryLane <invitations@mymemorlylane.com>',
```

**Change to:**
```javascript
from: 'MemoryLane <noreply@yourdomain.com>', // Your verified domain
// OR if you want separate addresses:
// from: 'MemoryLane <invitations@yourdomain.com>',
```

### Step 4: Test Email Sending

After updating the addresses:

1. **Test Monthly Summary:**
   - Generate a monthly summary in the app
   - Verify email is received
   - Check spam folder if not received

2. **Test Invitation:**
   - Send a test invitation
   - Verify email is received
   - Check that links work

3. **Check Resend Dashboard:**
   - Go to Resend Dashboard > Emails
   - Verify emails are being sent successfully
   - Check for any errors or bounces

## 📋 Quick Checklist

- [ ] Choose email domain (custom domain or verified Resend domain)
- [ ] Verify domain in Resend dashboard
- [ ] Update `utils/emailService.js` "from" address
- [ ] Update `utils/invitations.js` "from" address
- [ ] Test monthly summary email
- [ ] Test invitation email
- [ ] Verify emails in Resend dashboard
- [ ] Check spam folder for test emails

## 🔧 Alternative: Use Environment Variables

For more flexibility, you could move email addresses to environment variables:

**In `app.config.js`:**
```javascript
extra: {
  // ... existing config ...
  EMAIL_FROM_MONTHLY: process.env.EMAIL_FROM_MONTHLY || 'MemoryLane <noreply@yourdomain.com>',
  EMAIL_FROM_INVITATIONS: process.env.EMAIL_FROM_INVITATIONS || 'MemoryLane <noreply@yourdomain.com>',
}
```

**In `utils/emailService.js`:**
```javascript
const EMAIL_FROM = Constants.expoConfig?.extra?.EMAIL_FROM_MONTHLY || 'MemoryLane <noreply@yourdomain.com>';

// Then use:
from: EMAIL_FROM,
```

**In `utils/invitations.js`:**
```javascript
const EMAIL_FROM = Constants.expoConfig?.extra?.EMAIL_FROM_INVITATIONS || 'MemoryLane <noreply@yourdomain.com>';

// Then use:
from: EMAIL_FROM,
```

## ⚠️ Important Notes

1. **Domain Verification Required:**
   - Resend requires domain verification for production use
   - Test domain (`onboarding@resend.dev`) has strict limits
   - Unverified domains will cause email sending to fail

2. **Email Deliverability:**
   - Use a custom domain for better deliverability
   - Set up SPF, DKIM, and DMARC records
   - Monitor bounce rates in Resend dashboard

3. **Rate Limits:**
   - Test domain: Limited to 100 emails
   - Verified domain: Higher limits (check Resend plan)

4. **Testing:**
   - Always test email sending before production deployment
   - Check both inbox and spam folder
   - Verify links in emails work correctly

## 🚨 Current Status

**Monthly Summary Emails:**
- ⚠️ Using test domain (`onboarding@resend.dev`)
- ⚠️ **Will hit limits in production**
- ⚠️ **May be blocked by spam filters**

**Invitation Emails:**
- ⚠️ Using `invitations@mymemorlylane.com`
- ⚠️ **Needs domain verification in Resend**
- ⚠️ **Will fail if domain not verified**

## ✅ Action Required Before Production

1. **Verify domain in Resend** (if using custom domain)
2. **Update email "from" addresses** in both files
3. **Test email sending** with production addresses
4. **Monitor Resend dashboard** for any issues

---

**Last Updated:** January 2025

