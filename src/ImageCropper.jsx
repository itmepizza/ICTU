import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Modal cắt ảnh vuông 1:1 — khung cắt có 8 điểm điều chỉnh (4 góc + 4 cạnh),
// kéo để di chuyển, kéo bất kỳ điểm nào để phóng to/thu nhỏ (luôn giữ 1:1).
export default function ImageCropper({ file, isDark, onCancel, onConfirm, submitting }) {
  const imgRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [imgBox, setImgBox] = useState(null);
  const [crop, setCrop] = useState(null); // { x, y, size }
  const dragState = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const width = img.clientWidth;
    const height = img.clientHeight;
    setImgBox({ width, height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    const size = Math.min(width, height);
    setCrop({ x: (width - size) / 2, y: (height - size) / 2, size });
  };

  const clamp = (next, box) => {
    let { x, y, size } = next;
    size = Math.max(40, Math.min(size, box.width, box.height));
    x = Math.max(0, Math.min(x, box.width - size));
    y = Math.max(0, Math.min(y, box.height - size));
    return { x, y, size };
  };

  // handle: 'move' | 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'
  const startDrag = (e, handle) => {
    e.stopPropagation();
    dragState.current = { handle, startX: e.clientX, startY: e.clientY, orig: { ...crop } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!dragState.current || !imgBox) return;
    const { handle, orig } = dragState.current;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (handle === 'move') {
      setCrop(clamp({ x: orig.x + dx, y: orig.y + dy, size: orig.size }, imgBox));
      return;
    }

    const left = orig.x, top = orig.y, right = orig.x + orig.size, bottom = orig.y + orig.size;
    const centerX = orig.x + orig.size / 2, centerY = orig.y + orig.size / 2;
    let next;

    switch (handle) {
      case 'br': { const g = (dx + dy) / 2; next = { x: left, y: top, size: orig.size + g }; break; }
      case 'tl': { const g = -(dx + dy) / 2; next = { size: orig.size + g }; next.x = right - next.size; next.y = bottom - next.size; break; }
      case 'tr': { const g = (dx - dy) / 2; next = { size: orig.size + g }; next.x = left; next.y = bottom - next.size; break; }
      case 'bl': { const g = (dy - dx) / 2; next = { size: orig.size + g }; next.x = right - next.size; next.y = top; break; }
      case 'r':  { next = { size: orig.size + dx }; next.x = left; next.y = centerY - next.size / 2; break; }
      case 'l':  { next = { size: orig.size - dx }; next.x = right - next.size; next.y = centerY - next.size / 2; break; }
      case 'b':  { next = { size: orig.size + dy }; next.y = top; next.x = centerX - next.size / 2; break; }
      case 't':  { next = { size: orig.size - dy }; next.y = bottom - next.size; next.x = centerX - next.size / 2; break; }
      default: next = orig;
    }
    setCrop(clamp(next, imgBox));
  };

  const onPointerUp = () => {
    dragState.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const handleConfirm = () => {
    if (!crop || !imgBox) return;
    const img = imgRef.current;
    const scaleX = imgBox.naturalWidth / imgBox.width;
    const scaleY = imgBox.naturalHeight / imgBox.height;
    const sx = crop.x * scaleX;
    const sy = crop.y * scaleY;
    const sSize = crop.size * scaleX;

    const OUTPUT = 400;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.92);
  };

  const overlay = isDark ? 'bg-slate-900/90' : 'bg-black/60';
  const card = isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';

  // 8 điểm: vị trí (theo % trên khung) + con trỏ chuột + handle id
  const HANDLES = [
    { id: 'tl', top: '0%', left: '0%', cursor: 'nwse-resize' },
    { id: 't',  top: '0%', left: '50%', cursor: 'ns-resize' },
    { id: 'tr', top: '0%', left: '100%', cursor: 'nesw-resize' },
    { id: 'r',  top: '50%', left: '100%', cursor: 'ew-resize' },
    { id: 'br', top: '100%', left: '100%', cursor: 'nwse-resize' },
    { id: 'b',  top: '100%', left: '50%', cursor: 'ns-resize' },
    { id: 'bl', top: '100%', left: '0%', cursor: 'nesw-resize' },
    { id: 'l',  top: '50%', left: '0%', cursor: 'ew-resize' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlay}`}>
      <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 ${card}`}>
        <h3 className="font-bold text-lg mb-4">Cập nhật ảnh đại diện</h3>

        <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-slate-900 select-none">
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              onLoad={handleImgLoad}
              alt="Ảnh cần cắt"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          )}

          {crop && imgBox && (
            <div
              onPointerDown={(e) => startDrag(e, 'move')}
              style={{ left: crop.x, top: crop.y, width: crop.size, height: crop.size }}
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move touch-none"
            >
              {HANDLES.map((h) => (
                <div
                  key={h.id}
                  onPointerDown={(e) => startDrag(e, h.id)}
                  style={{ top: h.top, left: h.left, cursor: h.cursor, transform: 'translate(-50%, -50%)' }}
                  className="absolute w-3.5 h-3.5 bg-white rounded-full border-2 border-[#004b87] touch-none"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !crop}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#004b87] text-white hover:bg-[#003a68] disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
