/**
 * HORLOGE COLLECTION PAGES INTERACTION ENGINE
 */

import { saveInquiryToSupabase } from './supabase.js';
import './view3d.js';

// 1. Scroll Reveal Observer
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
}

// 2. Smooth Navigation Scrolling
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

// 3. Supabase Inquiry Form Handler for Collection Pages
function initInquiryForm() {
  const inquiryForm = document.getElementById('inquiry-form');
  const inquiryEmail = document.getElementById('inquiry-email');
  const inquiryModel = document.getElementById('inquiry-model');
  const successMsg = document.getElementById('inquiry-success');
  if (!inquiryForm) return;

  inquiryForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = inquiryEmail ? inquiryEmail.value.trim() : '';
    const selectedModel = inquiryModel ? inquiryModel.value : 'General Collection';
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
        name: 'Collection Visitor',
        source: `Collection Page (${selectedModel})`,
        timestamp: Date.now()
      });
      console.log('Inquiry submitted:', res);

      inquiryForm.style.display = 'none';
      if (successMsg) successMsg.style.display = 'block';
    } catch (err) {
      console.error('Inquiry error:', err);
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

// 4. Model Quick Spec Modal / Quick View
window.openInquiryForModel = function(modelName) {
  const inquiryModelInput = document.getElementById('inquiry-model');
  if (inquiryModelInput) {
    inquiryModelInput.value = modelName;
  }
  const inquirySection = document.getElementById('inquiry-section');
  if (inquirySection) {
    inquirySection.scrollIntoView({ behavior: 'smooth' });
    const emailInput = document.getElementById('inquiry-email');
    if (emailInput) setTimeout(() => emailInput.focus(), 800);
  }
};

// Initialize Collection Page Logic
function init() {
  initScrollReveals();
  initSmoothNavigation();
  initInquiryForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
