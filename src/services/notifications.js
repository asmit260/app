// Notification & Calendar Reminder Service
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase.js';
import { getUser } from './auth.js';

// ─── ICS & Calendar Helpers ─────────────────────────────────────

function foldLines(icsText) {
  const folded = icsText.split(/\r?\n/).map(line => {
    if (line.length <= 75) return line;
    let result = line.slice(0, 75);
    let remaining = line.slice(75);
    while (remaining.length > 0) {
      result += '\r\n ' + remaining.slice(0, 74);
      remaining = remaining.slice(74);
    }
    return result;
  }).join('\r\n');
  return folded.endsWith('\r\n') ? folded : folded + '\r\n';
}

export function openPhoneCalendar({ title, startUnix, durationMinutes = 25, episode, leadMinutes = 15 }) {
  try {
    const safeTitle = episode ? `${title} (Ep ${episode})` : (title || 'Anime Airing');
    let safeUnix = startUnix || Math.floor(Date.now() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    
    // If airing time already passed, shift to next week
    if (safeUnix <= nowUnix) {
      safeUnix += 7 * 86400;
    }

    const description = `AniTrack Airing Reminder for ${safeTitle}`;
    
    const start = new Date(safeUnix * 1000).toISOString().replace(/[-:\.]/g, '').slice(0, 15) + 'Z';
    const end = new Date((safeUnix + durationMinutes * 60) * 1000).toISOString().replace(/[-:\.]/g, '').slice(0, 15) + 'Z';
    
    const cleanTitle = encodeURIComponent(safeTitle);
    const cleanDesc = encodeURIComponent(description);

    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

    if (isAndroid) {
      const fallbackUrl = encodeURIComponent(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${cleanTitle}&dates=${start}/${end}&details=${cleanDesc}`);
      const intentUrl = `intent://#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;S.title=${cleanTitle};S.description=${cleanDesc};l.beginTime=${safeUnix * 1000};l.endTime=${(safeUnix + durationMinutes * 60) * 1000};S.browser_fallback_url=${fallbackUrl};end`;
      window.location.href = intentUrl;
      return;
    }

    if (isIOS) {
      const dtstamp = new Date().toISOString().replace(/[-:\.]/g, '').slice(0, 15) + 'Z';
      const escapeIcs = (str) => (str || '').replace(/[\\,;]/g, '\\$&').replace(/\r?\n/g, '\\n');
      const icsTitle = escapeIcs(safeTitle);
      const icsDesc = escapeIcs(description);
      const uid = `anitrack-${safeUnix}-${(title || 'anime').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}@anitrack.com`;

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AniTrack//Anime Calendar 1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `SUMMARY:${icsTitle}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `DESCRIPTION:${icsDesc}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:-PT${leadMinutes}M`,
        `DESCRIPTION:Reminder: ${icsTitle}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      window.location.href = `data:text/calendar;charset=utf8,${encodeURIComponent(foldLines(ics))}`;
      return;
    }

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${cleanTitle}&dates=${start}/${end}&details=${cleanDesc}`;
    window.open(gcalUrl, '_blank');
  } catch (err) {
    console.error("openPhoneCalendar error:", err);
  }
}

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
              title: `⚔️ Airing Alert: ${title}`,
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
          new Notification(`⚔️ Airing Alert: ${title}`, {
            body: `${episodeText} ${leadText}`
          });
        } catch (_) {}
      } else if (delayMs < 2147483647) {
        setTimeout(() => {
          try {
            new Notification(`⚔️ Airing Alert: ${title}`, {
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


