import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Save } from 'lucide-react';

const COLORS = ['#2a2a2a', '#E0524F', '#F2C200', '#4FAE5A', '#2B6FE0', '#7B4FE0', '#FF8FA3'];
const SIZES = [4, 8, 14];

// A simple, reliable in-app drawing pad (mouse + touch). "Save" uploads the
// drawing and stores the URL on the lesson via the onSave prop.
export default function DrawingCanvas({ onSave, savedUrl }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [color, setColor] = useState('#7B4FE0');
  const [size, setSize] = useState(8);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const last = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctxRef.current = ctx;
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const p = getPos(e);
    last.current = p;
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasDrawn(true);
  };

  const end = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const save = async () => {
    if (!onSave || !hasDrawn) return;
    setSaving(true);
    try {
      await new Promise((resolve) => {
        canvasRef.current.toBlob(async (blob) => {
          const file = new File([blob], 'drawing.png', { type: 'image/png' });
          await onSave(file);
          resolve();
        }, 'image/png');
      });
      setHasDrawn(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${
              color === c ? 'border-black scale-110' : 'border-white shadow'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-black/10">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition active:scale-90 ${
                size === s ? 'border-[#7B4FE0] bg-[#EDE6FF]' : 'border-black/10 bg-white'
              }`}
              aria-label={`Brush size ${s}`}
            >
              <span className="rounded-full bg-black/70" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        className="w-full rounded-2xl bg-white border-2 border-black/10 touch-none"
        style={{ aspectRatio: '4 / 3' }}
      />

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white border-2 border-black/10 px-4 py-2.5 text-sm font-bold text-black/60 active:scale-95 transition"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasDrawn || saving}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#4FAE5A] px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save my drawing'}
        </button>
      </div>

      {savedUrl && !hasDrawn && (
        <p className="mt-2 text-xs font-semibold text-[#4FAE5A]">✓ Drawing saved to this lesson!</p>
      )}
    </div>
  );
}