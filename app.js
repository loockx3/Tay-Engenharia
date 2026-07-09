/**
 * Site Tay - Civil Engineering Landing Page Logic
 * AppSec-by-Design: Dynamic UTM sanitization and secure DOM manipulation.
 */

// --- Global Configuration ---
const CONFIG = {
  phone: '5511999999999', // Replace with the actual WhatsApp number (including country/DDD, e.g. 55 for Brazil)
  defaultMessage: 'Olá! Gostaria de falar com o engenheiro responsável para tirar dúvidas sobre meu projeto.',
  services: {
    estrutural: 'Projetos Estruturais e Fundações',
    residencial: 'Projetos Residenciais e Comerciais',
    laudos: 'Laudos Técnicos e Perícias',
    regularizacao: 'Regularizações e Reformas'
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
 * @param {string} customService - Optional name of the civil engineering service clicked.
 * @returns {string} Sanitized WhatsApp link.
 */
function buildWhatsAppLink(customService = '') {
  const utms = getSanitizedUtms();
  
  // Assemble the base text
  let messageText = CONFIG.defaultMessage;
  if (customService) {
    messageText = `Olá! Gostaria de falar com o engenheiro responsável sobre o serviço de ${customService}.`;
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
  
  // URL encode the message body
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${CONFIG.phone}?text=${encodedText}`;
}

// --- DOM Manipulation & Event Binding ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Update all static WhatsApp buttons
  const whatsAppButtons = document.querySelectorAll('.js-whatsapp-link');
  whatsAppButtons.forEach(button => {
    // Check if the button has a specific service association
    const serviceKey = button.getAttribute('data-service-key');
    const serviceName = serviceKey ? CONFIG.services[serviceKey] : '';
    
    // Set attribute using secure native setAttribute (avoids raw innerHTML interpretation)
    const secureUrl = buildWhatsAppLink(serviceName);
    button.setAttribute('href', secureUrl);
  });

  // 2. Modals Control (Privacy Policy & Terms)
  const modalToggle = (modalId, action) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (action === 'open') {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Lock scroll
    } else {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Unlock scroll
    }
  };

  // Bind close buttons for all modals
  const closeButtons = document.querySelectorAll('.js-modal-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modalToggle(modal.id, 'close');
    });
  });

  // Close modal when clicking on the backdrop
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modalToggle(modal.id, 'close');
      }
    });
  });

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.active');
      if (openModal) modalToggle(openModal.id, 'close');
    }
  });

  // Global listeners for modal links
  const modalTriggerLinks = document.querySelectorAll('[data-open-modal]');
  modalTriggerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = link.getAttribute('data-open-modal');
      modalToggle(modalId, 'open');
    });
  });
});
