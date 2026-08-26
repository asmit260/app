import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, RotateCcw, Info, CheckCircle2 } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  icon: CustomIcon
}) {
  useEffect(() => {
    if (isOpen) {
      sound.playTab();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    sound.playTap();
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    sound.playTap();
    onClose();
  };

  // Color theme mapping
  const themes = {
    danger: {
      badgeBg: 'bg-rose-500',
      badgeText: 'text-white',
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
      defaultIcon: Trash2,
      border: 'border-rose-600/30'
    },
    warning: {
      badgeBg: 'bg-amber-400',
      badgeText: 'text-stone-950',
      confirmBtn: 'bg-amber-400 hover:bg-amber-300 text-stone-950',
      defaultIcon: AlertTriangle,
      border: 'border-amber-500/30'
    },
    info: {
      badgeBg: 'bg-sky-500',
      badgeText: 'text-white',
      confirmBtn: 'bg-navy-700 hover:bg-navy-600 text-white',
      defaultIcon: RotateCcw,
      border: 'border-sky-500/30'
    },
    success: {
      badgeBg: 'bg-emerald-500',
      badgeText: 'text-white',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      defaultIcon: CheckCircle2,
      border: 'border-emerald-500/30'
    }
  };

  const currentTheme = themes[type] || themes.danger;
  const Icon = CustomIcon || currentTheme.defaultIcon;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={handleCancel}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-sm w-full p-5 sm:p-6 rounded-2xl border-2 border-stone-900 shadow-manga-lg overflow-hidden relative flex flex-col space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-2xs hover:bg-sand-200 active:scale-95 transition-all"
          title="Close dialog"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${currentTheme.badgeBg} border-2 border-stone-900 flex items-center justify-center shadow-2xs shrink-0`}>
            <Icon className={`w-5 h-5 ${currentTheme.badgeText}`} />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-ink-900 uppercase tracking-tight leading-tight">
              {title}
            </h3>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-3 bg-sand-100 dark:bg-sand-200/80 rounded-xl border border-stone-900/20 text-xs font-medium text-stone-700 dark:text-stone-300 leading-relaxed">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="py-2.5 px-3 bg-sand-200 dark:bg-sand-300 hover:bg-sand-300 dark:hover:bg-sand-400 text-stone-800 dark:text-stone-200 rounded-xl font-bold text-xs border-2 border-stone-900/60 shadow-2xs active:scale-95 transition-all"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            className={`btn-manga py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider border-2 border-stone-900 shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 ${currentTheme.confirmBtn}`}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
