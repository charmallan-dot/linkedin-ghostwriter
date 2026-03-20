/**
 * LinkedIn Ghostwriter - FIXED VERSION
 * All functions exposed globally for onclick handlers
 */

// ===== STATE =====
let userUsage = { used: 0, limit: 3 };
let isGenerating = false;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ LinkedIn Ghostwriter Loaded!');
    loadUserUsage();
    setupEventListeners();
    updateCharCounter();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    const bulletInput = document.getElementById('bulletPoints');
    if (bulletInput) {
        bulletInput.addEventListener('input', function() {
            updateCharCounter();
            validateInput();
        });
    }
}

// ===== SCROLL TO GENERATOR =====
function scrollToGenerator() {
    console.log('📍 Scrolling to generator...');
    const generator = document.getElementById('generator');
    if (generator) {
        generator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
window.scrollToGenerator = scrollToGenerator;

// ===== CHARACTER COUNTER =====
function updateCharCounter() {
    const textarea = document.getElementById('bulletPoints');
    const counter = document.getElementById('charCount');
    if (textarea && counter) {
        counter.textContent = textarea.value.length;
    }
}

// ===== INPUT VALIDATION =====
function validateInput() {
    const textarea = document.getElementById('bulletPoints');
    const generateBtn = document.getElementById('generateBtn');
    
    if (!textarea || !generateBtn) return false;
    
    const text = textarea.value.trim();
    const lines = text.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'));
    const bulletCount = lines.length;
    
    generateBtn.disabled = !(bulletCount >= 3 && bulletCount <= 5 && !isGenerating);
    return bulletCount >= 3 && bulletCount <= 5;
}

// ===== LOAD USER USAGE =====
function loadUserUsage() {
    try {
        const saved = localStorage.getItem('linkedinGhostwriter_usage');
        if (saved) {
            userUsage = JSON.parse(saved);
            updateUsageDisplay();
        }
    } catch (e) {
        console.log('Usage tracking not available');
    }
}

// ===== UPDATE USAGE DISPLAY =====
function updateUsageDisplay() {
    const counter = document.getElementById('usageCounter');
    const text = document.getElementById('usageText');
    
    if (counter && text) {
        counter.classList.remove('hidden');
        text.textContent = userUsage.used + ' of ' + userUsage.limit + ' posts used this month';
        
        if (userUsage.used >= userUsage.limit) {
            text.innerHTML = '<span class="text-red-600 font-medium">Limit reached!</span> Upgrade to Pro for unlimited posts';
            const btn = document.getElementById('generateBtn');
            if (btn) btn.disabled = true;
        }
    }
}

// ===== GENERATE POSTS - MAIN FUNCTION =====
function generatePosts() {
    console.log('🚀 Generating posts...');
    
    if (isGenerating) {
        console.log('Already generating!');
        return;
    }
    
    const textarea = document.getElementById('bulletPoints');
    const styleSelect = document.getElementById('postStyle');
    
    if (!textarea || !styleSelect) {
        console.error('Missing form elements!');
        showToast('Error: Form not loaded. Please refresh.');
        return;
    }
    
    const bullets = textarea.value.trim();
    const style = styleSelect.value;
    
    // Validate bullet count
    const lines = bullets.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'));
    const bulletCount = lines.length;
    
    if (bulletCount < 3 || bulletCount > 5) {
        showToast('Please enter 3-5 bullet points (start each with • or -)');
        return;
    }
    
    // Check usage limit
    if (userUsage.used >= userUsage.limit) {
        showToast('Free limit reached! Upgrade to Pro for unlimited posts.');
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    // Set loading state
    isGenerating = true;
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('loadingState');
    const resultsSection = document.getElementById('resultsSection');
    
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
    }
    
    if (loadingState) loadingState.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');
    
    // Simulate AI generation (1.5 second delay)
    setTimeout(function() {
        const demoPosts = generateDemoPosts(bullets, style);
        
        // Update usage
        userUsage.used++;
        try {
            localStorage.setItem('linkedinGhostwriter_usage', JSON.stringify(userUsage));
        } catch (e) {
            console.log('Could not save usage');
        }
        
        updateUsageDisplay();
        displayPosts(demoPosts);
        
        // Reset state
        isGenerating = false;
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Posts ✨';
        }
        if (loadingState) loadingState.classList.add('hidden');
        
        showToast('Posts generated successfully! 🎉');
    }, 1500);
}
window.generatePosts = generatePosts;

// ===== DISPLAY POSTS =====
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!container) {
        console.error('Posts container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    posts.forEach(function(post, index) {
        const postCard = document.createElement('div');
        postCard.className = 'bg-white border border-gray-200 rounded-xl p-6 mb-4 fade-in';
        postCard.style.animationDelay = (index * 0.1) + 's';
        
        const wordCount = post.text.split(/\s+/).length;
        
        postCard.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-blue-600 font-semibold">${index + 1}</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">Option ${index + 1}</h4>
                        <p class="text-sm text-gray-500">${wordCount} words</p>
                    </div>
                </div>
                <button onclick="copyPostText('${escapeHtml(post.text)}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                    📋 Copy
                </button>
            </div>
            <div class="linkedin-preview bg-gray-50 rounded-lg p-4">
                <p class="post-text text-gray-800 whitespace-pre-line">${escapeHtml(post.text)}</p>
            </div>
        `;
        
        container.appendChild(postCard);
    });
    
    if (resultsSection) {
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== COPY POST =====
function copyPostText(text) {
    const unescaped = unescapeHtml(text);
    navigator.clipboard.writeText(unescaped).then(function() {
        showToast('Post copied to clipboard! ✓');
    }).catch(function(err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy. Select and copy manually.');
    });
}
window.copyPostText = copyPostText;

// ===== DEMO POST GENERATOR =====
function generateDemoPosts(bullets, style) {
    const bulletArray = bullets.split('\n').filter(function(line) {
        return line.trim().length > 0;
    });
    
    const cleanBullets = bulletArray.map(function(b) {
        return b.replace(/^[•\-\*]\s*/, '');
    });
    
    // Generate 3 variations based on style
    return [
        {
            text: "Here's what I learned:\n\n" + cleanBullets.slice(0, 3).join('\n') + "\n\nThe biggest takeaway? Success isn't about working harder. It's about working smarter.\n\nWhat's your experience been? 👇",
            style: style
        },
        {
            text: "After " + (Math.floor(Math.random() * 10) + 1) + " years in this industry:\n\n" + cleanBullets.map(function(b) { return '→ ' + b; }).join('\n') + "\n\nMost people overlook the last point. Don't be most people.\n\nAgree or disagree?",
            style: style
        },
        {
            text: "Unpopular opinion:\n\n" + cleanBullets.join('\n\n') + "\n\nI used to think differently. Then I learned the hard way.\n\nSave this for later. 🔖",
            style: style
        }
    ];
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function unescapeHtml(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.remove();
    }, 3000);
}

// ===== PLACEHOLDER FUNCTIONS =====
function showLoginModal() {
    showToast('Login coming soon! Usage tracked locally for now.');
}
window.showLoginModal = showLoginModal;

function openStripeCheckout(plan) {
    showToast('Stripe integration coming soon! Contact us for early access.');
}
window.openStripeCheckout = openStripeCheckout;

function regeneratePost(index) {
    showToast('Regenerating... (Pro feature)');
}
window.regeneratePost = regeneratePost;

// ===== DEBUG LOG =====
console.log('✅ All functions loaded:');
console.log('  - scrollToGenerator:', typeof window.scrollToGenerator);
console.log('  - generatePosts:', typeof window.generatePosts);
console.log('  - copyPostText:', typeof window.copyPostText);
console.log('  - showLoginModal:', typeof window.showLoginModal);
