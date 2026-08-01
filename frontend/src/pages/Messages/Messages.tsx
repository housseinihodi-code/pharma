import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { MessageCircle, Clock, Check } from 'lucide-react';
import { RootState } from '../../store';
import { messageService } from '../../services/message.service';
import { socketService } from '../../services/socket.service';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Messages() {
  const { user, isAuthenticated, token } = useSelector((s: RootState) => s.auth);
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevConvRef = useRef<string | null>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Connexion WebSocket ──
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    socketService.connect(token);
    const onConn = () => setWsConnected(true);
    const onDisc = () => setWsConnected(false);
    socketService.onConnect(onConn);
    socketService.onDisconnect(onDisc);
    return () => { socketService.disconnect(); };
  }, [isAuthenticated, token]);

  // ── Écoute nouveaux messages via WebSocket ──
  useEffect(() => {
    const handleMsg = (msg: any) => {
      if (msg.conversationId !== activeConvId) {
        setConversations(prev => prev.map(c =>
          c._id === msg.conversationId
            ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt,
                clientUnread: user?.role === 'client' ? c.clientUnread + 1 : c.clientUnread,
                pharmacyUnread: user?.role === 'pharmacist' ? c.pharmacyUnread + 1 : c.pharmacyUnread }
            : c,
        ));
        return;
      }
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c._id === msg.conversationId
          ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
          : c,
      ));
    };
    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?._id) setIsTyping(data.isTyping);
    };
    socketService.onMessage(handleMsg);
    socketService.onTyping(handleTyping);
    return () => { socketService.offMessage(handleMsg); socketService.offTyping(handleTyping); };
  }, [activeConvId, user]);

  // ── Join/Leave room conversation ──
  useEffect(() => {
    if (prevConvRef.current && prevConvRef.current !== activeConvId)
      socketService.leaveConversation(prevConvRef.current);
    if (activeConvId) { socketService.joinConversation(activeConvId); prevConvRef.current = activeConvId; }
  }, [activeConvId]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await messageService.getConversations();
      setConversations(convs); return convs;
    } catch { return []; } finally { setLoadingConvs(false); }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await messageService.getMessages(convId);
      setMessages(data.messages); setActiveConv(data.conversation);
      setConversations(prev => prev.map(c => c._id === convId ? { ...c, clientUnread: 0, pharmacyUnread: 0 } : c));
    } catch { /* silent */ } finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadConversations().then(convs => {
      const pharmacyId = searchParams.get('pharmacy');
      if (pharmacyId) {
        const ex = convs.find((c: any) => {
          const pid = typeof c.pharmacyId === 'object' ? c.pharmacyId._id : c.pharmacyId;
          return pid === pharmacyId;
        });
        if (ex) { setActiveConvId(ex._id); }
        else {
          messageService.startConversation(pharmacyId)
            .then(conv => { setConversations(prev => [conv, ...prev]); setActiveConvId(conv._id); })
            .catch(() => toast.error('Impossible de démarrer la conversation'));
        }
      } else if (convs.length > 0) setActiveConvId(convs[0]._id);
    });
  }, [isAuthenticated, searchParams]);

  useEffect(() => { if (activeConvId) loadMessages(activeConvId); }, [activeConvId]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sending) return;
    const content = input.trim();
    setInput(''); setSending(true);
    socketService.emitTyping(activeConvId, false);

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      senderId: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
      senderRole: user?.role === 'pharmacist' ? 'pharmacist' : 'client',
      content, isRead: false, createdAt: new Date().toISOString(), conversationId: activeConvId,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      if (socketService.connected) {
        socketService.sendMessage(activeConvId, content);
        setTimeout(() => setMessages(prev => prev.filter(m => m._id !== tempId)), 3000);
      } else {
        const msg = await messageService.sendMessage(activeConvId, content);
        setMessages(prev => prev.map(m => m._id === tempId ? msg : m));
        setConversations(prev => prev.map(c => c._id === activeConvId
          ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() } : c));
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setInput(content);
      toast.error('Erreur lors de l\'envoi');
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!activeConvId) return;
    socketService.emitTyping(activeConvId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socketService.emitTyping(activeConvId, false), 2000);
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><MessageCircle className="w-8 h-8 text-gray-400" /></div>
        <h2 className="text-xl font-semibold text-gray-900">Connectez-vous pour accéder aux messages</h2>
        <Link to="/login" className="mt-4 inline-block px-6 py-3 bg-green-600 text-white rounded-xl">Se connecter</Link>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-100">
      {/* ── Sidebar ── */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white border-r flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Messages</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {user?.role === 'pharmacist' ? 'Messages de vos clients' : 'Vos conversations'}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {wsConnected ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>

        {loadingConvs ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-gray-400" /></div>
            <p className="text-gray-500 text-sm">Aucune conversation</p>
            {user?.role !== 'pharmacist' && (
              <Link to="/pharmacies" className="mt-4 text-sm px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                Trouver une pharmacie
              </Link>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y">
            {conversations.map(conv => {
              const pharmacy = typeof conv.pharmacyId === 'object' ? conv.pharmacyId : null;
              const client = typeof conv.clientId === 'object' ? conv.clientId : null;
              const isPharmacistRole = user?.role === 'pharmacist';
              const name = isPharmacistRole
                ? `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client'
                : pharmacy?.name || 'Pharmacie';
              const avatar = !isPharmacistRole ? pharmacy?.imageUrl : null;
              const unread = isPharmacistRole ? conv.pharmacyUnread : conv.clientUnread;
              const isActive = conv._id === activeConvId;
              return (
                <button key={conv._id} onClick={() => setActiveConvId(conv._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${isActive ? 'bg-green-50 border-r-2 border-green-600' : ''}`}>
                  <div className="relative flex-shrink-0">
                    {avatar ? <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
                      : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-base">{name[0]?.toUpperCase() || '?'}</span>
                        </div>}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.lastMessageAt ? fmtTime(conv.lastMessageAt) : ''}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                      {conv.lastMessage || 'Aucun message'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Zone chat ── */}
      <div className={`flex-1 flex flex-col ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><MessageCircle className="w-8 h-8 text-gray-400" /></div>
              <p className="text-gray-500 font-medium">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
              <button onClick={() => setActiveConvId(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {(() => {
                const conv = conversations.find(c => c._id === activeConvId) || activeConv;
                const isPharmacistRole = user?.role === 'pharmacist';
                const pharmacy = conv && typeof conv.pharmacyId === 'object' ? conv.pharmacyId : null;
                const client = conv && typeof conv.clientId === 'object' ? conv.clientId : null;
                const name = isPharmacistRole
                  ? `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client'
                  : pharmacy?.name || 'Pharmacie';
                return (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold">{name[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{name}</p>
                      <p className="text-xs">
                        {isTyping
                          ? <span className="text-green-600 italic animate-pulse">En train d'écrire...</span>
                          : <span className="text-gray-400">{pharmacy?.address || 'En ligne'}</span>}
                      </p>
                    </div>
                    {pharmacy?._id && (
                      <Link to={`/pharmacies/${pharmacy._id}`}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex-shrink-0">
                        Voir pharmacie
                      </Link>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex justify-center mt-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-green-400" /></div>
                  <p className="text-gray-500 font-medium">Démarrez la conversation</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, idx) => {
                    const isMine = msg.senderRole === (user?.role === 'pharmacist' ? 'pharmacist' : 'client');
                    const prevMsg = messages[idx - 1];
                    const showDate = !prevMsg || !sameDay(prevMsg.createdAt, msg.createdAt);
                    const sender = typeof msg.senderId === 'object' ? msg.senderId : null;
                    const isTemp = msg._id?.startsWith('temp-');
                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded-full">{fmtDate(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                          {!isMine && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mr-2 flex-shrink-0 self-end">
                              <span className="text-white text-xs font-semibold">{sender?.firstName?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                          )}
                          <div className="max-w-[70%]">
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                              isMine ? 'bg-green-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                            } ${isTemp ? 'opacity-60' : ''}`}>
                              {msg.content}
                            </div>
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-gray-400">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                              {isMine && (
                                <span className="text-xs">
                                  {isTemp ? <Clock className="w-3 h-3 text-gray-300" />
                                    : msg.isRead ? <span className="text-green-500 flex"><Check className="w-3 h-3" /><Check className="w-3 h-3 -ml-1" /></span>
                                    : <Check className="w-3 h-3 text-gray-400" />}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex justify-start mb-1">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-white text-xs">?</span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="bg-white border-t px-4 py-3">
              <div className="flex items-end gap-3">
                <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                  placeholder="Écrivez un message... (Entrée pour envoyer)" rows={1}
                  className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm max-h-32 leading-relaxed"
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px'; }} />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className="flex-shrink-0 w-11 h-11 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 pl-1">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hier';
  return format(d, 'dd/MM', { locale: fr });
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return 'Hier';
  return format(d, 'EEEE dd MMMM', { locale: fr });
}
function sameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
