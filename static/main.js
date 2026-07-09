
const particlesContainer = document.getElementById('particles');
const particleCount = 50;

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size = Math.random() * 6 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';

    particlesContainer.appendChild(particle);
}


// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        }
    });
});


// ===== PARALLAX =====
document.addEventListener('mousemove', (e) => {
    const circles = document.querySelectorAll('.circle');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    circles.forEach((circle, index) => {
        const speed = (index + 1) * 10;
        circle.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
});


// ===== SCROLL ANIMATIONS =====
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
});


// ===== DESKTOP SIDEBAR =====
const sidebar = document.getElementById('sidebar');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

if (sidebar) {
    sidebar.addEventListener('click', (e) => {
        if (!sidebar.classList.contains('expanded') &&
            !e.target.closest('#sidebarCloseBtn') &&
            !e.target.closest('#accountBtnDesktop')) {
            sidebar.classList.add('expanded');
        }
    });
}

if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.remove('expanded');
    });
}


// ===== SUPABASE CLIENT =====
const supabaseClient = window.supabase.createClient(
    'https://rojoabcomeekdajowuvv.supabase.co',
    'sb_publishable_CWuH-Tz5zrAh6xVHmt39Bg_eUe2taPo'
);

let currentSession = null;

// ===== ACCOUNT / AUTH MODALS =====
const mobileAccountDrawer = document.getElementById('mobileAccountDrawer');
const accountHamburgerBtn = document.getElementById('accountHamburgerBtn');
const drawerCloseBtn      = document.getElementById('drawerCloseBtn');
const accountBtnDesktop   = document.getElementById('accountBtnDesktop');
const authModalOverlay    = document.getElementById('authModalOverlay');
const signInCard          = document.getElementById('signInCard');
const signUpCard          = document.getElementById('signUpCard');

if (accountHamburgerBtn) {
    accountHamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mobileAccountDrawer.classList.toggle('active');
    });
}

if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', () => {
        mobileAccountDrawer.classList.remove('active');
    });
}

if (accountBtnDesktop) {
    accountBtnDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentSession) {
            handleSignOut();
        } else {
            openAuthModal('signin');
        }
    });
}

function openAuthModal(mode) {
    mobileAccountDrawer.classList.remove('active');
    authModalOverlay.classList.add('active');
    switchAuthCard(mode);
}

function closeAuthModal() {
    authModalOverlay.classList.remove('active');
}

function switchAuthCard(mode) {
    if (mode === 'signin') {
        signInCard.style.display = 'block';
        signUpCard.style.display = 'none';
        document.getElementById('signInError').textContent = '';
    } else {
        signInCard.style.display = 'none';
        signUpCard.style.display = 'block';
        document.getElementById('signUpError').textContent = '';
    }
}

if (authModalOverlay) {
    authModalOverlay.addEventListener('click', (e) => {
        if (e.target === authModalOverlay) closeAuthModal();
    });
}

// ===== AUTH HANDLERS =====
async function handleSignIn() {
    const email    = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;
    const errorEl  = document.getElementById('signInError');
    errorEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = 'Please enter your email and password.';
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        errorEl.textContent = error.message;
        return;
    }

    currentSession = data.session;
    closeAuthModal();
    updateAuthUI();
    await loadProfile();
}

async function handleSignUp() {
    const username  = document.getElementById('signUpUsername').value.trim();
    const firstName = document.getElementById('signUpFirstName').value.trim();
    const lastName  = document.getElementById('signUpLastName').value.trim();
    const email     = document.getElementById('signUpEmail').value.trim();
    const password  = document.getElementById('signUpPassword').value;
    const confirm   = document.getElementById('signUpConfirmPassword').value;
    const errorEl   = document.getElementById('signUpError');
    errorEl.style.color = '#ef4444';
    errorEl.textContent = '';

    if (!username || !firstName || !lastName || !email || !password || !confirm) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
    }

    const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { username, first_name: firstName, last_name: lastName }
        }
    });

    if (error) {
        errorEl.textContent = error.message;
        return;
    }

    errorEl.style.color = '#10b981';
    errorEl.textContent = 'Check your email for a confirmation link!';
}

