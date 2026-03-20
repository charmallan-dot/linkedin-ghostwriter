/**
 * LinkedIn Ghostwriter - Cloudflare Worker
 * 
 * Serverless API layer that handles:
 * - Post generation via Hugging Face API
 * - Usage tracking via Cloudflare KV
 * - Stripe webhook processing
 */

// Hugging Face API Configuration
const HF_API_TOKEN = HF_API_TOKEN; // Set in Cloudflare Worker secrets
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Post Style Prompts
const STYLE_PROMPTS = {
  professional: "Write a professional, insightful LinkedIn post. Use short paragraphs, white space, and end with an engaging question. Sound experienced and credible.",
  storytelling: "Write a personal storytelling LinkedIn post. Start with a hook, share a journey, include emotion, and end with a lesson. Sound authentic and vulnerable.",
  contrarian: "Write a contrarian, bold LinkedIn post. Challenge conventional wisdom, use strong opinions, and provoke thought. Sound confident and slightly provocative.",
  educational: "Write an educational how-to LinkedIn post. Provide actionable steps, use numbered lists, and include a clear takeaway. Sound helpful and authoritative.",
  celebration: "Write a celebration/milestone LinkedIn post. Express genuine excitement, acknowledge others, and share gratitude. Sound humble and appreciative.",
  'lesson-learned': "Write a lesson-learned LinkedIn post. Share a failure or challenge, extract key insights, and offer advice. Sound reflective and wise."
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Route requests
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env);
      } else if (path === '/api/usage' && request.method === 'GET') {
        return await handleUsage(request, env);
      } else if (path === '/api/webhook/stripe' && request.method === 'POST') {
        return await handleStripeWebhook(request, env);
      } else if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Handle CORS
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Generate Posts
async function handleGenerate(request, env) {
  const { bullets, style = 'professional' } = await request.json();

  // Validate input
  if (!bullets || typeof bullets !== 'string') {
    return new Response(JSON.stringify({ error: 'Bullets required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse bullet points
  const bulletArray = bullets.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.length > 10));

  if (bulletArray.length < 3 || bulletArray.length > 5) {
    return new Response(JSON.stringify({ error: 'Please provide 3-5 bullet points' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Build prompt for AI
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.professional;
  const cleanBullets = bulletArray.map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n');
  
  const prompt = `${stylePrompt}

Topic bullets:
${cleanBullets}

Generate 3 different LinkedIn post variations. Each should:
- Start with a strong hook (first line grabs attention)
- Use short paragraphs and white space
- Be 150-300 words
- End with engagement (question or call-to-action)
- Sound human, not AI-generated

Format each post with "POST 1:", "POST 2:", "POST 3:" separators.`;

  // Call Hugging Face API
  const hfResponse = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 750,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
        do_sample: true
      }
    })
  });

  if (!hfResponse.ok) {
    const errorText = await hfResponse.text();
    console.error('HF API error:', errorText);
    throw new Error(`Hugging Face API error: ${hfResponse.status}`);
  }

  const hfData = await hfResponse.json();
  
  // Parse generated text into 3 posts
  const generatedText = hfData[0]?.generated_text || hfData.generated_text || '';
  const posts = parseGeneratedPosts(generatedText);

  // Track usage (if KV available)
  let remaining = 3;
  if (env.USAGE_KV) {
    const clientId = getClientId(request);
    const usage = await env.USAGE_KV.get(`usage:${clientId}`);
    const usageData = usage ? JSON.parse(usage) : { used: 0, resetsAt: getMonthEnd() };
    
    if (new Date(usageData.resetsAt) < new Date()) {
      usageData.used = 0;
      usageData.resetsAt = getMonthEnd();
    }
    
    usageData.used++;
    remaining = Math.max(0, 3 - usageData.used);
    await env.USAGE_KV.put(`usage:${clientId}`, JSON.stringify(usageData));
  }

  // Return response with CORS
  const response = new Response(JSON.stringify({
    posts: posts,
    remaining: remaining,
    style: style
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });

  return response;
}

// Parse Generated Posts
function parseGeneratedPosts(text) {
  const posts = [];
  
  // Try to split by POST markers
  const postMatches = text.match(/POST\s*\d*:([^]*?)(?=POST\s*\d*:|$)/g);
  
  if (postMatches && postMatches.length >= 3) {
    // Extract first 3 posts
    for (let i = 0; i < Math.min(3, postMatches.length); i++) {
      const postText = postMatches[i]
        .replace(/POST\s*\d*:/i, '')
        .trim();
      
      if (postText.length > 50) {
        posts.push({
          text: postText,
          tokens: postText.split(/\s+/).length,
          style: 'generated'
        });
      }
    }
  }
  
  // Fallback: split by double newlines if parsing failed
  if (posts.length < 3) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 100);
    
    // Group into 3 posts
    const postsPerGroup = Math.ceil(paragraphs.length / 3);
    for (let i = 0; i < 3; i++) {
      const start = i * postsPerGroup;
      const end = Math.min(start + postsPerGroup, paragraphs.length);
      const postText = paragraphs.slice(start, end).join('\n\n').trim();
      
      if (postText.length > 50) {
        posts.push({
          text: postText,
          tokens: postText.split(/\s+/).length,
          style: 'generated'
        });
      }
    }
  }
  
  // Ensure we have at least 3 posts
  while (posts.length < 3) {
    posts.push({
      text: posts[posts.length - 1]?.text || text,
      tokens: text.split(/\s+/).length,
      style: 'generated'
    });
  }
  
  return posts.slice(0, 3);
}

