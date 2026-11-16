import { useEffect, useRef } from 'react';

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

export default function CaptainMap({ position }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadGoogleMaps().then(maps => {
      if (!active) return;
      const map = new maps.Map(mapRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 5, mapTypeControl: false, streetViewControl: false });
      markerRef.current = new maps.Marker({ map, position: map.getCenter(), title: 'Your captain' });
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (position && markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat: position.lat, lng: position.lng });
      const maps = window.google?.maps;
      if (maps) mapRef.current.panTo({ lat: position.lat, lng: position.lng });
    }
  }, [position]);

  return (
    <div className="map-panel">
      {position
        ? <div ref={mapRef} className="google-map"/>
        : <div className="map-fallback"><strong>Waiting for captain location…</strong><span>The marker appears once the captain shares GPS.</span></div>}
    </div>
  );
}