async function handleSignOut() {
    await supabaseClient.auth.signOut();
    currentSession = null;
    updateAuthUI();
    document.getElementById('historyGrid').innerHTML =
        '<p class="no-history">Sign in to view your history.</p>';
}

// ===== AUTH STATE =====
function updateAuthUI() {
    const isLoggedIn = !!currentSession;

    // Update desktop sidebar Account button label
    const label = accountBtnDesktop?.querySelector('.sidebar-label');
    if (label) label.textContent = isLoggedIn ? 'Sign Out' : 'Account';

    // Update mobile drawer
    const drawerContent = document.querySelector('.drawer-content');
    if (drawerContent) {
        drawerContent.innerHTML = isLoggedIn
            ? `<p style="margin-bottom:15px; color: var(--text-color);">Signed in as<br><strong>${currentSession.user.email}</strong></p>
               <button class="btn btn-primary auth-trigger-btn" onclick="handleSignOut()">Sign Out</button>`
            : `<button class="btn btn-primary auth-trigger-btn" onclick="openAuthModal('signin')">Sign In</button>
               <button class="btn-secondary-action auth-trigger-btn" onclick="openAuthModal('signup')" style="margin-top: 15px; width: 100%;">Sign Up</button>`;
    }

    // Show/hide generate buttons based on login state
    const generateBtn          = document.getElementById('generateBtn');
    const influencerGenerateBtn = document.getElementById('influencerGenerateBtn');
    if (generateBtn) generateBtn.disabled = isLoggedIn ? !currentImageFile : true;
    if (influencerGenerateBtn) influencerGenerateBtn.disabled = isLoggedIn ? influencerImages.length === 0 : true;
}

// ===== PROFILE / USAGE DISPLAY =====
async function loadProfile() {
    if (!currentSession) return;

    try {
        const response = await fetch('/profile', {
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        const data = await response.json();
        if (!data.profile) return;

        const p = data.profile;
        const standardLeft   = p.is_admin ? '∞' : Math.max(0, 3 - p.standard_uses);
        const influencerLeft = p.is_admin ? '∞' : Math.max(0, 2 - p.influencer_uses);
        const bonusLeft      = p.bonus_credits || 0;

        console.log(`Usage — Standard: ${standardLeft} left, Influencer: ${influencerLeft} left, Bonus credits: ${bonusLeft}`);
        // You can surface this in the UI later — for now it's logged
    } catch (err) {
        console.error('Could not load profile:', err);
    }
}

// ===== SESSION INIT =====
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    updateAuthUI();
    if (session) {
        loadHistory();
        loadProfile();
    }
});

// ===== THEME TOGGLE =====
// localStorage is intentionally kept here — theme is a UI preference, not data
const themeToggleSide   = document.getElementById('themeToggleSide');
const themeToggleMobile = document.getElementById('themeToggleMobile');

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

function toggleTheme(e) {
    e.preventDefault();
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

if (themeToggleSide)   themeToggleSide.addEventListener('click', toggleTheme);
if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);


// ===== MODE SWITCHING =====
let currentMode       = 'standard';
let influencerImages  = [];
let influencerCaptions = [];

let standardPlatforms   = [];
let influencerPlatforms = [];

async function loadPlatforms() {
    try {
        const [stdRes, infRes] = await Promise.all([
            fetch('/platforms?mode=standard'),
            fetch('/platforms?mode=influencer')
        ]);
        const stdData = await stdRes.json();
        const infData = await infRes.json();
        standardPlatforms   = stdData.platforms || [];
        influencerPlatforms = infData.platforms || [];
        renderPlatformOptions();
    } catch (err) {
        console.error('Could not load platforms:', err);
    }
}

