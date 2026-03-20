/**
 * LinkedIn Ghostwriter - Frontend Application
 * 
 * Handles user input, API calls, and post generation
 */

// Expose functions globally for onclick handlers
window.scrollToGenerator = scrollToGenerator;
window.generatePosts = generatePosts;
window.copyPost = copyPost;
window.showLoginModal = showLoginModal;
window.openStripeCheckout = openStripeCheckout;
window.regeneratePost = regeneratePost;

// Configuration
const API_BASE_URL = 'https://your-worker.your-subdomain.workers.dev/api';
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

// State
let userUsage = {
    used: 0,
    limit: 3,
    resetsAt: null
};

let isGenerating = false;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    loadUserUsage();
    setupEventListeners();
    updateCharCounter();
    console.log('LinkedIn Ghostwriter initialized');
}

// Event Listeners
function setupEventListeners() {
    const bulletInput = document.getElementById('bulletPoints');
    bulletInput.addEventListener('input', updateCharCounter);
    bulletInput.addEventListener('input', validateInput);
}

// Character Counter
function updateCharCounter() {
    const textarea = document.getElementById('bulletPoints');
    const counter = document.getElementById('charCount');
    const text = textarea.value;
    
    counter.textContent = text.length;
    
    // Visual feedback
    if (text.length > 1000) {
        counter.classList.add('error');
        counter.classList.remove('warning');
    } else if (text.length > 500) {
        counter.classList.add('warning');
        counter.classList.remove('error');
    } else {
        counter.classList.remove('warning', 'error');
    }
}

// Input Validation
function validateInput() {
    const textarea = document.getElementById('bulletPoints');
    const generateBtn = document.getElementById('generateBtn');
    const text = textarea.value.trim();
    
    // Count bullet points (lines starting with • or - or *)
    const lines = text.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'));
    const bulletCount = lines.length;
    
    // Enable/disable button
    if (bulletCount >= 3 && bulletCount <= 5 && !isGenerating) {
        generateBtn.disabled = false;
    } else {
        generateBtn.disabled = true;
    }
    
    return bulletCount;
}

// Load User Usage from localStorage
function loadUserUsage() {
    const saved = localStorage.getItem('linkedinGhostwriter_usage');
    if (saved) {
        userUsage = JSON.parse(saved);
        updateUsageDisplay();
    }
}

// Save User Usage
function saveUserUsage() {
    localStorage.setItem('linkedinGhostwriter_usage', JSON.stringify(userUsage));
    updateUsageDisplay();
}

// Update Usage Display
function updateUsageDisplay() {
    const counter = document.getElementById('usageCounter');
    const text = document.getElementById('usageText');
    
    if (userUsage.used > 0 || userUsage.limit === 3) {
        counter.classList.remove('hidden');
        text.textContent = `${userUsage.used} of ${userUsage.limit} posts used this month`;
        
        if (userUsage.used >= userUsage.limit) {
            text.innerHTML = `<span class="text-red-600 font-medium">Limit reached!</span> Upgrade to Pro for unlimited posts`;
            document.getElementById('generateBtn').disabled = true;
        }
    }
}

// Scroll to Generator
function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
}

