# Analytics Setup - LinkedIn Ghostwriter

## Overview

**Goal:** Track user behavior, conversions, and product performance without compromising privacy.

**Recommended Stack:**
- **Primary:** Plausible Analytics (privacy-friendly, simple)
- **Alternative:** Google Analytics 4 (free, powerful)
- **Supplement:** Cloudflare Analytics (built-in, free)

**Total Cost:** $0-9/month

---

## Option 1: Plausible Analytics (Recommended)

### Why Plausible?

- ✅ Privacy-focused (GDPR compliant, no cookies)
- ✅ No cookie banner needed
- ✅ Simple, clean interface
- ✅ Lightweight (45x smaller than GA)
- ✅ Self-hostable (free) or hosted ($9/month)
- ✅ Goal tracking and conversion funnels

### Setup (Hosted Version - $9/month)

**Step 1: Sign Up**
1. Go to https://plausible.io
2. Click "Start Free Trial"
3. Enter your domain (e.g., `linkedinghostwriter.com`)
4. Complete signup

**Step 2: Add Tracking Script**

Copy the script Plausible provides:

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

**Step 3: Add to Your Site**

In `02-frontend-code/index.html`, add before `</head>`:

```html
<!-- Plausible Analytics -->
<script defer data-domain="linkedinghostwriter.com" src="https://plausible.io/js/script.js"></script>
```

**Step 4: Verify Installation**

1. Go to Plausible dashboard
2. Click your site
3. You should see real-time visitors (including yourself!)

### Setup (Self-Hosted Version - Free)

**Requirements:**
- Server with Docker
- Domain for analytics (e.g., `analytics.yourdomain.com`)

**Step 1: Deploy with Docker**

Create `docker-compose.yml`:

```yaml
version: '3'

services:
  plausible:
    image: plausible/analytics:latest
    command: sh -c "sleep 10 && /entrypoint.sh db-prepare && /entrypoint.sh run"
    depends_on:
      - postgres
      - clickhouse
    environment:
      - BASE_URL=https://analytics.yourdomain.com
      - SECRET_KEY_BASE=your-secret-key-base
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/plausible
      - CLICKHOUSE_DATABASE_URL=http://clickhouse:8123/plausible
    ports:
      - "8000:8000"

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=plausible
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data

  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    volumes:
      - clickhouse-data:/var/lib/clickhouse

volumes:
  postgres-data:
  clickhouse-data:
```

**Step 2: Deploy**

```bash
docker-compose up -d
```

**Step 3: Configure Reverse Proxy**

Use Nginx or Caddy to proxy `analytics.yourdomain.com` to `localhost:8000`

**Step 4: Add Tracking Script**

Same as hosted version, but point to your domain:

```html
<script defer data-domain="linkedinghostwriter.com" src="https://analytics.yourdomain.com/js/script.js"></script>
```

### Goal Tracking

Track important conversions:

**1. Signup Goal**
```javascript
// In app.js, after successful signup
plausible('Signup')
```

**2. Post Generated Goal**
```javascript
// In app.js, after post generation
plausible('Post Generated', { props: { style: style } })
```

**3. Upgrade Goal**
```javascript
// In app.js, after Stripe checkout
plausible('Upgrade', { props: { plan: 'pro' } })
```

**4. Copy Post Goal**
```javascript
// In app.js, in copyPost function
plausible('Post Copied')
```

### Custom Events to Track

| Event | When to Fire | Properties |
|-------|--------------|------------|
| `pageview` | Automatic | - |
| `Signup` | User signs up | `source` (organic, Product Hunt, etc.) |
| `Post Generated` | User generates posts | `style`, `bulletCount` |
| `Post Copied` | User copies a post | `postIndex` |
| `Upgrade` | User upgrades to Pro | `plan`, `price` |
| `Lifetime Purchase` | User buys lifetime | `price` |
| `Usage Limit Reached` | Free user hits limit | `postsUsed` |

---

## Option 2: Google Analytics 4 (Free Alternative)

### Why GA4?

- ✅ Completely free
- ✅ Powerful reporting
- ✅ Integration with Google Ads
- ✅ Audience building
- ❌ More complex setup
- ❌ Privacy concerns (cookie banner needed in EU)
- ❌ Heavier script

### Setup

**Step 1: Create GA4 Property**

1. Go to https://analytics.google.com
2. Click "Create Account"
3. Enter account name: "LinkedIn Ghostwriter"
4. Create property: "linkedinghostwriter.com"
5. Select your industry, business size
6. Accept terms

**Step 2: Get Measurement ID**

1. Go to Admin → Data Streams
2. Click "Add Stream" → Web
3. Enter website URL
4. Copy Measurement ID (starts with `G-`)

**Step 3: Add GA4 to Your Site**

In `02-frontend-code/index.html`, add before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID.

**Step 4: Enable Enhanced Measurement**

