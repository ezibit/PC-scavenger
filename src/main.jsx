import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const DEFAULT_PARTS = ['All', 'GPU', 'CPU', 'Motherboard', 'RAM', 'PSU', 'Complete PC'];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

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

function scoreDeal(item) {
  const text = `${item.title || ''} ${item.notes || ''}`.toLowerCase();
  const highHits = ['4090','4080','3090','7900 xtx','7950x3d','7800x3d','14900k','13900k','x670e','z790','ddr5','64gb','128gb','1000w','1200w'].filter((term) => text.includes(term)).length;
  const price = item.price;
  const estimate = item.valueEstimate || 300;
  const gap = price == null ? 0 : Math.max(estimate - price, 0);
  const ratio = price === 0 ? 80 : price ? estimate / price : 1;
  const tierBoost = { 'Ultimate Prize': 1600, 'Disgustingly Cheap': 950, Cheap: 600, Discounted: 260, 'Unknown Price': 80 }[item.tier] || 0;
  const categoryBoost = { GPU: 320, CPU: 260, Motherboard: 220, PSU: 180, RAM: 150, 'Complete PC': 140, Peripheral: 20 }[item.category] || 0;
  return Math.round(tierBoost + categoryBoost + highHits * 120 + gap / 4 + ratio * 35);
}

function normaliseDeal(item, index = 0) {
  const clean = {
    id: item.id || `deal-${Date.now()}-${index}`,
    title: item.title || 'Untitled listing',
    category: item.category || 'Peripheral',
    tier: item.tier || 'Unknown Price',
    price: item.price ?? null,
    valueEstimate: item.valueEstimate || 300,
    source: item.source || 'Unknown source',
    location: item.location || 'Unknown location',
    distanceKm: item.distanceKm ?? 999,
    listedAt: item.listedAt || new Date().toISOString(),
    specs: Array.isArray(item.specs) ? item.specs : [],
    seller: item.seller || 'Unknown seller',
    contact: item.contact || 'Open listing',
    link: item.link || '#',
    image: item.image || `https://placehold.co/480x320/111827/f8fafc?text=${encodeURIComponent(item.category || 'Listing')}`,
    notes: item.notes || 'Real listing captured from public scanner or browser extension.',
    isManual: false
  };
  return { ...clean, score: scoreDeal(clean) };
}