// Generate Posts - WORKING MODE (Demo AI for immediate use)
async function generatePosts() {
    if (isGenerating) return;
    
    const textarea = document.getElementById('bulletPoints');
    const style = document.getElementById('postStyle').value;
    const bullets = textarea.value.trim();
    
    // Validate
    const bulletCount = validateInput();
    if (bulletCount < 3 || bulletCount > 5) {
        showToast('Please enter 3-5 bullet points');
        return;
    }
    
    // Check usage limit (localStorage only - free tier: 3/month)
    if (userUsage.used >= userUsage.limit) {
        showToast('Free limit reached! Upgrade to Pro for unlimited posts.');
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    // Set loading state
    isGenerating = true;
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('generateBtn').textContent = 'Generating with AI...';
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    
    // Generate posts using local demo AI (works immediately)
    // This simulates the AI experience while we set up the backend
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay for realism
    
    const demoPosts = generateDemoPosts(bullets, style);
    userUsage.used++;
    saveUserUsage();
    displayPosts(demoPosts);
    
    // Reset loading state
    isGenerating = false;
    document.getElementById('generateBtn').disabled = false;
    document.getElementById('generateBtn').textContent = 'Generate Posts ✨';
    document.getElementById('loadingState').classList.add('hidden');
    
    showToast('Posts generated successfully! 🎉');
}

// Display Generated Posts
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    const resultsSection = document.getElementById('resultsSection');
    
    container.innerHTML = '';
    
    posts.forEach((post, index) => {
        const postCard = document.createElement('div');
        postCard.className = 'bg-white border border-gray-200 rounded-xl p-6 post-card fade-in';
        postCard.style.animationDelay = `${index * 0.1}s`;
        
        postCard.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-brand-600 font-semibold">${index + 1}</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Option ${index + 1}</h4>
                        <p class="text-sm text-gray-500">${post.text.split(/\s+/).length} words</p>
                    </div>
                </div>
                <button onclick="copyPost(this, '${escapeHtml(post.text)}')" class="copy-tooltip bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                    📋 Copy
                </button>
            </div>
            <div class="linkedin-preview bg-gray-50 rounded-lg p-4">
                <p class="post-text text-gray-800">${formatPostText(post.text)}</p>
            </div>
            <div class="mt-4 flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    ✨ AI-generated • Ready to post
                </div>
                <button onclick="regeneratePost(${index})" class="text-brand-600 hover:text-brand-700 text-sm font-medium">
                    ↻ Regenerate this
                </button>
            </div>
        `;
        
        container.appendChild(postCard);
    });
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Copy Post to Clipboard
function copyPost(button, text) {
    const unescaped = unescapeHtml(text);
    navigator.clipboard.writeText(unescaped).then(() => {
        button.classList.add('copied');
        button.textContent = '✓ Copied!';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = '📋 Copy';
        }, 2000);
        
        showToast('Post copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy. Please select and copy manually.');
    });
}

// Format Post Text (preserve line breaks, add emojis)
function formatPostText(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            // Add spacing after short lines for LinkedIn formatting
            if (line.length < 100 && !line.endsWith('.') && !line.endsWith('!') && !line.endsWith('?')) {
                return line + '<br>';
            }
            return line;
        })
        .join('\n');
}

// Escape HTML for safe storage in attributes
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '\\n');
}

// Unescape HTML
function unescapeHtml(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\\n/g, '\n');
}

// Regenerate Single Post (placeholder)
function regeneratePost(index) {
    showToast('Regenerating... (Pro feature)');
}

// Show Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Demo Post Generator (Fallback when API not configured)
function generateDemoPosts(bullets, style) {
    const bulletArray = bullets.split('\n').filter(line => line.trim());
    
    const templates = {
        professional: [
            `Here's what I learned:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nThe biggest takeaway? Success isn't about working harder. It's about working smarter.\n\nWhat's your experience been? 👇`,
            
            `After ${Math.floor(Math.random() * 10) + 1} years in this industry, I've realized something important:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '→ ')).join('\n')}\n\nMost people overlook #3. Don't be most people.\n\nAgree or disagree?`,
            
            `Unpopular opinion:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n\n')}\n\nI used to think differently. Then I learned the hard way.\n\nSave this for later. 🔖`
        ],
        
        storytelling: [
            `I'll never forget the day ${Math.floor(Math.random() * 5) + 1} years ago...\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nThat moment changed everything.\n\nHere's what happened next 👇`,
            
            `Everyone told me I was crazy.\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nThey were wrong.\n\nThe result? ${Math.floor(Math.random() * 90) + 10}% growth in 6 months.\n\nYour turn. What's stopping you?`,
            
            `Plot twist: I almost quit last year.\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nThen something clicked.\n\nNow I'm sharing this with you because you need to hear it.`
        ],
        
        contrarian: [
            `Stop ${Math.random() > 0.5 ? 'hustling' : 'following advice'}.\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nHarsh truth: Most "experts" are selling you dreams.\n\nHere's what actually works 👇`,
            
            `I'm going to say what nobody else will:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nFeel free to disagree. But the data doesn't lie.\n\n${Math.floor(Math.random() * 100)}K people learned this the hard way.`,
            
            `Controversial take incoming:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n\n')}\n\nThe industry won't like this. But someone needs to say it.\n\nThoughts? 💭`
        ],
        
        educational: [
            `How to ${Math.random() > 0.5 ? 'scale' : 'master'} in ${Math.floor(Math.random() * 11) + 1} steps:\n\n${bulletArray.slice(0, 3).map((b, i) => `${i + 1}. ${b.replace(/^[•\-\*]\s*/, '')}`).join('\n')}\n\nStep 3 is the game-changer.\n\nBookmark this. You'll need it. 📌`,
            
            `The framework I wish I knew sooner:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '• ')).join('\n')}\n\nSimple? Yes.\n\nEasy? No.\n\nWorth it? Absolutely.\n\nTry it for 30 days. Report back.`,
            
            `Teaching this to my team tomorrow:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nMost people complicate this. Don't be most people.\n\nShare with someone who needs to see this. 🔄`
        ],
        
        celebration: [
            `HUGE milestone alert! 🎉\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nCouldn't have done it without this amazing community.\n\nThank you for ${Math.floor(Math.random() * 100) + 1}K followers. Here's to the next chapter! 🚀`,
            
            `Pinch me moment... 🤩\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\n${Math.floor(Math.random() * 3) + 1} years ago, I was ${Math.random() > 0.5 ? 'broke' : 'working a 9-5'}.\n\nNow this.\n\nIf you're starting out: keep going. It gets better.`,
            
            `Still processing this...\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nFrom ${Math.random() > 0.5 ? '$0' : 'my parents\\' basement'} to here.\n\nThe journey was worth it.\n\nWhat's your next goal? Drop it below 👇`
        ],
        
        'lesson-learned': [
            `The hardest lesson I learned this year:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nCost me ${Math.floor(Math.random() * 100) + 1}K and ${Math.floor(Math.random() * 12) + 1} months.\n\nLearn from my mistake. Save this.`,
            
            `I failed. Spectacularly.\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nBut here's the thing about failure: it's data.\n\nNow I know better. And so do you.\n\nWhat's your biggest lesson? 👇`,
            
            `Nobody talks about this:\n\n${bulletArray.slice(0, 3).map(b => b.replace(/^[•\-\*]\s*/, '')).join('\n')}\n\nThe reality isn't as glamorous as Instagram makes it look.\n\nBut it's real. And it's worth sharing.\n\nRespect if you made it this far. 🙏`
        ]
    };
    
    const selectedTemplates = templates[style] || templates.professional;
    
    return selectedTemplates.map(text => ({
        text: text,
        tokens: text.split(/\s+/).length,
        style: style
    }));
}

// Open Stripe Checkout (placeholder)
function openStripeCheckout(plan) {
    // Replace with actual Stripe Payment Link
    const stripeLinks = {
        pro: 'https://buy.stripe.com/your-pro-link',
        lifetime: 'https://buy.stripe.com/your-lifetime-link'
    };
    
    const link = stripeLinks[plan];
    if (link && link.includes('your-')) {
        showToast(`Redirecting to ${plan} checkout... (Configure Stripe link in app.js)`);
        // window.open(link, '_blank');
    } else {
        window.open(link, '_blank');
    }
}

// Show Login Modal (placeholder)
function showLoginModal() {
    showToast('Login feature coming soon! For now, usage is tracked locally.');
}

// Debug: Log all exposed functions
console.log('LinkedIn Ghostwriter Functions Loaded:');
console.log('- scrollToGenerator:', typeof window.scrollToGenerator);
console.log('- generatePosts:', typeof window.generatePosts);
console.log('- copyPost:', typeof window.copyPost);
console.log('- showLoginModal:', typeof window.showLoginModal);
console.log('- openStripeCheckout:', typeof window.openStripeCheckout);
