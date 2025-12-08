/**
 * Chat Notification Service
 * Handles sound notifications for incoming marketplace chat messages
 */

// Default notification sounds (base64 encoded short beeps)
const DEFAULT_SOUNDS = {
  beep1: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6cnJeNfW1fVk5MTFNZYG12hZKdpquqpJyRg3RoXVVRUlheZ3WDkZ2mqq2spZuPgXJmXFZUV11mbXuJl6KrrauknJGCc2ZdVlZaYGp0gY+cpqyuraadkYNzZl5ZWV1lbnaFkZ6nrK2qpJuPgXNnYV1dYmlyfoqWoqqsq6aekYVzZ2FdXmVudIOQnaalqKainZCDdWtmY2Zrb3WBjJejq6ypp56RgnRpYl9gbXV+io+coaaopp2UhXdsZGNmbneDjJagpqinop2UhnZrZ2ZocHiFj5igpaWmpJyThHZrZWRncHaEjZWfpKSmpZyWhndsaGdqcHeGj5aho6WkpZyVhndtaWhrcnqIkZugoqOlpJyUhHZsaGhrc3qJkpyfoqKkpZyTg3ZsaGhrAA==',
  beep2: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJGdnaKbl4l7bmJaU09RWGFrdoSQm6Woq6eglox/c2phWVVVW2RvfIqYo6yvraiflox9cGVcVlRYXmhzgY+cpqqsq6WdkYN0amFaWFtib3yJl6OrrK2rop2QgXNoX1lZXWRueoiVoaqtraunn5KFdGliXVxgaHN+i5igrK6urKiglIt+c2lgXl9mcHuHk56mrq+vrKihlY19c2piX2Bmc3yGkJqkrK+wramimI5/dGxlYmRpb3mDjJafo6qtr62oo5mQgXVuaGRlaW92f4mSmqKnq66tqaOaj4F1b2llZmtwdoCIkJmgo6eqrKunopqQgHVuaWdobnN5g4qRmaCjpqqqqqSfmJCCd29rampuc3mCiZCSmp+ho6eqqqeimJCCd3BsampudHuEi5KZn6KkpqmqqaWhmI+CdnBsamtwdnyCi5OaoKOkpqmrqqahmJCDd3FtbG1zenuFjJScn6OkpqmsqqeimJKEeHNubW50e36Hi5SbnqGkpqirq6ijmZKEeHJub3F3fnuHjJScnqKkpqirq6mkmJKE',
  ding: 'data:audio/wav;base64,UklGRl9vT19telepmZMAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fd42eoaWjnpSHe3BmX1pXWV9nbXiEj5mhpainop6Wjn93b2heWVhbYWhxeoeRm6GlpqWinpeSiYB3b2hgXVxfZGtze4aMlJugpKWkoJ2Ykol/d3BpY2BfYmlweoOLk5qfoaSlpKGdmo+GfnZvaWRiYmhtdX6Gj5ecn6Gio6Oim5SNhH52bmliYGJmbnZ/h5CXnKCgoqSkoJuVjYN7c2xoY2NlaG92f4iQl5ygoKKko6CblpCGfnZvamdlZmlud4CIkJecoKCio6ShnpqUi4N7dG5qaGdpbXN7g4uTmZ2goKKjo6GempSMhH12cGxqa2twdXuDi5KYnJ+goqOjo6CemZSMhH53cW1rbG9zdnyEjJKYnJ+hoaKjo6GfnZiSioJ7dXFubm9zdn2EjJKXm56goaKioqGgnpqVjYV+eHNwb3F0d32FjJKXm56foaGioqKhnp2YlIyFf3l0cXBydXl+hYySlpibnp+goqKioaCenJiUjIZ/eXRycXN2en+GjJKWmZyenp+goaGhoJ+dnJiUjIaAfnp2dHR2eXyAhYuQlJeam5ydnp+foKCfnp2cmJSMhoB7d3V0dHZ4fH+Ei4+Tl5mbnJydnZ6en56enZyYlIyGgHt3dXR1dnh7fYKHjJCUl5mam5ycnZ2dnZ2dnJuYlIyGgHx4dnV1dnh6fYGGi4+TlpiZmpubm5ycnJycnJuamJSMhoB8eHZ1dXZ4enyChouPk5aYmZqampubm5ubm5uamZiUjIaAfHh2dXV2eHp8gYaKj5OWmJmampqbm5ubm5ubmpqYlIyGgHx4dnV1dnh6fIGGio+TlpiZmpqampubm5ubm5qamJSM',
  notification: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJGZmqCfmZCBeG1lXVdUV11janWCjZaeoaSkoJ2XjoV7cmphW1laYGhyfIiTnKOmqKein5iPhnxzamFbWlthaHJ9iZOcoaWnqKWhn5aOhXxza2JcW11jaXN9iZOco6aoqKaim5WMg3t0bWZhYGNncHmDjpadoqWoqaijn5iQiH92bmdjYmRpcHmEjZaeoaWoqqmlop2Xj4d/d29pZGNlaW93gYuUnqOmqKuqqaWhnpiQiIB4cWxnZGZpbnZ/iZKboKSnqauqqaWgnpmRiYF5cm1oZWdqb3eBi5Sdn6SnqaqrqaagmpaPh4B4cm1pZmdqb3Z/iZKbnqKlp6mqqqigm5aRiYJ6dG9qZ2Zoa3B3f4iRmp6ho6aoqqqlop2YkoqDe3VwbGlnaGtwdn6HkJmdn6KlqKmqp6OemZOMhX54c25qaGhrcHV8hY6XnJ+ipqipqqmmoZ6akoyFfnl0cGxpaWtud3+Ij5WanqGkp6ipqaelnpuWkIl/eXRvbGpqbHB1fYaOlZqdoKOlqKmpqKWinpmTi4N9d3JubGtrbW90e4SNk5ibnaChpKeoqKimoZ2YkoyEfnhzb2xra21wdHuDi5GXmp2foaOlp6iopp+cmZOLhH55dHBubGtscHR6gYiPk5ebnp+io6Wmp6eloZ6ak4yFf3p1cW5sbG1wdHl/hoySlZmbnZ+ho6Slp6ajn5yWkIiCfHd0cG5tbW9ydnyCiY2SFZibnZ+goqSmpqaln52YkoqEfnh0cW9ub29ydn2DiY2RlZiamp2foaOkpaSjn52Xkot/eXZ0cXBwcXN2en+EiI2QlJeanJ6foaGjo6SjoJ6ako2IfHh1c3FxcnN2en6Ch4uPkpWYmpydn5+goaGioZ+dmpKNh4F8eHVzc3N0dnh7foOGio2Qk5aYmpydn56foaChn52blo+KhH97eHV0dHR1d3l8foKFiYyPkpWXmZucnZ6en5+fnp2bmJOMhYF9end1dHR1dnh6fH+ChYiLjpGUl5manJydnp6enp2cmpiUjomDfnp3dXR0dHZ3eXt9gIOGiYyPkpWYmZqbnJ2dnZ2dnJqZlo+LhYB8eXZ1dHR1dnd6fH6Bg4aJjJCTlpiZmpubnJycnJycm5qYlI+LhYF9enZ1dXV2d3l6fX+CBoaJjJCTlpeZmpubnJycnJycm5qYlI+LhYF9enZ1dXV2d3l6fX+Cg4aJjI+TlpeZmpubnJycnJybm5qYlI+LhYF9enZ1dXV2d3l6fX+Cg4aJjI+TlpeZmpubnJyc',
};

