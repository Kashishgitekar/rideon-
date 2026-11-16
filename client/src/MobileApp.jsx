import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronDown, MapPin, Calendar, Search, ArrowRight, Star, ShieldCheck, Navigation, Check, CreditCard, Home as HomeIcon, CalendarCheck, Route, UserRound, Pencil } from 'lucide-react';
import { api } from './api.js';
import { useAuth } from './main.jsx';

const CATEGORIES = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'cars', label: 'Cars', match: c => ['Sedan', 'Hatchback'].includes(c) },
  { id: 'suvs', label: 'SUVs', match: c => c === 'SUV' },
  { id: 'bikes', label: 'Bikes', match: c => ['Motorcycle', 'Scooter'].includes(c) },
  { id: 'vans', label: 'Vans', match: c => c === 'Luxury' }
];

function TopBar({ title, notify }) {
  return <header className="m-top">
    {title ? <h1 className="m-brand">{title}</h1> : <h1 className="m-brand">Ride<span>On</span></h1>}
    <button className="m-bell" onClick={notify}><Bell size={17}/></button>
  </header>;
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'home', label: 'Home', icon: <HomeIcon size={19}/> },
    { id: 'bookings', label: 'My Booking', icon: <CalendarCheck size={19}/> },
    { id: 'trips', label: 'My Trips', icon: <Route size={19}/> },
    { id: 'profile', label: 'Profile', icon: <UserRound size={19}/> }
  ];
  return <nav className="m-nav">
    {items.map(i => <button key={i.id} className={`m-nav-item ${tab === i.id ? 'active' : ''}`} onClick={() => setTab(i.id)}>{i.icon}<span>{i.label}</span></button>)}
  </nav>;
}

