// Create floating particles
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

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Parallax effect on mouse move
document.addEventListener('mousemove', (e) => {
    const circles = document.querySelectorAll('.circle');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    circles.forEach((circle, index) => {
        const speed = (index + 1) * 10;
        circle.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
});

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

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

// Global variables
let currentImage = null;
let currentCaption = '';
let historyData = JSON.parse(localStorage.getItem('captionHistory')) || [];

// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const generateBtn = document.getElementById('generateBtn');

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#a855f7';
    uploadArea.style.background = 'rgba(168, 85, 247, 0.1)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
    uploadArea.style.background = '';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(168, 85, 247, 0.5)';
    uploadArea.style.background = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
});

// Click to upload
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageUpload(file);
    }
});

// Handle image upload
function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImage = e.target.result;
        previewImage.src = e.target.result;
        uploadArea.style.display = 'none';
        previewArea.style.display = 'block';
        generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// Remove image
function removeImage() {
    currentImage = null;
    uploadArea.style.display = 'block';
    previewArea.style.display = 'none';
    fileInput.value = '';
    generateBtn.disabled = true;
}

// Scroll to generator
function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Generate caption
async function generateCaption() {
    if (!currentImage) {
        alert('Please upload an image first!');
        return;
    }

    const captionContent = document.getElementById('captionContent');
    captionContent.innerHTML = `
        <div style="text-align: center;">
            <div class="loading"></div>
            <p style="margin-top: 15px; color: #9ca3af;">
                Generating your caption using AI...
            </p>
        </div>
    `;

    const style = document.getElementById('captionStyle').value;
    const length = document.getElementById('captionLength').value;
    const includeEmojis = document.getElementById('includeEmojis').checked;
    const includeHashtags = document.getElementById('includeHashtags').checked;

    try {
        // Convert base64 image to Blob
        const response = await fetch(currentImage);
        const blob = await response.blob();

        // Prepare form data
        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');
        formData.append('style', style);
        formData.append('length', length);
        formData.append('emojis', includeEmojis);
        formData.append('hashtags', includeHashtags);

        // Send to Flask backend
        const apiResponse = await fetch('/generate-caption', {
            method: 'POST',
            body: formData
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            throw new Error(data.caption || 'Failed to generate caption');
        }

        currentCaption = data.caption;

        captionContent.innerHTML = `
            <p>${currentCaption.replace(/\n/g, '<br>')}</p>
        `;

        // Save to history
        addToHistory(currentImage, currentCaption);

    } catch (error) {
        captionContent.innerHTML = `
            <p style="color: #ef4444; text-align: center;">
                ❌ Error generating caption.<br>
                ${error.message}
            </p>
        `;
        console.error(error);
    }
}

// Clear caption
function clearCaption() {
    document.getElementById('captionContent').innerHTML = '<p class="placeholder-text">No caption yet. Upload an image to get started.</p>';
    currentCaption = '';
}

// Copy caption
function copyCaption() {
    if (!currentCaption) {
        alert('No caption to copy!');
        return;
    }

    navigator.clipboard.writeText(currentCaption).then(() => {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#10b981';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    });
}

// Download caption
function downloadCaption() {
    if (!currentCaption) {
        alert('No caption to download!');
        return;
    }

    const blob = new Blob([currentCaption], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caption_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

//
function createThumbnail(base64Image, maxWidth = 200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = maxWidth / img.width;
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            resolve(canvas.toDataURL('image/jpeg', 0.6)); // compressed
        };
        img.src = base64Image;
    });
}

// Add to history
async function addToHistory(image, caption) {
    const thumbnail = await createThumbnail(image);

    const historyItem = {
        id: Date.now(),
        thumbnail: thumbnail,   // LOW-RES
        caption: caption,
        date: new Date().toLocaleString()
    };

    historyData.unshift(historyItem);

    if (historyData.length > 12) {
        historyData = historyData.slice(0, 12);
    }

    localStorage.setItem('captionHistory', JSON.stringify(historyData));
    renderHistory();
}

// Render history
function renderHistory() {
    const historyGrid = document.getElementById('historyGrid');

    if (historyData.length === 0) {
        historyGrid.innerHTML = '<p class="no-history">No history yet. Generate your first caption!</p>';
        return;
    }

    historyGrid.innerHTML = historyData.map(item => `
        <div class="history-item" onclick="viewHistoryItem(${item.id})">
        <img src="${item.thumbnail}" class="history-image">
            <div class="history-content">
                <p class="history-caption">${item.caption}</p>
                <p class="history-date">${item.date}</p>
            </div>
            <div class="history-actions">
                <button class="history-btn" onclick="event.stopPropagation(); copyHistoryCaption(${item.id})">Copy</button>
                <button class="history-btn" onclick="event.stopPropagation(); deleteHistoryItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// View history item
function viewHistoryItem(id) {
    const item = historyData.find(h => h.id === id);
    if (item) {
        // currentImage = item.thumbnail;
        currentCaption = item.caption;
        previewImage.src = item.image;
        // uploadArea.style.display = 'none';
        // previewArea.style.display = 'block';
        document.getElementById('captionContent').innerHTML = `<p>${item.caption.replace(/\n/g, '<br>')}</p>`;
        
        // Scroll to generator
        // scrollToGenerator(); // Auto-scroll feature removed
    }
}

// Copy history caption
function copyHistoryCaption(id) {
    const item = historyData.find(h => h.id === id);
    if (item) {
        navigator.clipboard.writeText(item.caption);
        alert('Caption copied to clipboard!');
    }
}

// Delete history item
function deleteHistoryItem(id) {
    historyData = historyData.filter(h => h.id !== id);
    localStorage.setItem('captionHistory', JSON.stringify(historyData));
    renderHistory();
}

// Clear all history
function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        historyData = [];
        localStorage.removeItem('captionHistory');
        renderHistory();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    generateBtn.disabled = true;
});