// Store for tracking message counts
let lastMessageCounts = {};
let audioContext = null;
let customSoundUrl = null;
let notificationEnabled = true;
let soundVolume = 0.7;
let selectedSound = 'notification';

/**
 * Initialize audio context (required for web audio)
 */
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play notification sound
 */
export const playNotificationSound = async () => {
  if (!notificationEnabled) return;
  
  try {
    let soundUrl = customSoundUrl || DEFAULT_SOUNDS[selectedSound] || DEFAULT_SOUNDS.notification;
    
    const audio = new Audio(soundUrl);
    audio.volume = soundVolume;
    
    // Handle autoplay restrictions
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Audio autoplay blocked:', error);
      });
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

/**
 * Check for new messages and play sound if detected
 */
export const checkNewMessages = (conversations, storeId) => {
  if (!conversations || !Array.isArray(conversations)) return false;
  
  const key = storeId || 'default';
  const currentUnread = conversations.reduce((total, conv) => {
    return total + (conv.unread_count || conv.unreadCount || 0);
  }, 0);
  
  const previousUnread = lastMessageCounts[key] || 0;
  lastMessageCounts[key] = currentUnread;
  
  // If unread count increased, we have new messages
  if (currentUnread > previousUnread && previousUnread !== 0) {
    playNotificationSound();
    return true;
  }
  
  return false;
};

