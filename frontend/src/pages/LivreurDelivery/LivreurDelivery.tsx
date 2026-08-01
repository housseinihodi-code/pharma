import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import { Package, Bike, CheckCircle2, User, MessageCircle, Hospital, MapPin, Phone, Navigation, Check } from 'lucide-react';
import { RootState } from '../../store';
import { deliveryService } from '../../services/delivery.service';
import { deliverySocketService } from '../../services/deliverySocket.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const meIcon = L.divIcon({
  html: `<div style="background:#16a34a;border:3px solid #fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.3);animation:pulse 2s infinite"><span style="color:white;font-weight:bold;font-size:15px">L</span></div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});
const destIcon = L.divIcon({
  html: `<div style="background:#2563eb;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><span style="color:white;font-weight:bold;font-size:13px">C</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }> = {
  assigned: { next: 'picked_up', label: 'Marquer récupéré', color: 'bg-orange-500 hover:bg-orange-600' },
  picked_up: { next: 'in_transit', label: 'Démarrer la livraison', color: 'bg-emerald-500 hover:bg-emerald-600' },
  in_transit: { next: 'delivered', label: 'Marquer comme livré', color: 'bg-green-600 hover:bg-green-700' },
};

const DELIVERY_STEPS = [
  { key: 'assigned', label: 'Assigné', Icon: User },
  { key: 'picked_up', label: 'Récupéré', Icon: Package },
  { key: 'in_transit', label: 'En livraison', Icon: Bike },
  { key: 'delivered', label: 'Livré', Icon: CheckCircle2 },
];

const STEP_INDEX: Record<string, number> = {
  assigned: 0, picked_up: 1, in_transit: 2, delivered: 3,
};

