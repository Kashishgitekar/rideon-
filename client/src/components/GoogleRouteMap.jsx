import { useEffect, useRef, useState } from 'react';

let googleMapsPromise;

function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Google Maps could not be loaded'));
      document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}

export default function GoogleRouteMap({ onLocationsChange }) {
  const mapRef = useRef(null);
  const pickupRef = useRef(null);
  const destinationRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const locationsChangeRef = useRef(onLocationsChange);
  const [status, setStatus] = useState('Loading Google Maps...');
  const [fallback, setFallback] = useState({ pickup: '', destination: '' });
  const [mapAvailable, setMapAvailable] = useState(Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY.includes('replace-with')));

  useEffect(() => {
    locationsChangeRef.current = onLocationsChange;
  }, [onLocationsChange]);

  useEffect(() => {
    let active = true;
    const handleGoogleAuthFailure = () => {
      if (!active) return;
      setMapAvailable(false);
      setStatus('Google Maps is unavailable. Enter your locations below.');
    };
    window.gm_authFailure = handleGoogleAuthFailure;
    if (!mapAvailable) {
      setStatus('Google Maps key is not configured. Enter your locations below.');
      return () => {
        active = false;
        if (window.gm_authFailure === handleGoogleAuthFailure) delete window.gm_authFailure;
      };
    }
    const listeners = [];
    loadGoogleMaps().then(maps => {
      if (!active) return;
      const map = new maps.Map(mapRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 5, mapTypeControl: false, streetViewControl: false });
      directionsRendererRef.current = new maps.DirectionsRenderer({ map });
      const autocompleteOptions = { fields: ['formatted_address', 'geometry', 'name'] };
      const pickup = new maps.places.Autocomplete(pickupRef.current, autocompleteOptions);
      const destination = new maps.places.Autocomplete(destinationRef.current, autocompleteOptions);
      const update = () => {
        const pickupPlace = pickup.getPlace();
        const destinationPlace = destination.getPlace();
        if (!pickupPlace?.geometry || !destinationPlace?.geometry) return;
        const directions = new maps.DirectionsService();
        directions.route({ origin: pickupPlace.geometry.location, destination: destinationPlace.geometry.location, travelMode: maps.TravelMode.DRIVING }, (result, code) => {
          if (code !== 'OK') {
            setStatus('Could not calculate a driving route');
            return;
          }
          directionsRendererRef.current.setDirections(result);
          setStatus(`${result.routes[0].legs[0].distance.text} · about ${result.routes[0].legs[0].duration.text}`);
          locationsChangeRef.current?.({ pickup: pickupPlace.formatted_address || pickupPlace.name, destination: destinationPlace.formatted_address || destinationPlace.name });
        });
      };
      listeners.push(pickup.addListener('place_changed', update));
      listeners.push(destination.addListener('place_changed', update));
      setStatus('Select pickup and destination to see the route');
    }).catch(error => {
      if (!active) return;
      setMapAvailable(false);
      setStatus(`${error.message}. Enter your locations below.`);
    });
    return () => {
      active = false;
      listeners.forEach(listener => { try { listener.remove(); } catch { /* already disposed */ } });
      if (directionsRendererRef.current && typeof directionsRendererRef.current.setMap === 'function') {
        try { directionsRendererRef.current.setMap(null); } catch { /* already disposed */ }
      }
      directionsRendererRef.current = null;
      if (window.gm_authFailure === handleGoogleAuthFailure) delete window.gm_authFailure;
    };
  }, [mapAvailable]);

  const manualChange = (key, value) => {
    const next = { ...fallback, [key]: value };
    setFallback(next);
    onLocationsChange?.(next);
  };
  return <div className="map-panel"><div className="map-inputs"><input ref={pickupRef} placeholder={mapAvailable ? 'Search pickup location' : 'Enter pickup location'} value={fallback.pickup} onChange={e => manualChange('pickup', e.target.value)} autoComplete="off"/><input ref={destinationRef} placeholder={mapAvailable ? 'Search destination' : 'Enter destination'} value={fallback.destination} onChange={e => manualChange('destination', e.target.value)} autoComplete="off"/></div>{mapAvailable ? <div ref={mapRef} className="google-map"/> : <div className="map-fallback"><strong>Map search unavailable</strong><span>Type your pickup and destination above to continue.</span></div>}<p className="map-status">{status}</p></div>;
}
