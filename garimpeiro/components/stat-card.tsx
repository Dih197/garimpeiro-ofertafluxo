"use client";

import { useEffect, useState, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "shopee" | "emerald" | "indigo" | "amber" | "rose";
  sparkline?: number[];
  onClick?: () => void;
};

const ACCENT = {
  shopee: { bg: "bg-shopee/10", text: "text-shopee", ring: "ring-shopee/20", spark: "#ee4d2d", glow: "shadow-shopee/10" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20", spark: "#34d399", glow: "shadow-emerald-500/10" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", ring: "ring-indigo-500/20", spark: "#818cf8", glow: "shadow-indigo-500/10" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20", spark: "#fbbf24", glow: "shadow-amber-500/10" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20", spark: "#f43f5e", glow: "shadow-rose-500/10" }
};

function MiniSparkline({ data, color, className }: { data: number[]; color: string; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 0.01);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pad = 2;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = [
    `${pad},${h - pad}`,
    ...points,
    `${w - pad},${h - pad}`
  ].join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (() => {
        const lastX = pad + ((data.length - 1) / (data.length - 1)) * innerW;
        const lastY = pad + innerH - ((data[data.length - 1] - min) / range) * innerH;
        return <circle cx={lastX} cy={lastY} r="2" fill={color} />;
      })()}
    </svg>
  );
}

function AnimatedValue({ value, className }: { value: string | number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setDisplayed(value);
    }
  }, [value]);

  return (
    <span className={cn("inline-block animate-count-up", className)} key={String(value)}>
      {displayed}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendValue,
  accent = "shopee",
  sparkline,
  onClick
}: StatCardProps) {
  const a = ACCENT[accent];
  const Element = onClick ? "button" : "div";

  return (
    <Element
      onClick={onClick}
      className={cn(
        "premium-card glass group rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] hover:shadow-[0_24px_60px_rgba(0,0,0,.2)]",
        onClick && "cursor-pointer",
        a.glow && `hover:${a.glow}`
      )}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
        e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
      }}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">{label}</div>
          <div className="text-2xl font-black tracking-[-0.035em] tabular-nums text-zinc-50">
            <AnimatedValue value={value} />
          </div>
          {hint && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              {trend === "up" && <span className="text-emerald-400">↑</span>}
              {trend === "down" && <span className="text-rose-400">↓</span>}
              <span className="truncate">{hint}</span>
              {trendValue && (
                <span className={cn(
                  "rounded-md px-1 py-0.5 text-[9px] font-bold",
                  trend === "up" ? "bg-emerald-500/15 text-emerald-400" : trend === "down" ? "bg-rose-500/15 text-rose-400" : "bg-zinc-800 text-zinc-400"
                )}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1 shadow-inner transition-all duration-300 group-hover:-rotate-3 group-hover:scale-110", a.bg, a.ring)}>
            <Icon className={cn("h-5 w-5", a.text)} strokeWidth={2} />
          </div>
          {sparkline && sparkline.length > 2 && (
            <MiniSparkline data={sparkline} color={a.spark} />
          )}
        </div>
      </div>
    </Element>
  );
}
