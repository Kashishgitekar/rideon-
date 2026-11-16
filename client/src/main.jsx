import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ArrowRight, Car, CheckCircle2, CreditCard, LogOut, Search, ShieldCheck, Star, UserRound } from 'lucide-react';
import './styles.css';
import GoogleRouteMap from './components/GoogleRouteMap.jsx';
import CaptainMap from './components/CaptainMap.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
const realtimeUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }
function AuthProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('rideon-session') || 'null'));
  const save = value => { setSession(value); value ? localStorage.setItem('rideon-session', JSON.stringify(value)) : localStorage.removeItem('rideon-session'); };
  useEffect(() => { if (session?.token) api.defaults.headers.common.Authorization = `Bearer ${session.token}`; }, [session]);
  useEffect(() => {
    const interceptor = api.interceptors.response.use(undefined, error => {
      if (error.response?.status === 401 && session?.token) { api.defaults.headers.common.Authorization = ''; save(null); }
      return Promise.reject(error);
    });
    return () => api.interceptors.response.eject(interceptor);
  }, [session?.token]);
  return <AuthContext.Provider value={{ session, save }}>{children}</AuthContext.Provider>;
}
function Layout({ children }) {
  const { session, save } = useAuth();
  return <><header><Link className="brand" to="/"><span className="brand-mark"><Car size={18}/></span> ride<span>on</span></Link><nav><Link to="/ride">Book a ride</Link><Link to="/vehicles">Rent a vehicle</Link>{session ? <><Link to="/dashboard">Dashboard</Link><Link to="/profile">Profile</Link><Link to="/wallet">Wallet</Link><Link to="/track">Track</Link><button className="link-button" onClick={() => save(null)}><LogOut size={15}/> Sign out</button></> : <Link className="button small" to="/login">Sign in</Link>}</nav></header>{children}<footer><strong>ride<span>on</span></strong><span>Move freely. Travel confidently.</span></footer></>;
}
function Home() {
  const [vehicles, setVehicles] = useState([]);
  useEffect(() => { api.get('/vehicles').then(result => setVehicles(result.data.vehicles.slice(0, 3))).catch(() => {}); }, []);
  return <main><section className="hero"><div><p className="eyebrow">SAFE RIDES. FAIR PRICES.</p><h1>Your city, your way.</h1><p className="lead">Book a bike, auto, cab, or self-drive car in a few taps. Upfront fares, verified partners, and support when you need it.</p><div className="hero-actions"><Link className="button" to="/ride">Book a ride <ArrowRight size={17}/></Link><Link className="button secondary" to="/vehicles">Rent a vehicle</Link></div></div><div className="hero-card"><div className="floating-card"><ShieldCheck size={19}/><span><b>Every ride is verified</b><small>Transparent pricing, no surprises</small></span></div></div></section><section className="ride-options"><div><p className="eyebrow">CHOOSE YOUR RIDE</p><h2>Every trip has an option</h2></div><div className="option-grid">{rideOptions.map(option => <Link className="option-card" to={option.id === 'rental' ? '/vehicles' : '/ride'} key={option.id}><span className="option-icon">{option.icon}</span><b>{option.name}</b><small>{option.description}</small><strong>From ₹{option.baseFare}</strong></Link>)}</div></section>{vehicles.length > 0 && <section className="featured-section"><div className="section-heading"><div><p className="eyebrow">POPULAR VEHICLES</p><h2>Ready for your next trip</h2></div><Link className="text-link" to="/vehicles">View all vehicles</Link></div><div className="featured-grid">{vehicles.map(vehicle => <Link className="featured-card" to={`/vehicles/${vehicle._id}`} key={vehicle._id}><img src={vehicle.imageUrl} alt={vehicle.name}/><div><b>{vehicle.name}</b><span>{vehicle.category} · ₹{vehicle.pricePerDay.toLocaleString()}/day</span></div></Link>)}</div></section>}<section className="trust"><span>✓ Verified drivers</span><span>✓ Upfront fares</span><span>✓ 24/7 support</span><span>✓ Secure payments</span></section></main>;
}
const rideOptions = [
  { id: 'bike', name: 'Bike', description: 'Beat traffic quickly', baseFare: 35, icon: '🏍️' },
  { id: 'auto', name: 'Auto', description: 'Affordable everyday rides', baseFare: 55, icon: '🛺' },
  { id: 'car', name: 'Cab', description: 'Comfort for up to 4', baseFare: 99, icon: '🚕' },
  { id: 'rental', name: 'Self-drive', description: 'Keep the car for the day', baseFare: 799, icon: '🚗' }
];
function Vehicles() {
  const [vehicles, setVehicles] = useState([]); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  const [filters, setFilters] = useState({ category: '', fuelType: '', transmission: '', minSeats: '', maxPrice: '' });
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (filters.category) params.category = filters.category;
    if (filters.fuelType) params.fuelType = filters.fuelType;
    if (filters.transmission) params.transmission = filters.transmission;
    if (filters.minSeats) params.minSeats = filters.minSeats;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    api.get('/vehicles', { params }).then(r => setVehicles(r.data.vehicles)).catch(e => setError(e.response?.data?.message || 'Connect the API and MongoDB to browse vehicles.'));
  }, [search, filters]);
  const setFilter = key => e => setFilters(f => ({ ...f, [key]: e.target.value }));
  return <main className="page"><div className="page-heading"><div><p className="eyebrow">THE RIDEON COLLECTION</p><h2>Find your next ride</h2><p>Choose from verified vehicles for every kind of trip.</p></div><label className="search"><Search size={18}/><input placeholder="Search by vehicle or city" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
  <div className="filter-bar">
    <select value={filters.category} onChange={setFilter('category')}><option value="">All categories</option>{['Scooter','Motorcycle','Hatchback','Sedan','SUV','Luxury'].map(c => <option key={c} value={c}>{c}</option>)}</select>
    <select value={filters.fuelType} onChange={setFilter('fuelType')}><option value="">Any fuel</option>{['Petrol','Diesel','Electric','CNG'].map(f => <option key={f} value={f}>{f}</option>)}</select>
    <select value={filters.transmission} onChange={setFilter('transmission')}><option value="">Any transmission</option>{['Manual','Automatic'].map(t => <option key={t} value={t}>{t}</option>)}</select>
    <select value={filters.minSeats} onChange={setFilter('minSeats')}><option value="">Min seats</option>{[2,4,5,7].map(s => <option key={s} value={s}>{s}+</option>)}</select>
    <input type="number" min="0" placeholder="Max ₹/day" value={filters.maxPrice} onChange={setFilter('maxPrice')}/>
  </div>
  {error && <div className="notice">{error}</div>}<div className="vehicle-grid">{vehicles.map(v => <Link className="vehicle-card" to={`/vehicles/${v._id}`} key={v._id}><img src={v.imageUrl} alt={v.name}/><div className="vehicle-info"><div><h3>{v.name}</h3><span>{v.category} · {v.seats} seats</span></div><b>₹{v.pricePerDay.toLocaleString()}<small>/day</small></b></div><p>{v.location} · {v.transmission}</p></Link>)}{!error && !vehicles.length && <div className="empty">No vehicles found yet. Add verified vehicles from the owner dashboard.</div>}</div></main>;
}
function VehicleDetails() {
  const { id } = useParams(); const [vehicle, setVehicle] = useState(null); const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]); const [review, setReview] = useState({ rating: 5, comment: '' }); const { session } = useAuth();
  useEffect(() => { api.get(`/vehicles/${id}`).then(r => setVehicle(r.data.vehicle)).catch(e => setError(e.response?.data?.message || 'Vehicle unavailable')); api.get(`/reviews/vehicle/${id}`).then(r => setReviews(r.data.reviews)).catch(() => {}); }, [id]);
  async function submitReview(e) { e.preventDefault(); if (!session) return; try { const r = await api.post(`/reviews/vehicle/${id}`, review); setReviews(current => [r.data.review, ...current.filter(item => item.customer?._id !== r.data.review.customer?._id)]); setReview({ rating: 5, comment: '' }); } catch (err) { setError(err.response?.data?.message || 'Unable to save review'); } }
  if (error) return <main className="page"><div className="notice">{error}</div></main>; if (!vehicle) return <main className="page"><p>Loading vehicle...</p></main>;
  const average = reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : 'New';
  return <main className="page"><section className="detail"><img className="detail-image" src={vehicle.imageUrl} alt={vehicle.name}/><div className="detail-content"><p className="eyebrow">{vehicle.category}</p><h2>{vehicle.name}</h2><div className="rating"><Star size={16} fill="currentColor"/> {average} <span>({reviews.length} reviews)</span></div><p className="lead">{vehicle.description || 'A verified RideOn vehicle, prepared for your next journey.'}</p><div className="specs"><span><b>{vehicle.seats}</b> seats</span><span><b>{vehicle.fuelType}</b> fuel</span><span><b>{vehicle.transmission}</b></span></div><div className="price-row"><div><b>₹{vehicle.pricePerDay.toLocaleString()}</b><small> / day</small></div><Link className="button" to={`/book/${vehicle._id}`}>Book this vehicle <ArrowRight size={17}/></Link></div></div></section><section className="reviews-section"><div className="section-heading"><div><p className="eyebrow">RIDER FEEDBACK</p><h3 className="section-title">What people say</h3></div><span className="rating"><Star size={16} fill="currentColor"/> {average}</span></div>{reviews.length ? reviews.map(item => <article className="review-card" key={item._id}><div><b>{item.customer?.name || 'Rider'}</b><span>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span></div><p>{item.comment}</p></article>) : <div className="empty">No reviews yet. Be the first to share your experience.</div>}{session && <form className="review-form" onSubmit={submitReview}><h4>Leave a review</h4><select value={review.rating} onChange={e => setReview({ ...review, rating: e.target.value })}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><textarea required minLength="3" maxLength="500" placeholder="How was your experience?" value={review.comment} onChange={e => setReview({ ...review, comment: e.target.value })}/><button className="button">Publish review</button></form>}</section></main>;
}
function AuthPage({ register = false }) {
  const { save } = useAuth(); const navigate = useNavigate(); const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' }); const [error, setError] = useState('');
  async function submit(e) { e.preventDefault(); try { const r = await api.post(`/auth/${register ? 'register' : 'login'}`, form); save(r.data); navigate('/dashboard'); } catch (err) { setError(err.response?.data?.message || 'Unable to continue'); } }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">{register ? 'JOIN RIDEON' : 'WELCOME BACK'}</p><h2>{register ? 'Create your account' : 'Sign in to RideOn'}</h2>{register && <><input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})}/><label className="auth-label">Account type<select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option value="customer">Rider</option><option value="driver">Driver</option></select></label></>}<input required type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={form.password} onChange={e => setForm({...form, password:e.target.value})}/>{error && <div className="error">{error}</div>}<button className="button full">{register ? 'Create account' : 'Sign in'} <ArrowRight size={17}/></button><p className="muted">{register ? 'Already a member?' : 'New to RideOn?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></form></main>;
}
function Booking({ id }) {
  const { session } = useAuth(); const navigate = useNavigate(); const [form, setForm] = useState({ pickupLocation: '', destination: '', startAt: '', endAt: '', passengers: 1, paymentMethod: 'cash' }); const [error, setError] = useState(''); const [price, setPrice] = useState(null); const [booking, setBooking] = useState(null);
  if (!session) return <Navigate to="/login" replace />;
  async function submit(e) { e.preventDefault(); setError(''); try { const result = await api.post('/bookings', { ...form, vehicleId: id }); setPrice(result.data.price); setBooking(result.data.booking); } catch (err) { setError(err.response?.data?.message || 'Unable to create booking'); } }
  return <main className="page narrow"><p className="eyebrow">PLAN YOUR TRIP</p><h2>Book your vehicle</h2><p className="lead">Choose your route, dates, and a payment method. Your booking stays pending until the owner confirms it.</p><form className="booking-form" onSubmit={submit}><GoogleRouteMap onLocationsChange={locations => setForm(current => ({ ...current, pickupLocation: locations.pickup, destination: locations.destination }))}/><label>Pickup location<input required placeholder="Search or type your pickup" value={form.pickupLocation} onChange={e => setForm({...form,pickupLocation:e.target.value})}/></label><label>Destination<input required placeholder="Search or type your destination" value={form.destination} onChange={e => setForm({...form,destination:e.target.value})}/></label><div className="form-grid"><label>Pickup date and time<input required type="datetime-local" value={form.startAt} onChange={e => setForm({...form,startAt:e.target.value})}/></label><label>Return date and time<input required type="datetime-local" value={form.endAt} onChange={e => setForm({...form,endAt:e.target.value})}/></label></div><label>Passengers<input required type="number" min="1" max="20" value={form.passengers} onChange={e => setForm({...form,passengers:e.target.value})}/></label><label>Payment method<select value={form.paymentMethod} onChange={e => setForm({...form,paymentMethod:e.target.value})}><option value="cash">Cash on pickup</option><option value="upi">UPI (payment gateway required)</option><option value="card">Card (payment gateway required)</option></select></label><div className="rules-card"><b>Before you book</b><span>Bring a valid driving licence and ID.</span><span>Keep the vehicle clean and return it on time.</span><span>Cancellation may be charged after confirmation.</span></div>{price && <div className="price-summary"><span>Estimated total</span><strong>₹{price.total.toLocaleString()}</strong><small>Payment status: pending · {form.paymentMethod === 'cash' ? 'pay at pickup' : 'complete payment below'}</small></div>}{booking && form.paymentMethod !== 'cash' && <PayBooking booking={booking}/>}{booking && <div className="price-summary payment-box"><span>Booking documents</span><small>Upload your licence or booking proof to speed up approval.</small><a className="button small secondary" href="/profile">Open verification uploads</a></div>}{error && <div className="error">{error}</div>}<button className="button full">{price ? 'Booking created · Go to dashboard' : 'Confirm booking'} <ArrowRight size={17}/></button></form>{price && <button className="text-button centered" onClick={() => navigate('/dashboard')}>View my bookings</button>}</main>;
}
function RidePage() {
  const { session } = useAuth();
  const socketRef = useRealtime();
  const [form, setForm] = useState({ vehicleType: 'bike', pickup: '', destination: '', distanceKm: 3, couponCode: '', paymentMethod: 'cash' });
  const [ride, setRide] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !ride?._id) return undefined;
    socket.emit('ride:join', { rideId: ride._id });
    const updateRide = payload => payload.ride && setRide(payload.ride);
    socket.on('ride:status', updateRide);
    socket.on('ride:accepted', updateRide);
    return () => { socket.off('ride:status', updateRide); socket.off('ride:accepted', updateRide); };
  }, [ride?._id, socketRef]);
  if (!session) return <Navigate to="/login" replace />;
  async function submit(e) { e.preventDefault(); setError(''); try { const r = await api.post('/rides', form); setRide(r.data.ride); } catch (err) { if (!err.response) setError('Unable to reach the server — is the API running?'); else if (err.response.status !== 401) setError(err.response.data?.message || 'Unable to request ride'); } }
  const selected = rideOptions.find(option => option.id === form.vehicleType);
  return <main className="page narrow"><p className="eyebrow">ON-DEMAND RIDES</p><h2>Choose your ride</h2><p className="lead">See the fare before you request. Prices are estimates based on distance and vehicle type.</p><div className="ride-choice-grid">{rideOptions.filter(option => option.id !== 'rental').map(option => <button type="button" className={`ride-choice ${form.vehicleType === option.id ? 'selected' : ''}`} onClick={() => setForm({...form, vehicleType: option.id})} key={option.id}><span>{option.icon}</span><b>{option.name}</b><small>{option.description}</small><strong>From ₹{option.baseFare}</strong></button>)}</div><form className="booking-form ride-form" onSubmit={submit}><label>Pickup location<input required placeholder="e.g. Hinjawadi Phase 1" value={form.pickup} onChange={e => setForm({...form,pickup:e.target.value})}/></label><label>Destination<input required placeholder="e.g. Pune Railway Station" value={form.destination} onChange={e => setForm({...form,destination:e.target.value})}/></label><label>Distance (km)<input required type="number" min="0.1" step="0.1" value={form.distanceKm} onChange={e => setForm({...form,distanceKm:e.target.value})}/></label><div className="form-grid"><label>Coupon code<input placeholder="Optional" value={form.couponCode} onChange={e => setForm({...form,couponCode:e.target.value})}/></label><label>Payment method<select value={form.paymentMethod} onChange={e => setForm({...form,paymentMethod:e.target.value})}><option value="cash">Cash</option><option value="wallet">Wallet</option></select></label></div><div className="fare-preview"><span>{selected.name} estimate</span><strong>₹{Math.max(selected.baseFare, Math.round(selected.baseFare + Number(form.distanceKm) * (form.vehicleType === 'bike' ? 8 : form.vehicleType === 'auto' ? 12 : 18)))}</strong><small>Includes base fare and distance charge · final fare may vary slightly</small></div>{error && <div className="error">{error}</div>}<button className="button full">Request {selected.name} <ArrowRight size={17}/></button></form>{ride && <div className="ride-confirmation"><CheckCircle2 size={20}/><div><b>Ride {ride.status}</b><span>Estimated fare: ₹{ride.fare}. {ride.driver?.name ? `Driver: ${ride.driver.name}.` : 'We are finding a driver for you.'}</span></div></div>}</main>;
}
function DriverDashboard() {
  const { session } = useAuth(); const socketRef = useRealtime(); const [profile, setProfile] = useState({ vehicleType: 'bike', vehicleNumber: '', licenseNumber: '' }); const [rides, setRides] = useState([]); const [error, setError] = useState('');
  useEffect(() => {
    if (!profile.online || !socketRef.current || !navigator.geolocation) return undefined;
    const timer = setInterval(() => navigator.geolocation.getCurrentPosition(pos => {
      socketRef.current.emit('captain:location', { latitude: pos.coords.latitude, longitude: pos.coords.longitude }, () => {});
    }, () => {}, { enableHighAccuracy: true }), 15000);
    return () => clearInterval(timer);
  }, [profile.online, socketRef]);
  const load = () => api.get('/drivers/rides').then(r => setRides(r.data.rides)).catch(err => setError(err.response?.data?.message || 'Unable to load driver rides'));
  useEffect(() => { api.get('/drivers/me').then(r => r.data.driver && setProfile(r.data.driver)); load(); }, []);
  async function saveProfile(e) { e.preventDefault(); try { const r = await api.put('/drivers/me', profile); setProfile(r.data.driver); } catch (err) { setError(err.response?.data?.message || 'Unable to save profile'); } }
  async function toggleAvailability() { try { const r = await api.patch('/drivers/availability', { online: !profile.online }); setProfile(r.data.driver); load(); } catch (err) { setError(err.response?.data?.message || 'Unable to change availability'); } }
  async function accept(id) { try { await api.patch(`/rides/${id}/accept`); load(); } catch (err) { setError(err.response?.data?.message || 'Unable to accept ride'); } }
  async function setStatus(id, status) { try { await api.patch(`/rides/${id}/status`, { status }); load(); } catch (err) { setError(err.response?.data?.message || 'Unable to update ride'); } }
  if (!session) return <Navigate to="/login" replace />;
  return <main className="page"><p className="eyebrow">DRIVER PARTNER</p><h2>Drive with RideOn.</h2><div className="driver-toolbar"><span className={`driver-status ${profile.online ? 'online' : ''}`}>{profile.online ? 'Online and receiving rides' : 'Offline'}</span><button className="button small" onClick={toggleAvailability}>{profile.online ? 'Go offline' : 'Go online'}</button></div><form className="driver-profile booking-form" onSubmit={saveProfile}><h3 className="section-title">Driver profile</h3><select value={profile.vehicleType || 'bike'} onChange={e => setProfile({...profile,vehicleType:e.target.value})}><option value="bike">Bike</option><option value="auto">Auto</option><option value="car">Car</option></select><input required placeholder="Vehicle number" value={profile.vehicleNumber || ''} onChange={e => setProfile({...profile,vehicleNumber:e.target.value})}/><input required placeholder="Driving license number" value={profile.licenseNumber || ''} onChange={e => setProfile({...profile,licenseNumber:e.target.value})}/><button className="button">Save profile</button></form>{error && <div className="error">{error}</div>}<h3 className="section-title booking-title">Ride requests</h3>{rides.length ? rides.map(ride => <div className="booking-row" key={ride._id}><div><b>{ride.pickup} → {ride.destination}</b><span>{ride.vehicleType} · {ride.distanceKm} km · ₹{ride.fare}</span></div>{ride.status === 'requested' ? <button className="button small" onClick={() => accept(ride._id)}>Accept</button> : <><strong className="status">{ride.status}</strong>{['accepted', 'arriving'].includes(ride.status) && <button className="button small secondary" onClick={() => setStatus(ride._id, 'arriving')}>Arriving</button>}{ride.status === 'arriving' && ride.otpVerifiedAt && <button className="button small" onClick={() => setStatus(ride._id, 'started')}>Start</button>}{ride.status === 'started' && <button className="button small" onClick={() => setStatus(ride._id, 'completed')}>Complete</button>}{['accepted', 'arriving', 'started'].includes(ride.status) && <RideChat rideId={ride._id} socketRef={socketRef}/>}</>}</div>) : <div className="empty">No ride requests right now.</div>}</main>;
}
function Dashboard() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [rides, setRides] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationError, setRecommendationError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!session) return;
    api.get('/bookings/mine').then(r => setBookings(r.data.bookings)).catch(() => {});
    api.get('/rides/mine').then(r => setRides(r.data.rides)).catch(() => {});
    api.get('/vehicles/recommendations')
      .then(r => setRecommendations(r.data.recommendations))
      .catch(() => setRecommendationError('Recommendations are temporarily unavailable.'));
  }, [session]);
  async function cancelRide(ride) { try { const r = await api.patch(`/rides/${ride._id}/status`, { status: 'cancelled' }); setRides(current => current.map(x => x._id === ride._id ? r.data.ride : x)); } catch (err) { setNotice(err.response?.data?.message || 'Unable to cancel ride'); } }
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role === 'driver') return <DriverDashboard />;
  if (session.user.role === 'admin') return <AdminDashboard />;
  if (session.user.role === 'owner') return <OwnerDashboard />;
  const activeRide = rides.find(ride => ['requested', 'accepted', 'arriving', 'started'].includes(ride.status));
  return <main className="page">
    <section className="dashboard-hero"><p className="eyebrow">YOUR RIDEON</p><h2>Good to see you, {session.user.name.split(' ')[0]}.</h2><p>Manage your rides, bookings, and vehicle recommendations in one place.</p></section>
    <div className="dashboard-grid">
      <div className="dash-card"><UserRound size={20}/><span>Account</span><b>{session.user.email}</b></div>
      <div className="dash-card"><CheckCircle2 size={20}/><span>Booking status</span><b>{bookings.length ? `${bookings.length} booking(s)` : 'No bookings yet'}</b></div>
      <div className="dash-card"><Car size={20}/><span>On-demand rides</span><b>{rides.length ? `${rides.length} ride(s)` : 'No rides yet'}</b></div>
    </div>
    <h3 className="section-title booking-title">On-demand rides</h3>
    {activeRide && <div className="active-ride"><div><span className="status">{activeRide.status}</span><b>{activeRide.pickup} → {activeRide.destination}</b><small>{activeRide.vehicleType} · ₹{activeRide.fare}</small></div><Link className="button small" to="/ride">Book another</Link></div>}
    {rides.length ? rides.map(ride => <div className="booking-row" key={ride._id}><div><b>{ride.pickup} → {ride.destination}</b><span>{ride.vehicleType} · {ride.distanceKm} km · ₹{ride.finalFare ?? ride.fare}{ride.discount ? ` · ₹${ride.discount} off` : ''}</span></div><strong className={`status ${ride.status}`}>{ride.status}</strong><span>{ride.driver?.name || 'Finding a driver'}</span>{['requested', 'accepted', 'arriving'].includes(ride.status) && <button className="button small secondary" onClick={() => cancelRide(ride)}>Cancel</button>}</div>) : <div className="empty">Need a quick trip? <Link to="/ride">Request a ride</Link></div>}
    <div className="recommendation-heading">
      <div><p className="eyebrow">SMART PICKS</p><h3 className="section-title">Recommended for you</h3></div>
      <span className="muted">Based on your booking preferences</span>
    </div>
    {recommendationError ? <div className="notice">{recommendationError}</div> : <div className="recommendation-grid">
      {recommendations.map(({ vehicle, reason }) => <Link className="recommendation-card" to={`/vehicles/${vehicle._id}`} key={vehicle._id}>
        <img src={vehicle.imageUrl} alt={vehicle.name}/>
        <div><h3>{vehicle.name}</h3><span>{vehicle.category} · ₹{vehicle.pricePerDay.toLocaleString()}/day</span><small>{reason}</small></div>
      </Link>)}
      {!recommendations.length && <div className="empty">Book a vehicle to personalize your next recommendations.</div>}
    </div>}
    <h3 className="section-title booking-title">Your bookings</h3>
    {notice && <div className="notice">{notice}</div>}
    {bookings.length ? bookings.map(b => <div className="booking-row" key={b._id}><div><b>{b.vehicle?.name || 'Vehicle'}</b><span>{b.pickupLocation} → {b.destination}</span></div><strong className={`status ${b.status}`}>{b.status}</strong><strong className={`status ${b.paymentStatus === 'successful' ? 'completed' : b.paymentStatus === 'refunded' ? '' : 'cancelled'}`}>{b.paymentStatus || 'pending'}</strong><b>₹{b.totalAmount.toLocaleString()}</b>{['pending', 'confirmed'].includes(b.status) && <button className="button small secondary" onClick={async () => { try { const r = await api.patch(`/bookings/${b._id}/cancel`); setBookings(current => current.map(x => x._id === b._id ? r.data.booking : x)); setNotice(r.data.refund?.percent != null ? `Booking cancelled. Estimated refund: ₹${r.data.refund.amount} (${r.data.refund.percent}% of total).` : 'Booking cancelled.'); } catch (err) { setNotice(err.response?.data?.message || 'Unable to cancel booking'); } }}>Cancel</button>}</div>) : <div className="empty">Your confirmed journeys will appear here. <Link to="/vehicles">Explore vehicles</Link></div>}
  </main>;
}
function OwnerDashboard() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ name: '', category: 'Hatchback', seats: 4, pricePerDay: 1500, fuelType: 'Petrol', transmission: 'Manual', location: '', imageUrl: '' });
  const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (session) api.get('/vehicles/mine').then(r => setVehicles(r.data.vehicles)).catch(e => setError(e.response?.data?.message || 'Unable to load your vehicles')); }, [session]);
  if (!session) return <Navigate to="/login" replace />;
  async function addVehicle(e) {
    e.preventDefault(); setError(''); setNotice('');
    try {
      await api.post('/vehicles', { ...form, seats: Number(form.seats), pricePerDay: Number(form.pricePerDay) });
      setNotice('Vehicle submitted and awaiting admin verification.');
      const r = await api.get('/vehicles/mine'); setVehicles(r.data.vehicles);
    } catch (err) { setError(err.response?.data?.message || 'Unable to add vehicle'); }
  }
  async function removeVehicle(vehicle) {
    setError(''); setNotice('');
    try {
      await api.delete(`/vehicles/${vehicle._id}`);
      setVehicles(current => current.filter(v => v._id !== vehicle._id));
      setNotice(`${vehicle.name} removed.`);
    } catch (err) { setError(err.response?.data?.message || 'Unable to delete vehicle'); }
  }
  return <main className="page">
    <p className="eyebrow">OWNER PORTAL</p><h2>Your fleet</h2>
    <p className="lead">Add vehicles to the RideOn marketplace and manage availability. Vehicles become visible to customers after admin verification.</p>
    {notice && <div className="notice">{notice}</div>}{error && <div className="error">{error}</div>}
    <form className="booking-form" onSubmit={addVehicle}>
      <h3 className="section-title">Add a vehicle</h3>
      <div className="form-grid">
        <label>Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{['Scooter','Motorcycle','Hatchback','Sedan','SUV','Luxury'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Seats<input required type="number" min="1" max="20" value={form.seats} onChange={e => setForm({...form, seats: e.target.value})}/></label>
        <label>Price per day (₹)<input required type="number" min="1" value={form.pricePerDay} onChange={e => setForm({...form, pricePerDay: e.target.value})}/></label>
        <label>Fuel<select value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>{['Petrol','Diesel','Electric','CNG'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label>Transmission<select value={form.transmission} onChange={e => setForm({...form, transmission: e.target.value})}>{['Manual','Automatic'].map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Location<input required value={form.location} onChange={e => setForm({...form, location: e.target.value})}/></label>
        <label>Image URL<input placeholder="https://…" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})}/></label>
      </div>
      <button className="button">Submit vehicle <ArrowRight size={17}/></button>
    </form>
    <h3 className="section-title booking-title">My vehicles</h3>
    {vehicles.length ? vehicles.map(v => <div className="booking-row admin-row" key={v._id}>
      <div><b>{v.name}</b><span>{v.category} · ₹{v.pricePerDay.toLocaleString()}/day · {v.location}</span></div>
      <strong className={`status ${v.verified ? '' : 'cancelled'}`}>{v.verified ? 'verified' : 'pending'}</strong>
      <strong className={`status ${v.available ? '' : 'cancelled'}`}>{v.available ? 'available' : 'hidden'}</strong>
      <button className="button small secondary" onClick={() => removeVehicle(v)}>Delete</button>
    </div>) : <div className="empty">No vehicles yet. Add your first one above.</div>}
  </main>;
}

function useRealtime() {
  const { session } = useAuth();
  const socketRef = React.useRef(null);
  useEffect(() => {
    if (!session?.token) return undefined;
    const socket = io(realtimeUrl, { auth: { token: session.token }, autoConnect: true });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [session]);
  return socketRef;
}
function AdminDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const load = () => Promise.all([api.get('/drivers'), api.get('/bookings'), api.get('/vehicles/admin'), api.get('/analytics').catch(() => null)])
    .then(([driverResult, bookingResult, vehicleResult, analyticsResult]) => {
      setDrivers(driverResult.data.drivers);
      setBookings(bookingResult.data.bookings);
      setVehicles(vehicleResult.data.vehicles);
      setAnalytics(analyticsResult?.data || null);
    })
    .catch(err => setError(err.response?.data?.message || 'Unable to load admin data'));
  useEffect(() => { load(); }, []);
  async function verify(driver, verified) {
    try { await api.patch(`/drivers/${driver._id}/verify`, { verified }); load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update verification'); }
  }
  async function updateBooking(booking, status) {
    try { await api.patch(`/bookings/${booking._id}/status`, { status }); load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update booking'); }
  }
  async function updateVehicle(vehicle, available) {
    try { await api.patch(`/vehicles/${vehicle._id}`, { available }); load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update vehicle'); }
  }
  return <main className="page"><p className="eyebrow">ADMIN CONSOLE</p><h2>Keep the network moving.</h2><p className="lead">Review drivers, bookings, and vehicle availability from one place.</p>{error && <div className="error">{error}</div>}
  {analytics && <div className="dashboard-grid">
    <div className="dash-card"><CreditCard size={20}/><span>Total revenue (30d)</span><b>₹{analytics.totalRevenue.toLocaleString()}</b></div>
    <div className="dash-card"><CheckCircle2 size={20}/><span>Cancelled bookings</span><b>{analytics.cancellationRate}%</b></div>
    <div className="dash-card"><Car size={20}/><span>Top vehicle</span><b>{analytics.topVehicles[0]?.[0] || '—'}</b></div>
  </div>}
  {analytics && analytics.revenueByDay.length > 0 && <div className="price-summary" style={{ marginTop: 14 }}><span>Revenue last 30 days</span>{analytics.revenueByDay.map(([day, amount]) => <div key={day} className="rev-bar-row"><small>{day.slice(5)}</small><div className="rev-bar"><span style={{ width: `${Math.min(100, (amount / Math.max(...analytics.revenueByDay.map(([, v]) => v))) * 100)}%` }}/></div><small>₹{amount.toLocaleString()}</small></div>)}</div>}<h3 className="section-title booking-title">Driver verification</h3>{drivers.length ? drivers.map(driver => <div className="booking-row admin-row" key={driver._id}><div><b>{driver.name}</b><span>{driver.email} · {driver.driverProfile?.vehicleType || 'Profile incomplete'} · {driver.driverProfile?.vehicleNumber || 'No vehicle number'}</span></div><strong className={`status ${driver.driverProfile?.verified ? '' : 'cancelled'}`}>{driver.driverProfile?.verified ? 'verified' : 'pending'}</strong><button className="button small" onClick={() => verify(driver, !driver.driverProfile?.verified)}>{driver.driverProfile?.verified ? 'Revoke' : 'Verify'}</button></div>) : <div className="empty">No driver partners yet.</div>}<h3 className="section-title booking-title">Booking operations</h3>{bookings.length ? bookings.map(booking => <div className="booking-row admin-row" key={booking._id}><div><b>{booking.bookingId} · {booking.vehicle?.name || 'Vehicle'}</b><span>{booking.customer?.name || 'Customer'} · {booking.pickupLocation} → {booking.destination}</span></div><strong className={`status ${booking.status}`}>{booking.status}</strong><select value={booking.status} onChange={e => updateBooking(booking, e.target.value)}><option value="pending">pending</option><option value="confirmed">confirmed</option><option value="active">active</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></div>) : <div className="empty">No bookings yet.</div>}<h3 className="section-title booking-title">Vehicle availability</h3>{vehicles.length ? vehicles.map(vehicle => <div className="booking-row admin-row" key={vehicle._id}><div><b>{vehicle.name}</b><span>{vehicle.location} · ₹{vehicle.pricePerDay}/day</span></div><strong className={`status ${vehicle.available ? '' : 'cancelled'}`}>{vehicle.available ? 'available' : 'hidden'}</strong><button className="button small" onClick={() => updateVehicle(vehicle, !vehicle.available)}>{vehicle.available ? 'Hide' : 'Show'}</button></div>) : <div className="empty">No vehicles yet.</div>}</main>;
}
function App() { return <AuthProvider><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/ride" element={<RidePage/>}/><Route path="/vehicles" element={<Vehicles/>}/><Route path="/vehicles/:id" element={<VehicleDetails/>}/><Route path="/book/:id" element={<BookingRoute/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/profile" element={<Profile/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/track" element={<TrackRide/>}/></Routes></Layout></AuthProvider>; }
function BookingRoute() { const { id } = useParams(); return <Booking id={id}/>; }

function Profile() {
  const { session, save } = useAuth(); const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [upload, setUpload] = useState({ kind: 'govt_id', file: null });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [reviews, setReviews] = useState([]);
  useEffect(() => { if (session) { api.get('/documents/mine').then(r => setDocuments(r.data.documents)).catch(() => {}); api.get('/reviews/mine').then(r => setReviews(r.data.reviews)).catch(() => {}); } }, [session]);
  if (!session) return <Navigate to="/login" replace />;
  async function submitUpload(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!upload.file) return setError('Choose a file to upload.');
    if (upload.file.size > 5 * 1024 * 1024) return setError('File must be under 5 MB.');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post('/documents', { kind: upload.kind, fileName: upload.file.name, mimeType: upload.file.type, dataBase64: String(reader.result) });
        setNotice('Document uploaded and pending admin verification.');
        const r = await api.get('/documents/mine'); setDocuments(r.data.documents);
      } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
    };
    reader.readAsDataURL(upload.file);
  }
  async function changePassword(e) {
    e.preventDefault(); setError(''); setNotice('');
    try {
      await api.patch('/auth/password', pw);
      setNotice('Password updated successfully.');
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err) { setError(err.response?.data?.message || 'Unable to change password'); }
  }
  return <main className="page narrow">
    <p className="eyebrow">YOUR PROFILE</p><h2>Account and verification</h2>
    <div className="dash-card profile-card"><UserRound size={20}/><span>Signed in as</span><b>{session.user.name}</b><small>{session.user.email} · role: {session.user.role}</small></div>
    {notice && <div className="notice">{notice}</div>}{error && <div className="error">{error}</div>}
    <form className="booking-form" onSubmit={submitUpload}>
      <h3 className="section-title">Verification documents</h3>
      <p className="lead">Upload a government ID for verification, a passport for interstate trips, or booking proof. PNG/JPEG/WebP/PDF up to 5 MB.</p>
      <label>Document type<select value={upload.kind} onChange={e => setUpload({ ...upload, kind: e.target.value })}><option value="govt_id">Government ID</option><option value="passport">Passport (interstate)</option><option value="booking_proof">Booking proof</option></select></label>
      <label>File<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e => setUpload({ ...upload, file: e.target.files[0] })}/></label>
      <button className="button">Upload document <ArrowRight size={17}/></button>
    </form>
    <form className="booking-form" onSubmit={changePassword}>
      <h3 className="section-title">Change password</h3>
      <label>Current password<input required type="password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })}/></label>
      <label>New password<input required type="password" minLength="8" placeholder="8+ characters" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })}/></label>
      <button className="button">Update password <ArrowRight size={17}/></button>
    </form>
    <h3 className="section-title booking-title">My reviews</h3>
    {reviews.length ? reviews.map(rv => <div className="booking-row" key={rv._id}><div><b>{rv.vehicle?.name || 'Vehicle'}</b><span>{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span></div><p>{rv.comment}</p></div>) : <div className="empty">You haven't reviewed any vehicles yet.</div>}
    <h3 className="section-title booking-title">Uploaded documents</h3>
    {documents.length ? documents.map(d => <div className="booking-row" key={d._id}><div><b>{d.kind.replace('_', ' ')}</b><span>{d.fileName}</span></div><strong className={`status ${d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'cancelled' : ''}`}>{d.status}</strong><a className="button small secondary" href={`${api.defaults.baseURL}/documents/${d._id}/download`}>Download</a></div>) : <div className="empty">No documents uploaded yet.</div>}
    <button className="button full" onClick={() => { save(null); navigate('/'); }}>Sign out <LogOut size={16}/></button>
  </main>;
}

function Wallet() {
  const { session } = useAuth();
  const [balance, setBalance] = useState(0); const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('500'); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (session) api.get('/wallet').then(r => { setBalance(r.data.balance); setTransactions(r.data.transactions); }).catch(() => {}); }, [session]);
  if (!session) return <Navigate to="/login" replace />;
  async function topup(e) {
    e.preventDefault(); setError(''); setNotice('');
    try { const r = await api.post('/wallet/topup', { amount: Number(amount) }); setBalance(r.data.balance); setTransactions(current => [r.data.transaction, ...current]); setNotice(`Wallet topped up with ₹${r.data.transaction.amount}.`); } catch (err) { setError(err.response?.data?.message || 'Unable to top up'); }
  }
  return <main className="page narrow">
    <p className="eyebrow">RIDEON WALLET</p><h2>Your wallet</h2>
    <p className="lead">Use wallet balance to pay for rides instantly. Balance is credited after each top-up.</p>
    <div className="dash-card"><CreditCard size={20}/><span>Current balance</span><b>₹{balance.toLocaleString()}</b></div>
    {notice && <div className="notice">{notice}</div>}{error && <div className="error">{error}</div>}
    <form className="booking-form" onSubmit={topup}>
      <h3 className="section-title">Add money</h3>
      <label>Amount (₹)<input required type="number" min="10" max="100000" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <button className="button">Top up wallet <ArrowRight size={17}/></button>
      <small className="muted">Simulated gateway — swap in Razorpay/Stripe for production.</small>
    </form>
    <h3 className="section-title booking-title">Transactions</h3>
    {transactions.length ? transactions.map(t => <div className="booking-row" key={t._id}><div><b>{t.type === 'credit' ? '+' : '−'} ₹{t.amount.toLocaleString()}</b><span>{t.reason.replace(/_/g, ' ')} · {new Date(t.createdAt).toLocaleString()}</span></div><strong className={`status ${t.type === 'credit' ? 'completed' : 'cancelled'}`}>{t.type}</strong><small>₹{t.balanceAfter.toLocaleString()}</small></div>) : <div className="empty">No transactions yet. Top up to get started.</div>}
  </main>;
}

