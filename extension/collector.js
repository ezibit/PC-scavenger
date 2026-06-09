(() => {
  const HIGH_END_REGEX = /rtx\s?4090|rtx\s?4080|rtx\s?3090|rtx\s?3080\s?ti|rx\s?7900\s?xtx|ryzen\s?9|7950x3d|7950x|7800x3d|14900k|13900k|14700k|x670e|x670|z790|z690|ddr5|64gb|128gb|1000w|1200w|platinum|aorus|strix|rog/i;
  const JUNK_REGEX = /gt\s?1030|gtx\s?750|gtx\s?760|gtx\s?960|ddr3|office pc|faulty|not working|for parts only|broken/i;

  function clean(text = '') {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  function abs(href) {
    try { return new URL(href, location.href).href; } catch { return location.href; }
  }

  function inferCategory(text) {
    if (/rtx|radeon|geforce|gpu|graphics|7900 xtx/i.test(text)) return 'GPU';
    if (/ryzen|i9|i7|7950|7800x3d|14900|13900|14700|cpu/i.test(text)) return 'CPU';
    if (/motherboard|x670|z790|z690|b650|am5/i.test(text)) return 'Motherboard';
    if (/psu|power supply|1000w|1200w|platinum|seasonic|corsair hx|dark power/i.test(text)) return 'PSU';
    if (/ddr5|ram|memory|64gb|128gb/i.test(text)) return 'RAM';
    if (/gaming pc|workstation|desktop|computer/i.test(text)) return 'Complete PC';
    return 'Peripheral';
  }

  function inferPrice(text) {
    if (/\bfree\b|giveaway|give away/i.test(text)) return 0;
    const match = text.match(/\$\s?([0-9][0-9,]*)/);
    return match ? Number(match[1].replace(/,/g, '')) : null;
  }

  function estimateValue(text) {
    const lower = text.toLowerCase();
    if (lower.includes('4090')) return 2600;
    if (lower.includes('4080')) return 1500;
    if (lower.includes('3090')) return 1100;
    if (lower.includes('7900 xtx')) return 1300;
    if (lower.includes('7950x3d')) return 850;
    if (lower.includes('7800x3d')) return 600;
    if (lower.includes('14900k')) return 850;
    if (lower.includes('13900k')) return 650;
    if (lower.includes('x670e')) return 600;
    if (lower.includes('z790')) return 500;
    if (lower.includes('128gb')) return 520;
    if (lower.includes('64gb')) return 260;
    if (lower.includes('1200w')) return 360;
    if (lower.includes('1000w')) return 280;
    if (lower.includes('gaming pc')) return 1800;
    return 300;
  }

  function tier(price, estimate, text) {
    if (price === 0 || /\bfree\b|giveaway/i.test(text)) return 'Ultimate Prize';
    if (price == null) return 'Unknown Price';
    const ratio = estimate / Math.max(price, 1);
    if (ratio >= 4 || price <= 150) return 'Disgustingly Cheap';
    if (ratio >= 2.2) return 'Cheap';
    if (ratio >= 1.4) return 'Discounted';
    return 'Check Deal';
  }

  function score(item) {
    const text = `${item.title} ${item.notes}`.toLowerCase();
    const hits = ['4090','4080','3090','7900 xtx','7950x3d','7800x3d','14900k','13900k','x670e','z790','ddr5','64gb','128gb','1000w','1200w'].filter((term) => text.includes(term)).length;
    const gap = item.price == null ? 0 : Math.max(item.valueEstimate - item.price, 0);
    const ratio = item.price === 0 ? 80 : item.price ? item.valueEstimate / item.price : 1;
    return Math.round(hits * 140 + gap / 4 + ratio * 40 + (item.price === 0 ? 1600 : 0));
  }

  function imageFor(card) {
    const img = card.querySelector('img');
    return img?.src || `https://placehold.co/480x320/111827/f8fafc?text=${encodeURIComponent(location.hostname)}`;
  }

  function collectListings() {
    const candidates = Array.from(document.querySelectorAll('a[href], [role="article"], [data-testid], div'));
    const seen = new Set();
    const listings = [];

    for (const el of candidates) {
      const body = clean(el.innerText || el.textContent || '');
      if (!body || body.length < 18 || body.length > 1200) continue;
      if (!HIGH_END_REGEX.test(body)) continue;
      if (JUNK_REGEX.test(body)) continue;

      const anchor = el.matches('a[href]') ? el : el.querySelector('a[href]');
      const href = abs(anchor?.getAttribute('href') || location.href);
      const title = clean(body.split(/\n| · | \| /)[0]).slice(0, 160) || 'Marketplace listing';
      const key = `${title}|${href}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const price = inferPrice(body);
      const valueEstimate = estimateValue(body);
      const category = inferCategory(body);
      const listing = {
        id: `ext-${Date.now()}-${listings.length}`,
        title,
        category,
        tier: tier(price, valueEstimate, body),
        price,
        valueEstimate,
        source: `Extension: ${location.hostname}`,
        location: 'Logged-in browser result',
        distanceKm: 0,
        listedAt: new Date().toISOString(),
        specs: Array.from(new Set(body.match(/RTX\s?4090|RTX\s?4080|RTX\s?3090|RX\s?7900\s?XTX|7950X3D|7800X3D|14900K|13900K|14700K|X670E|Z790|DDR5|64GB|128GB|1000W|1200W/gi) || [])),
        seller: 'Visible marketplace seller',
        contact: 'Open listing',
        link: href,
        image: imageFor(el),
        notes: body.slice(0, 300),
        isManual: false
      };
      listings.push({ ...listing, score: score(listing) });
      if (listings.length >= 80) break;
    }

    chrome.storage.local.set({ pcScavengerListings: listings, pcScavengerLastCollected: new Date().toISOString() });
    return listings;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'PC_SCAVENGER_COLLECT_NOW') {
      const listings = collectListings();
      sendResponse({ ok: true, count: listings.length, listings });
    }
    return true;
  });

  setTimeout(collectListings, 1500);
})();
