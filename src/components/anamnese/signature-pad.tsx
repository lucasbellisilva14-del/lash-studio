"use client";

/**
 * Canvas de assinatura touch: caneta suave (curvas quadráticas entre pontos
 * médios), botão limpar e export em PNG via toBlob. O PNG exportado ganha
 * fundo branco (papel do documento) para ficar legível fora do app.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

export function SignaturePad({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const drawingRef = useRef(false);
  const prevRef = useRef<Point | null>(null);
  const midRef = useRef<Point | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Cor do traço acompanha o token text-ink aplicado no canvas.
    const inkColor = getComputedStyle(canvas).color;
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctxRef.current = ctx;
  }, []);

  function pointFrom(e: PointerEvent<HTMLCanvasElement>): Point | null {
    const rect = rectRef.current;
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDown(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // pointer já encerrado/sintético — seguir sem captura
    }
    rectRef.current = canvas.getBoundingClientRect();
    const p = pointFrom(e);
    if (!p) return;
    drawingRef.current = true;
    prevRef.current = p;
    midRef.current = p;
    // Toque sem arrastar ainda marca um ponto (pingo do "i", acento...).
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    setEmpty(false);
  }

  function handleMove(e: PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxRef.current;
    const prev = prevRef.current;
    const mid = midRef.current;
    if (!drawingRef.current || !ctx || !prev || !mid) return;
    const p = pointFrom(e);
    if (!p) return;
    const nextMid = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(mid.x, mid.y);
    ctx.quadraticCurveTo(prev.x, prev.y, nextMid.x, nextMid.y);
    ctx.stroke();
    prevRef.current = p;
    midRef.current = nextMid;
  }

  function handleUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    prevRef.current = null;
    midRef.current = null;
    exportBlob();
  }

  function exportBlob() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; // fundo do documento exportado, não é cor de UI
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    out.toBlob((blob) => onChange(blob), "image/png");
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    prevRef.current = null;
    midRef.current = null;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <canvas
          ref={canvasRef}
          className="block w-full h-44 touch-none text-ink"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        />
        {/* Linha-guia e dica — fora do canvas, não entram no PNG. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-t border-dashed border-line" />
        {empty ? (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-ink-faint">
            Assine aqui com o dedo
          </p>
        ) : null}
      </div>
      {!empty ? (
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Limpar assinatura
          </Button>
        </div>
      ) : null}
    </div>
  );
}