function RideChat({ rideId, socketRef }) {
  const [messages, setMessages] = useState([]); const [text, setText] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !rideId) return undefined;
    api.get(`/chat/${rideId}`).then(r => setMessages(r.data.messages)).catch(() => {});
    const onMessage = msg => setMessages(current => [...current, msg]);
    socket.on('chat:message', onMessage);
    return () => { socket.off('chat:message', onMessage); };
  }, [rideId, socketRef]);
  async function send(e) {
    e.preventDefault(); if (!text.trim()) return;
    try { const r = await api.post(`/chat/${rideId}`, { message: text.trim() }); setMessages(current => current.some(m => m._id === r.data.message._id) ? current : [...current, r.data.message]); setText(''); } catch (err) { setError(err.response?.data?.message || 'Unable to send message'); }
  }
  return <div className="chat-panel">
    <h3 className="section-title">Ride chat</h3>
    <div className="chat-messages">{messages.map(m => <div className="chat-bubble" key={m._id || m.createdAt}><span>{m.message}</span></div>)}</div>
    {error && <div className="error">{error}</div>}
    <form className="chat-input" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder="Message your captain…" maxLength={1000}/><button className="button small">Send</button></form>
  </div>;
}

function TrackRide() {
  const { session } = useAuth(); const socketRef = useRealtime();
  const [rides, setRides] = useState([]); const [activeId, setActiveId] = useState('');
  const [captainPos, setCaptainPos] = useState(null); const [notice, setNotice] = useState('');
  useEffect(() => { if (session) api.get('/rides/mine').then(r => setRides(r.data.rides)).catch(() => {}); }, [session]);
  useEffect(() => {
    const socket = socketRef.current; if (!socket || !activeId) return undefined;
    socket.emit('ride:join', { rideId: activeId }, ack => { if (ack && !ack.ok) setNotice(ack.message); });
    const onLocation = p => setCaptainPos({ lat: p.latitude, lng: p.longitude, updatedAt: p.updatedAt });
    socket.on('captain:location', onLocation);
    return () => { socket.off('captain:location', onLocation); };
  }, [activeId, socketRef]);
  if (!session) return <Navigate to="/login" replace />;
  const trackable = rides.filter(ride => ['accepted', 'arriving', 'started'].includes(ride.status));
  const activeRide = rides.find(ride => ['accepted', 'arriving', 'started'].includes(ride.status));
  return <main className="page narrow">
    <p className="eyebrow">LIVE TRACKING</p><h2>Track your captain</h2>
    <p className="lead">Authorized tracking for rides you booked. Position updates arrive over a secure socket while the ride is in progress.</p>
    {notice && <div className="notice">{notice}</div>}
    {trackable.length ? trackable.map(ride => <button key={ride._id} className={`button small ${activeId === ride._id ? '' : 'secondary'}`} style={{ marginRight: 10 }} onClick={() => { setActiveId(ride._id); setCaptainPos(null); }}>{ride.pickup} → {ride.destination}</button>) : <div className="empty">No ride is currently in progress.</div>}
    {activeId && <div className="track-panel"><CaptainMap position={captainPos}/>{captainPos && <div className="price-summary"><span>Captain position</span><strong>{captainPos.lat.toFixed(4)}, {captainPos.lng.toFixed(4)}</strong><small>Updated {new Date(captainPos.updatedAt).toLocaleTimeString()}</small></div>}<RideChat rideId={activeId} socketRef={socketRef}/></div>}
  </main>;
}