function renderPlatformOptions() {
    const select = document.getElementById('captionPlatform');
    const list = currentMode === 'influencer' ? influencerPlatforms : standardPlatforms;
    select.innerHTML = list.map(p => `<option value="${p.key}">${p.label}</option>`).join('');
}

function switchMode(mode) {
    currentMode = mode;
    renderPlatformOptions();


    const standardUploadCard   = document.getElementById('standardUploadCard');
    const influencerUploadCard = document.getElementById('influencerUploadCard');
    const standardContextCard  = document.getElementById('standardContextCard');
    const influencerContextCard= document.getElementById('influencerContextCard');
    const standardCaptionCard  = document.getElementById('standardCaptionCard');
    const influencerCaptionCard= document.getElementById('influencerCaptionCard');
    const modeIndicator        = document.getElementById('modeIndicator');
    const standardModeBtn      = document.getElementById('standardModeBtn');
    const influencerModeBtn    = document.getElementById('influencerModeBtn');

    if (mode === 'standard') {
        standardUploadCard.style.display    = 'block';
        influencerUploadCard.style.display  = 'none';
        standardContextCard.style.display   = 'block';
        influencerContextCard.style.display = 'none';
        standardCaptionCard.style.display   = 'block';
        influencerCaptionCard.style.display = 'none';
        modeIndicator.textContent = 'Standard Mode';
        standardModeBtn.classList.add('mode-btn-active');
        influencerModeBtn.classList.remove('mode-btn-active');
        clearStandardMode();
    } else {
        standardUploadCard.style.display    = 'none';
        influencerUploadCard.style.display  = 'block';
        standardContextCard.style.display   = 'none';
        influencerContextCard.style.display = 'block';
        standardCaptionCard.style.display   = 'none';
        influencerCaptionCard.style.display = 'block';
        modeIndicator.textContent = 'Influencer Mode (Pro)';
        standardModeBtn.classList.remove('mode-btn-active');
        influencerModeBtn.classList.add('mode-btn-active');
        clearInfluencerMode();
    }
}

function clearStandardMode() {
    currentImageFile = null;
    uploadArea.style.display  = 'block';
    previewArea.style.display = 'none';
    fileInput.value = '';
    generateBtn.disabled = true;
    document.getElementById('captionContent').innerHTML =
        '<p class="placeholder-text">No caption yet. Upload an image to get started.</p>';
    document.getElementById('captionContext').value = '';
}

function clearInfluencerMode() {
    influencerImages   = [];
    influencerCaptions = [];
    document.getElementById('influencerUploadArea').style.display  = 'block';
    document.getElementById('influencerPreviewArea').style.display = 'none';
    document.getElementById('influencerFileInput').value = '';
    document.getElementById('influencerContext').value   = '';
    document.getElementById('influencerGenerateBtn').disabled = true;
    document.getElementById('captionsGrid').innerHTML =
        '<p class="placeholder-text">No captions yet. Upload images and describe your post to get started.</p>';
}


// ===== IMAGE UPLOAD — STANDARD MODE =====
let currentImageFile = null;
let currentCaption   = '';

const uploadArea   = document.getElementById('uploadArea');
const fileInput    = document.getElementById('fileInput');
const previewArea  = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const generateBtn  = document.getElementById('generateBtn');

if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#a855f7';
        uploadArea.style.background  = 'rgba(168, 85, 247, 0.1)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        uploadArea.style.background  = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        uploadArea.style.background  = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleImageUpload(file);
    });

    uploadArea.addEventListener('click', () => { fileInput.click(); });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });
}

function handleImageUpload(file) {
    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadArea.style.display  = 'none';
        previewArea.style.display = 'block';
        generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImageFile = null;
    uploadArea.style.display  = 'block';
    previewArea.style.display = 'none';
    fileInput.value = '';
    generateBtn.disabled = true;
}


