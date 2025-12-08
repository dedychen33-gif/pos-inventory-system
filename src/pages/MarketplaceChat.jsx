import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Search, Send, RefreshCw, MessageCircle, Store,
  Image, Paperclip, Smile, Check, CheckCheck, Clock, Filter,
  User, Phone, ShoppingBag, ChevronDown, MoreVertical, Star,
  Wifi, WifiOff, AlertCircle
} from 'lucide-react';
import { useMarketplaceStore, PLATFORM_INFO } from '../store/marketplaceStore';
import { chatService } from '../services/chatApi';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Chat Store
const useChatStore = create(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      unreadCounts: {},
      
      // Add conversation
      addConversation: (conv) => set(state => ({
        conversations: [conv, ...state.conversations.filter(c => c.id !== conv.id)]
      })),
      
      // Add message
      addMessage: (conversationId, message) => set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), message]
        }
      })),
      
      // Set messages for conversation
      setMessages: (conversationId, messages) => set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: messages
        }
      })),
      
      // Mark as read
      markAsRead: (conversationId) => set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [conversationId]: 0
        },
        conversations: state.conversations.map(c => 
          c.id === conversationId ? { ...c, unread: 0 } : c
        )
      })),
      
      // Update unread count
      setUnreadCount: (conversationId, count) => set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [conversationId]: count
        }
      })),
      
      // Get total unread
      getTotalUnread: () => {
        const counts = get().unreadCounts;
        return Object.values(counts).reduce((sum, c) => sum + c, 0);
      }
    }),
    { name: 'marketplace-chat-store' }
  )
);

// Demo data generator
const generateDemoConversations = (stores) => {
  const customerNames = [
    'Budi Santoso', 'Siti Rahayu', 'Ahmad Hidayat', 'Dewi Lestari',
    'Rudi Hermawan', 'Ani Wijaya', 'Dian Purnama', 'Eko Prasetyo',
    'Fitri Handayani', 'Gunawan Susilo', 'Hendra Kusuma', 'Indah Permata'
  ];
  
  const lastMessages = [
    'Barang sudah dikirim belum ya?',
    'Terima kasih, barang sudah sampai dengan selamat',
    'Apakah warna merah ready stock?',
    'Bisa nego harga gak kak?',
    'Kapan estimasi sampainya?',
    'Ada varian lain tidak?',
    'Ongkirnya berapa ke Jakarta?',
    'Barang original kan kak?',
    'Bisa COD tidak?',
    'Minta no resi dong kak'
  ];
  
  const conversations = [];
  let id = 1;
  
  stores.filter(s => s.isActive).forEach(store => {
    const numConvs = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < numConvs; i++) {
      const unread = Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0;
      conversations.push({
        id: `conv-${id}`,
        platform: store.platform,
        storeId: store.id,
        storeName: store.shopName,
        customerId: `cust-${id}`,
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        customerAvatar: null,
        lastMessage: lastMessages[Math.floor(Math.random() * lastMessages.length)],
        lastMessageTime: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        unread,
        isOnline: Math.random() > 0.7,
        orderId: Math.random() > 0.5 ? `ORD${Date.now()}${id}` : null
      });
      id++;
    }
  });
  
  return conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
};

const generateDemoMessages = (conversationId) => {
  const messages = [];
  const numMessages = Math.floor(Math.random() * 10) + 5;
  const now = Date.now();
  
  const buyerMessages = [
    'Halo kak, barang ready stock?',
    'Bisa minta foto aslinya?',
    'Ada warna lain tidak?',
    'Ongkir ke Jakarta berapa?',
    'Bisa nego harga?',
    'Kapan bisa dikirim?',
    'Terima kasih kak',
    'Ok saya order ya',
    'Barang sudah sampai, sesuai deskripsi'
  ];
  
  const sellerMessages = [
    'Halo kak, terima kasih sudah menghubungi kami',
    'Ready stock kak, silakan order',
    'Baik kak, saya kirimkan fotonya',
    'Ada kak, tersedia warna merah, biru, dan hitam',
    'Ongkir tergantung ekspedisi yang dipilih ya kak',
    'Harga sudah nett ya kak',
    'Akan dikirim hari ini jika order sebelum jam 3 sore',
    'Terima kasih sudah order kak, ditunggu pesanannya',
    'Senang bisa membantu kak, jangan lupa kasih bintang 5 ya 🙏'
  ];
  
  for (let i = 0; i < numMessages; i++) {
    const isBuyer = i % 2 === 0;
    messages.push({
      id: `msg-${conversationId}-${i}`,
      conversationId,
      content: isBuyer 
        ? buyerMessages[Math.floor(Math.random() * buyerMessages.length)]
        : sellerMessages[Math.floor(Math.random() * sellerMessages.length)],
      sender: isBuyer ? 'buyer' : 'seller',
      timestamp: new Date(now - (numMessages - i) * 300000).toISOString(),
      status: isBuyer ? 'received' : (Math.random() > 0.3 ? 'read' : 'sent'),
      type: 'text'
    });
  }
  
  return messages;
};

