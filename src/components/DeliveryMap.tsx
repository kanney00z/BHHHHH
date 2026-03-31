import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Store, User, Bike } from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface DeliveryMapProps {
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | string;
  updatedAt: string; // the time the status last changed
}

// Icons
const createIcon = (iconElement: React.ReactNode, bgColor: string, pulse = false) => {
  const htmlStr = renderToString(
    <div style={{
      background: bgColor,
      color: 'white',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      border: '3px solid white',
      position: 'relative'
    }}>
      {iconElement}
      {pulse && (
        <div style={{
          position: 'absolute',
          top: -3, left: -3, right: -3, bottom: -3,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: bgColor,
          animation: 'map-pulse 2s infinite'
        }} />
      )}
    </div>
  );

  return new L.DivIcon({
    html: htmlStr,
    className: 'custom-map-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const storeIcon = createIcon(<Store size={18} />, 'var(--primary)');
const customerIcon = createIcon(<User size={18} />, 'var(--info)', true);
const driverIcon = createIcon(<Bike size={18} />, 'var(--success)', true);

// Component to adjust bounds to fit all markers
const MapBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, positions]);
  return null;
};

export default function DeliveryMap({ storeLat, storeLng, customerLat, customerLng, status, updatedAt }: DeliveryMapProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Determine target progress based on status
  const targetProgress = useMemo(() => {
    if (status === 'delivered') return 1;
    if (status === 'delivering') {
      // Fake progress: say a delivery takes 15 mins (900 seconds)
      // We calculate how much time passed since it became 'delivering'
      const start = new Date(updatedAt).getTime();
      const now = new Date().getTime();
      const elapsedSec = (now - start) / 1000;
      const fakeProg = Math.min(0.95, elapsedSec / 900); // Caps at 95% until marked delivered
      return Math.max(0.1, fakeProg); // start at least 10% out of the store
    }
    return 0; // preparing, confirmed, etc. driver is at store
  }, [status, updatedAt]);

  // Animate the driver smoothly
  useEffect(() => {
    if (animatedProgress === targetProgress) return;
    
    // Simple spring-like or linear animation toward target
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.01) {
          clearInterval(interval);
          return targetProgress;
        }
        return prev + diff * 0.1; // approach by 10% each tick (50ms)
      });
    }, 50);

    return () => clearInterval(interval);
  }, [targetProgress, animatedProgress]);

  const driverLat = storeLat + (customerLat - storeLat) * animatedProgress;
  const driverLng = storeLng + (customerLng - storeLng) * animatedProgress;

  const positions: [number, number][] = [
    [storeLat, storeLng],
    [customerLat, customerLng]
  ];

  return (
    <div style={{
      width: '100%',
      height: '250px',
      borderRadius: '24px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-glass)',
      position: 'relative',
      zIndex: 1
    }}>
      <style>{`
        @keyframes map-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .custom-map-icon {
          background: transparent;
          border: none;
        }
      `}</style>
      <MapContainer 
        center={[storeLat, storeLng]} 
        zoom={14} 
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds positions={positions} />
        
        {/* Path line connecting store and customer */}
        <Polyline 
          positions={positions} 
          pathOptions={{ color: 'var(--text-muted)', weight: 3, dashArray: '5, 10', opacity: 0.5 }} 
        />

        {/* Path left behind by driver */}
        {animatedProgress > 0 && (
          <Polyline 
            positions={[[storeLat, storeLng], [driverLat, driverLng]]} 
            pathOptions={{ color: 'var(--success)', weight: 4 }} 
          />
        )}

        <Marker position={[storeLat, storeLng]} icon={storeIcon}>
          <Popup>ร้านอาหาร</Popup>
        </Marker>

        <Marker position={[customerLat, customerLng]} icon={customerIcon}>
          <Popup>ตำแหน่งของคุณ</Popup>
        </Marker>

        {(status === 'delivering' || status === 'delivered') && (
          <Marker position={[driverLat, driverLng]} icon={driverIcon} zIndexOffset={100}>
            <Popup>คนขับอยู่ที่นี่</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
