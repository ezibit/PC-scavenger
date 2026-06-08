import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const DEFAULT_SOURCES = [
  'Facebook Marketplace', 'Gumtree', 'eBay AU', 'OzBargain', 'Reddit', 'Grays Auctions',
  'Pickles Auctions', 'AllBids', 'Lloyds Auctions', 'Cash Converters', 'CeX Australia',
  'Reebelo', 'Umart', 'Computer Alliance', 'Scorptec', 'Mwave', 'PC Case Gear',
  'Centre Com', 'Amazon AU', 'Kogan', 'Catch', 'StaticICE'
];

const SEED_DEALS = [
  {
    id: 'seed-start-here',
    title: 'Run scan now to pull live public-source and manual hunt results',
    category: 'GPU',
    tier: 'Unknown Price',
    source: 'PC Scavenger',
    price: null,
    valueEstimate: 2600,
    location: 'Brisbane / SE QLD signal',
    distanceKm: 18,
    listedAt: new Date().toISOString(),
    specs: ['4090', '4080', '7950x3d', '7800x3d'],
    seller: 'Scanner',
    contact: 'Run scan',
    link: '/.netlify/functions/scan',
    image: 'https://placehold.co/480x320/111827/f8fafc?text=PC+Scavenger',
    notes: 'The app now calls a Netlify backend scanner. Add Google CSE keys in Netlify to widen live Google-based search results.'
  }
];

function scoreDeal(item) {
  if (Number.isFinite(item.score)) return item.score;
  const valueGap = item.price === null ? 0 : Math.max(item.valueEstimate - item.price, 0);
  const ratio = item.price === 0 ? 999 : item.price ? item.valueEstimate / item.price : 1;
  const tierBoost = {
    'Ultimate Prize': 1000,
    'Disgustingly Cheap': 700,
    Cheap: 450,
    Discounted: 220,
    'Showroom Slashed': 120,
    'On Sale': 60,
    'Unknown Price': 35
  }[item.tier] || 0;
  const categoryBoost = { GPU: 220, CPU: 190, Motherboard: 170, PSU: 150, RAM: 130, 'Complete PC': 120, Peripheral: 40 }[item.category] || 0;
  const distancePenalty = item.distanceKm > 150 ? 80 : item.distanceKm / 3;
  return Math.round(tierBoost + categoryBoost + valueGap / 5 + ratio * 15 - distancePenalty);
}