// Platform Logo Component
const PlatformLogo = ({ platform, size = 24 }) => {
  const info = PLATFORM_INFO[platform];
  if (!info || !info.logo) return null;
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: info.logo(size) }}
      className="flex-shrink-0"
    />
  );
};

export default function MarketplaceChat() {
  const navigate = useNavigate();
  const { stores } = useMarketplaceStore();
  const { 
    conversations, 
    messages, 
    addConversation, 
    setMessages, 
    addMessage,
    markAsRead 
  } = useChatStore();
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterUnread, setFilterUnread] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showStoreFilter, setShowStoreFilter] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize demo data
  useEffect(() => {
    if (conversations.length === 0 && stores.length > 0) {
      const demoConvs = generateDemoConversations(stores);
      demoConvs.forEach(conv => addConversation(conv));
    }
  }, [stores]);

  // Load messages when selecting conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation) return;
      
      // If messages already loaded, just mark as read
      if (messages[selectedConversation.id]?.length > 0) {
        markAsRead(selectedConversation.id);
        return;
      }
      
      // Try to load from API
      const store = stores.find(s => s.id === selectedConversation.storeId);
      if (store?.credentials?.accessToken) {
        try {
          const apiMessages = await chatService.getMessages(store, selectedConversation.id);
          
          // Transform messages
          const transformedMsgs = apiMessages.map(msg => ({
            id: msg.message_id || msg.id || `msg-${Date.now()}-${Math.random()}`,
            conversationId: selectedConversation.id,
            content: msg.content?.text || msg.txt_content || msg.message || msg.content || '',
            sender: msg.message_sender === 'seller' || msg.direction === 'out' ? 'seller' : 'buyer',
            timestamp: new Date((msg.create_timestamp || msg.create_time || Date.now()) * 1000).toISOString(),
            status: msg.is_read ? 'read' : 'sent',
            type: msg.message_type || 'text'
          }));
          
          setMessages(selectedConversation.id, transformedMsgs);
          
          // Mark as read on API
          await chatService.markAsRead(store, selectedConversation.id);
        } catch (error) {
          console.error('Failed to load messages:', error);
          // Fallback to demo messages
          const demoMsgs = generateDemoMessages(selectedConversation.id);
          setMessages(selectedConversation.id, demoMsgs);
        }
      } else {
        // Demo mode
        const demoMsgs = generateDemoMessages(selectedConversation.id);
        setMessages(selectedConversation.id, demoMsgs);
      }
      
      markAsRead(selectedConversation.id);
    };
    
    loadMessages();
  }, [selectedConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchSearch = !searchTerm || 
        conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStore = filterStore === 'all' || conv.storeId === parseInt(filterStore);
      const matchUnread = !filterUnread || conv.unread > 0;
      
      return matchSearch && matchStore && matchUnread;
    });
  }, [conversations, searchTerm, filterStore, filterUnread]);

  // Stats
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const activeStores = [...new Set(conversations.map(c => c.storeId))].length;
  
  // Check if any store has API configured
  const hasApiStores = stores.some(s => 
    s.isActive && 
    s.credentials?.accessToken && 
    ['shopee', 'lazada', 'tokopedia'].includes(s.platform)
  );

  // Send message (real API or demo)
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    const content = messageInput.trim();
    setMessageInput('');
    
    // Add optimistic message
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      sender: 'seller',
      timestamp: new Date().toISOString(),
      status: 'sending',
      type: 'text'
    };
    
    addMessage(selectedConversation.id, newMessage);
    inputRef.current?.focus();
    
    // Try to send via API if store has credentials
    const store = stores.find(s => s.id === selectedConversation.storeId);
    if (store?.credentials?.accessToken) {
      try {
        await chatService.sendMessage(store, selectedConversation.id, content);
        // Update message status to sent
        const msgs = messages[selectedConversation.id] || [];
        const updatedMsgs = msgs.map(m => 
          m.id === newMessage.id ? { ...m, status: 'sent' } : m
        );
        setMessages(selectedConversation.id, updatedMsgs);
      } catch (error) {
        console.error('Failed to send message:', error);
        // Update message status to failed
        const msgs = messages[selectedConversation.id] || [];
        const updatedMsgs = msgs.map(m => 
          m.id === newMessage.id ? { ...m, status: 'failed' } : m
        );
        setMessages(selectedConversation.id, updatedMsgs);
      }
    } else {
      // Demo mode - simulate sent
      setTimeout(() => {
        const msgs = messages[selectedConversation.id] || [];
        const updatedMsgs = msgs.map(m => 
          m.id === newMessage.id ? { ...m, status: 'sent' } : m
        );
        setMessages(selectedConversation.id, updatedMsgs);
      }, 500);
    }
  };

  // Sync chats from API
  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      // Get stores with API access
      const apiStores = stores.filter(s => 
        s.isActive && 
        s.credentials?.accessToken && 
        ['shopee', 'lazada', 'tokopedia'].includes(s.platform)
      );
      
      if (apiStores.length > 0) {
        // Fetch real conversations from API
        const allConversations = await chatService.getAllConversations(apiStores);
        
        // Transform and add to store
        allConversations.forEach(conv => {
          const transformed = {
            id: conv.conversation_id || conv.session_id || conv.msg_id || `conv-${Date.now()}`,
            platform: conv.platform,
            storeId: conv.storeId,
            storeName: conv.storeName,
            customerId: conv.to_id || conv.buyer_id || conv.user_id,
            customerName: conv.to_name || conv.buyer_name || conv.user_name || 'Pelanggan',
            customerAvatar: conv.to_avatar || conv.buyer_avatar,
            lastMessage: conv.last_message_content || conv.latest_message || conv.content || '',
            lastMessageTime: new Date((conv.last_message_timestamp || conv.latest_message_time || Date.now()) * 1000).toISOString(),
            unread: conv.unread_count || conv.unread || 0,
            isOnline: conv.is_online || false,
            orderId: conv.order_id || conv.order_sn || null
          };
          addConversation(transformed);
        });
        
        alert(`Berhasil sync ${allConversations.length} percakapan dari ${apiStores.length} toko`);
      } else {
        // Demo mode - generate demo data
        if (conversations.length === 0) {
          const demoConvs = generateDemoConversations(stores);
          demoConvs.forEach(conv => addConversation(conv));
        }
        alert('Mode Demo: Tidak ada toko dengan API terkoneksi. Menampilkan data demo.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Gagal sinkronisasi: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-refresh every 30 seconds if API is connected
  useEffect(() => {
    if (!hasApiStores) return;
    
    const interval = setInterval(() => {
      handleSync();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [hasApiStores, stores]);

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit`;
    if (diff < 86400000) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const currentMessages = selectedConversation ? messages[selectedConversation.id] || [] : [];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/marketplace/integration')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chat Marketplace</h1>
            <div className="flex items-center gap-2 text-sm">
              {hasApiStores ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Wifi size={14} />
                  Live - Auto refresh 30s
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  <WifiOff size={14} />
                  Demo Mode
                </span>
              )}
              {totalUnread > 0 && (
                <span className="text-gray-500">• {totalUnread} belum dibaca</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasApiStores && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              Hubungkan toko untuk chat real
            </span>
          )}
          <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          Sync Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 lg:w-96 border-r bg-white flex flex-col flex-shrink-0">
          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari chat..."
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => setShowStoreFilter(!showStoreFilter)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Store size={16} />
                    {filterStore === 'all' ? 'Semua Toko' : stores.find(s => s.id === parseInt(filterStore))?.shopName}
                  </span>
                  <ChevronDown size={16} />
                </button>
                {showStoreFilter && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => { setFilterStore('all'); setShowStoreFilter(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Semua Toko
                    </button>
                    {stores.filter(s => s.isActive).map(store => (
                      <button
                        key={store.id}
                        onClick={() => { setFilterStore(store.id.toString()); setShowStoreFilter(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <PlatformLogo platform={store.platform} size={16} />
                        {store.shopName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setFilterUnread(!filterUnread)}
                className={`px-3 py-2 text-sm border rounded-lg ${filterUnread ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
              >
                Belum Dibaca
              </button>
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="mx-auto mb-3 text-gray-300" size={48} />
                <p>Tidak ada percakapan</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 flex gap-3 hover:bg-gray-50 border-b transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="text-gray-500" size={24} />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <PlatformLogo platform={conv.platform} size={18} />
                    </div>
                    {conv.isOnline && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate">{conv.customerName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{conv.storeName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      {conv.unread > 0 && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="text-gray-500" size={20} />
                    </div>
                    {selectedConversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedConversation.customerName}</span>
                      <PlatformLogo platform={selectedConversation.platform} size={16} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.isOnline ? 'Online' : 'Offline'} • {selectedConversation.storeName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.orderId && (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      <ShoppingBag size={16} />
                      Lihat Pesanan
                    </button>
                  )}
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Phone size={18} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentMessages.map((msg, index) => {
                  const isSeller = msg.sender === 'seller';
                  const showDate = index === 0 || 
                    new Date(msg.timestamp).toDateString() !== new Date(currentMessages[index - 1].timestamp).toDateString();
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                            {new Date(msg.timestamp).toLocaleDateString('id-ID', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long' 
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isSeller ? 'order-2' : ''}`}>
                          <div className={`px-4 py-2 rounded-2xl ${
                            isSeller 
                              ? 'bg-primary text-white rounded-br-md' 
                              : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                            isSeller ? 'justify-end' : ''
                          }`}>
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isSeller && (
                              msg.status === 'read' 
                                ? <CheckCheck size={14} className="text-blue-500" />
                                : msg.status === 'delivered'
                                  ? <CheckCheck size={14} />
                                  : <Check size={14} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t p-3 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Image size={20} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Paperclip size={20} />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ketik pesan..."
                      rows={1}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Smile size={20} />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Tekan Enter untuk kirim, Shift+Enter untuk baris baru
                </p>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Pilih Percakapan</h3>
                <p className="text-gray-500">Pilih chat dari daftar untuk mulai membalas pesan</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
