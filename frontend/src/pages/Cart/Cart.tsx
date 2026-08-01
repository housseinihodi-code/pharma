import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Pill, ClipboardList, FileText, Banknote, CreditCard, MapPin } from 'lucide-react';
import { AppDispatch, RootState } from '../../store';
import { fetchCart, updateCartItem, removeFromCart, clearCartAsync } from '../../store/cartSlice';
import { orderService } from '../../services/order.service';
import { medicationService } from '../../services/medication.service';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentModal from '../../components/PaymentModal';

export default function Cart() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { cart, loading } = useSelector((s: RootState) => s.cart);
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState('');
  const prescriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingCart className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-xl font-semibold text-gray-900">Connectez-vous pour voir votre panier</h2>
          <Link to="/login" className="mt-4 inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;

  const items = cart?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const pharmacyName = typeof cart?.pharmacyId === 'object' ? (cart.pharmacyId as any)?.name : '';
  const requiresPrescription = items.some(i => i.requiresPrescription);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible sur ce navigateur');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
        toast.success('Position détectée — le livreur pourra vous suivre précisément');
      },
      () => {
        setLocating(false);
        toast.error('Impossible d\'accéder à votre position. Vérifiez les autorisations du navigateur.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Fichier trop lourd (10 Mo max)'); return; }
    setPrescriptionFile(file);
    setPrescriptionPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const handleOrder = async () => {
    if (items.length === 0) return;
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Veuillez entrer une adresse de livraison'); return;
    }
    if (requiresPrescription && !prescriptionFile) {
      toast.error('Une ordonnance est requise pour certains médicaments de votre panier'); return;
    }
    const pharmacyId = typeof cart?.pharmacyId === 'string' ? cart.pharmacyId : (cart?.pharmacyId as any)?._id;
    if (!pharmacyId) { toast.error('Erreur: pharmacie non trouvée'); return; }

    setOrdering(true);
    try {
      let prescriptionUrl: string | undefined;
      if (prescriptionFile) {
        prescriptionUrl = await medicationService.uploadPrescription(prescriptionFile);
      }
      const order = await orderService.create({
        pharmacyId,
        items: items.map(i => ({
          medicationId: typeof i.medicationId === 'string' ? i.medicationId : (i.medicationId as any)._id,
          quantity: i.quantity,
        })),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined,
        deliveryLocation: deliveryType === 'delivery' && deliveryCoords ? deliveryCoords : undefined,
        notes,
        paymentMethod,
        prescriptionUrl,
      });
      dispatch(clearCartAsync());
      // Mobile money / Orange Money → ouvrir le modal de paiement
      if (paymentMethod === 'mobile_money' || paymentMethod === 'orange_money') {
        setPendingOrderId(order._id);
      } else {
        toast.success('Commande passée avec succès !');
        navigate(`/orders/${order._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal paiement mobile money */}
      {pendingOrderId && (paymentMethod === 'mobile_money' || paymentMethod === 'orange_money') && (
        <PaymentModal
          orderId={pendingOrderId}
          amount={total}
          method={paymentMethod as 'mobile_money' | 'orange_money'}
          onSuccess={() => { const id = pendingOrderId; setPendingOrderId(null); navigate(`/orders/${id}`); }}
          onClose={() => { const id = pendingOrderId; setPendingOrderId(null); navigate(`/orders/${id}`); }}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon panier</h1>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingCart className="w-8 h-8 text-gray-400" /></div>
            <h2 className="text-lg font-medium text-gray-900">Votre panier est vide</h2>
            <p className="text-gray-500 mt-2">Parcourez nos pharmacies pour ajouter des médicaments</p>
            <Link to="/pharmacies"
              className="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700">
              Explorer les pharmacies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {pharmacyName && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" /> Commande depuis <strong>{pharmacyName}</strong>
                </div>
              )}
              {items.map((item) => {
                const medicationId = typeof item.medicationId === 'string'
                  ? item.medicationId
                  : (item.medicationId as any)._id;
                return (
                  <div key={medicationId} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-teal-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Pill className="w-7 h-7 text-teal-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-green-600 font-semibold mt-1">{item.price.toLocaleString()} FCFA</p>
                      {item.requiresPrescription && (
                        <span className="text-xs text-orange-500">Ordonnance requise</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dispatch(updateCartItem({ medicationId, quantity: item.quantity - 1 }))}
                        className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 text-lg"
                      >−</button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateCartItem({ medicationId, quantity: item.quantity + 1 }))}
                        className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 text-lg"
                      >+</button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-semibold text-gray-900">{(item.price * item.quantity).toLocaleString()}</p>
                      <button
                        onClick={() => dispatch(removeFromCart(medicationId))}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >Retirer</button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => dispatch(clearCartAsync())}
                className="text-sm text-red-500 hover:text-red-700 underline"
              >
                Vider le panier
              </button>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Options de livraison</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" value="delivery" checked={deliveryType === 'delivery'}
                      onChange={() => setDeliveryType('delivery')} className="text-green-600" />
                    <span className="text-sm font-medium">Livraison à domicile</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" value="pickup" checked={deliveryType === 'pickup'}
                      onChange={() => setDeliveryType('pickup')} className="text-green-600" />
                    <span className="text-sm font-medium">Retrait en pharmacie</span>
                  </label>
                </div>
                {deliveryType === 'delivery' && (
                  <>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Adresse de livraison"
                      className="mt-3 w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={locating}
                      className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        deliveryCoords
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {locating
                        ? 'Détection en cours...'
                        : deliveryCoords
                        ? 'Position détectée — le livreur pourra vous localiser'
                        : 'Utiliser ma position actuelle (recommandé pour le suivi)'}
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Mode de paiement</h2>
                <div className="space-y-2">
                  {[
                    { value: 'mobile_money', label: 'MTN Mobile Money', badge: 'MTN', badgeBg: 'bg-yellow-400', desc: 'Paiement instantané via MoMo' },
                    { value: 'orange_money', label: 'Orange Money', badge: 'OM', badgeBg: 'bg-orange-500', desc: 'Paiement Orange Money' },
                    { value: 'cash', label: 'Espèces à la livraison', badge: <Banknote className="w-4 h-4 text-gray-600" />, badgeBg: 'bg-gray-200', desc: 'Payez à la réception' },
                    { value: 'card', label: 'Carte bancaire', badge: <CreditCard className="w-4 h-4 text-white" />, badgeBg: 'bg-blue-500', desc: 'Visa / Mastercard' },
                  ].map((opt) => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === opt.value
                          ? opt.value === 'mobile_money' ? 'border-yellow-400 bg-yellow-50'
                          : opt.value === 'orange_money' ? 'border-orange-400 bg-orange-50'
                          : 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}>
                      <input type="radio" value={opt.value} checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)} className="sr-only" />
                      <div className={`w-9 h-9 rounded-lg ${opt.badgeBg} flex items-center justify-center flex-shrink-0`}>
                        {typeof opt.badge === 'string' ? <span className="text-white font-black text-xs">{opt.badge}</span> : opt.badge}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                      {paymentMethod === opt.value && (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions spéciales, allergies..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                />
              </div>

              {/* Ordonnance */}
              {requiresPrescription && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <ClipboardList className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h2 className="font-semibold text-orange-800">Ordonnance requise</h2>
                      <p className="text-xs text-orange-600 mt-0.5">
                        Votre panier contient des médicaments sur ordonnance. Veuillez joindre votre ordonnance.
                      </p>
                    </div>
                  </div>
                  <div
                    onClick={() => prescriptionRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center ${
                      prescriptionFile ? 'border-green-400 bg-green-50' : 'border-orange-300 hover:border-orange-400 bg-white'
                    }`}
                  >
                    {prescriptionFile ? (
                      <div className="flex flex-col items-center gap-2">
                        {prescriptionPreview ? (
                          <img src={prescriptionPreview} alt="Ordonnance" className="h-24 object-contain rounded-lg" />
                        ) : (
                          <FileText className="w-10 h-10 text-orange-300" />
                        )}
                        <p className="text-sm font-medium text-green-700 truncate max-w-full">{prescriptionFile.name}</p>
                        <p className="text-xs text-green-600">Ordonnance jointe — cliquez pour changer</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-orange-400 py-2">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-orange-600">Cliquez pour joindre l'ordonnance</span>
                        <span className="text-xs">JPG, PNG, PDF — max 10 Mo</span>
                      </div>
                    )}
                  </div>
                  <input ref={prescriptionRef} type="file" accept="image/*,.pdf" onChange={handlePrescriptionChange} className="hidden" />
                </div>
              )}

              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Résumé</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
                    <span>{total.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Livraison</span>
                    <span>{deliveryType === 'pickup' ? 'Gratuit' : 'Variable'}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span className="text-green-700">{total.toLocaleString()} FCFA</span>
                  </div>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={ordering || items.length === 0}
                  className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {ordering ? 'Commande en cours...' : 'Passer la commande'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