function formatMoney(value) {
  if (value === 0) return 'FREE';
  if (value === null || value === undefined) return 'CHECK PRICE';
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
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function App() {
  const [deals, setDeals] = useState(() => load('pcscavenger.deals', SEED_DEALS));
  const [interested, setInterested] = useState(() => load('pcscavenger.interested', []));
  const [passed, setPassed] = useState(() => load('pcscavenger.passed', []));
  const [sourceSearches, setSourceSearches] = useState(() => load('pcscavenger.sourceSearches', []));
  const [view, setView] = useState('deals');
  const [category, setCategory] = useState('All');
  const [lastScan, setLastScan] = useState(() => load('pcscavenger.lastScan', null));
  const [scanStatus, setScanStatus] = useState('Ready');
  const [scanErrors, setScanErrors] = useState([]);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => localStorage.setItem('pcscavenger.deals', JSON.stringify(deals)), [deals]);
  useEffect(() => localStorage.setItem('pcscavenger.interested', JSON.stringify(interested)), [interested]);
  useEffect(() => localStorage.setItem('pcscavenger.passed', JSON.stringify(passed)), [passed]);
  useEffect(() => localStorage.setItem('pcscavenger.sourceSearches', JSON.stringify(sourceSearches)), [sourceSearches]);
  useEffect(() => localStorage.setItem('pcscavenger.lastScan', JSON.stringify(lastScan)), [lastScan]);

  async function runLiveScan() {
    setScanStatus('Scanning wide net...');
    setScanErrors([]);
    try {
      const response = await fetch('/.netlify/functions/scan', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Scanner returned ${response.status}`);
      const payload = await response.json();
      setDeals(Array.isArray(payload.deals) && payload.deals.length ? payload.deals : SEED_DEALS);
      setSourceSearches(payload.sourceSearches || []);
      setLastScan(payload.scannedAt || new Date().toISOString());
      setGoogleEnabled(Boolean(payload.googleCseEnabled));
      setScanErrors(payload.errors || []);
      setScanStatus(`Scan complete: ${payload.resultCount || 0} results`);
    } catch (error) {
      setScanStatus('Scan failed — showing saved/mock data');
      setScanErrors([error.message]);
    }
  }

  useEffect(() => { runLiveScan(); }, []);

  const visibleDeals = useMemo(() => {
    const ignored = new Set([...interested, ...passed]);
    return deals
      .filter((deal) => !ignored.has(deal.id))
      .filter((deal) => category === 'All' || deal.category === category)
      .map((deal) => ({ ...deal, score: scoreDeal(deal) }))
      .sort((a, b) => b.score - a.score);
  }, [deals, interested, passed, category]);

  const interestedDeals = useMemo(() => deals.filter((deal) => interested.includes(deal.id)).map((deal) => ({ ...deal, score: scoreDeal(deal) })).sort((a, b) => b.score - a.score), [deals, interested]);

  function markInterested(id) { setInterested((prev) => (prev.includes(id) ? prev : [...prev, id])); }
  function pass(id) { setPassed((prev) => (prev.includes(id) ? prev : [...prev, id])); }
  function resetLists() { setInterested([]); setPassed([]); }

  const categories = ['All', 'GPU', 'CPU', 'Motherboard', 'PSU', 'RAM', 'Complete PC', 'Peripheral'];
  const activeList = view === 'interested' ? interestedDeals : visibleDeals;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Brisbane-first high-end hardware hunter</p>
          <h1>PC Scavenger</h1>
          <p className="intro">
            Wide-net deal triage for GPUs, CPUs, PSUs, motherboards, RAM and complete high-spec systems.
            Free, giveaway and absurdly cheap listings get pushed to the top.
          </p>
        </div>
        <div className="panel scan-panel">
          <button className="primary" onClick={runLiveScan}>Run scan now</button>
          <p>Status: <strong>{scanStatus}</strong></p>
          <p>Twice-daily backend target: <strong>8:00 AM</strong> and <strong>8:00 PM</strong></p>
          <p>Google CSE: <strong>{googleEnabled ? 'Enabled' : 'Not connected yet'}</strong></p>
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
        {(sourceSearches.length ? sourceSearches : DEFAULT_SOURCES.map((name) => ({ name, url: '#', loginRequired: name === 'Facebook Marketplace' }))).map((source) => (
          <a key={source.name} href={source.url} target="_blank" rel="noreferrer" title={source.loginRequired ? 'Login required at source. Your app state stays saved here.' : 'Open source search'}>
            {source.name}{source.loginRequired ? ' 🔐' : ''}
          </a>
        ))}
      </section>

      {scanErrors.length > 0 && (
        <section className="panel warning">
          <strong>Scanner notes:</strong>
          <ul>{scanErrors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

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
              <div className="card-top"><span className="badge">{deal.tier}</span><span className="score">Score {deal.score}</span></div>
              <h2>{deal.title}</h2>
              <p className="meta">{deal.category} · {deal.source} · {deal.location} · {deal.distanceKm}km from Calamvale · {formatAge(deal.listedAt)}</p>
              <div className="price-row"><strong>{formatMoney(deal.price)}</strong><span>Estimated value {formatMoney(deal.valueEstimate)}</span></div>
              <ul className="specs">{(deal.specs || []).map((spec) => <li key={spec}>{spec}</li>)}</ul>
              <p className="notes">{deal.notes}</p>
              <div className="seller"><span>Seller: <strong>{deal.seller}</strong></span><span>Contact: <strong>{deal.contact}</strong></span></div>
              <div className="actions">
                <a href={deal.link} target="_blank" rel="noreferrer">Open listing/search</a>
                {view !== 'interested' && <button onClick={() => markInterested(deal.id)}>Interested</button>}
                {view !== 'interested' && <button className="pass" onClick={() => pass(deal.id)}>Pass</button>}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel roadmap">
        <h2>Scanner architecture</h2>
        <p>
          Login-required sites open directly in their own tab. You log in with the source itself, not inside this app.
          PC Scavenger preserves your Interested/Pass state while you move between markets.
        </p>
        <ul>
          <li>Live feeds: Reddit, eBay RSS, OzBargain RSS where accessible.</li>
          <li>Google CSE: broad discovery across Facebook, Gumtree, auctions, refurbishers and retailers once keys are added.</li>
          <li>Manual source launchers: open targeted searches when sites block bots or require login.</li>
        </ul>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
