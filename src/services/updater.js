// In-App Auto-Updater Service
// Infallible multi-tier update checker (Raw GitHub JSON + GitHub Releases API)

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const CURRENT_APP_VERSION = '1.0.4';
const GITHUB_REPO = 'asmit260/app';
const LAST_CHECK_KEY = 'anitrack_last_update_check';
const DISMISSED_VERSION_KEY = 'anitrack_dismissed_update_version';
const CHECK_COOLDOWN_MS = 60 * 60 * 1000; // Check at most once every 1 hour in background

/**
 * Compare semantic versions (e.g., '1.0.4' > '1.0.0')
 */
export function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const l = latest.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  const c = current.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lVal = l[i] || 0;
    const cVal = c[i] || 0;
    if (lVal > cVal) return true;
    if (lVal < cVal) return false;
  }
  return false;
}

/**
 * Saves a dismissed update version so the user isn't spammed
 */
export function dismissUpdate(version) {
  if (!version) return;
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, String(version).replace(/^v/i, '').trim());
  } catch (_) {}
}

/**
 * Checks for latest app updates across multiple fast, unmetered endpoints.
 * @param {boolean} force - If true, bypasses the background throttle and dismissed check
 */
export async function checkForAppUpdate(force = false) {
  try {
    const now = Date.now();
    if (!force) {
      const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
      if (now - lastCheck < CHECK_COOLDOWN_MS) {
        return null;
      }
    }
    localStorage.setItem(LAST_CHECK_KEY, String(now));

    let latestVersion = null;
    let releaseName = '';
    let releaseNotes = '';
    let downloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
    let publishedAt = '';

    // Tier 1: Infallible Raw GitHub version.json (0ms rate-limit risk)
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        if (rawData?.version) {
          latestVersion = String(rawData.version).replace(/^v/i, '').trim();
          releaseName = rawData.name || `Version v${latestVersion}`;
          releaseNotes = rawData.releaseNotes || 'New features, performance upgrades, and bug fixes.';
          if (rawData.apkUrl) downloadUrl = rawData.apkUrl;
          if (rawData.publishedAt) publishedAt = rawData.publishedAt;
        }
      }
    } catch (rawErr) {
      console.warn("Raw version.json check error, falling back to API:", rawErr);
    }

    // Tier 2: GitHub Releases API fallback (if Tier 1 failed)
    if (!latestVersion) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const rawTag = data.tag_name || '';
          latestVersion = rawTag.replace(/^v/i, '').trim();
          releaseName = data.name || `Version v${latestVersion}`;
          releaseNotes = data.body || 'New features, performance upgrades, and bug fixes.';
          const apkAsset = (data.assets || []).find(a => (a.name || '').toLowerCase().endsWith('.apk'));
          if (apkAsset?.browser_download_url) {
            downloadUrl = apkAsset.browser_download_url;
          } else if (data.html_url) {
            downloadUrl = data.html_url;
          }
          if (data.published_at) {
            publishedAt = new Date(data.published_at).toLocaleDateString();
          }
        }
      } catch (apiErr) {
        console.warn("GitHub releases API error:", apiErr);
      }
    }

    // Check if newer than current version
    if (latestVersion && isNewerVersion(latestVersion, CURRENT_APP_VERSION)) {
      // Check if user previously dismissed this exact version (unless force check)
      if (!force) {
        const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
        if (dismissed === latestVersion) {
          return null; // Don't annoy user on launch
        }
      }

      const updateInfo = {
        hasUpdate: true,
        version: latestVersion,
        currentVersion: CURRENT_APP_VERSION,
        releaseName: releaseName || `Version v${latestVersion}`,
        releaseNotes: releaseNotes || 'New features, performance upgrades, and bug fixes.',
        downloadUrl,
        publishedAt: publishedAt || new Date().toLocaleDateString()
      };

      // Send device notification if on Android (only if not dismissed)
      triggerUpdateDeviceNotification(updateInfo);

      return updateInfo;
    }

    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestCheckedVersion: latestVersion || CURRENT_APP_VERSION
    };
  } catch (err) {
    console.warn("Update check completed with warning:", err?.message || err);
    return { hasUpdate: false, currentVersion: CURRENT_APP_VERSION };
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
            id: 999999,
            title: `🚀 AniTrack v${updateInfo.version} Available!`,
            body: `Tap to download and install the latest version.`,
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      });
    }
  } catch (_) {}
}
