import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix Leaflet's default marker icon issue in React
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
      icon={defaultIcon}
    />
  );
}

export default function MapPicker({ position, onChange }: MapPickerProps) {
  const [mapCenter, setMapCenter] = useState(BANGKOK_CENTER);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [locating, setLocating] = useState(false);

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
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน');
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
          padding: '10px 16px',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(255, 107, 53, 0.3)',
          transition: 'all 0.2s',
          fontSize: '0.9rem'
        }}
      >
        <MapPin size={16} /> 
        {locating ? 'กำลังค้นหาตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}
      </button>

      <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
          ref={setMapInstance}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onChange={onChange} />
        </MapContainer>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MapPin size={12} /> คุณสามารถซูมและ <strong style={{color: 'var(--primary)'}}>ลากหมุด</strong> ไปยังจุดที่ต้องการให้จัดส่งได้เลย
      </p>
    </div>
  );
}
