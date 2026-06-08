import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const CALAMVALE = { lat: -27.6233, lng: 153.0478 };

const SOURCES = [
  'Facebook Marketplace',
  'Gumtree',
  'eBay Australia',
  'Grays Auctions',
  'Pickles Auctions',
  'AllBids',
  'OzBargain',
  'Reddit /r/bapcsalesaustralia',
  'Reddit /r/hardwareswapaustralia',
  'Local refurbishers',
  'University notice boards',
  'Community giveaway groups'
];

const SEED_DEALS = [
  {
    id: 'seed-rtx4090-free',
    title: 'RTX 4090 Founders Edition - moving house giveaway',
    category: 'GPU',
    tier: 'Ultimate Prize',
    source: 'Facebook Marketplace',
    price: 0,
    valueEstimate: 2600,
    location: 'Brisbane City, QLD',
    distanceKm: 18,
    listedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    specs: ['24GB GDDR6X', 'PCIe 4.0', 'High-end 4K / AI workload GPU'],
    seller: 'John D.',
    contact: 'Messenger only',
    link: 'https://www.facebook.com/marketplace/',
    image: 'https://placehold.co/480x320/111827/f8fafc?text=RTX+4090',
    notes: 'Mock example. Replace with real source feed when backend is added.'
  },
  {
    id: 'seed-7950x3d',
    title: 'AMD Ryzen 9 7950X3D CPU - unopened',
    category: 'CPU',
    tier: 'Disgustingly Cheap',
    source: 'Gumtree',
    price: 150,
    valueEstimate: 850,
    location: 'Sunnybank, QLD',
    distanceKm: 5,
    listedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    specs: ['16 cores / 32 threads', 'AM5', '3D V-Cache'],
    seller: 'Alice C.',
    contact: '0450 123 456',
    link: 'https://www.gumtree.com.au/',
    image: 'https://placehold.co/480x320/0f172a/f8fafc?text=Ryzen+9+7950X3D',
    notes: 'Mock example with strong value score.'
  },
  {
    id: 'seed-x670e',
    title: 'ASUS ROG Crosshair X670E Hero motherboard',
    category: 'Motherboard',
    tier: 'Cheap',
    source: 'Reddit /r/hardwareswapaustralia',
    price: 300,
    valueEstimate: 900,
    location: 'Gold Coast, QLD',
    distanceKm: 75,
    listedAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    specs: ['AM5', 'DDR5', 'PCIe 5.0', 'Wi-Fi 6E'],
    seller: 'HardwareSwapper42',
    contact: 'Reddit DM',
    link: 'https://www.reddit.com/',
    image: 'https://placehold.co/480x320/111827/f8fafc?text=X670E+Hero',
    notes: 'High-end board. Verify socket pins before pickup.'
  },
  {
    id: 'seed-1000w-psu',
    title: 'Corsair HX1000i Platinum PSU',
    category: 'PSU',
    tier: 'Discounted',
    source: 'eBay Australia',
    price: 190,
    valueEstimate: 360,
    location: 'Melbourne, VIC - freight',
    distanceKm: 1670,
    listedAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    specs: ['1000W', '80+ Platinum', 'Modular', 'ATX high-end build ready'],
    seller: 'RefurbTechAU',
    contact: 'eBay message',
    link: 'https://www.ebay.com.au/',
    image: 'https://placehold.co/480x320/020617/f8fafc?text=HX1000i',
    notes: 'Freight option. Check cable set is complete.'
  }
];

function scoreDeal(item) {
  const valueGap = Math.max(item.valueEstimate - item.price, 0);
  const ratio = item.price === 0 ? 999 : item.valueEstimate / item.price;
  const tierBoost = {
    'Ultimate Prize': 1000,
    'Disgustingly Cheap': 700,
    Cheap: 450,
    Discounted: 220,
    'Showroom Slashed': 120,
    'On Sale': 60
  }[item.tier] || 0;
  const categoryBoost = {
    GPU: 220,
    CPU: 190,
    Motherboard: 170,
    PSU: 150,
    RAM: 130,
    'Complete PC': 120,
    Peripheral: 40
  }[item.category] || 0;
  const distancePenalty = item.distanceKm > 150 ? 80 : item.distanceKm / 3;
  return Math.round(tierBoost + categoryBoost + valueGap / 5 + ratio * 15 - distancePenalty);
}

function formatMoney(value) {
  if (value === 0) return 'FREE';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
}