// ===== IMAGE UPLOAD — INFLUENCER MODE =====
const influencerUploadArea   = document.getElementById('influencerUploadArea');
const influencerFileInput    = document.getElementById('influencerFileInput');
const influencerPreviewArea  = document.getElementById('influencerPreviewArea');
const influencerGenerateBtn  = document.getElementById('influencerGenerateBtn');

if (influencerUploadArea) {
    influencerUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        influencerUploadArea.style.borderColor = '#a855f7';
        influencerUploadArea.style.background  = 'rgba(168, 85, 247, 0.1)';
    });

    influencerUploadArea.addEventListener('dragleave', () => {
        influencerUploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        influencerUploadArea.style.background  = '';
    });

    influencerUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        influencerUploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        influencerUploadArea.style.background  = '';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleInfluencerImageUpload(files);
    });

    influencerUploadArea.addEventListener('click', () => { influencerFileInput.click(); });
}

if (influencerFileInput) {
    influencerFileInput.addEventListener('change', (e) => {
        handleInfluencerImageUpload(Array.from(e.target.files));
    });
}

function handleInfluencerImageUpload(files) {
    const maxFiles   = 5;
    const filesToAdd = files.slice(0, maxFiles - influencerImages.length);

    filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Store both the data URL (for preview) and the raw File (for upload)
            influencerImages.push({ dataUrl: e.target.result, file });
            renderInfluencerPreview();
            influencerGenerateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });
}

function renderInfluencerPreview() {
    const previewCarousel = document.getElementById('previewCarousel');
    const previewCount    = document.getElementById('previewCount');

    previewCount.textContent = `${influencerImages.length} image${influencerImages.length !== 1 ? 's' : ''} selected`;

    previewCarousel.innerHTML = influencerImages.map((img, index) => `
        <div class="preview-thumbnail-wrapper">
            <img src="${img.dataUrl}" class="preview-thumbnail" alt="Preview ${index + 1}">
            <button class="remove-thumbnail-btn" onclick="removeInfluencerImage(${index})">×</button>
        </div>
    `).join('');

    if (influencerImages.length > 0) {
        influencerUploadArea.style.display  = 'none';
        influencerPreviewArea.style.display = 'block';
    } else {
        influencerUploadArea.style.display  = 'block';
        influencerPreviewArea.style.display = 'none';
    }
}

function removeInfluencerImage(index) {
    influencerImages.splice(index, 1);
    renderInfluencerPreview();
    if (influencerImages.length === 0) {
        influencerGenerateBtn.disabled = true;
    }
}

