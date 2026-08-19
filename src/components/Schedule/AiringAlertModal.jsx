import React, { useState } from 'react';
import { X, Bell, BellOff, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import { 
  openPhoneCalendar, 
  requestNotificationPermission, 
  scheduleDeviceNotification, 
  saveAnimeAlert, 
  removeAnimeAlert 
} from '../../services/notifications';

const LEAD_OPTIONS = [
  { value: 0, label: 'At Airing Time' },
  { value: 15, label: '15 mins before' },
  { value: 30, label: '30 mins before' },
  { value: 60, label: '1 hour before' }
];

export default function AiringAlertModal({
  isOpen,
  onClose,
  anime,
  airingInfo,
  existingAlert,
  onAlertUpdated,
  titleLanguage = 'english'
}) {
  const [leadMinutes, setLeadMinutes] = useState(existingAlert?.lead_minutes || 15);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [permissionError, setPermissionError] = useState('');

  if (!isOpen || !anime) return null;

  const getTitle = () => {
    if (!anime) return 'Anime';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
  };

  const cover = anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage || anime.anime_cover || '';
  const airingAt = airingInfo?.airingAt || Math.floor(Date.now() / 1000) + 3600;
  const episode = airingInfo?.episode || 1;

  const handleSetNotification = async () => {
    setLoading(true);
    setPermissionError('');

    try {
      // 1. Request notification permission
      const permission = await requestNotificationPermission();
      if (permission === 'denied') {
        setPermissionError('Notification permission was blocked. Please enable notifications in your device settings.');
        setLoading(false);
        return;
      }

      // 2. Schedule local notification
      scheduleDeviceNotification({
        animeId: anime.id || anime.anime_id,
        title: getTitle(),
        episode,
        airingAt,
        leadMinutes
      });

      // 3. Save alert in DB
      await saveAnimeAlert({
        animeId: anime.id || anime.anime_id,
        title: getTitle(),
        cover,
        airingAt,
        episode,
        leadMinutes
      });

      setSuccessMessage('Airing reminder scheduled successfully!');
      if (onAlertUpdated) onAlertUpdated();
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Alert save error:", err);
      setPermissionError('Failed to schedule reminder.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCalendar = () => {
    openPhoneCalendar({
      title: getTitle(),
      startUnix: airingAt,
      durationMinutes: anime.duration || 25,
      episode,
      leadMinutes
    });

    setSuccessMessage('Opening calendar event...');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1500);
  };

  const handleRemoveAlert = async () => {
    setLoading(true);
    try {
      await removeAnimeAlert(anime.id || anime.anime_id);
      setSuccessMessage('Reminder removed.');
      if (onAlertUpdated) onAlertUpdated();
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Remove alert error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-sm w-full p-6 relative rounded-lg border-2 border-stone-900 shadow-manga-lg overflow-hidden space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {/* Header Preview */}
        <div className="flex gap-3 items-center pr-6">
          <img 
            src={cover} 
            alt={getTitle()} 
            className="w-14 h-20 object-cover rounded border-2 border-stone-900 shrink-0 bg-sand-200"
          />
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-amber-400 text-ink-900 border border-stone-900 rounded mb-1">
              Airing Alert
            </span>
            <h3 className="font-display font-black text-sm text-ink-900 line-clamp-2 leading-tight">
              {getTitle()}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-stone-600 font-bold">
              <Clock className="w-3 h-3 text-navy-700" />
              <span>Ep {episode} · {airingInfo?.time || 'Soon'}</span>
            </div>
            {airingInfo?.countdown && (
              <span className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                in {airingInfo.countdown}
              </span>
            )}
          </div>
        </div>

        {/* Feedback / Success messages */}
        {successMessage && (
          <div className="p-2.5 bg-status-watching-bg text-status-watching text-xs font-bold rounded border border-status-watching/30 flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {permissionError && (
          <div className="p-2.5 bg-status-dropped-bg text-status-dropped text-xs font-bold rounded border border-status-dropped/30 flex items-center gap-1.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Lead Time Selection */}
        <div className="space-y-1.5 pt-2 border-t border-sand-300 dark:border-sand-400">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
            Notify Me:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {LEAD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLeadMinutes(opt.value)}
                className={`py-1.5 px-2 rounded-md text-xs font-bold border-2 border-stone-900 transition-all text-center ${
                  leadMinutes === opt.value
                    ? 'bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                    : 'bg-sand-100 dark:bg-sand-200 text-stone-600 hover:bg-sand-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {/* Device Push / App Notification */}
          <button
            onClick={handleSetNotification}
            disabled={loading}
            className="w-full btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 py-2.5 rounded font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Bell className="w-4 h-4 fill-current" />
            <span>{existingAlert ? 'Update Airing Alert' : 'Set Airing Notification'}</span>
          </button>

          {/* Phone Calendar Sync */}
          <button
            onClick={handleAddToCalendar}
            disabled={loading}
            className="w-full btn-manga bg-sand-100 dark:bg-sand-200 hover:bg-amber-100 text-ink-900 py-2 rounded font-bold text-xs flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4 text-navy-700" />
            <span>Add to Phone Calendar</span>
          </button>

          {/* Remove Alert (if already active) */}
          {existingAlert && (
            <button
              onClick={handleRemoveAlert}
              disabled={loading}
              className="w-full text-xs font-bold text-status-dropped hover:underline pt-1 flex items-center justify-center gap-1"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Cancel Alert for this Show</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