// Get Usage
async function handleUsage(request, env) {
  if (!env.USAGE_KV) {
    return new Response(JSON.stringify({
      used: 0,
      limit: 3,
      remaining: 3,
      resetsAt: getMonthEnd()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const clientId = getClientId(request);
  const usage = await env.USAGE_KV.get(`usage:${clientId}`);
  
  if (!usage) {
    return new Response(JSON.stringify({
      used: 0,
      limit: 3,
      remaining: 3,
      resetsAt: getMonthEnd()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const usageData = JSON.parse(usage);
  
  // Check if reset is needed
  if (new Date(usageData.resetsAt) < new Date()) {
    usageData.used = 0;
    usageData.resetsAt = getMonthEnd();
    await env.USAGE_KV.put(`usage:${clientId}`, JSON.stringify(usageData));
  }

  return new Response(JSON.stringify({
    used: usageData.used,
    limit: 3,
    remaining: Math.max(0, 3 - usageData.used),
    resetsAt: usageData.resetsAt
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Handle Stripe Webhook
async function handleStripeWebhook(request, env) {
  // In production, verify webhook signature
  // const signature = request.headers.get('Stripe-Signature');
  // const isValid = await verifyStripeSignature(signature, request.body, env.STRIPE_WEBHOOK_SECRET);
  
  const event = await request.json();
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerId = session.customer_email;
    
    // Update user status in KV
    if (env.USAGE_KV && customerId) {
      await env.USAGE_KV.put(`user:${customerId}`, JSON.stringify({
        plan: session.mode === 'subscription' ? 'pro' : 'lifetime',
        subscribedAt: new Date().toISOString(),
        stripeCustomerId: session.customer
      }));
    }
    
    console.log(`User ${customerId} upgraded to ${session.mode === 'subscription' ? 'Pro' : 'Lifetime'}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper: Get Client ID from request
function getClientId(request) {
  // Use IP address or generate anonymous ID
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const userAgent = request.headers.get('User-Agent') || '';
  
  // Simple hash
  let hash = 0;
  const str = ip + userAgent;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `client_${Math.abs(hash).toString(16)}`;
}

// Helper: Get end of current month
function getMonthEnd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  return lastDay.toISOString();
}

// Helper: Verify Stripe signature (placeholder)
async function verifyStripeSignature(signature, body, secret) {
  // Implement Stripe signature verification
  // See: https://stripe.com/docs/webhooks/signatures
  return true; // Placeholder
}