function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ===== CAPTION GENERATION — STANDARD MODE =====
async function generateCaption() {
    if (!currentImageFile) {
        alert('Please upload an image first!');
        return;
    }

    const captionContent = document.getElementById('captionContent');
    captionContent.innerHTML = `
        <div style="text-align: center;">
            <div class="loading"></div>
            <p style="margin-top: 15px; color: #9ca3af;">Generating your caption...</p>
        </div>
    `;
    generateBtn.disabled = true;

    const formData = new FormData();
    formData.append('image_file', currentImageFile);
    formData.append('platform',  document.getElementById('captionPlatform').value);
    formData.append('style',     document.getElementById('captionStyle').value);
    formData.append('tone',      document.getElementById('captionTone').value);
    formData.append('language',  document.getElementById('captionLanguage').value);
    formData.append('length',    document.getElementById('captionLength').value);
    formData.append('emojis',    document.getElementById('includeEmojis').checked ? 'true' : 'false');
    formData.append('hashtags',  document.getElementById('includeHashtags').checked ? 'true' : 'false');
    formData.append('context',   document.getElementById('captionContext').value);

    try {
        const response = await fetch('/generate-caption', {
        method: 'POST',
        body: formData,
        headers: currentSession ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {}
        });        
        const data = await response.json();

        if (!response.ok) {
            if (data.limit_reached) {
                captionContent.innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <p style="color:#ef4444; margin-bottom:15px;">${data.error}</p>
                        <a href="mailto:saumya.tagore@email.com" class="btn btn-primary" style="text-decoration:none;">
                            Contact Creator
                        </a>
                    </div>`;
                return;
            }
            throw new Error(data.error || data.caption || 'Server error');
        }
        currentCaption = data.caption;
        captionContent.innerHTML = `<p>${currentCaption.replace(/\n/g, '<br>')}</p>`;
        await loadHistory();
    } 
    catch (err) {
        captionContent.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}</p>`;
    } finally {
        generateBtn.disabled = false;
    }
}


// ===== CAPTION GENERATION — INFLUENCER MODE =====
async function generateInfluencerCaptions() {
    const influencerContext = document.getElementById('influencerContext').value;

    if (!influencerContext.trim()) {
        alert('Please describe your post to generate captions!');
        return;
    }

    if (influencerImages.length === 0) {
        alert('Please upload at least one image!');
        return;
    }

    const captionsGrid = document.getElementById('captionsGrid');
    captionsGrid.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1;">
            <div class="loading"></div>
            <p style="margin-top: 15px; color: #9ca3af;">Generating captions...</p>
        </div>
    `;
    influencerGenerateBtn.disabled = true;

    const formData = new FormData();
    influencerImages.forEach(img => formData.append('image_files', img.file));
    formData.append('platform', document.getElementById('captionPlatform').value);
    formData.append('style',    document.getElementById('captionStyle').value);
    formData.append('tone',     document.getElementById('captionTone').value);
    formData.append('language', document.getElementById('captionLanguage').value);
    formData.append('length',   document.getElementById('captionLength').value);
    formData.append('emojis',   document.getElementById('includeEmojis').checked ? 'true' : 'false');
    formData.append('hashtags', document.getElementById('includeHashtags').checked ? 'true' : 'false');
    formData.append('context',  influencerContext);

    try {
        const response = await fetch('/generate-influencer-captions', {
                method: 'POST',
                body: formData,
                headers: currentSession ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {}
        });        
        const data     = await response.json();

        if (!response.ok) {
            if (data.limit_reached) {
                captionsGrid.innerHTML = `
                    <div style="text-align:center; padding: 20px; grid-column: 1/-1;">
                        <p style="color:#ef4444; margin-bottom:15px;">${data.error}</p>
                        <a href="mailto:saumya.tagore@email.com" class="btn btn-primary" style="text-decoration:none;">
                            Contact Creator
                        </a>
                    </div>`;
                return;
            }
            throw new Error(data.error || 'Server error');
        }
        influencerCaptions = data.captions;
        renderInfluencerCaptions();
        await loadHistory();
    } 
    catch (err) {
        captionsGrid.innerHTML = `<p style="color: #ef4444; grid-column: 1 / -1;">Error: ${err.message}</p>`;
    } finally {
        influencerGenerateBtn.disabled = false;
    }
}

function renderInfluencerCaptions() {
    const captionsGrid = document.getElementById('captionsGrid');
    captionsGrid.innerHTML = influencerCaptions.map((caption, index) => `
        <div class="caption-option">
            <div class="caption-option-header">
                <h4>Option ${index + 1}</h4>
                <input type="radio" name="selected-caption" value="${index}" onchange="selectCaption(${index})">
            </div>
            <div class="caption-option-content">
                <p>${caption.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="caption-option-actions">
                <button class="btn-secondary-action" onclick="copyInfluencerCaption(${index})">
                    <i class="fa-solid fa-copy"></i> Copy
                </button>
            </div>
        </div>
    `).join('');
}

let selectedCaptionIndex = 0;
function selectCaption(index) {
    selectedCaptionIndex = index;
}

function copyInfluencerCaption(index) {
    navigator.clipboard.writeText(influencerCaptions[index]).then(() => {
        alert('Caption copied to clipboard!');
    });
}


// ===== CAPTION ACTIONS =====
function clearCaption() {
    document.getElementById('captionContent').innerHTML =
        '<p class="placeholder-text">No caption yet. Upload an image to get started.</p>';
    currentCaption = '';
    document.getElementById('captionContext').value = '';
}

function clearInfluencerCaptions() {
    document.getElementById('captionsGrid').innerHTML =
        '<p class="placeholder-text">No captions yet. Upload images and describe your post to get started.</p>';
    influencerCaptions = [];
}

function copyCaption() {
    if (!currentCaption) return alert('No caption to copy!');
    navigator.clipboard.writeText(currentCaption).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        btn.style.background   = 'rgba(16, 185, 129, 0.2)';
        btn.style.borderColor  = '#10b981';
        btn.style.color        = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = '';
        }, 2000);
    });
}

function downloadCaption() {
    if (!currentCaption) return alert('No caption to download!');
    const blob = new Blob([currentCaption], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `caption_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// ===== HISTORY =====
async function loadHistory() {
    const historyGrid = document.getElementById('historyGrid');
    if (!historyGrid) return;

    if (!currentSession) {
        historyGrid.innerHTML = '<p class="no-history">Sign in to view your history.</p>';
        return;
    }

    try {
        const response = await fetch('/history', {
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        const data = await response.json();
        renderHistory(data.history || []);
    } catch (err) {
        historyGrid.innerHTML = '<p class="no-history">Could not load history.</p>';
    }
}

function getImageUrl(fullPath) {
    // Extract just the filename from a full disk path (works for both / and \ separators)
    const filename = fullPath.split(/[\\/]/).pop();
    return `/saved_images/${filename}`;
}

function renderHistory(items) {
    const historyGrid = document.getElementById('historyGrid');
    if (!historyGrid) return;

    if (items.length === 0) {
        historyGrid.innerHTML = '<p class="no-history">No history yet. Generate your first caption!</p>';
        return;
    }

    historyGrid.innerHTML = items.map(item => {
        const paths = item.image_paths || [];
        const thumbsHtml = paths.map(p => `
            <img src="${getImageUrl(p)}" class="history-thumb" alt="${escapeHtml(item.image_name || '')}">
        `).join('');

        return `
            <div class="history-item" onclick="viewHistoryItem('${escapeHtml(item.caption)}')">
                <div class="history-thumbs">${thumbsHtml}</div>
                <div class="history-content">
                    <p class="history-caption">${escapeHtml(item.caption)}</p>
                    <p class="history-date">${item.created_at}</p>
                </div>
                <div class="history-actions">
                    <button class="history-btn" onclick="event.stopPropagation(); copyHistoryCaption('${escapeAttr(item.caption)}')">Copy</button>
                    <button class="history-btn" onclick="event.stopPropagation(); deleteHistoryItem(${item.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
    return str.replace(/'/g, '&#39;').replace(/\n/g, '\\n');
}

function viewHistoryItem(caption) {
    currentCaption = caption;
    document.getElementById('captionContent').innerHTML =
        `<p>${escapeHtml(caption).replace(/\\n/g, '<br>')}</p>`;
}

function copyHistoryCaption(caption) {
    navigator.clipboard.writeText(caption.replace(/\\n/g, '\n')).then(() => {
        alert('Caption copied to clipboard!');
    });
}

async function deleteHistoryItem(id) {
    if (!currentSession) return;
    try {
        await fetch(`/history/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        await loadHistory();
    } catch (err) {
        alert('Could not delete record.');
    }
}

async function clearHistory() {
    if (!currentSession) return;
    if (!confirm('Are you sure you want to clear all history?')) return;
    try {
        await fetch('/history', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        await loadHistory();
    } catch (err) {
        alert('Could not clear history.');
    }
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (generateBtn) generateBtn.disabled = true;
    switchMode('standard');
    loadPlatforms();
    loadHistory();
});
