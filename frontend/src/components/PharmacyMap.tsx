import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Pharmacy } from '../types';

// Fix broken default marker images in Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function pharmacyIcon(isOpen: boolean) {
  const color = isOpen ? '#16a34a' : '#dc2626';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="11" fill="white"/>
      <rect x="15" y="10" width="6" height="16" rx="2" fill="${color}"/>
      <rect x="10" y="15" width="16" height="6" rx="2" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
}

function userIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <circle cx="14" cy="14" r="12" fill="#2563eb" stroke="white" stroke-width="3" opacity="0.9"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevCenter = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (
      !prevCenter.current ||
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1]
    ) {
      map.flyTo(center, 14, { duration: 1.2 });
      prevCenter.current = center;
    }
  }, [center, map]);
  return null;
}

interface Props {
  pharmacies: Pharmacy[];
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
}

const DEFAULT_CENTER: [number, number] = [3.8480, 11.5021]; // Yaoundé, Cameroun

export default function PharmacyMap({ pharmacies, userLocation, height = '460px' }: Props) {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : DEFAULT_CENTER;

  const zoom = userLocation ? 14 : 12;

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <MapUpdater center={[userLocation.lat, userLocation.lng]} />}

        {/* User position */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon()}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-green-700">Votre position</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pharmacy markers */}
        {pharmacies.map((pharmacy) => {
          if (!pharmacy.location?.coordinates) return null;
          // GeoJSON: [longitude, latitude] → Leaflet: [latitude, longitude]
          const [lng, lat] = pharmacy.location.coordinates;
          if (!lat || !lng) return null;

          return (
            <Marker
              key={pharmacy._id}
              position={[lat, lng]}
              icon={pharmacyIcon(pharmacy.isOpen)}
            >
              <Popup minWidth={220}>
                <div className="p-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{pharmacy.name}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      pharmacy.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {pharmacy.isOpen ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{pharmacy.address}</p>
                  {pharmacy.phone && (
                    <p className="text-xs text-gray-500 mb-2">
                      <a href={`tel:${pharmacy.phone}`} className="text-green-600 hover:underline">
                        {pharmacy.phone}
                      </a>
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {pharmacy.distance !== undefined ? (
                      <span className="text-xs text-gray-400">
                        {pharmacy.distance < 1000
                          ? `${pharmacy.distance}m`
                          : `${(pharmacy.distance / 1000).toFixed(1)} km`}
                      </span>
                    ) : (
                      <div />
                    )}
                    <Link
                      to={`/pharmacies/${pharmacy._id}`}
                      className="inline-block px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Voir →
                    </Link>
                  </div>
                  {pharmacy.hasDelivery && (
                    <p className="mt-2 text-xs text-green-600">
                      Livraison {pharmacy.deliveryFee > 0 ? `${pharmacy.deliveryFee} FCFA` : 'gratuite'}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
