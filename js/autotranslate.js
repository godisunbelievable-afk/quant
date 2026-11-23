/**
 * Auto-Translate Platform Engine (Hybrid: Browser Language + IP Geolocation)
 * 1. Checks visitor's device/browser language preference immediately (0ms).
 * 2. Cross-references/falls back to visitor's physical country IP via geolocation.
 * 3. Sets Google Translate cookies and triggers translation without banner clutter.
 */
(function initAutoTranslate() {
  // Mapping of Country ISO codes to official primary languages
  const COUNTRY_LANG_MAP = {
    // Europe
    FR: 'fr', DE: 'de', ES: 'es', IT: 'it', PT: 'pt', NL: 'nl', PL: 'pl',
    RU: 'ru', UA: 'uk', TR: 'tr', GR: 'el', RO: 'ro', CZ: 'cs', SE: 'sv',
    NO: 'no', DK: 'da', FI: 'fi', HU: 'hu', AT: 'de', CH: 'de', BE: 'fr',
    // Latin America
    BR: 'pt', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
    // Asia & Middle East
    CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', JP: 'ja', KR: 'ko', VN: 'vi',
    TH: 'th', ID: 'id', MY: 'ms', PH: 'tl', IN: 'hi', SA: 'ar', AE: 'ar',
    EG: 'ar', QA: 'ar', KW: 'ar', IL: 'iw', IR: 'fa',
    // Africa
    NG: 'en', KE: 'sw', ZA: 'en', GH: 'en', MA: 'ar', DZ: 'ar',
    // English default countries
    US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en'
  };

  function setTransCookie(lang) {
    if (!lang || lang === 'en') return;
    const cookieVal = `/en/${lang}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${window.location.hostname};`;
  }

  function getExistingCookie() {
    const match = document.cookie.match(/(^|;\s*)googtrans=([^;]+)/);
    return match ? match[2] : null;
  }

  // 1. Instant check: Browser navigator language
  const navLang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();

  if (!getExistingCookie() && navLang && navLang !== 'en') {
    setTransCookie(navLang);
  }

  // 2. Secondary check: IP Geolocation (if browser is set to default 'en' or undetermined)
  if (!getExistingCookie() || getExistingCookie() === '/en/en') {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(geo => {
        if (geo && geo.country_code) {
          const matchedLang = COUNTRY_LANG_MAP[geo.country_code.toUpperCase()];
          if (matchedLang && matchedLang !== 'en') {
            setTransCookie(matchedLang);
            // Trigger translation if elements are already loaded
            const selectEl = document.querySelector('.goog-te-combo');
            if (selectEl) {
              selectEl.value = matchedLang;
              selectEl.dispatchEvent(new Event('change'));
            }
          }
        }
      })
      .catch(() => {
        // Fallback silently if offline or rate limited
      });
  }

  // 3. Insert hidden Google Translate DOM element
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      autoDisplay: false
    }, 'google_translate_element');
  };

  // Add container and stylesheet to hide the top Google Translate banner
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    const style = document.createElement('style');
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate,
      .goog-te-banner-frame,
      #goog-gt-tt,
      .goog-te-balloon-frame { display: none !important; }
      body { top: 0px !important; }
      .goog-text-highlight { background: none !important; box-shadow: none !important; }
      .skiptranslate iframe { display: none !important; }
    `;
    document.head.appendChild(style);
  });

  // Inject Google Translate script
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(script);
})();

