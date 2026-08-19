// Notification & Calendar Reminder Service
import { supabase } from './supabase.js';
import { getUser } from './auth.js';

// Safe dynamic loader for Capacitor plugin
async function getLocalNotifications() {
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch (err) {
    console.warn("Capacitor LocalNotifications not available:", err);
    return null;
  }
}

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
  const safeTitle = episode ? `${title} (Ep ${episode})` : (title || 'Anime Airing');
  const safeUnix = startUnix || Math.floor(Date.now() / 1000);
  const description = `AniTrack Airing Reminder for ${safeTitle}`;
  
  const start = new Date(safeUnix * 1000).toISOString().replace(/[-:\.]/g, '').slice(0, 15) + 'Z';
  const end = new Date((safeUnix + durationMinutes * 60) * 1000).toISOString().replace(/[-:\.]/g, '').slice(0, 15) + 'Z';
  
  const cleanTitle = encodeURIComponent(safeTitle);
  const cleanDesc = encodeURIComponent(description);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

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
}

// ─── Native Local Notifications ─────────────────────────────────

export async function requestNotificationPermission() {
  try {
    const ln = await getLocalNotifications();
    if (ln) {
      const status = await ln.requestPermissions();
      if (status.display === 'granted') {
        return 'granted';
      }
    }
  } catch (_) {}

  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (_) {}
  }

  return 'granted';
}

export async function scheduleDeviceNotification({ animeId, title, episode, airingAt, leadMinutes = 15 }) {
  const notifyTimeMs = (airingAt * 1000) - (leadMinutes * 60 * 1000);
  const nowMs = Date.now();
  const scheduleDate = notifyTimeMs > nowMs ? new Date(notifyTimeMs) : new Date(nowMs + 1000);

  const episodeText = episode ? `Episode ${episode}` : 'New Episode';
  const leadText = leadMinutes > 0 ? `airs in ${leadMinutes} minutes!` : 'is airing right now!';
  const notificationId = Math.abs(parseInt(animeId) || Math.floor(Math.random() * 100000));

  // 1. Try Native Capacitor LocalNotifications
  try {
    const ln = await getLocalNotifications();
    if (ln) {
      await ln.schedule({
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
    }
  } catch (nativeErr) {
    console.warn("Native LocalNotifications error, falling back to Web API:", nativeErr);
  }

  // 2. Fallback for browser
  if ('Notification' in window && Notification.permission === 'granted') {
    const delayMs = notifyTimeMs - nowMs;
    if (delayMs <= 0) {
      new Notification(`⚔️ Airing Alert: ${title}`, {
        body: `${episodeText} ${leadText}`
      });
    } else if (delayMs < 2147483647) {
      setTimeout(() => {
        new Notification(`⚔️ Airing Alert: ${title}`, {
          body: `${episodeText} ${leadText}`
        });
      }, delayMs);
    }
  }

  return true;
}

export async function cancelDeviceNotification(animeId) {
  const notificationId = Math.abs(parseInt(animeId) || 0);
  try {
    const ln = await getLocalNotifications();
    if (ln) {
      await ln.cancel({
        notifications: [{ id: notificationId }]
      });
    }
  } catch (_) {}
}

// ─── Persistent Alert CRUD in Supabase Mock DB ──────────────────

export async function getActiveAnimeAlerts() {
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
}

export async function saveAnimeAlert({ animeId, title, cover, airingAt, episode, leadMinutes = 15 }) {
  const user = await getUser() || { id: 'local_user' };
  const id = `${user.id}_alert_${animeId}`;

  const payload = {
    id,
    user_id: user.id,
    anime_id: parseInt(animeId),
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
}

export async function removeAnimeAlert(animeId) {
  const user = await getUser() || { id: 'local_user' };
  
  await cancelDeviceNotification(animeId);

  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', user.id)
    .eq('anime_id', parseInt(animeId));
  
  window.dispatchEvent(new CustomEvent('anitrack-alerts-changed'));
}
