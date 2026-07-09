import { api } from './api';

// Utility function to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Tu navegador o dispositivo no soporta notificaciones Push.');
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    
    // Check if subscription already exists
    let subscription = await reg.pushManager.getSubscription();
    
    if (!subscription) {
      // 1. Get VAPID public key from server
      const { public_key } = await api.getVapidPublicKey();
      if (!public_key || public_key === 'MOCK_PUBLIC_KEY') {
        // Fallback for demo mode
        if (api.getMode() === 'demo') {
          console.log('[Demo] Generando suscripción push falsa');
          subscription = {
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/demo_subscription',
            keys: { p256dh: 'mock_p256dh', auth: 'mock_auth' }
          };
        } else {
          throw new Error('La llave pública VAPID no está configurada en el servidor.');
        }
      } else {
        // 2. Subscribe user
        const convertedVapidKey = urlBase64ToUint8Array(public_key);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
    }

    // 3. Send subscription details to server
    const subJson = typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;
    await api.subscribePushNotifications(subJson);

    // 4. Trigger test notification to prove it works
    await api.testPushNotification();
    
    return true;
  } catch (error) {
    console.error('Error al suscribir a notificaciones Push:', error);
    throw error;
  }
}
