import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Package, Bike, CheckCircle2, User, ChevronLeft, MessageCircle, Flag } from 'lucide-react';
import { RootState } from '../../store';
import { deliveryService } from '../../services/delivery.service';
import { deliverySocketService } from '../../services/deliverySocket.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fix Leaflet default icon paths (Vite/webpack issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  html: `<div style="background:#16a34a;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><span style="color:white;font-weight:bold;font-size:14px">L</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});
const pharmacyIcon = L.divIcon({
  html: `<div style="background:#059669;border:3px solid #fff;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><span style="color:white;font-weight:bold;font-size:12px">Ph</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});
const clientIcon = L.divIcon({
  html: `<div style="background:#2563eb;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><span style="color:white;font-weight:bold;font-size:13px">C</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(distKm: number) {
  return Math.round((distKm / 25) * 60);
}

function FlyToDriver({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { animate: true, duration: 1 });
  }, [position, map]);
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  assigned: 'Livreur assigné',
  picked_up: 'Colis récupéré',
  in_transit: 'En route',
  delivered: 'Livré',
  failed: 'Échec',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-orange-100 text-orange-700',
  in_transit: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DeliveryTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, token } = useSelector((s: RootState) => s.auth as any);

  const [delivery, setDelivery] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChat = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!orderId) return;
    deliveryService.getTracking(orderId)
      .then(d => {
        setDelivery(d);
        setStatus(d?.status || '');
        if (d?.messages) setMessages(d.messages);
        if (d?.currentLocation?.coordinates?.length === 2) {
          const [lng, lat] = d.currentLocation.coordinates;
          if (lat !== 0 || lng !== 0) setDriverPos([lat, lng]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!delivery?._id || !token) return;

    deliverySocketService.connect(token);

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);
    const onPosition = (data: { lat: number; lng: number }) => {
      setDriverPos([data.lat, data.lng]);
    };
    const onMsg = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollChat, 50);
    };
    const onStatus = (data: { status: string }) => {
      setStatus(data.status);
    };

    deliverySocketService.onConnect(onConnect);
    deliverySocketService.onDisconnect(onDisconnect);
    deliverySocketService.onPositionUpdated(onPosition);
    deliverySocketService.onMessage(onMsg);
    deliverySocketService.onStatusUpdated(onStatus);
    deliverySocketService.joinDelivery(delivery._id);

    if (deliverySocketService.connected) setWsConnected(true);

    return () => {
      deliverySocketService.leaveDelivery(delivery._id);
      deliverySocketService.offPositionUpdated(onPosition);
      deliverySocketService.offMessage(onMsg);
      deliverySocketService.offStatusUpdated(onStatus);
    };
  }, [delivery?._id, token, scrollChat]);

  useEffect(() => { scrollChat(); }, [messages, scrollChat]);

  const handleSend = () => {
    if (!input.trim() || !delivery?._id) return;
    deliverySocketService.sendMessage(delivery._id, input.trim());
    setInput('');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4 text-sm">Chargement du suivi...</p>
      </div>
    </div>
  );

  if (!delivery) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center bg-white rounded-2xl border p-10">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package className="w-8 h-8 text-gray-400" /></div>
        <p className="text-gray-700 font-semibold mt-4">Livraison non trouvée</p>
        <p className="text-gray-400 text-sm mt-2">La livraison n'a pas encore été assignée</p>
        <Link to={`/orders/${orderId}`} className="mt-4 inline-flex items-center gap-1 text-green-600 hover:underline text-sm">
          <ChevronLeft className="w-4 h-4" /> Retour à la commande
        </Link>
      </div>
    </div>
  );

  const driver = delivery.driverId;
  const isClientView = !user?.role || user.role === 'client';
  const pickupCoords = delivery.pickupLocation?.coordinates;
  const deliveryCoords = delivery.deliveryLocation?.coordinates;
  const mapCenter: [number, number] = driverPos
    ?? (pickupCoords?.[1] && pickupCoords?.[0] ? [pickupCoords[1], pickupCoords[0]] : [12.365, -1.533]);

  // ETA calculation
  const eta = (() => {
    if (!deliveryCoords?.[0] || !deliveryCoords?.[1]) return null;
    const destLat = deliveryCoords[1];
    const destLng = deliveryCoords[0];
    if (driverPos) {
      const d = haversineKm(driverPos[0], driverPos[1], destLat, destLng);
      return { distKm: d, minutes: etaMinutes(d), fromDriver: true };
    }
    if (pickupCoords?.[0] && pickupCoords?.[1]) {
      const d = haversineKm(pickupCoords[1], pickupCoords[0], destLat, destLng);
      return { distKm: d, minutes: etaMinutes(d), fromDriver: false };
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link to={`/orders/${orderId}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Suivi de livraison</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[status] || status}
                </span>
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-400">{wsConnected ? 'Temps réel' : 'Reconnexion...'}</span>
              </div>
            </div>
          </div>

          {/* Driver card */}
          {driver && (
            <div className="hidden sm:flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><Bike className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{driver.firstName} {driver.lastName}</p>
                <p className="text-xs text-gray-400">{isClientView ? 'Votre livreur' : 'Livreur assigné'}</p>
              </div>
              {driver.phone && (
                <a href={`tel:${driver.phone}`}
                  className="ml-2 p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="bg-white border rounded-xl px-5 py-4 mb-5 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {['assigned', 'picked_up', 'in_transit', 'delivered'].map((s, i) => {
              const steps = ['assigned', 'picked_up', 'in_transit', 'delivered'];
              const currentIdx = steps.indexOf(status);
              const done = i < currentIdx;
              const active = i === currentIdx;
              const labels = ['Assigné', 'Récupéré', 'En route', 'Livré'];
              const icons = [<User className="w-5 h-5" />, <Package className="w-5 h-5" />, <Bike className="w-5 h-5" />, <CheckCircle2 className="w-5 h-5" />];
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                      done ? 'border-green-500 bg-green-50' : active ? 'border-green-500 bg-white' : 'border-gray-200 bg-white'
                    } ${active ? 'scale-110 shadow-md' : ''}`}>
                      {icons[i]}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${done || active ? 'text-green-600' : 'text-gray-400'}`}>
                      {labels[i]}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`w-16 h-1 mx-1 rounded-full transition-all ${
                      i < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ETA Banner ── */}
        {eta && status !== 'delivered' && (
          <div className={`rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
            eta.fromDriver && eta.minutes <= 5
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <span className={eta.fromDriver && eta.minutes <= 5 ? 'text-green-600' : 'text-blue-600'}>{eta.fromDriver && eta.minutes <= 5 ? <Flag className="w-8 h-8" /> : <Bike className="w-8 h-8" />}</span>
              <div>
                <p className={`font-bold text-lg ${eta.fromDriver && eta.minutes <= 5 ? 'text-green-700' : 'text-blue-700'}`}>
                  {eta.minutes <= 1 ? 'Arrivée imminente !' : `Arrivée dans ~${eta.minutes} min`}
                </p>
                <p className="text-xs text-gray-500">
                  {eta.fromDriver
                    ? `Livreur à ${eta.distKm < 1 ? `${(eta.distKm * 1000).toFixed(0)} m` : `${eta.distKm.toFixed(1)} km`} de votre adresse`
                    : `Distance totale estimée : ${eta.distKm.toFixed(1)} km`
                  }
                  {' · '}Vitesse moyenne 25 km/h en ville
                </p>
              </div>
            </div>
            {/* Progress bar */}
            {eta.fromDriver && eta.distKm < 10 && (
              <div className="sm:w-40 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Pharmacie</span>
                  <span>Vous</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.max(5, Math.min(95, 100 - (eta.distKm / 10) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'delivered' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-green-700">Livraison effectuée !</p>
              <p className="text-xs text-green-600">Votre commande a bien été livrée. Merci pour votre confiance.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Map */}
          <div className="lg:col-span-3 bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Carte en temps réel</h2>
              {driverPos ? (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Position live
                </span>
              ) : (
                <span className="text-xs text-gray-400">En attente de la position du livreur</span>
              )}
            </div>
            <div style={{ height: '400px' }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {driverPos && (
                  <>
                    <FlyToDriver position={driverPos} />
                    <Marker position={driverPos} icon={driverIcon}>
                      <Popup>
                        <strong>{driver?.firstName} {driver?.lastName}</strong>
                        <br />{isClientView ? 'Votre livreur' : 'Livreur'} — position live
                      </Popup>
                    </Marker>
                  </>
                )}
                {pickupCoords?.[1] && pickupCoords?.[0] && pickupCoords[0] !== 0 && (
                  <Marker position={[pickupCoords[1], pickupCoords[0]]} icon={pharmacyIcon}>
                    <Popup>Pharmacie (point de départ)</Popup>
                  </Marker>
                )}
                {deliveryCoords?.[1] && deliveryCoords?.[0] && deliveryCoords[0] !== 0 && (
                  <Marker position={[deliveryCoords[1], deliveryCoords[0]]} icon={clientIcon}>
                    <Popup>{isClientView ? 'Votre adresse de livraison' : 'Adresse du client'}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 bg-white border rounded-xl flex flex-col" style={{ height: '470px' }}>
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-900 text-sm">
                <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" />{driver ? `Chat avec ${driver.firstName}` : 'Chat avec le livreur'}</span>
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-8">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>Aucun message pour l'instant</p>
                  <p className="text-xs mt-1">Posez vos questions au livreur ici</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?._id;
                return (
                  <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      isMe ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                        {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm', { locale: fr }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 py-3 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Écrivez au livreur..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !wsConnected}
                  className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
