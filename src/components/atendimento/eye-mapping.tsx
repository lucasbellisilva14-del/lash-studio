"use client";

/**
 * Mapping visual: olho fechado em SVG dividido em 5 zonas (canto interno →
 * externo). Tocar numa zona a seleciona; o stepper −/+ ajusta o tamanho
 * (6–15mm) e os cílios desenhados crescem proporcionalmente.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { MAPPING_MAX_MM, MAPPING_MIN_MM, MAPPING_ZONES } from "@/lib/constants";
import { IconPlus } from "@/components/ui/icons";
import { IconMinus } from "./icons";

const ZONE_NAMES = ["Canto interno", "Interno", "Centro", "Externo", "Canto externo"];

const VB_W = 360;
const VB_H = 174;
const X0 = 30;
const X1 = 330;
const LID_Y = 40;
const LID_ARCH = 30;
const LASH_COUNT = 35;
const PX_PER_MM = 4.4;

/** Ponto na linha dos cílios (pálpebra fechada), t ∈ [0,1]. */
function lidPoint(t: number): [number, number] {
  const x = X0 + (X1 - X0) * t;
  const y = LID_Y + LID_ARCH * Math.sin(Math.PI * t);
  return [x, y];
}

/** Cílio como curva suave saindo da pálpebra, comprimento proporcional ao mm. */
function lashPath(t: number, mm: number): string {
  const [x, y] = lidPoint(t);
  const e = 0.004;
  const [xa, ya] = lidPoint(Math.max(0, t - e));
  const [xb, yb] = lidPoint(Math.min(1, t + e));
  let dx = xb - xa;
  let dy = yb - ya;
  const norm = Math.hypot(dx, dy) || 1;
  dx /= norm;
  dy /= norm;
  // normal apontando para baixo (cílios de olho fechado caem para baixo)
  const nx = -dy;
  const ny = dx;
  const len = mm * PX_PER_MM;
  const cx = x + nx * len * 0.55;
  const cy = y + ny * len * 0.55;
  const tipX = x + nx * len + dx * len * 0.2;
  const tipY = y + ny * len + dy * len * 0.2;
  return `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;
}

function samplePath(fn: (t: number) => [number, number], samples = 48): string {
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const [x, y] = fn(i / samples);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
}

const LID_PATH = samplePath(lidPoint);
const CREASE_PATH = samplePath((t) => {
  const x = X0 + 10 + (X1 - X0 - 20) * t;
  const y = LID_Y - 16 + LID_ARCH * 0.72 * Math.sin(Math.PI * t);
  return [x, y];
});

const clampMm = (v: number) =>
  Math.min(MAPPING_MAX_MM, Math.max(MAPPING_MIN_MM, Math.round(v)));

export function EyeMapping({
  zones,
  onChange,
}: {
  /** 5 tamanhos em mm, canto interno → externo. */
  zones: number[];
  onChange: (next: number[]) => void;
}) {
  const [selected, setSelected] = useState(2);
  const safeZones = useMemo(
    () => Array.from({ length: MAPPING_ZONES }, (_, i) => clampMm(zones[i] ?? 9)),
    [zones],
  );

  const lashes = useMemo(() => {
    const items: { d: string; zone: number; key: number }[] = [];
    for (let i = 0; i < LASH_COUNT; i++) {
      const t = 0.025 + (0.95 * i) / (LASH_COUNT - 1);
      const zone = Math.min(MAPPING_ZONES - 1, Math.floor(t * MAPPING_ZONES));
      items.push({ d: lashPath(t, safeZones[zone]), zone, key: i });
    }
    return items;
  }, [safeZones]);

  const zoneX = (z: number) => X0 + ((X1 - X0) * z) / MAPPING_ZONES;
  const zoneMidX = (z: number) => X0 + ((X1 - X0) * (z + 0.5)) / MAPPING_ZONES;

  function adjust(delta: number) {
    const next = safeZones.slice();
    next[selected] = clampMm(next[selected] + delta);
    onChange(next);
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto select-none touch-manipulation"
        aria-hidden="true"
      >
        {/* faixa de destaque da zona selecionada */}
        <rect
          x={zoneX(selected)}
          y={16}
          width={(X1 - X0) / MAPPING_ZONES}
          height={124}
          rx={14}
          fill="var(--accent)"
          opacity={0.08}
          style={{ transition: "x 0.2s ease" }}
        />

        {/* rótulos dos cantos */}
        <text x={X0} y={12} fontSize={10} fill="var(--ink-faint)" letterSpacing={0.4}>
          canto interno
        </text>
        <text x={X1} y={12} fontSize={10} fill="var(--ink-faint)" letterSpacing={0.4} textAnchor="end">
          canto externo
        </text>

        {/* divisórias sutis entre zonas */}
        {[1, 2, 3, 4].map((z) => (
          <line
            key={z}
            x1={zoneX(z)}
            y1={26}
            x2={zoneX(z)}
            y2={138}
            stroke="var(--line)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* vinco da pálpebra (detalhe) */}
        <path d={CREASE_PATH} fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />

        {/* cílios */}
        {lashes.map((lash) => {
          const isSelected = lash.zone === selected;
          return (
            <path
              key={lash.key}
              d={lash.d}
              fill="none"
              stroke={isSelected ? "var(--accent)" : "var(--ink)"}
              strokeWidth={isSelected ? 2.4 : 2}
              opacity={isSelected ? 1 : 0.5}
              strokeLinecap="round"
              style={{ d: `path("${lash.d}")`, transition: "d 0.18s ease, stroke 0.18s ease" } as CSSProperties}
            />
          );
        })}

        {/* linha da pálpebra fechada */}
        <path d={LID_PATH} fill="none" stroke="var(--ink)" strokeWidth={2.75} strokeLinecap="round" />

        {/* tamanhos por zona */}
        {safeZones.map((mm, z) => {
          const isSelected = z === selected;
          return (
            <g key={z}>
              {isSelected ? (
                <rect x={zoneMidX(z) - 19} y={146} width={38} height={22} rx={11} fill="var(--accent)" />
              ) : null}
              <text
                x={zoneMidX(z)}
                y={161}
                fontSize={13}
                fontWeight={600}
                textAnchor="middle"
                fill={isSelected ? "var(--accent-ink)" : "var(--ink-soft)"}
              >
                {mm}
              </text>
            </g>
          );
        })}

        {/* áreas de toque (por cima de tudo) */}
        {Array.from({ length: MAPPING_ZONES }, (_, z) => (
          <rect
            key={z}
            x={z === 0 ? 0 : zoneX(z)}
            y={0}
            width={z === 0 || z === MAPPING_ZONES - 1 ? (X1 - X0) / MAPPING_ZONES + X0 : (X1 - X0) / MAPPING_ZONES}
            height={VB_H}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => setSelected(z)}
          />
        ))}
      </svg>

      {/* stepper da zona selecionada */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={safeZones[selected] <= MAPPING_MIN_MM}
          aria-label="Diminuir tamanho"
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full border border-line bg-surface text-ink",
            "active:bg-surface-sunken transition-colors disabled:opacity-35",
          )}
        >
          <IconMinus />
        </button>
        <div className="text-center min-w-0">
          <p className="text-[13px] text-ink-soft">{ZONE_NAMES[selected]}</p>
          <p className="font-display text-2xl leading-7 font-semibold text-ink">
            {safeZones[selected]}
            <span className="text-sm font-sans font-medium text-ink-soft ml-1">mm</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={safeZones[selected] >= MAPPING_MAX_MM}
          aria-label="Aumentar tamanho"
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full border border-line bg-surface text-ink",
            "active:bg-surface-sunken transition-colors disabled:opacity-35",
          )}
        >
          <IconPlus />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">
        Toque em uma zona do olho para selecionar e ajuste o tamanho
      </p>
    </div>
  );
}
