# Design Specification: Secure Civil Engineering Landing Page

**Date:** 2026-07-09  
**Author:** Antigravity (AppSec & Senior Software Engineer)  
**Status:** Approved by User  

---

## 1. Goal and Requirements
Build a mobile-first, high-converting, and high-performance single-page landing page for a Civil Engineering office. The primary conversion action is redirecting users to WhatsApp via a dynamic, sanitized link that tracks marketing campaigns (UTM parameters).

### Visual & Performance Requirements:
- **Zero Dependencies:** Pure HTML5, CSS3 (using CSS variables), and Vanilla JS.
- **High Performance:** Minimal page load size, optimized inline SVGs, and layout shift (CLS) prevention.
- **Sleek Dark Mode:** A premium look and feel utilizing deep slate greys, warm gold/amber accents, and crisp typography.

### Security Requirements (AppSec-by-Design):
- **CSP (Content Security Policy):** Strict policy to block `'unsafe-inline'` script execution.
- **External Link Protection:** Mandatory `rel="noopener noreferrer"` on all links opening in new tabs.
- **Referrer Policy:** Configured as `strict-origin-when-cross-origin`.
- **Dynamic Link Sanitization:** Sanitizing URL query parameters using `URLSearchParams` and strict URL encoding (`encodeURIComponent`) to prevent DOM-based XSS attacks before injecting links into the DOM.

---

## 2. Architecture & File Structure
We will follow a modular, clean structure with separate concerns:
1. `index.html` - Semantics, inline SVGs, layout container, and metadata tags (CSP, Referrer).
2. `style.css` - Design system variable tokens, typography imports, structural layouts, and animations.
3. `app.js` - Safe parameters extraction, sanitation, WhatsApp link builder, modal handling, and micro-interactions.

---

## 3. Detailed Specifications

### 3.1 Content Security Policy & Meta Tags
The page will include metadata tags for security:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.google-analytics.com https://connect.facebook.net; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.whatsapp.com; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';">
<meta name="referrer" content="strict-origin-when-cross-origin">
```

### 3.2 Dynamic WhatsApp Link logic (`app.js`)
We will extract UTM parameters safely:
- Allowed keys: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`.
- The JS script will:
  1. Retrieve UTM parameters using `new URLSearchParams(window.location.search)`.
  2. Sanitize inputs by stripping out non-alphanumeric/non-basic characters to prevent code injection.
  3. Format a default message: `"Olá! Gostaria de fazer um orçamento de Engenharia Civil para meu projeto."`
  4. Append tracking details to the text in a clean, user-friendly format (e.g., `"[Origem: google | Campanha: blackfriday]"`).
  5. URL encode the final message and build the `https://wa.me/` link.
  6. Inject it into all CTA elements on the page via `setAttribute('href', safeUrl)`.

### 3.3 Visual Theme Tokens (`style.css`)
```css
:root {
  --bg-primary: #0b0f19;
  --bg-secondary: #131c2e;
  --border-color: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --accent-gold: #f59e0b;
  --accent-gold-hover: #d97706;
  --accent-green: #22c55e;
  --accent-green-hover: #16a34a;
  
  --font-title: 'Montserrat', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

---

## 4. Verification Plan
- **Security Check:** Validate that CSP rules are respected by loading the page and confirming no inline script runs. Validate that all external links contain `rel="noopener noreferrer"`.
- **UTM Sanitization Check:** Load the page with `?utm_source=<script>alert(1)</script>&utm_medium=test-xss` and verify that the script is neutralized and the WhatsApp URL is clean.
- **Visual & Performance Check:** Verify mobile responsiveness, layout on screens of different widths, and confirm that there are no external dependencies.