function fmt(date) {
  return date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/* ---------------- Home screen ---------------- */
function HomeScreen({ onSearch, tripsCount }) {
  const { session } = useAuth();
  const today = new Date(); const tomorrow = new Date(Date.now() + 86400000);
  const [city, setCity] = useState('Indore');
  const [startAt, setStartAt] = useState(toLocal(today));
  const [endAt, setEndAt] = useState(toLocal(tomorrow));
  function toLocal(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  return <div className="m-screen">
    <div className="m-hero">
      <p className="m-hero-eyebrow">EXPLORE INDIA</p>
      <h2>Explore {city || 'India'},<br/>Your Style,<br/>Your Priority</h2>
      <div className="m-hero-car">🚗</div>
    </div>
    <div className="m-search-card">
      <label className="m-field">
        <span className="m-field-label"><MapPin size={13}/> Pickup Location</span>
        <div className="m-field-row"><input value={city} onChange={e => setCity(e.target.value)} placeholder="Enter city"/><ChevronDown size={15}/></div>
      </label>
      <div className="m-date-row">
        <label className="m-field half">
          <span className="m-field-label"><Calendar size={13}/> Pickup</span>
          <div className="m-field-row"><input type="date" value={startAt.slice(0, 10)} onChange={e => setStartAt(e.target.value)}/></div>
        </label>
        <span className="m-date-arrow"><ArrowRight size={14}/></span>
        <label className="m-field half">
          <span className="m-field-label"><Calendar size={13}/> Return</span>
          <div className="m-field-row"><input type="date" value={endAt.slice(0, 10)} onChange={e => setEndAt(e.target.value)}/></div>
        </label>
      </div>
      <button className="m-cta" onClick={() => onSearch({ city, startAt, endAt })}><Search size={16}/> Search Vehicles</button>
    </div>
    <div className="m-section-head"><h3>Browse by Category</h3><button className="m-link" onClick={() => onSearch({ category: 'all' })}>View all →</button></div>
    <div className="m-chips">
      {CATEGORIES.slice(1).map(c => <button key={c.id} className="m-chip" onClick={() => onSearch({ category: c.id })}>{c.label}</button>)}
    </div>
    <div className="m-promo">
      <div><b>Travel Smart<br/>in {city || 'India'}</b><small>Save up to 20% on day trips</small></div>
      <span className="m-promo-car">🚙</span>
    </div>
    {tripsCount > 0 && <div className="m-activity"><b>{tripsCount} trip{tripsCount > 1 ? 's' : ''} booked</b><small>{session ? `Signed in as ${session.user.name.split(' ')[0]}` : ''}</small></div>}
  </div>;
}

/* ---------------- Available Vehicles screen ---------------- */
function VehiclesScreen({ searchArgs, onBook }) {
  const [vehicles, setVehicles] = useState([]);
  const [cat, setCat] = useState(searchArgs?.category || 'all');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/vehicles').then(r => { setVehicles(r.data.vehicles); setLoading(false); }).catch(e => { setError(e.response?.data?.message || 'Could not load vehicles.'); setLoading(false); });
  }, []);
  useEffect(() => { if (searchArgs?.category) setCat(searchArgs.category); }, [searchArgs?.category]);
  const list = useMemo(() => {
    const def = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];
    const filtered = vehicles.filter(v => def.match(v.category) && (!searchArgs?.city || (v.location || '').toLowerCase().includes(String(searchArgs.city).toLowerCase())));
    return filtered.sort((a, b) => sortAsc ? a.pricePerDay - b.pricePerDay : b.pricePerDay - a.pricePerDay);
  }, [vehicles, cat, sortAsc, searchArgs?.city]);
  return <div className="m-screen">
    <h2 className="m-title">Available Vehicles</h2>
    <div className="m-chips scroll">
      {CATEGORIES.map(c => <button key={c.id} className={`m-chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
    </div>
    <div className="m-sort-row">
      <button className="m-sort-btn"><span>⚙️ Filters</span></button>
      <button className="m-sort-btn" onClick={() => setSortAsc(a => !a)}><span>Sort by Price {sortAsc ? '↑' : '↓'}</span></button>
    </div>
    {error && <div className="m-error">{error}</div>}
    {loading && <div className="m-empty">Loading vehicles…</div>}
    {!loading && !list.length && !error && <div className="m-empty">No vehicles found. Try another category.</div>}
    <div className="m-vlist">
      {list.map((v, i) => <article className="m-vehicle" key={v._id}>
        {i === 0 && <span className="m-popular">⚡ Popular</span>}
        <div className="m-vehicle-img"><img src={v.imageUrl} alt={v.name}/></div>
        <div className="m-vehicle-body">
          <div className="m-vehicle-head"><h3>{v.name}</h3><span className="m-rating"><Star size={12} fill="currentColor"/> 4.8</span></div>
          <div className="m-tags"><span className="m-tag">{v.seats} Seats</span><span className="m-tag">{v.transmission}</span><span className="m-tag">{v.fuelType}</span></div>
          <div className="m-vehicle-foot">
            <div className="m-price"><b>₹{v.pricePerDay.toLocaleString()}</b><small>/day</small></div>
            <button className="m-book" onClick={() => onBook(v)}>Book Now <ArrowRight size={13}/></button>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}

/* ---------------- Booking checkout screen ---------------- */
function CheckoutScreen({ vehicle, searchArgs, onDone }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [pay, setPay] = useState('upi');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!session) return <Navigate to="/login" replace />;
  const days = Math.max(1, Math.ceil((new Date(searchArgs.endAt) - new Date(searchArgs.startAt)) / 86400000)) || 1;
  const base = vehicle.pricePerDay * days;
  const taxes = Math.round(base * 0.05);
  const total = base + taxes;
  async function confirm() {
    setBusy(true); setError('');
    try {
      await api.post('/bookings', {
        vehicleId: vehicle._id,
        pickupLocation: searchArgs.city || 'Indore',
        destination: searchArgs.city || 'Indore',
        startAt: new Date(searchArgs.startAt).toISOString(),
        endAt: new Date(searchArgs.endAt).toISOString(),
        passengers: vehicle.seats,
        paymentMethod: pay === 'cash' ? 'cash' : 'upi'
      });
      onDone();
    } catch (err) { setError(err.response?.data?.message || 'Unable to create booking'); } finally { setBusy(false); }
  }
  return <div className="m-screen">
    <h2 className="m-title">Booking Checkout</h2>
    <div className="m-summary">
      <div className="m-summary-img"><img src={vehicle.imageUrl} alt={vehicle.name}/></div>
      <div>
        <h3>{vehicle.name}</h3>
        <div className="m-tags"><span className="m-tag">{vehicle.seats} Seats</span><span className="m-tag">{vehicle.transmission}</span><span className="m-tag">{vehicle.fuelType}</span></div>
      </div>
    </div>
    <div className="m-itinerary">
      <div className="m-itin-row"><span className="m-dot gold"/><div><small>Pickup</small><b>{vehicle.location || searchArgs.city || 'Indore'}</b></div></div>
      <div className="m-itin-line"/>
      <div className="m-itin-row"><span className="m-dot"/><div><small>Drop-off</small><b>{searchArgs.city || 'Indore'}</b></div></div>
      <div className="m-itin-dates"><Calendar size={13}/> {fmt(searchArgs.startAt)} → {fmt(searchArgs.endAt)} · {days} day{days > 1 ? 's' : ''}</div>
    </div>
    <div className="m-bill">
      <div><span>Base fare ({days} × ₹{vehicle.pricePerDay.toLocaleString()})</span><b>₹{base.toLocaleString()}</b></div>
      <div><span>Taxes &amp; fees (5%)</span><b>₹{taxes.toLocaleString()}</b></div>
      <div className="m-bill-total"><span>Total Amount</span><b>₹{total.toLocaleString()}</b></div>
    </div>
    <div className="m-verify"><ShieldCheck size={17}/><div><b>Vehicle Verification</b><small>Documents and safety checks completed</small></div><Check size={16}/></div>
    <div className="m-live"><Navigation size={17}/><div><b>Live Location</b><small>Track your vehicle once the trip starts</small></div></div>
    <div className="m-payhead">💳 Secure Payment</div>
    <div className="m-paygrid">
      {[{ id: 'upi', label: 'UPI' }, { id: 'wallet', label: 'Wallet' }, { id: 'card', label: 'Card' }, { id: 'cash', label: 'Cash' }].map(p =>
        <button key={p.id} className={`m-pay ${pay === p.id ? 'active' : ''}`} onClick={() => setPay(p.id)}>{p.label}</button>)}
    </div>
    {error && <div className="m-error">{error}</div>}
    <div className="m-footer-cta"><div><small>Total</small><b>₹{total.toLocaleString()}</b></div><button className="m-cta inline" disabled={busy} onClick={confirm}>{busy ? 'Booking…' : 'Continue'} <ArrowRight size={15}/></button></div>
  </div>;
}

/* ---------------- My bookings / trips ---------------- */
function BookingsScreen({ tab }) {
  const { session } = useAuth();
  const [bookings, setBookings] = useState([]); const [rides, setRides] = useState([]); const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    api.get('/bookings/mine').then(r => setBookings(r.data.bookings)).catch(e => setError(e.response?.data?.message || 'Sign in to see your bookings.'));
    api.get('/rides/mine').then(r => setRides(r.data.rides)).catch(() => {});
  }, [session]);
  if (!session) return <Navigate to="/login" replace />;
  const list = tab === 'bookings' ? bookings : rides;
  return <div className="m-screen">
    <h2 className="m-title">{tab === 'bookings' ? 'My Bookings' : 'My Trips'}</h2>
    {error && <div className="m-error">{error}</div>}
    {list.length ? list.map(item => <article className="m-booking" key={item._id}>
      <div>
        <b>{tab === 'bookings' ? item.vehicle?.name || 'Vehicle' : `${item.pickup} → ${item.destination}`}</b>
        <small>{tab === 'bookings' ? `${item.pickupLocation} → ${item.destination}` : `${item.vehicleType} · ${item.distanceKm} km`}</small>
      </div>
      <div className="m-booking-side">
        <strong className={`m-status ${item.status}`}>{item.status}</strong>
        <b>₹{(tab === 'bookings' ? item.totalAmount : (item.finalFare ?? item.fare)).toLocaleString()}</b>
      </div>
    </article>) : <div className="m-empty">{tab === 'bookings' ? 'No bookings yet. Browse vehicles to book one.' : 'No rides yet.'}</div>}
  </div>;
}

/* ---------------- Profile screen ---------------- */
function ProfileScreen() {
  const { session, save } = useAuth();
  const navigate = useNavigate();
  if (!session) return <Navigate to="/login" replace />;
  return <div className="m-screen">
    <h2 className="m-title">Profile</h2>
    <div className="m-profile-card">
      <span className="m-avatar"><UserRound size={22}/></span>
      <div><b>{session.user.name}</b><small>{session.user.email}</small></div>
    </div>
    <div className="m-menu">
      <Link to="/wallet" className="m-menu-item"><CreditCard size={17}/> Wallet</Link>
      <Link to="/profile" className="m-menu-item"><ShieldCheck size={17}/> Documents &amp; verification</Link>
      <Link to="/track" className="m-menu-item"><Navigation size={17}/> Track my ride</Link>
      <button className="m-menu-item" onClick={() => { save(null); navigate('/'); }}>Sign out</button>
    </div>
  </div>;
}

/* ---------------- main mobile app shell ---------------- */
export default function MobileApp() {
  const [tab, setTab] = useState('home');
  const [searchArgs, setSearchArgs] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [bookingsCount, setBookingsCount] = useState(0);
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) api.get('/bookings/mine').then(r => setBookingsCount(r.data.bookings.length)).catch(() => {}); }, [session, tab]);

  function onSearch(args) { setSearchArgs(args); setTab('vehicles'); }
  function onBook(v) { setVehicle(v); setTab('checkout'); }
  function onDone() { setVehicle(null); setTab('bookings'); }

  let screen;
  if (tab === 'vehicles') screen = <VehiclesScreen searchArgs={searchArgs} onBook={onBook}/>;
  else if (tab === 'checkout' && vehicle) screen = <CheckoutScreen vehicle={vehicle} searchArgs={searchArgs || { city: 'Indore', startAt: new Date().toISOString(), endAt: new Date(Date.now() + 86400000).toISOString() }} onDone={onDone}/>;
  else if (tab === 'checkout') screen = <VehiclesScreen searchArgs={searchArgs} onBook={onBook}/>;
  else if (tab === 'bookings') screen = <BookingsScreen tab="bookings"/>;
  else if (tab === 'trips') screen = <BookingsScreen tab="trips"/>;
  else if (tab === 'profile') screen = <ProfileScreen/>;
  else screen = <HomeScreen onSearch={onSearch} tripsCount={bookingsCount}/>;

  const navTab = ['bookings', 'trips', 'profile'].includes(tab) ? tab : (tab === 'checkout' ? 'bookings' : 'home');
  return <div className="m-app">
    <TopBar notify={() => {}}/>
    {screen}
    <BottomNav tab={navTab} setTab={t => { setVehicle(null); setTab(t); }}/>
  </div>;
}
