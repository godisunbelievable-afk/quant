// Shared vanilla-JS behaviour for every page.
// Replaces the React components: FadeIn, Header mobile drawer, InsightsFaq
// accordion, and the BorrowCalculator (the calculator only runs if present).

/* ─── 1. Scroll fade-in (was <FadeIn>) ─── */
function initFadeIn() {
  const items = document.querySelectorAll('.fade-in');
  if (!items.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay;
          if (delay) entry.target.style.transitionDelay = `${delay}ms`;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}

/* ─── 2. Mobile drawer (was Header) ─── */
function initDrawer() {
  const openBtn = document.querySelector('[data-drawer-open]');
  const closeBtn = document.querySelector('[data-drawer-close]');
  const overlay = document.querySelector('[data-drawer-overlay]');
  const panel = document.querySelector('[data-drawer-panel]');
  if (!openBtn || !panel) return;

  const setOpen = (open) => {
    overlay?.classList.toggle('opacity-100', open);
    overlay?.classList.toggle('pointer-events-auto', open);
    overlay?.classList.toggle('opacity-0', !open);
    overlay?.classList.toggle('pointer-events-none', !open);
    panel.classList.toggle('translate-x-0', open);
    panel.classList.toggle('translate-x-full', !open);
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn?.addEventListener('click', () => setOpen(false));
  overlay?.addEventListener('click', () => setOpen(false));
  // Close the drawer when a nav link inside it is clicked
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

/* ─── 3. FAQ accordion (was InsightsFaq) ─── */
function initFaq() {
  const items = document.querySelectorAll('[data-faq-item]');
  if (!items.length) return;

  items.forEach((item) => {
    const btn = item.querySelector('[data-faq-button]');
    const panel = item.querySelector('[data-faq-panel]');
    const icon = item.querySelector('[data-faq-icon]');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
      // grid-template-rows 0fr -> 1fr animation
      panel.classList.toggle('grid-rows-[1fr]', isOpen);
      panel.classList.toggle('opacity-100', isOpen);
      panel.classList.toggle('grid-rows-[0fr]', !isOpen);
      panel.classList.toggle('opacity-0', !isOpen);
      icon?.classList.toggle('rotate-45', isOpen);
      icon?.classList.toggle('text-black', isOpen);
    });
  });
}

/* ─── 4. Borrow calculator (was BorrowCalculator) ─── */
function initCalculator() {
  const root = document.querySelector('[data-calculator]');
  if (!root) return;

  const PRICES = {
    BTC: { name: 'Bitcoin', price: 68500, maxLtv: 80 },
    ETH: { name: 'Ethereum', price: 3450, maxLtv: 75 },
    SOL: { name: 'Solana', price: 175, maxLtv: 70 },
    ONDO: { name: 'Ondo Token', price: 1.15, maxLtv: 65 },
  };

  const assetSel = root.querySelector('[data-asset]');
  const amountInput = root.querySelector('[data-collateral]');
  const ltvSlider = root.querySelector('[data-ltv]');
  const currencySel = root.querySelector('[data-currency]');

  const ltvLabel = root.querySelector('[data-ltv-label]');
  const ltvMax = root.querySelector('[data-ltv-max]');
  const usdInline = root.querySelector('[data-collateral-usd]');
  const borrowOut = root.querySelector('[data-borrow-out]');
  const borrowCur = root.querySelector('[data-borrow-currency]');
  const refName = root.querySelector('[data-ref-name]');
  const refPrice = root.querySelector('[data-ref-price]');
  const refValue = root.querySelector('[data-ref-value]');
  const refLtv = root.querySelector('[data-ref-ltv]');

  const fmt = (n) => n.toLocaleString('en-US');

  function render() {
    const asset = PRICES[assetSel.value] || PRICES.BTC;
    const amount = Math.max(0, parseFloat(amountInput.value) || 0);

    // Clamp the slider ceiling to the asset's max LTV
    ltvSlider.max = String(asset.maxLtv);
    let ltv = parseInt(ltvSlider.value, 10);
    if (ltv > asset.maxLtv) { ltv = asset.maxLtv; ltvSlider.value = String(ltv); }

    const usdValue = amount * asset.price;
    const borrow = Math.round(usdValue * (ltv / 100));

    ltvLabel.textContent = `${ltv}% LTV`;
    ltvMax.textContent = `Max ${asset.maxLtv}%`;
    usdInline.textContent = `≈ $${fmt(usdValue)}`;
    borrowOut.textContent = `$${fmt(borrow)}`;
    borrowCur.textContent = currencySel.value;

    refName.textContent = `${asset.name} price:`;
    refPrice.textContent = `$${fmt(asset.price)} USD`;
    refValue.textContent = `$${fmt(usdValue)} USD`;
    refLtv.textContent = `${asset.maxLtv}%`;
  }

  [assetSel, amountInput, ltvSlider, currencySel].forEach((elm) =>
    elm?.addEventListener('input', render)
  );
  render();
}

/* ─── init ─── */
function startAll() {
  initFadeIn();
  initDrawer();
  initFaq();
  initCalculator();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAll);
} else {
  startAll();
}