/**
 * Set custom notification sound from file
 */
export const setCustomSound = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      customSoundUrl = null;
      resolve(null);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      reject(new Error('File harus berupa audio (MP3, WAV, OGG)'));
      return;
    }
    
    // Max 500KB for sound file
    if (file.size > 500 * 1024) {
      reject(new Error('Ukuran file maksimal 500KB'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      customSoundUrl = e.target.result;
      // Save to localStorage
      localStorage.setItem('chat_notification_sound', customSoundUrl);
      resolve(customSoundUrl);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Set custom sound from URL
 */
export const setCustomSoundUrl = (url) => {
  customSoundUrl = url;
  if (url) {
    localStorage.setItem('chat_notification_sound', url);
  } else {
    localStorage.removeItem('chat_notification_sound');
  }
};

/**
 * Get available default sounds
 */
export const getDefaultSounds = () => {
  return [
    { id: 'notification', name: 'Notifikasi', description: 'Sound default' },
    { id: 'beep1', name: 'Beep 1', description: 'Beep pendek' },
    { id: 'beep2', name: 'Beep 2', description: 'Beep panjang' },
    { id: 'ding', name: 'Ding', description: 'Bell sound' },
  ];
};

/**
 * Select a default sound
 */
export const selectDefaultSound = (soundId) => {
  if (DEFAULT_SOUNDS[soundId]) {
    selectedSound = soundId;
    customSoundUrl = null;
    localStorage.setItem('chat_notification_sound_id', soundId);
    localStorage.removeItem('chat_notification_sound');
  }
};

/**
 * Enable/disable notifications
 */
export const setNotificationEnabled = (enabled) => {
  notificationEnabled = enabled;
  localStorage.setItem('chat_notification_enabled', JSON.stringify(enabled));
};

/**
 * Set notification volume (0-1)
 */
export const setNotificationVolume = (volume) => {
  soundVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('chat_notification_volume', JSON.stringify(soundVolume));
};

/**
 * Get current notification settings
 */
export const getNotificationSettings = () => {
  return {
    enabled: notificationEnabled,
    volume: soundVolume,
    selectedSound,
    hasCustomSound: !!customSoundUrl,
  };
};

/**
 * Initialize notification settings from localStorage
 */
export const initNotificationSettings = () => {
  try {
    const enabled = localStorage.getItem('chat_notification_enabled');
    if (enabled !== null) {
      notificationEnabled = JSON.parse(enabled);
    }
    
    const volume = localStorage.getItem('chat_notification_volume');
    if (volume !== null) {
      soundVolume = JSON.parse(volume);
    }
    
    const soundId = localStorage.getItem('chat_notification_sound_id');
    if (soundId && DEFAULT_SOUNDS[soundId]) {
      selectedSound = soundId;
    }
    
    const customSound = localStorage.getItem('chat_notification_sound');
    if (customSound) {
      customSoundUrl = customSound;
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
};

/**
 * Request browser notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  
  return 'denied';
};

/**
 * Show browser notification
 */
export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }
  
  const notification = new Notification(title, {
    icon: '/images/icon-192.png',
    badge: '/images/icon-192.png',
    ...options,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  return notification;
};

/**
 * Combined notification: sound + browser notification
 */
export const notifyNewChat = (storeName, buyerName, message) => {
  // Play sound
  playNotificationSound();
  
  // Show browser notification
  showBrowserNotification(`Chat baru dari ${storeName}`, {
    body: `${buyerName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
    tag: 'chat-notification',
    requireInteraction: false,
  });
};

// Initialize on load
initNotificationSettings();
