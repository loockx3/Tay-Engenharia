/**
 * TxJ - Projetos e Segurança Contra Incêndio
 * AppSec-by-Design: Dynamic UTM sanitization and secure DOM manipulation.
 */

// --- Global Configuration ---
const CONFIG = {
  phone: '5511999999999', // Replace with actual WhatsApp number (country + DDD + number)
  defaultMessage: 'Olá! Gostaria de falar com um especialista da TxJ sobre segurança contra incêndio para minha empresa.',
  services: {
    ppci: 'Projetos de Incêndio (PPCI/PSCIP)',
    instalacao: 'Instalação de Sistemas Contra Incêndio',
    manutencao: 'Manutenção Preventiva de Sistemas',
    avcb: 'Laudos e Vistorias (AVCB/CLCB)',
    brigada: 'Treinamento de Brigada de Incêndio',
    spda: 'Para-Raios e SPDA'
  }
};

// --- Input Sanitization (Mitigate DOM-based XSS) ---
/**
 * Safely sanitizes URL parameters to prevent code injection.
 * Strips HTML tags and limits characters to alphanumeric, spaces, hyphens, and underscores.
 * @param {string|null} input The raw parameter value from the URL.
 * @returns {string} The sanitized output.
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Step 1: Strip HTML tags
  let clean = input.replace(/<[^>]*>?/gm, '');
  
  // Step 2: Keep only letters, numbers, spaces, hyphens, and underscores
  clean = clean.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  
  return clean.trim();
}

/**
 * Extracts and sanitizes UTM tracking parameters from the current URL.
 * @returns {Object} Cleaned UTM parameters.
 */
function getSanitizedUtms() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      source: sanitizeInput(params.get('utm_source')),
      medium: sanitizeInput(params.get('utm_medium')),
      campaign: sanitizeInput(params.get('utm_campaign')),
      content: sanitizeInput(params.get('utm_content'))
    };
  } catch (error) {
    console.error('Erro ao ler os parâmetros de rastreamento:', error);
    return { source: '', medium: '', campaign: '', content: '' };
  }
}

/**
 * Generates a safe, fully-encoded WhatsApp link.
 * @param {string} customService - Optional name of the fire safety service clicked.
 * @returns {string} Sanitized WhatsApp link.
 */
function buildWhatsAppLink(customService = '') {
  const utms = getSanitizedUtms();
  
  let messageText = CONFIG.defaultMessage;
  if (customService) {
    messageText = `Olá! Gostaria de falar com um especialista da TxJ sobre: ${customService}.`;
  }
  
  // Build clean marketing campaign metadata footer
  let metaList = [];
  if (utms.source) metaList.push(`Origem: ${utms.source}`);
  if (utms.medium) metaList.push(`Mídia: ${utms.medium}`);
  if (utms.campaign) metaList.push(`Campanha: ${utms.campaign}`);
  if (utms.content) metaList.push(`Ref: ${utms.content}`);
  
  if (metaList.length > 0) {
    messageText += `\n\n[Rastreamento: ${metaList.join(' | ')}]`;
  }
  
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${CONFIG.phone}?text=${encodedText}`;
}

// --- DOM Manipulation & Event Binding ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Update all WhatsApp buttons
  const whatsAppButtons = document.querySelectorAll('.js-whatsapp-link');
  whatsAppButtons.forEach(button => {
    const serviceKey = button.getAttribute('data-service-key');
    const serviceName = serviceKey ? CONFIG.services[serviceKey] : '';
    const secureUrl = buildWhatsAppLink(serviceName);
    button.setAttribute('href', secureUrl);
  });

  // 2. Modals Control (Privacy Policy & Terms)
  const modalToggle = (modalId, action) => {
    const modalOverlay = document.getElementById(modalId);
    if (!modalOverlay) return;
    
    if (action === 'open') {
      modalOverlay.removeAttribute('hidden');
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Focus close button for accessibility
      const closeBtn = modalOverlay.querySelector('.modal-close, [data-close-modal], .js-modal-close');
      if (closeBtn) closeBtn.focus();
    } else {
      modalOverlay.setAttribute('hidden', '');
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Bind trigger links (supports both data-open-modal and data-modal)
  document.querySelectorAll('[data-open-modal], [data-modal]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = link.getAttribute('data-open-modal') || link.getAttribute('data-modal');
      modalToggle(modalId, 'open');
    });
  });

  // Bind close buttons (supports .js-modal-close, [data-close-modal], and .modal-close)
  const closeSelectors = '.js-modal-close, [data-close-modal], .modal-close';
  document.querySelectorAll(closeSelectors).forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalOverlay = e.target.closest('.modal-overlay');
      if (modalOverlay) modalToggle(modalOverlay.id, 'close');
    });
  });

  // Close modal on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modalToggle(overlay.id, 'close');
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.active, .modal-overlay:not([hidden])');
      if (openModal) modalToggle(openModal.id, 'close');
    }
  });
});
