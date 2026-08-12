/**
 * HORLOGE LUXURY WATCH HERO AUTOMATIC 360° ENGINE
 * Preloads 240 high-res image frames and automatically plays 360° animation loop when page opens.
 */

import { saveInquiryToSupabase } from './supabase.js';
import './view3d.js';

const TOTAL_FRAMES = 240;
const FRAME_PATH_PREFIX = './frames/ezgif-frame-';
const FRAME_EXTENSION = '.jpg';
const TARGET_FPS = 30; // 30 FPS smooth 360° auto-rotation

// State Management
const state = {
  frames: [],
  loadedCount: 0,
  currentFrame: 1
};

// DOM References
const elements = {
  canvas: document.getElementById('frame-canvas'),
  ctx: document.getElementById('frame-canvas')?.getContext('2d')
};

// 1. Preload 240 Image Frames
function preloadFrames() {
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    img.src = `${FRAME_PATH_PREFIX}${frameNum}${FRAME_EXTENSION}`;

    img.onload = () => {
      state.loadedCount++;
      if (state.loadedCount === 1) {
        renderFrame(1);
      }
    };

    img.onerror = () => {
      state.loadedCount++;
    };

    state.frames.push(img);
  }
}

// 2. High-DPI Canvas Resizing
function resizeCanvas() {
  if (!elements.canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = elements.canvas.getBoundingClientRect();

  elements.canvas.width = rect.width * dpr;
  elements.canvas.height = rect.height * dpr;

  renderFrame(state.currentFrame);
}

// 3. Render Canvas Frame with Object-Fit Contain logic
function renderFrame(frameIndex) {
  if (!elements.canvas || !elements.ctx) return;

  const clampedIndex = Math.max(1, Math.min(TOTAL_FRAMES, frameIndex));
  const img = state.frames[clampedIndex - 1];

  if (!img || !img.complete || img.naturalWidth === 0) return;

  const ctx = elements.ctx;
  const canvasWidth = elements.canvas.width;
  const canvasHeight = elements.canvas.height;

  // Clear Canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Contain Scaling Math
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, drawX, drawY;

  if (canvasRatio > imgRatio) {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  }

  // Draw Image centered
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// 4. Automatic 360° Animation Loop (Runs on Page Open)
let lastTime = 0;
const interval = 1000 / TARGET_FPS;

function autoPlayAnimationLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;

  if (delta >= interval) {
    lastTime = timestamp - (delta % interval);
    state.currentFrame = (state.currentFrame % TOTAL_FRAMES) + 1;
    renderFrame(state.currentFrame);
  }

  requestAnimationFrame(autoPlayAnimationLoop);
}

// 5. Scroll Reveal Observer & Parallax for page elements
function initScrollReveals() {
  const observerOptions = { threshold: 0.1 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Parallax effect for the Heritage section image
  window.addEventListener('scroll', () => {
    const parallax = document.querySelector('[data-alt*="Jura mountains"]');
    const scrollPosition = window.pageYOffset;
    if (parallax) {
      parallax.style.backgroundPositionY = (scrollPosition * 0.4) + 'px';
    }
  });
}

// 6. Smooth Navigation Scrolling for Navbar Links & Buttons
function initSmoothNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// 7. Supabase Inquiry Form Handler
function initInquiryForm() {
  const inquiryForm = document.getElementById('inquiry-form');
  const inquiryEmail = document.getElementById('inquiry-email');
  const successMsg = document.getElementById('inquiry-success');
  if (!inquiryForm) return;

  inquiryForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = inquiryEmail ? inquiryEmail.value.trim() : '';
    if (!email) return;

    const submitBtn = inquiryForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Inquire';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const res = await saveInquiryToSupabase({
        email: email,
        name: 'Website Visitor',
        source: 'Inquiry Form',
        timestamp: Date.now()
      });
      console.log('Inquiry submitted to Supabase:', res);

      inquiryForm.style.display = 'none';
      if (successMsg) successMsg.style.display = 'block';
    } catch (err) {
      console.error('Inquiry submission error:', err);
      inquiryForm.style.display = 'none';
      if (successMsg) successMsg.style.display = 'block';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
      setTimeout(() => {
        inquiryForm.reset();
        inquiryForm.style.display = '';
        if (successMsg) successMsg.style.display = 'none';
      }, 5000);
    }
  });
}

// 8. Event Listeners
function bindEvents() {
  window.addEventListener('resize', resizeCanvas);
}

// Initialize Application
function init() {
  bindEvents();
  initScrollReveals();
  initSmoothNavigation();
  initInquiryForm();
  preloadFrames();
  resizeCanvas();
  requestAnimationFrame(autoPlayAnimationLoop);
}

init();
