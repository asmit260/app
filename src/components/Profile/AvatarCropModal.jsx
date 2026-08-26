import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, ZoomIn, ZoomOut, RotateCw, Check, Upload, Trash2, 
  Sparkles, Move, Image as ImageIcon, RefreshCw, Layers
} from 'lucide-react';
import { sound } from '../../services/soundEffects';

const ANIME_PRESETS = [
  { id: 'scout', name: 'Scout Emblem', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80' },
  { id: 'gojo', name: 'Domain Master', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80' },
  { id: 'cyber', name: 'Cyber Hunter', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80' },
  { id: 'ninja', name: 'Shinobi Shadow', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80' },
  { id: 'samurai', name: 'Ronin Blade', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80' },
  { id: 'mecha', name: 'Mecha Core', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&auto=format&fit=crop&q=80' }
];

export default function AvatarCropModal({
  isOpen,
  onClose,
  currentAvatar = '',
  onSaveAvatar,
  onRemoveAvatar
}) {
  const [loadedImage, setLoadedImage] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const CANVAS_SIZE = 260; // 260x260 viewport for crisp rendering on both mobile and desktop

  // Load image safely into HTMLImageElement
  const loadImage = useCallback((src) => {
    if (!src) {
      setLoadedImage(null);
      return;
    }
    setIsLoadingImage(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImage(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      setIsLoadingImage(false);
    };
    img.onerror = () => {
      // Retry without CORS if tainted
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setLoadedImage(fallbackImg);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setRotation(0);
        setIsLoadingImage(false);
      };
      fallbackImg.onerror = () => {
        setIsLoadingImage(false);
      };
      fallbackImg.src = src;
    };
    img.src = src;
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (currentAvatar) {
        loadImage(currentAvatar);
      } else {
        setLoadedImage(null);
      }
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, currentAvatar, loadImage]);

  // Redraw canvas with 100% WYSIWYG hardware acceleration
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8; // circle radius

    // Clear whole canvas
    ctx.clearRect(0, 0, size, size);

    if (loadedImage) {
      ctx.save();

      // 1. Clip circle viewport
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Dark background
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(0, 0, size, size);

      // 2. Compute aspect ratio fit
      const imgAspect = loadedImage.naturalWidth / loadedImage.naturalHeight;
      let baseW, baseH;
      if (imgAspect > 1) {
        baseH = radius * 2;
        baseW = baseH * imgAspect;
      } else {
        baseW = radius * 2;
        baseH = baseW / imgAspect;
      }

      // 3. Apply position, rotation & zoom
      ctx.translate(center + offset.x, center + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      ctx.drawImage(
        loadedImage,
        -baseW / 2,
        -baseH / 2,
        baseW,
        baseH
      );

      ctx.restore();

      // 4. Crisp manga framing ring
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#F59E0B'; // Amber-500
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // 5. Delicate framing guide
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(24, 19, 13, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Empty placeholder
      ctx.fillStyle = '#26221F';
      ctx.fillRect(0, 0, size, size);
      
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#78716C';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [loadedImage, zoom, offset, rotation]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      loadImage(event.target.result);
      sound.playClick();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Preset Click Handler
  const handlePresetSelect = (url) => {
    sound.playTap();
    loadImage(url);
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (!loadedImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !loadedImage) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers (Mobile)
  const handleTouchStart = (e) => {
    if (!loadedImage || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !loadedImage || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    sound.playTap();
    setRotation((r) => (r + 90) % 360);
  };

  // Reset transforms
  const handleReset = () => {
    sound.playTap();
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Apply & Export Cropped Avatar
  const handleSaveAvatar = () => {
    if (!loadedImage) {
      onSaveAvatar('');
      onClose();
      return;
    }

    const exportSize = 320;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const eCtx = exportCanvas.getContext('2d');
    const eCenter = exportSize / 2;
    const eRadius = exportSize / 2;

    // Circular clip
    eCtx.beginPath();
    eCtx.arc(eCenter, eCenter, eRadius, 0, Math.PI * 2);
    eCtx.closePath();
    eCtx.clip();

    // Dark backdrop
    eCtx.fillStyle = '#1C1917';
    eCtx.fillRect(0, 0, exportSize, exportSize);

    // Scale calculation
    const displayRadius = (CANVAS_SIZE / 2) - 8;
    const scaleRatio = exportSize / (displayRadius * 2);

    const imgAspect = loadedImage.naturalWidth / loadedImage.naturalHeight;
    let baseW, baseH;
    if (imgAspect > 1) {
      baseH = exportSize;
      baseW = baseH * imgAspect;
    } else {
      baseW = exportSize;
      baseH = baseW / imgAspect;
    }

    eCtx.translate(eCenter + (offset.x * scaleRatio), eCenter + (offset.y * scaleRatio));
    eCtx.rotate((rotation * Math.PI) / 180);
    eCtx.scale(zoom, zoom);

    eCtx.drawImage(
      loadedImage,
      -baseW / 2,
      -baseH / 2,
      baseW,
      baseH
    );

    try {
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.9);
      onSaveAvatar(dataUrl);
      sound.playSaveSuccess();
      onClose();
    } catch (err) {
      // Fallback if image source was CORS restricted
      onSaveAvatar(loadedImage.src);
      sound.playSaveSuccess();
      onClose();
    }
  };

  const handleRemove = () => {
    sound.playTap();
    onRemoveAvatar();
    setLoadedImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-sm sm:max-w-md bg-sand-50 dark:bg-stone-900 border-3 border-stone-900 rounded-2xl shadow-manga-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b-2 border-stone-900 flex items-center justify-between bg-sand-100 dark:bg-stone-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-400 border border-stone-900 text-stone-950 shadow-2xs">
              <ImageIcon className="w-4 h-4" />
            </span>
            <h3 className="font-display font-black text-sm sm:text-base text-stone-900 dark:text-stone-100 uppercase tracking-tight">
              Edit Avatar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-950 dark:hover:text-stone-100 rounded-md border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto hide-scrollbar">
          
          {/* Canvas Interactive Viewport */}
          <div className="flex flex-col items-center">
            <div 
              className={`w-[${CANVAS_SIZE}px] h-[${CANVAS_SIZE}px] rounded-2xl border-2 border-stone-900 bg-sand-200 dark:bg-stone-950 overflow-hidden relative shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] select-none flex items-center justify-center ${
                loadedImage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              }`}
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (!loadedImage) fileInputRef.current?.click();
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full h-full block"
              />

              {!loadedImage && !isLoadingImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-stone-400 pointer-events-none">
                  <Upload className="w-8 h-8 mb-2 text-stone-500" />
                  <p className="text-xs font-bold text-stone-700 dark:text-stone-300">Tap to Upload Photo</p>
                  <p className="text-[10px] text-stone-500 text-center mt-0.5">JPG, PNG, WebP supported</p>
                </div>
              )}

              {isLoadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center text-white space-y-1">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                    <span className="text-[10px] font-mono">Loading...</span>
                  </div>
                </div>
              )}
            </div>

            {loadedImage && (
              <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-2 flex items-center gap-1">
                <Move className="w-3 h-3 text-amber-500" />
                <span>Drag inside circle to position photo</span>
              </p>
            )}
          </div>

          {/* Interactive Controls (Zoom & Rotate) */}
          {loadedImage && (
            <div className="space-y-2 bg-sand-100 dark:bg-stone-800 p-3 rounded-xl border-2 border-stone-900 shadow-2xs animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-stone-500" />
                  <span>Zoom Scale</span>
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min="0.8"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-sand-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                {/* 90 deg Rotate */}
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg bg-sand-50 dark:bg-stone-700 hover:bg-amber-400 text-stone-700 dark:text-stone-200 hover:text-stone-950 border-2 border-stone-900 transition-colors shadow-2xs shrink-0"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Reset Center */}
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg bg-sand-50 dark:bg-stone-700 hover:bg-amber-400 text-stone-700 dark:text-stone-200 hover:text-stone-950 border-2 border-stone-900 transition-colors shadow-2xs shrink-0 text-[10px] font-bold"
                  title="Reset Position & Zoom"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Device Upload & Remove */}
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
              className="flex-1 btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-900 dark:text-stone-100 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>{loadedImage ? 'Upload Another' : 'Upload Image'}</span>
            </button>

            {loadedImage && (
              <button
                onClick={handleRemove}
                className="btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 py-2 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                title="Remove Avatar"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
              <span className="text-[10px] font-mono text-stone-500">1-Tap Select</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {ANIME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.url)}
                  className="aspect-square rounded-full border-2 border-stone-900 overflow-hidden hover:scale-110 active:scale-95 transition-all hover:ring-2 hover:ring-amber-400 bg-stone-800 shadow-2xs"
                  title={p.name}
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs hover:bg-sand-300 transition-all active:translate-y-0.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAvatar}
            disabled={!loadedImage}
            className="flex-2 py-2.5 px-4 rounded-lg border-2 border-stone-900 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] transition-all active:translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
