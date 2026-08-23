// Airing Notification & Device Alert Service
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase.js';
import { getUser } from './auth.js';

// ─── Native Local Notifications ─────────────────────────────────

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check?.display === 'granted') {
        return 'granted';
      }
      const status = await LocalNotifications.requestPermissions();
      if (status?.display === 'denied') {
        return 'denied';
      }
      return 'granted';
    } catch (err) {
      console.warn("Native permission request exception:", err);
      return 'granted';
    }
  }

  // Desktop browser fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return await Notification.requestPermission();
    } catch (_) {}
  }

  return 'granted';
}

export async function scheduleDeviceNotification({ animeId, title, episode, airingAt, leadMinutes = 15 }) {
  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    // If the episode has already aired, schedule for next week's episode (+7 days)
    let targetUnix = airingAt;
    if (targetUnix <= nowUnix) {
      targetUnix += 7 * 86400;
    }

    const notifyUnix = targetUnix - (leadMinutes * 60);
    const scheduleDate = notifyUnix > nowUnix ? new Date(notifyUnix * 1000) : new Date(Date.now() + 5000);

    const episodeText = episode ? `Episode ${episode}` : 'New Episode';
    const leadText = leadMinutes > 0 ? `airs in ${leadMinutes} minutes!` : 'is airing now!';
    
    // Ensure safe positive 32-bit int notification ID for Android
    const numericId = parseInt(animeId, 10);
    const notificationId = (!isNaN(numericId) ? Math.abs(numericId) : Math.floor(Math.random() * 1000000)) % 2147483647;

    // 1. Native Capacitor LocalNotifications
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title: `Airing Alert: ${title}`,
              body: `${episodeText} ${leadText}`,
              schedule: { 
                at: scheduleDate,
                allowWhileIdle: true 
              },
              extra: { animeId, episode }
            }
          ]
        });
        return true;
      } catch (nativeErr) {
        console.warn("Native LocalNotifications schedule error:", nativeErr);
      }
    }

    // 2. Desktop browser fallback
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
      const delayMs = (notifyUnix * 1000) - Date.now();
      if (delayMs <= 0) {
        try {
          new Notification(`Airing Alert: ${title}`, {
            body: `${episodeText} ${leadText}`
          });
        } catch (_) {}
      } else if (delayMs < 2147483647) {
        setTimeout(() => {
          try {
            new Notification(`Airing Alert: ${title}`, {
              body: `${episodeText} ${leadText}`
            });
          } catch (_) {}
        }, delayMs);
      }
    }
  } catch (err) {
    console.error("scheduleDeviceNotification unexpected error:", err);
  }

  return true;
}

export async function cancelDeviceNotification(animeId) {
  try {
    const numericId = parseInt(animeId, 10);
    const notificationId = (!isNaN(numericId) ? Math.abs(numericId) : 0) % 2147483647;
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });
    }
  } catch (err) {
    console.warn("Cancel notification error:", err);
  }
}

// ─── Persistent Alert CRUD in Supabase Mock DB ──────────────────

export async function getActiveAnimeAlerts() {
  try {
    const user = await getUser() || { id: 'local_user' };
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id);
    
    const alertsMap = {};
    (data || []).forEach(item => {
      if (item.anime_id) {
        alertsMap[item.anime_id] = item;
      }
    });
    return alertsMap;
  } catch (e) {
    console.error("getActiveAnimeAlerts error:", e);
    return {};
  }
}

export async function saveAnimeAlert({ animeId, title, cover, airingAt, episode, leadMinutes = 15 }) {
  try {
    const user = await getUser() || { id: 'local_user' };
    const id = `${user.id}_alert_${animeId}`;

    const payload = {
      id,
      user_id: user.id,
      anime_id: parseInt(animeId, 10) || animeId,
      title,
      cover,
      airing_at: airingAt,
      episode,
      lead_minutes: leadMinutes,
      created_at: new Date().toISOString()
    };

    await supabase.from('calendar_events').upsert(payload);
    window.dispatchEvent(new CustomEvent('anitrack-alerts-changed'));
    return payload;
  } catch (e) {
    console.error("saveAnimeAlert error:", e);
    return null;
  }
}

export async function removeAnimeAlert(animeId) {
  try {
    const user = await getUser() || { id: 'local_user' };
    
    await cancelDeviceNotification(animeId);

    await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id)
      .eq('anime_id', parseInt(animeId, 10) || animeId);
    
    window.dispatchEvent(new CustomEvent('anitrack-alerts-changed'));
  } catch (e) {
    console.error("removeAnimeAlert error:", e);
  }
}