In GA4:
1. Go to Admin → Data Streams
2. Click your web stream
3. Enable "Enhanced Measurement"
4. This automatically tracks:
   - Page views
   - Scrolls
   - Outbound clicks
   - Site search
   - File downloads

### Custom Events in GA4

**Track Post Generation:**
```javascript
gtag('event', 'post_generated', {
  'event_category': 'engagement',
  'event_label': style,
  'bullet_count': bulletCount
});
```

**Track Upgrades:**
```javascript
gtag('event', 'upgrade', {
  'event_category': 'conversion',
  'event_label': plan,
  'value': price,
  'currency': 'USD'
});
```

**Track Copy:**
```javascript
gtag('event', 'post_copied', {
  'event_category': 'engagement'
});
```

### Conversion Events

Mark important events as conversions:

1. Go to Admin → Conversions
2. Click "New Conversion Event"
3. Add events:
   - `signup`
   - `post_generated`
   - `upgrade`
   - `lifetime_purchase`

### Audience Building

Create audiences for retargeting:

1. **Free Users (Active):** Generated post in last 7 days, not upgraded
2. **Free Users (At Risk):** Signed up 14+ days ago, no upgrade
3. **Pro Users:** Upgraded in last 30 days
4. **Power Users:** Generated 10+ posts in last 7 days

Use these audiences for:
- Google Ads retargeting
- Email segmentation
- In-app messaging

---

## Option 3: Cloudflare Analytics (Built-in)

### Why Cloudflare Analytics?

- ✅ Free (included with Cloudflare)
- ✅ No additional scripts
- ✅ Server-side tracking
- ✅ Privacy-friendly
- ❌ Less detailed than Plausible/GA4
- ❌ Limited custom events

### Setup

**Step 1: Enable Analytics**

1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to Analytics → Overview
4. Analytics is automatically enabled

**Step 2: View Data**

You'll see:
- Total requests
- Unique visitors
- Bandwidth
- Threats blocked
- Top countries

**Step 3: Worker Analytics**

For your Cloudflare Worker:

1. Go to Workers & Pages
2. Select your Worker
3. Click "Analytics"
4. See:
   - Requests
   - Errors
   - CPU time
   - Response times

### Custom Logging

Add custom logs to your Worker:

```javascript
// In worker.js
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    
    try {
      // Your code here
      const response = await handleGenerate(request, env);
      
      // Log success
      console.log('Request successful', {
        path: new URL(request.url).pathname,
        duration: Date.now() - startTime,
        status: response.status
      });
      
      return response;
    } catch (error) {
      // Log error
      console.error('Request failed', {
        path: new URL(request.url).pathname,
        error: error.message
      });
      throw error;
    }
  }
};
```

View logs in:
- Cloudflare Dashboard → Workers → Your Worker → Logs
- Or use `wrangler tail` in CLI

---

## Recommended Setup

### For Most Users: Plausible (Hosted)

**Cost:** $9/month
**Setup Time:** 10 minutes
**Best For:** Privacy-focused, simple setup, no cookie banner

**Implementation:**
```html
<!-- Add to index.html -->
<script defer data-domain="linkedinghostwriter.com" src="https://plausible.io/js/script.js"></script>
```

**Track These Events:**
```javascript
// Signup
plausible('Signup')

// Post Generated
plausible('Post Generated', { props: { style: style } })

// Upgrade
plausible('Upgrade', { props: { plan: 'pro', price: 15 } })

// Copy
plausible('Post Copied')
```

---

## Dashboard Setup

### Key Metrics Dashboard

Create a dashboard with these metrics:

**1. Traffic Overview**
- Daily visitors
- Page views
- Bounce rate
- Avg. time on page

**2. Conversion Funnel**
```
Visitors → Signups → First Post → Upgrade
```

Track conversion rates at each step.

**3. Engagement Metrics**
- Posts generated per user
- Posts copied
- Avg. posts per session
- Return visitor rate

**4. Revenue Metrics**
- Daily MRR
- New upgrades (Pro + Lifetime)
- Churn rate
- LTV by cohort

**5. Feature Usage**
- Most popular post styles
- Avg. bullets per post
- Regenerate rate
- Custom voice adoption

### Sample Dashboard (Plausible)

**Create Custom Dashboard:**

1. Go to Plausible → Your Site → Dashboard
2. Click "Add Widget"
3. Add these widgets:

**Widget 1: Daily Signups**
- Metric: Custom Event
- Event: `Signup`
- Timeframe: Last 30 days

**Widget 2: Posts Generated**
- Metric: Custom Event
- Event: `Post Generated`
- Group by: `style` property

**Widget 3: Upgrade Rate**
- Metric: Custom Event
- Event: `Upgrade`
- Show as: Conversion rate from Signup

**Widget 4: Revenue**
- Metric: Custom Event
- Event: `Upgrade` + `Lifetime Purchase`
- Show: Sum of `price` property

---

## Privacy Compliance

