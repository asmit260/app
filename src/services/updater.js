// In-App Auto-Updater Service
// Checks GitHub Releases for new APK versions and manages update notifications

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const CURRENT_APP_VERSION = '1.0.0';
const GITHUB_REPO = 'asmit260/app';
const LAST_CHECK_KEY = 'anitrack_last_update_check';
const CHECK_COOLDOWN_MS = 30 * 60 * 1000; // Check at most once every 30 minutes in background

/**
 * Compare semantic versions (e.g., '1.0.1' > '1.0.0')
 */
export function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const l = latest.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const c = current.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lVal = l[i] || 0;
    const cVal = c[i] || 0;
    if (lVal > cVal) return true;
    if (lVal < cVal) return false;
  }
  return false;
}

/**
 * Checks GitHub Releases for the latest version.
 * @param {boolean} force - If true, bypasses the 30-minute cooldown (for manual button tap)
 */
export async function checkForAppUpdate(force = false) {
  try {
    const now = Date.now();
    if (!force) {
      const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
      if (now - lastCheck < CHECK_COOLDOWN_MS) {
        return null; // Skip check to save network and stay fast
      }
    }
    localStorage.setItem(LAST_CHECK_KEY, String(now));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second hard timeout

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const rawTag = data.tag_name || '';
    const latestVersion = rawTag.replace(/^v/i, '');

    if (isNewerVersion(latestVersion, CURRENT_APP_VERSION)) {
      // Find APK in assets
      const apkAsset = (data.assets || []).find(a => (a.name || '').toLowerCase().endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;

      const updateInfo = {
        hasUpdate: true,
        version: latestVersion,
        currentVersion: CURRENT_APP_VERSION,
        releaseName: data.name || `Version v${latestVersion}`,
        releaseNotes: data.body || 'New features, bug fixes, and performance improvements.',
        downloadUrl,
        publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : ''
      };

      // Trigger a native notification alert if on native Android
      triggerUpdateDeviceNotification(updateInfo);

      return updateInfo;
    }

    return { hasUpdate: false, currentVersion: CURRENT_APP_VERSION };
  } catch (err) {
    console.warn("Update check completed or timed out:", err?.message || err);
    return null;
  }
}

/**
 * Triggers a device notification informing the user about the new update
 */
async function triggerUpdateDeviceNotification(updateInfo) {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999, // Reserved update notification ID
            title: `🚀 AniTrack v${updateInfo.version} Available!`,
            body: `A new update is available. Tap to install the latest version.`,
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      });
    }
  } catch (_) {}
}