function formatAge(iso) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [deals, setDeals] = useState(() => load('pcscavenger.deals', SEED_DEALS));
  const [interested, setInterested] = useState(() => load('pcscavenger.interested', []));
  const [passed, setPassed] = useState(() => load('pcscavenger.passed', []));
  const [view, setView] = useState('deals');
  const [category, setCategory] = useState('All');
  const [lastScan, setLastScan] = useState(() => load('pcscavenger.lastScan', null));

  useEffect(() => localStorage.setItem('pcscavenger.deals', JSON.stringify(deals)), [deals]);
  useEffect(() => localStorage.setItem('pcscavenger.interested', JSON.stringify(interested)), [interested]);
  useEffect(() => localStorage.setItem('pcscavenger.passed', JSON.stringify(passed)), [passed]);
  useEffect(() => localStorage.setItem('pcscavenger.lastScan', JSON.stringify(lastScan)), [lastScan]);

  const visibleDeals = useMemo(() => {
    const ignored = new Set([...interested, ...passed]);
    return deals
      .filter((deal) => !ignored.has(deal.id))
      .filter((deal) => category === 'All' || deal.category === category)
      .map((deal) => ({ ...deal, score: scoreDeal(deal) }))
      .sort((a, b) => b.score - a.score);
  }, [deals, interested, passed, category]);

  const interestedDeals = useMemo(() => {
    return deals
      .filter((deal) => interested.includes(deal.id))
      .map((deal) => ({ ...deal, score: scoreDeal(deal) }))
      .sort((a, b) => b.score - a.score);
  }, [deals, interested]);

  function runMockScan() {
    setLastScan(new Date().toISOString());
    alert('Mock scan complete. Real marketplace scanning needs a backend worker or automation layer. This front-end is ready for it.');
  }

  function markInterested(id) {
    setInterested((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function pass(id) {
    setPassed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function resetLists() {
    setInterested([]);
    setPassed([]);
  }

  const categories = ['All', 'GPU', 'CPU', 'Motherboard', 'PSU', 'RAM', 'Complete PC', 'Peripheral'];
  const activeList = view === 'interested' ? interestedDeals : visibleDeals;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Brisbane-first high-end hardware hunter</p>
          <h1>PC Scavenger</h1>
          <p className="intro">
            Ruthless deal triage for GPUs, CPUs, PSUs, motherboards, RAM and complete high-spec systems.
            Free and absurdly cheap gear gets pushed to the top.
          </p>
        </div>
        <div className="panel scan-panel">
          <button className="primary" onClick={runMockScan}>Run scan now</button>
          <p>Twice-daily scan target: <strong>8:00 AM</strong> and <strong>8:00 PM</strong></p>
          <p>Last scan: <strong>{lastScan ? new Date(lastScan).toLocaleString() : 'Not yet'}</strong></p>
        </div>
      </header>

      <section className="controls panel">
        <div className="tabs">
          <button className={view === 'deals' ? 'active' : ''} onClick={() => setView('deals')}>Available finds</button>
          <button className={view === 'interested' ? 'active' : ''} onClick={() => setView('interested')}>Interested list ({interestedDeals.length})</button>
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </select>
        <button className="ghost" onClick={resetLists}>Reset interested/pass</button>
      </section>

      <section className="source-strip">
        {SOURCES.map((source) => <span key={source}>{source}</span>)}
      </section>

      <section className="stats">
        <div><strong>{visibleDeals.length}</strong><span>Active finds</span></div>
        <div><strong>{interestedDeals.length}</strong><span>Interested</span></div>
        <div><strong>{passed.length}</strong><span>Passed</span></div>
      </section>

      <section className="list">
        {activeList.length === 0 && <div className="empty panel">No items in this view yet.</div>}
        {activeList.map((deal) => (
          <article className="card" key={deal.id}>
            <img src={deal.image} alt="" />
            <div className="card-body">
              <div className="card-top">
                <span className="badge">{deal.tier}</span>
                <span className="score">Score {deal.score}</span>
              </div>
              <h2>{deal.title}</h2>
              <p className="meta">{deal.category} · {deal.source} · {deal.location} · {deal.distanceKm}km from Calamvale · {formatAge(deal.listedAt)}</p>
              <div className="price-row">
                <strong>{formatMoney(deal.price)}</strong>
                <span>Estimated value {formatMoney(deal.valueEstimate)}</span>
              </div>
              <ul className="specs">
                {deal.specs.map((spec) => <li key={spec}>{spec}</li>)}
              </ul>
              <p className="notes">{deal.notes}</p>
              <div className="seller">
                <span>Seller: <strong>{deal.seller}</strong></span>
                <span>Contact: <strong>{deal.contact}</strong></span>
              </div>
              <div className="actions">
                <a href={deal.link} target="_blank" rel="noreferrer">Open listing</a>
                {view !== 'interested' && <button onClick={() => markInterested(deal.id)}>Interested</button>}
                {view !== 'interested' && <button className="pass" onClick={() => pass(deal.id)}>Pass</button>}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel roadmap">
        <h2>Next build layer</h2>
        <p>
          This version is a deployable front-end with mock data. The real scavenger needs a backend scan worker because Facebook,
          Gumtree, auctions and Reddit feeds cannot be reliably scraped from a browser-only app.
        </p>
        <ul>
          <li>Backend worker: scheduled scans twice daily.</li>
          <li>Source adapters: Gumtree, eBay, auctions, Reddit, refurbishers, RSS, Google programmable search.</li>
          <li>Deal memory: avoid repeated alerts unless price drops.</li>
          <li>Notifications: email, Telegram, Discord, or phone push.</li>
          <li>Scoring: high-end parts only, with blacklist for junk GPUs/old office towers.</li>
        </ul>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
