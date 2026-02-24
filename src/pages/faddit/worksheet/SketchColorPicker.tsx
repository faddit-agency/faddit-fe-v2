import React, { useCallback, useEffect, useRef, useState } from 'react';

interface HSB {
  h: number;
  s: number;
  b: number;
}

function hsbToHex(h: number, s: number, b: number): string {
  const ss = s / 100;
  const bb = b / 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => bb * (1 - ss * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const bv = Math.round(f(1) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

function hexToHsb(hex: string): HSB {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { h: 0, s: 0, b: 100 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const bv = Math.round(max * 100);
  return { h, s, b: bv };
}

interface SketchColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  label: string;
}

export default function SketchColorPicker({ color, onChange, label }: SketchColorPickerProps) {
  const [hsb, setHsb] = useState<HSB>(() => hexToHsb(color));
  const [hexInput, setHexInput] = useState(color);
  const sbRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSB = useRef(false);
  const draggingHue = useRef(false);

  useEffect(() => {
    const parsed = hexToHsb(color);
    setHsb(parsed);
    setHexInput(color);
  }, [color]);

  const emitColor = useCallback(
    (newHsb: HSB) => {
      const hex = hsbToHex(newHsb.h, newHsb.s, newHsb.b);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange],
  );

  const handleSBMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingSB.current || !sbRef.current) return;
      const rect = sbRef.current.getBoundingClientRect();
      const s = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const b = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
      const newHsb = { ...hsb, s, b };
      setHsb(newHsb);
      emitColor(newHsb);
    },
    [hsb, emitColor],
  );

  const handleHueMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingHue.current || !hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
      const newHsb = { ...hsb, h };
      setHsb(newHsb);
      emitColor(newHsb);
    },
    [hsb, emitColor],
  );

  const stopDrag = useCallback(() => {
    draggingSB.current = false;
    draggingHue.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleSBMouseMove);
    window.addEventListener('mousemove', handleHueMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleSBMouseMove);
      window.removeEventListener('mousemove', handleHueMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [handleSBMouseMove, handleHueMouseMove, stopDrag]);

  const handleSBDown = (e: React.MouseEvent) => {
    draggingSB.current = true;
    handleSBMouseMove(e.nativeEvent);
  };

  const handleHueDown = (e: React.MouseEvent) => {
    draggingHue.current = true;
    handleHueMouseMove(e.nativeEvent);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const parsed = hexToHsb(val);
      setHsb(parsed);
      onChange(val);
    }
  };

  const sbThumbX = `${hsb.s}%`;
  const sbThumbY = `${100 - hsb.b}%`;
  const hueThumbX = `${(hsb.h / 360) * 100}%`;

  return (
    <div className='flex flex-col gap-2 p-2'>
      <p className='text-[11px] font-medium text-gray-500'>{label}</p>

      <div
        ref={sbRef}
        className='relative h-32 w-full cursor-crosshair rounded-md'
        style={{
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1)),
            linear-gradient(to right, #fff, hsl(${hsb.h}, 100%, 50%))
          `,
        }}
        onMouseDown={handleSBDown}
      >
        <div
          className='pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow'
          style={{ left: sbThumbX, top: sbThumbY }}
        />
      </div>

      <div
        ref={hueRef}
        className='relative h-3 w-full cursor-pointer rounded-full'
        style={{
          background:
            'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        }}
        onMouseDown={handleHueDown}
      >
        <div
          className='pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow'
          style={{ left: hueThumbX }}
        />
      </div>

      <div className='flex items-center gap-2'>
        <div
          className='h-6 w-6 shrink-0 rounded border border-gray-200'
          style={{ background: hsbToHex(hsb.h, hsb.s, hsb.b) }}
        />
        <input
          type='text'
          value={hexInput}
          onChange={handleHexChange}
          className='flex-1 rounded border border-gray-200 px-2 py-0.5 font-mono text-xs uppercase focus:ring-1 focus:ring-gray-400 focus:outline-none'
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