### GDPR (EU)

**Plausible:**
- ✅ No cookies
- ✅ No personal data collected
- ✅ No cookie banner needed
- ✅ Data stored in EU (if using EU servers)

**Google Analytics:**
- ❌ Uses cookies
- ❌ Requires cookie banner
- ❌ Data transferred to US
- ⚠️ Consider GA4 with IP anonymization

### CCPA (California)

Both Plausible and GA4 can be configured for CCPA compliance:

- Provide opt-out mechanism
- Don't sell personal data
- Honor "Do Not Sell" requests

### Implementation

**Add Privacy Policy Page:**

```markdown
# Privacy Policy

## Data We Collect

We use Plausible Analytics to understand how people use our site.

Plausible collects:
- Page views
- Referrer
- Device type
- Country

Plausible does NOT collect:
- Personal information
- IP addresses (anonymized)
- Cookies

## Third-Party Services

- **Cloudflare:** Hosting and security
- **Hugging Face:** AI post generation
- **Stripe:** Payment processing

## Your Rights

- Access your data
- Delete your data
- Opt-out of analytics

Contact: privacy@linkedinghostwriter.com
```

**Add Cookie Banner (if using GA4):**

```html
<!-- Cookie Banner -->
<div id="cookie-banner" class="hidden">
  <p>We use cookies to improve your experience. <a href="/privacy">Learn more</a></p>
  <button onclick="acceptCookies()">Accept</button>
  <button onclick="declineCookies()">Decline</button>
</div>

<script>
function acceptCookies() {
  // Enable GA4
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });
  localStorage.setItem('cookies', 'accepted');
  document.getElementById('cookie-banner').classList.add('hidden');
}

function declineCookies() {
  localStorage.setItem('cookies', 'declined');
  document.getElementById('cookie-banner').classList.add('hidden');
}

// Check preference
if (localStorage.getItem('cookies') === 'accepted') {
  acceptCookies();
} else if (!localStorage.getItem('cookies')) {
  document.getElementById('cookie-banner').classList.remove('hidden');
}
</script>
```

---

## A/B Testing

### Simple A/B Test (No Additional Tools)

**Test: CTA Button Color**

```javascript
// In app.js
const ctaButton = document.getElementById('ctaButton');
const variant = Math.random() > 0.5 ? 'blue' : 'green';

if (variant === 'green') {
  ctaButton.classList.remove('bg-brand-600');
  ctaButton.classList.add('bg-green-600');
}

// Track which variant was shown
plausible('CTA Viewed', { props: { variant: variant } });

// Track clicks
ctaButton.addEventListener('click', () => {
  plausible('CTA Clicked', { props: { variant: variant } });
});
```

**Analyze Results:**
- Compare click-through rates
- Run test for 1-2 weeks
- Pick winner based on statistical significance

### Tools for Advanced Testing

- **Google Optimize:** Free (being discontinued)
- **VWO:** Paid, powerful
- **Optimizely:** Paid, enterprise
- **PostHog:** Open-source, self-hostable

---

## Monitoring & Alerts

### Set Up Alerts

**Plausible:**
- No built-in alerts
- Check dashboard manually or use API

**Google Analytics:**
1. Go to Admin → Custom Alerts
2. Create alert:
   - Alert name: "Traffic Drop"
   - Period: Day
   - Condition: Sessions decreased by >50%
   - Email: your@email.com

**Cloudflare:**
1. Go to Analytics → Settings
2. Set up alerts for:
   - Error rate spikes
   - Traffic anomalies
   - Security threats

### Custom Monitoring

**Uptime Monitoring:**
- Use UptimeRobot (free): https://uptimerobot.com
- Monitor: `/api/health` endpoint
- Alert if down for 5+ minutes

**Error Tracking:**
- Use Sentry (free tier): https://sentry.io
- Add to frontend and Worker
- Get notified of errors

```javascript
// In app.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "your-sentry-dsn"
});

// In worker.js
// Use Cloudflare's built-in error reporting
```

---

## Analytics Checklist

### Pre-Launch

- [ ] Analytics tool selected and account created
- [ ] Tracking script added to `index.html`
- [ ] Custom events defined and implemented
- [ ] Conversion goals configured
- [ ] Dashboard created with key metrics
- [ ] Privacy policy page created
- [ ] Cookie banner (if using GA4)
- [ ] Test tracking in real-time

### Post-Launch

- [ ] Verify data is being collected
- [ ] Check conversion funnel
- [ ] Set up weekly analytics review
- [ ] Create monthly report template
- [ ] Configure alerts for anomalies
- [ ] Document key metrics and targets

### Monthly Review

- [ ] Traffic trends (up/down?)
- [ ] Conversion rate optimization opportunities
- [ ] Top traffic sources
- [ ] Feature usage analysis
- [ ] Cohort retention analysis
- [ ] Revenue metrics review

---

**Next Step:** Create README.md with quick start guide