function App() {
  const [deals, setDeals] = useState(() => load('pcscavenger.deals', []));
  const [interested, setInterested] = useState(() => load('pcscavenger.interested', []));
  const [passed, setPassed] = useState(() => load('pcscavenger.passed', []));
  const [availableParts, setAvailableParts] = useState(() => load('pcscavenger.availableParts', DEFAULT_PARTS));
  const [selectedPart, setSelectedPart] = useState(() => load('pcscavenger.selectedPart', 'All'));
  const [view, setView] = useState('deals');
  const [category, setCategory] = useState('All');
  const [lastScan, setLastScan] = useState(() => load('pcscavenger.lastScan', null));
  const [scanStatus, setScanStatus] = useState('Ready');
  const [scanErrors, setScanErrors] = useState([]);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState('Not checked');

  useEffect(() => save('pcscavenger.deals', deals), [deals]);
  useEffect(() => save('pcscavenger.interested', interested), [interested]);
  useEffect(() => save('pcscavenger.passed', passed), [passed]);
  useEffect(() => save('pcscavenger.availableParts', availableParts), [availableParts]);
  useEffect(() => save('pcscavenger.selectedPart', selectedPart), [selectedPart]);
  useEffect(() => save('pcscavenger.lastScan', lastScan), [lastScan]);

  function mergeDeals(incoming) {
    const cleaned = incoming.map(normaliseDeal).filter((deal) => deal.title && deal.link && !deal.isManual);
    setDeals((prev) => {
      const all = [...cleaned, ...prev];
      return all.filter((item, index, arr) => arr.findIndex((x) => x.link === item.link || x.id === item.id) === index);
    });
    return cleaned.length;
  }

  async function runPublicScan(part = selectedPart) {
    setScanStatus(`Scanning public/indexed listings for ${part}...`);
    setScanErrors([]);
    try {
      const response = await fetch(`/.netlify/functions/scan?part=${encodeURIComponent(part)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Scanner returned ${response.status}`);
      const payload = await response.json();
      const count = mergeDeals(Array.isArray(payload.deals) ? payload.deals : []);
      setAvailableParts(payload.availableParts || DEFAULT_PARTS);
      setLastScan(payload.scannedAt || new Date().toISOString());
      setGoogleEnabled(Boolean(payload.googleCseEnabled));
      setScanErrors(payload.errors || []);
      setScanStatus(`Public scan complete: ${count} real results added`);
    } catch (error) {
      setScanStatus('Public scan failed — no manual/maybe results shown');
      setScanErrors([error.message]);
    }
  }

  function pullFromExtension() {
    setExtensionStatus('Requesting listings from extension...');
    const timeout = setTimeout(() => setExtensionStatus('No extension response. Load the Chrome/Edge extension from /extension, then refresh.'), 3000);
    function handler(event) {
      if (event.source !== window || event.data?.type !== 'PC_SCAVENGER_EXTENSION_LISTINGS') return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      const listings = Array.isArray(event.data.listings) ? event.data.listings : [];
      const count = mergeDeals(listings);
      setExtensionStatus(`Imported ${count} logged-in browser listings`);
    }
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PC_SCAVENGER_REQUEST_LISTINGS' }, '*');
  }

  useEffect(() => { runPublicScan(selectedPart); }, []);

  const visibleDeals = useMemo(() => {
    const ignored = new Set([...interested, ...passed]);
    return deals
      .filter((deal) => !deal.isManual)
      .filter((deal) => !ignored.has(deal.id))
      .filter((deal) => category === 'All' || deal.category === category)
      .map((deal) => ({ ...deal, score: scoreDeal(deal) }))
      .sort((a, b) => b.score - a.score);
  }, [deals, interested, passed, category]);

  const interestedDeals = useMemo(() => deals
    .filter((deal) => interested.includes(deal.id))
    .map((deal) => ({ ...deal, score: scoreDeal(deal) }))
    .sort((a, b) => b.score - a.score), [deals, interested]);

  function markInterested(id) { setInterested((prev) => (prev.includes(id) ? prev : [...prev, id])); }
  function pass(id) { setPassed((prev) => (prev.includes(id) ? prev : [...prev, id])); }
  function resetLists() { setInterested([]); setPassed([]); }
  function clearFeed() { setDeals([]); setInterested([]); setPassed([]); }
  function changePart(part) { setSelectedPart(part); setCategory(part === 'All' ? 'All' : part); runPublicScan(part); }

  const categories = ['All', 'GPU', 'CPU', 'Motherboard', 'PSU', 'RAM', 'Complete PC', 'Peripheral'];
  const activeList = view === 'interested' ? interestedDeals : visibleDeals;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Desktop scavenger command centre</p>
          <h1>PC Scavenger</h1>
          <p className="intro">One ranked feed for real high-end PC listings. Public scanners plus logged-in browser extension capture. No manual maybe cards.</p>
        </div>
        <div className="panel scan-panel">
          <button className="primary" onClick={() => runPublicScan(selectedPart)}>Run public scan</button>
          <button className="primary secondary" onClick={pullFromExtension}>Pull browser listings</button>
          <p>Status: <strong>{scanStatus}</strong></p>
          <p>Extension: <strong>{extensionStatus}</strong></p>
          <p>Google CSE: <strong>{googleEnabled ? 'Enabled' : 'Not connected yet'}</strong></p>
          <p>Last scan: <strong>{lastScan ? new Date(lastScan).toLocaleString() : 'Not yet'}</strong></p>
        </div>
      </header>

      <section className="controls panel">
        <div className="tabs">
          <button className={view === 'deals' ? 'active' : ''} onClick={() => setView('deals')}>Real listings</button>
          <button className={view === 'interested' ? 'active' : ''} onClick={() => setView('interested')}>Interested ({interestedDeals.length})</button>
        </div>
        <select value={selectedPart} onChange={(event) => changePart(event.target.value)}>{availableParts.map((name) => <option key={name}>{name}</option>)}</select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((name) => <option key={name}>{name}</option>)}</select>
        <button className="ghost" onClick={resetLists}>Reset decisions</button>
        <button className="ghost" onClick={clearFeed}>Clear feed</button>
      </section>

      {scanErrors.length > 0 && <section className="panel warning"><strong>Scanner notes:</strong><ul>{scanErrors.map((error) => <li key={error}>{error}</li>)}</ul></section>}

      <section className="stats">
        <div><strong>{visibleDeals.length}</strong><span>Real listings</span></div>
        <div><strong>{interestedDeals.length}</strong><span>Interested</span></div>
        <div><strong>{passed.length}</strong><span>Passed</span></div>
      </section>

      <section className="list">
        {activeList.length === 0 && <div className="empty panel">No real listings loaded yet. Run public scan or pull logged-in marketplace listings from the extension.</div>}
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
                <a href={deal.link} target="_blank" rel="noreferrer">Open listing</a>
                {view !== 'interested' && <button onClick={() => markInterested(deal.id)}>Interested</button>}
                {view !== 'interested' && <button className="pass" onClick={() => pass(deal.id)}>Pass</button>}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
