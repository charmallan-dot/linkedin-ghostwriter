# Deployment Guide - LinkedIn Ghostwriter

## Overview

This guide walks you through deploying LinkedIn Ghostwriter in under 1 hour. No advanced technical skills required.

**What You'll Deploy:**
- Frontend: Cloudflare Pages (free)
- Backend: Cloudflare Workers (free tier: 100K requests/day)
- Database: Cloudflare KV (free tier: 100K reads/day)
- Payments: Stripe Payment Links (no code)

**Total Cost:** $0/month (free tiers handle up to 3,000+ users)

---

## Prerequisites

**You Need:**
1. GitHub account (free)
2. Cloudflare account (free)
3. Hugging Face account (free)
4. Stripe account (free)

**Time Required:** 45-60 minutes

**Skill Level:** Beginner-friendly (copy/paste commands)

---

## Step 1: Get Your API Keys (10 minutes)

### Hugging Face API Token

1. Go to https://huggingface.co/settings/tokens
2. Click "Create new token"
3. Name it "LinkedIn Ghostwriter"
4. Select "Read" permission
5. Copy the token (starts with `hf_`)
6. **Save it securely** (you'll need it in Step 3)

**Note:** Hugging Face free tier includes 10,000 requests/month. This handles ~300 users on the free tier.

### Stripe Account

1. Go to https://stripe.com
2. Click "Sign up" (use test mode initially)
3. Complete account setup
4. Go to Dashboard → Products
5. Create two products:

**Product 1: Pro Subscription**
- Name: LinkedIn Ghostwriter Pro
- Price: $15/month
- Type: Recurring

**Product 2: Lifetime Access**
- Name: LinkedIn Ghostwriter Lifetime
- Price: $97 (one-time)
- Type: One-time

6. For each product, create a Payment Link:
   - Click "Create Payment Link"
   - Customize the checkout page
   - Copy the Payment Link URL

**Save these URLs** (you'll add them to the frontend)

---

## Step 2: Deploy Frontend to Cloudflare Pages (15 minutes)

### Option A: Deploy via Cloudflare Dashboard (Easiest)

1. **Go to Cloudflare Pages**
   - Visit https://pages.cloudflare.com
   - Click "Create a project"
   - Select "Direct Upload"

2. **Prepare Your Files**
   ```bash
   # Navigate to frontend folder
   cd 02-frontend-code/
   
   # Create a zip file
   zip -r linkedin-ghostwriter-frontend.zip index.html style.css app.js
   ```

3. **Upload to Cloudflare**
   - Drag and drop the zip file
   - Project name: `linkedin-ghostwriter`
   - Click "Deploy"

4. **Update API Configuration**
   - Open `app.js` in your project
   - Find this line (around line 11):
     ```javascript
     const API_BASE_URL = 'https://your-worker.your-subdomain.workers.dev/api';
     ```
   - Replace with your actual Worker URL (you'll get this in Step 3)
   - For now, use: `https://linkedin-ghostwriter-api.your-subdomain.workers.dev/api`

5. **Update Stripe Links**
   - In `app.js`, find the `openStripeCheckout` function
   - Replace the placeholder URLs with your actual Stripe Payment Links:
     ```javascript
     const stripeLinks = {
       pro: 'https://buy.stripe.com/your-actual-pro-link',
       lifetime: 'https://buy.stripe.com/your-actual-lifetime-link'
     };
     ```

6. **Re-deploy**
   - Go back to Cloudflare Pages
   - Click "Create deployment"
   - Upload the updated zip file

**Your site is now live!** URL will be: `https://linkedin-ghostwriter.pages.dev`

### Option B: Deploy via Git (Recommended for Updates)

1. **Create GitHub Repository**
   ```bash
   # Initialize git in frontend folder
   cd 02-frontend-code/
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create repo on GitHub (go to github.com/new)
   # Then push:
   git remote add origin https://github.com/yourusername/linkedin-ghostwriter-frontend.git
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to https://pages.cloudflare.com
   - Click "Create a project"
   - Select "Connect to Git"
   - Choose your repository
   - Build settings:
     - Build command: (leave blank)
     - Build output directory: `/`
   - Click "Deploy"

3. **Auto-Deploy on Updates**
   - Any push to `main` branch will auto-deploy
   - No more manual uploads!

---

## Step 3: Deploy Backend to Cloudflare Workers (15 minutes)

### Install Wrangler (Cloudflare CLI)

```bash
# Install Node.js if you don't have it
# Then install Wrangler:
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Configure and Deploy

1. **Navigate to Backend Folder**
   ```bash
   cd 03-backend-code/
   ```

2. **Update wrangler.toml**
   - Open `wrangler.toml`
   - Add your Cloudflare Account ID (find it at https://dash.cloudflare.com)
   ```toml
   account_id = "your-account-id-here"
   ```

3. **Create KV Namespace**
   ```bash
   # Create KV namespace for usage tracking
   wrangler kv:namespace create "USAGE_KV"
   
   # Copy the output ID
   # It will look like: "id": "abc123def456"
   ```

4. **Update wrangler.toml with KV ID**
   ```toml
   [[kv_namespaces]]
   binding = "USAGE_KV"
   id = "abc123def456"  # Replace with your actual ID
   preview_id = "abc123def456"  # Same for now
   ```

5. **Set API Token Secret**
   ```bash
   wrangler secret put HF_API_TOKEN
   # When prompted, paste your Hugging Face token
   ```

6. **Deploy the Worker**
   ```bash
   wrangler deploy
   ```

7. **Note Your Worker URL**
   - After deployment, you'll see:
     ```
     Published linkedin-ghostwriter-api.your-subdomain.workers.dev
     ```
   - **This is your API URL!**
   - Copy it and update the frontend (Step 2, item 4)

### Test Your API

```bash
# Test the health endpoint
curl https://linkedin-ghostwriter-api.your-subdomain.workers.dev/api/health

# Should return: {"status":"ok"}
```

---

## Step 4: Configure Stripe Webhooks (5 minutes)

### Set Up Webhook Endpoint

1. **Go to Stripe Dashboard**
   - Visit https://dashboard.stripe.com
   - Navigate to Developers → Webhooks

2. **Add Endpoint**
   - Click "Add endpoint"
   - Endpoint URL: `https://linkedin-ghostwriter-api.your-subdomain.workers.dev/api/webhook/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Get Webhook Secret**
   - After creating, copy the "Signing secret"
   - Set it as a Worker secret:
     ```bash
     wrangler secret put STRIPE_WEBHOOK_SECRET
     # Paste your webhook signing secret
     ```

4. **Re-deploy Worker**
   ```bash
   wrangler deploy
   ```

### Test Webhook (Optional)

Use Stripe's CLI to test locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev
stripe listen --forward-to localhost:8787/api/webhook/stripe
```

---

## Step 5: Update Frontend with Real URLs (5 minutes)

### Update API URL

1. Open `02-frontend-code/app.js`
2. Find line 11:
   ```javascript
   const API_BASE_URL = 'https://your-worker.your-subdomain.workers.dev/api';
   ```
3. Replace with your actual Worker URL

### Update Stripe Links

1. In `app.js`, find the `openStripeCheckout` function
2. Replace placeholder URLs with your Stripe Payment Links

### Re-deploy Frontend

```bash
# If using Git:
git add app.js
git commit -m "Update API and Stripe URLs"
git push

# If using Direct Upload:
cd 02-frontend-code/
zip -r linkedin-ghostwriter-frontend.zip index.html style.css app.js
# Upload to Cloudflare Pages
```

---

## Step 6: Custom Domain (Optional, 5 minutes)

### Cloudflare Pages Custom Domain

1. **Go to Cloudflare Pages**
   - Select your project
   - Navigate to "Custom domains"

2. **Add Domain**
   - Click "Add custom domain"
   - Enter your domain (e.g., `app.linkedinghostwriter.com`)
   - Follow DNS configuration steps

3. **SSL Certificate**
   - Cloudflare auto-provisions SSL
   - Takes 5-10 minutes to activate

### Update CORS (If Using Custom Domain)

In `worker.js`, update the CORS headers:

```javascript
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
```

---

## Step 7: Analytics Setup (5 minutes)

See `10-analytics-setup.md` for detailed instructions.

**Quick Setup:**

1. **Plausible (Recommended)**
   - Sign up at https://plausible.io
   - Add your site
   - Copy the tracking script
   - Add to `index.html` before `</head>`

2. **Google Analytics (Alternative)**
   - Create property at https://analytics.google.com
   - Get Measurement ID
   - Add GA4 script to `index.html`

---

## Step 8: Testing Checklist

### Frontend Tests

- [ ] Landing page loads correctly
- [ ] Generator section is accessible
- [ ] Can enter bullet points
- [ ] Generate button works
- [ ] Posts are generated and displayed
- [ ] Copy to clipboard works
- [ ] Usage counter updates
- [ ] Pricing page links work
- [ ] Stripe checkout links work

### Backend Tests

- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] `/api/generate` accepts POST requests
- [ ] `/api/usage` returns usage data
- [ ] Usage tracking works (increments after generation)
- [ ] Free tier limit (3 posts) is enforced

### Payment Tests

- [ ] Stripe Payment Links work
- [ ] Checkout page loads correctly
- [ ] Test payment goes through
- [ ] Webhook is received by Worker
- [ ] User status updates after payment

---

## Troubleshooting

### Problem: Worker Deployment Fails

**Error:** "Authentication required"
```bash
# Solution: Re-login
wrangler login
```

**Error:** "KV namespace not found"
```bash
# Solution: Create the namespace
wrangler kv:namespace create "USAGE_KV"
# Update wrangler.toml with the new ID
```

### Problem: API Returns 500 Error

**Check:**
1. Hugging Face token is set correctly
   ```bash
   wrangler secret list
   ```
2. Token has correct permissions (Read)
3. Hugging Face API is accessible (check status at status.huggingface.co)

### Problem: CORS Errors in Browser

**Solution:** Update CORS headers in `worker.js`:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',  // Or your specific domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Problem: Posts Not Generating

**Debug:**
1. Check Worker logs:
   ```bash
   wrangler tail
   ```
2. Look for Hugging Face API errors
3. Verify token is valid:
   ```bash
   curl -H "Authorization: Bearer hf_xxx" \
     https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3 \
     -X POST -d '{"inputs":"test"}'
   ```

### Problem: Usage Not Tracking

**Check:**
1. KV namespace is properly configured
2. Worker has KV binding in wrangler.toml
3. Client ID generation is working

---

## Going Live Checklist

Before announcing publicly:

- [ ] All tests passing
- [ ] Stripe in live mode (not test)
- [ ] Payment links updated to live products
- [ ] Terms of Service and Privacy Policy pages added
- [ ] Contact email configured
- [ ] Analytics tracking verified
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Backup plan in place (what if Hugging Face goes down?)
- [ ] Support system ready (email, docs, FAQ)

---

## Maintenance

### Weekly Tasks

- [ ] Check Worker logs for errors
- [ ] Monitor Hugging Face API usage
- [ ] Review Stripe dashboard for payments
- [ ] Check analytics for traffic/usage patterns

### Monthly Tasks

- [ ] Review and respond to user feedback
- [ ] Update dependencies if needed
- [ ] Check for new Hugging Face models
- [ ] Review pricing and conversion rates

### Scaling Considerations

When you hit 1,000+ users:

1. **Upgrade Hugging Face** → Pro tier ($9/mo for 100K requests)
2. **Add Caching** → Cache common prompts in KV
3. **Rate Limiting** → Add per-IP rate limits
4. **Database** → Migrate from KV to D1 (Cloudflare's SQL DB)
5. **Monitoring** → Set up Cloudflare Analytics + alerts

---

## Cost Breakdown at Scale

| Users/Month | Hugging Face | Cloudflare | Stripe Fees | Total |
|-------------|--------------|------------|-------------|-------|
| 0-300 | Free | Free | ~$50 | ~$50 |
| 300-1,000 | $9 | Free | ~$200 | ~$209 |
| 1,000-3,000 | $29 | $5 | ~$600 | ~$634 |
| 3,000-10,000 | $99 | $20 | ~$2,000 | ~$2,119 |

**Revenue at 150 Pro Users:** $2,250/month
**Cost at 150 Users:** ~$50/month
**Profit Margin:** 98%

---

## Support Resources

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Hugging Face API Docs:** https://huggingface.co/docs/api-inference
- **Stripe Payment Links:** https://stripe.com/docs/payments/payment-links
- **Community Forum:** https://community.cloudflare.com/

---

**Next Step:** Review marketing launch plan → `08-marketing-launch.md`