function PayBooking({ booking }) {
  const [order, setOrder] = useState(null); const [paymentRef, setPaymentRef] = useState(null); const [paymentId, setPaymentId] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  async function startPayment() {
    setError(''); setStatus('Creating order…');
    try {
      const r = await api.post('/payments/order', { bookingId: booking._id });
      setPaymentRef(r.data.payment.id); setOrder(r.data.order);
      setStatus(r.data.order.provider === 'razorpay' ? 'Order created — confirm the payment below.' : 'Development mode: confirming simulated payment.');
    } catch (err) { setStatus(''); setError(err.response?.data?.message || 'Unable to create payment order'); }
  }
  async function confirmPayment() {
    setError('');
    try {
      await api.post('/payments/verify', { paymentId: paymentRef, razorpayPaymentId: paymentId || undefined, razorpaySignature: paymentId ? undefined : undefined });
      setStatus('Payment successful! Booking confirmed.');
    } catch (err) { setError(err.response?.data?.message || 'Payment verification failed'); }
  }
  return <div className="price-summary payment-box">
    <span>Payment</span>
    {status && <small>{status}</small>}
    {error && <div className="error">{error}</div>}
    {!order ? <button type="button" className="button" onClick={startPayment}><CreditCard size={16}/> Pay ₹{booking.totalAmount.toLocaleString()} securely</button>
      : <div className="pay-confirm">
          <small>Order {order.orderId}</small>
          {order.provider === 'razorpay' ? <input placeholder="Paste Razorpay payment id (pay_…)" value={paymentId} onChange={e => setPaymentId(e.target.value)}/> : null}
          <button type="button" className="button small" onClick={confirmPayment}>Confirm payment</button>
        </div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
