import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Upload, Trash2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { sound } from '../../services/soundEffects';

const ANIME_PRESET_AVATARS = [
  { id: 'scout', name: 'Scout Emblem', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80' },
  { id: 'gojo', name: 'Jujutsu High', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80' },
  { id: 'cyber', name: 'Cyber Hero', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80' },
  { id: 'ninja', name: 'Shinobi', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80' },
  { id: 'samurai', name: 'Ronin', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' },
  { id: 'mecha', name: 'Mecha Pilot', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=300&auto=format&fit=crop&q=80' }
];

export default function AvatarCropModal({
  isOpen,
  onClose,
  currentAvatar = '',
  onSaveAvatar,
  onRemoveAvatar
}) {
  const [imageSrc, setImageSrc] = useState(currentAvatar);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentAvatar || '');
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      sound.playClick();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPreset = (url) => {
    setImageSrc(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    sound.playTap();
  };

  // Mouse & Touch Drag Handlers for pan
  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (!imageSrc || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSaveCropped = () => {
    if (!imageSrc) {
      onSaveAvatar('');
      onClose();
      return;
    }

    const canvas = document.createElement('canvas');
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Smooth background fill
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(0, 0, size, size);

      // Draw image transformed by zoom & position
      const viewportSize = 220; // Size of CSS viewport in px
      const scaleFactor = size / viewportSize;
      
      const aspect = img.width / img.height;
      let drawW, drawH;
      if (aspect > 1) {
        drawH = viewportSize * zoom;
        drawW = drawH * aspect;
      } else {
        drawW = viewportSize * zoom;
        drawH = drawW / aspect;
      }

      const drawX = (viewportSize - drawW) / 2 + position.x;
      const drawY = (viewportSize - drawH) / 2 + position.y;

      ctx.drawImage(
        img,
        drawX * scaleFactor,
        drawY * scaleFactor,
        drawW * scaleFactor,
        drawH * scaleFactor
      );

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        onSaveAvatar(dataUrl);
        sound.playSaveSuccess();
        onClose();
      } catch (err) {
        // Fallback for CORS images
        onSaveAvatar(imageSrc);
        sound.playSaveSuccess();
        onClose();
      }
    };
    img.onerror = () => {
      onSaveAvatar(imageSrc);
      onClose();
    };
    img.src = imageSrc;
  };

  const handleRemove = () => {
    onRemoveAvatar();
    setImageSrc('');
    sound.playTap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-md bg-sand-50 dark:bg-stone-900 border-3 border-stone-900 rounded-xl shadow-manga-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-stone-900 flex items-center justify-between bg-sand-100 dark:bg-stone-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-400 border border-stone-900 text-stone-950 shadow-2xs">
              <ImageIcon className="w-4 h-4" />
            </span>
            <h3 className="font-display font-black text-base text-stone-900 dark:text-stone-100 uppercase tracking-tight">
              Edit Avatar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-950 dark:hover:text-stone-100 rounded-md border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto hide-scrollbar">
          
          {/* Circular Crop Viewport */}
          <div className="flex flex-col items-center">
            <div 
              className="w-[220px] h-[220px] rounded-full border-4 border-amber-400 dark:border-amber-400 bg-stone-950 overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(24,19,13,1)] select-none cursor-grab active:cursor-grabbing flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {imageSrc ? (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Avatar Preview"
                  className="max-w-none pointer-events-none transition-transform duration-75"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              ) : (
                <div className="text-center p-4 text-stone-400">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-stone-500" />
                  <p className="text-xs font-bold">No Image Selected</p>
                  <p className="text-[10px] text-stone-500">Upload a photo or pick a preset below</p>
                </div>
              )}

              {/* Guide Overlay Ring */}
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            </div>

            {imageSrc && (
              <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mt-2 flex items-center gap-1">
                <span>Drag to reposition image</span>
              </p>
            )}
          </div>

          {/* Zoom Slider Control */}
          {imageSrc && (
            <div className="space-y-1.5 bg-sand-100 dark:bg-stone-800 p-3 rounded-lg border-2 border-stone-900">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                <span className="flex items-center gap-1">
                  <ZoomOut className="w-3.5 h-3.5 text-stone-500" />
                  <span>Zoom & Crop</span>
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-sand-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <button
                  onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
                  className="p-1.5 rounded bg-sand-200 dark:bg-stone-700 hover:bg-amber-400 text-stone-700 dark:text-stone-200 hover:text-stone-950 border border-stone-900 transition-colors shrink-0"
                  title="Reset Position & Zoom"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-900 dark:text-stone-100 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Upload from Device</span>
            </button>

            {imageSrc && (
              <button
                onClick={handleRemove}
                className="btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 py-2.5 px-3 text-xs font-bold flex items-center gap-1.5"
                title="Remove Custom Avatar"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Anime Presets Gallery */}
          <div className="space-y-2 pt-2 border-t border-stone-900/10 dark:border-stone-700">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Anime Presets</span>
              </span>
              <span className="text-[10px] font-mono text-stone-500">Quick Select</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {ANIME_PRESET_AVATARS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.url)}
                  className="aspect-square rounded-full border-2 border-stone-900 overflow-hidden hover:scale-110 active:scale-95 transition-all hover:ring-2 hover:ring-amber-400 bg-stone-800 shadow-xs"
                  title={p.name}
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs hover:bg-sand-300 transition-all active:translate-y-0.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCropped}
            disabled={!imageSrc}
            className="flex-2 py-2 px-4 rounded-lg border-2 border-stone-900 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] transition-all active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