export default function LivreurDelivery() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { user, token } = useSelector((s: RootState) => s.auth as any);

  const [delivery, setDelivery] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const posIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollChat = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!deliveryId) return;
    Promise.all([
      deliveryService.getById(deliveryId),
      deliveryService.getMessages(deliveryId),
    ])
      .then(([d, msgs]) => {
        setDelivery(d);
        setStatus(d.status);
        setMessages(msgs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deliveryId]);

  useEffect(() => {
    if (!deliveryId || !token) return;
    deliverySocketService.connect(token);

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);
    const onMsg = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollChat, 50);
    };
    const onStatus = (data: { status: string }) => {
      setStatus(data.status);
      if (data.status === 'delivered') {
        toast.success('Livraison marquée comme effectuée !');
        setTimeout(() => navigate('/livreur'), 2000);
      }
    };

    deliverySocketService.onConnect(onConnect);
    deliverySocketService.onDisconnect(onDisconnect);
    deliverySocketService.onMessage(onMsg);
    deliverySocketService.onStatusUpdated(onStatus);
    deliverySocketService.joinDelivery(deliveryId);

    if (deliverySocketService.connected) setWsConnected(true);

    return () => {
      deliverySocketService.leaveDelivery(deliveryId);
      deliverySocketService.offMessage(onMsg);
      deliverySocketService.offStatusUpdated(onStatus);
      stopTracking();
    };
  }, [deliveryId, token, scrollChat, navigate]);

  useEffect(() => { scrollChat(); }, [messages, scrollChat]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible sur ce navigateur');
      return;
    }
    setTracking(true);
    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyPos([lat, lng]);
        if (deliveryId) deliverySocketService.updatePosition(deliveryId, lat, lng);
      },
      () => toast.error('Impossible d\'accéder à la position GPS'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    // Also push via HTTP every 15s as fallback
    posIntervalRef.current = setInterval(() => {
      if (myPos && deliveryId) {
        deliveryService.updateLocation(deliveryId, myPos[0], myPos[1]).catch(() => {});
      }
    }, 15000);
    toast.success('Partage de position activé');
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (posIntervalRef.current) {
      clearInterval(posIntervalRef.current);
      posIntervalRef.current = null;
    }
    setTracking(false);
  };

  const handleStatusUpdate = async () => {
    const transition = STATUS_TRANSITIONS[status];
    if (!transition || !deliveryId) return;
    setUpdatingStatus(true);
    try {
      // HTTP est autoritatif : met à jour la BDD + envoie notifications
      await deliveryService.updateStatus(deliveryId, transition.next);
      // WS notifie le client en temps réel
      deliverySocketService.updateStatus(deliveryId, transition.next);
      setStatus(transition.next);
      toast.success(`Statut mis à jour : ${transition.next}`);
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !deliveryId) return;
    deliverySocketService.sendMessage(deliveryId, input.trim());
    setInput('');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const order = delivery?.orderId as any;
  const mapCenter: [number, number] = myPos || [12.365, -1.533];
  const destCoords = delivery?.deliveryLocation?.coordinates;
  const transition = STATUS_TRANSITIONS[status];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link to="/livreur" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Mission de livraison</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {delivery?._id ? `#${delivery._id.slice(-8).toUpperCase()}` : 'Chargement...'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-500 font-medium">
              {wsConnected ? 'En ligne' : 'Reconnexion…'}
            </span>
          </div>
        </div>

        {/* Mission cards — pickup + destination */}
        {order && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Pickup */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <Hospital className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Départ — Pharmacie</span>
              </div>
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {delivery?.pickupLocation?.address || 'Adresse pharmacie'}
              </p>
            </div>

            {/* Destination */}
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-700" />
                </div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Destination — Client</span>
              </div>
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {order.deliveryAddress || 'Adresse non précisée'}
              </p>
              {(order as any).userId && typeof (order as any).userId === 'object' && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {(order as any).userId.firstName} {(order as any).userId.lastName}
                  </p>
                  {(order as any).userId.phone && (
                    <a
                      href={`tel:${(order as any).userId.phone}`}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="w-3 h-3" /> Appeler
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status + Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">

          {/* 4-step delivery progress stepper */}
          <div className="flex items-center mb-5">
            {DELIVERY_STEPS.map((step, idx) => {
              const stepIdx = STEP_INDEX[status] ?? 0;
              const done = idx < stepIdx;
              const active = idx === stepIdx;
              const StepIcon = step.Icon;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      done
                        ? 'bg-green-600 border-green-600'
                        : active
                        ? 'bg-white border-green-600 ring-4 ring-green-50'
                        : 'bg-white border-gray-200'
                    }`}>
                      {done
                        ? <Check className="w-4 h-4 text-white" />
                        : <StepIcon className={`w-4 h-4 ${active ? 'text-green-600' : 'text-gray-300'}`} />
                      }
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      done ? 'text-green-600' : active ? 'text-gray-900' : 'text-gray-300'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < DELIVERY_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 mb-4 ${idx < stepIdx ? 'bg-green-500' : 'bg-gray-100'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions row */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={tracking ? stopTracking : startTracking}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                tracking
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Navigation className="w-4 h-4" />
              {tracking ? 'Arrêter GPS' : 'Partager ma position'}
            </button>

            {transition && status !== 'delivered' && (
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-colors disabled:opacity-50 flex-1 justify-center ${transition.color}`}
              >
                {updatingStatus ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check className="w-4 h-4" /> {transition.label}</>
                )}
              </button>
            )}

            {status === 'delivered' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 flex-1 justify-center">
                <CheckCircle2 className="w-4 h-4" /> Mission accomplie
              </div>
            )}
          </div>

          {tracking && myPos && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Position partagée · {myPos[0].toFixed(5)}, {myPos[1].toFixed(5)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Map */}
          <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Carte en temps réel</h2>
            </div>
            <div style={{ height: '380px' }}>
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {myPos && (
                  <Marker position={myPos} icon={meIcon}>
                    <Popup>Ma position actuelle</Popup>
                  </Marker>
                )}
                {destCoords?.[1] && destCoords?.[0] && destCoords[0] !== 0 && (
                  <Marker position={[destCoords[1], destCoords[0]]} icon={destIcon}>
                    <Popup>Adresse de livraison : {order?.deliveryAddress}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col" style={{ height: '450px' }}>
            <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" /> Chat client
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Communication en temps réel</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-8">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>Aucun message</p>
                  <p className="text-xs mt-1">Communiquez avec le client ici</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?._id || msg.senderRole === 'driver';
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
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Message au client..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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

        {/* Payment summary */}
        {order && (
          <div className="mt-5 bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Récapitulatif de la mission</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Montant à collecter</p>
                <p className="text-lg font-bold text-green-700">{order.totalAmount?.toLocaleString()}</p>
                <p className="text-xs text-green-600">FCFA</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Mode de paiement</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {order.paymentMethod?.replace('_', ' ') || '—'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Déjà payé' : 'À encaisser'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-500 mb-1">Articles</p>
                <p className="text-sm font-semibold text-gray-900">
                  {(order as any).items?.length ?? '—'} article{((order as any).items?.length ?? 0) > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-400">dans le colis</p>
              </div>
            </div>
            {order.notes && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Note du client</p>
                  <p className="text-sm text-amber-800 mt-0.5">{order.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
