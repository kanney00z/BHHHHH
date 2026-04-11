import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Beautiful custom map pin using HTML/CSS
const customMarkerHtml = `
  <div style="
    background-color: #ff2d55;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0px 4px 12px rgba(255,45,85,0.5);
  ">
    <div style="
      width: 12px;
      height: 12px;
      background-color: white;
      border-radius: 50%;
    "></div>
  </div>
`;

const modernPinIcon = new L.DivIcon({
  className: 'modern-map-pin',
  html: customMarkerHtml,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

interface MapPickerProps {
  position: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
}

const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 };

function LocationMarker({ position, onChange }: MapPickerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Allow clicking on map to move marker too
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onChange]
  );

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={modernPinIcon}
    />
  );
}

export default function MapPicker({ position, onChange }: MapPickerProps) {
  const [mapCenter, setMapCenter] = useState(BANGKOK_CENTER);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [locating, setLocating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // If we have a position set, let's use it as center
    if (position) {
      setMapCenter(position);
      if (mapInstance) {
        mapInstance.flyTo(position, 16);
      }
    } else {
      // Try to auto-locate
      handleLocateMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance]); // Only run when map first mounts (or position changes externally mostly ignored since User drags it)

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน', 'error');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(newPos);
        onChange(newPos);
        if (mapInstance) {
          mapInstance.flyTo(newPos, 16, { animate: true });
        }
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        // Fallback to initial location (Bangkok) if error, so the marker still appears
        onChange(BANGKOK_CENTER);
        if (mapInstance) {
          mapInstance.flyTo(BANGKOK_CENTER, 14, { animate: true });
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button 
        type="button" 
        onClick={handleLocateMe}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'var(--accent)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-glow)',
          transition: 'all var(--transition-normal)',
          fontSize: '0.95rem'
        }}
      >
        <MapPin size={18} /> 
        {locating ? 'กำลังค้นหาตำแหน่ง...' : 'กดเพื่อใช้ตำแหน่งปัจจุบันของฉัน'}
      </button>

      <div style={{ height: '300px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(255, 45, 85, 0.2)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
          ref={setMapInstance}
        >
          {/* Beautiful Google Maps tiles instead of standard OSM */}
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          <LocationMarker position={position} onChange={onChange} />
        </MapContainer>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MapPin size={12} /> คุณสามารถซูมและ <strong style={{color: 'var(--accent)'}}>ลากหมุด</strong> ไปยังจุดที่ต้องการให้จัดส่งได้เลย
      </p>
    </div>
  );
}
