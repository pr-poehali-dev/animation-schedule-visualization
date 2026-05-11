import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// Station layout positions (% of scene width/height)
const STATIONS = [
  { id: "kitchen",  label: "Кухня",       icon: "🍳", x: 15,  y: 22, w: 18, h: 14, color: "#e8845d" },
  { id: "fries",    label: "Картофель",   icon: "🍟", x: 40,  y: 12, w: 16, h: 12, color: "#d4a017" },
  { id: "drinks",   label: "Напитки",     icon: "🥤", x: 65,  y: 18, w: 16, h: 12, color: "#5db8e8" },
  { id: "counter",  label: "Прилавок",    icon: "🏪", x: 12,  y: 58, w: 22, h: 10, color: "#e85d9a" },
  { id: "hall",     label: "Зал",         icon: "🪑", x: 50,  y: 52, w: 34, h: 20, color: "#7dc87a" },
];

// Worker definitions
const WORKER_DEFS = [
  { id: "w1", name: "Иван",   color: "#e8845d", hat: "👨‍🍳", station: "kitchen"  },
  { id: "w2", name: "Марина", color: "#ff9eb5", hat: "👩‍🍳", station: "kitchen"  },
  { id: "w3", name: "Катя",   color: "#d4a017", hat: "👩",   station: "fries"    },
  { id: "w4", name: "Дима",   color: "#5db8e8", hat: "🧑",   station: "drinks"   },
  { id: "w5", name: "Света",  color: "#e85d9a", hat: "👩‍💼", station: "counter"  },
  { id: "w6", name: "Коля",   color: "#9b7de8", hat: "🧑‍💼", station: "counter"  },
  { id: "w7", name: "Алекс",  color: "#7dc87a", hat: "🧑",   station: "hall"     },
  { id: "w8", name: "Настя",  color: "#e87d7d", hat: "👩",   station: "hall"     },
];

const PEOPLE_LOAD: Record<string, number[]> = {
  kitchen: [3,4,5,8,12,16,20,25,28,24,18,13,9,7,5,3],
  fries:   [2,3,4,7,11,15,18,22,25,21,16,11,8,6,4,2],
  drinks:  [4,5,6,9,14,18,22,28,30,26,20,15,10,8,6,4],
  counter: [5,6,7,10,15,20,25,32,35,30,22,16,12,9,7,5],
  hall:    [8,10,12,16,22,28,34,40,45,38,30,22,16,12,9,7],
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
type WorkerAnim = "idle" | "walk" | "work" | "carry";
type Dir = "left" | "right" | "up" | "down";

interface WorkerState {
  id: string;
  name: string;
  color: string;
  hat: string;
  x: number;   // % of scene
  y: number;
  tx: number;  // target
  ty: number;
  anim: WorkerAnim;
  dir: Dir;
  stationId: string;
  taskLabel: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function stationCenter(s: typeof STATIONS[0]) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

function initWorkers(): WorkerState[] {
  return WORKER_DEFS.map((wd) => {
    const st = STATIONS.find((s) => s.id === wd.station)!;
    const c = stationCenter(st);
    const jx = c.x + (Math.random() - 0.5) * 8;
    const jy = c.y + (Math.random() - 0.5) * 5;
    return {
      id: wd.id, name: wd.name, color: wd.color, hat: wd.hat,
      x: jx, y: jy, tx: jx, ty: jy,
      anim: "idle", dir: "down",
      stationId: wd.station, taskLabel: "",
    };
  });
}

const TASKS: Record<string, string[]> = {
  kitchen: ["🍔 Бургер", "🥩 Стейк", "🥪 Сэндвич", "🍗 Нагетсы"],
  fries:   ["🍟 Фри M", "🍟 Фри L", "🧂 Соус"],
  drinks:  ["🥤 Кола", "🧃 Сок", "☕ Кофе", "🥛 Шейк"],
  counter: ["💳 Оплата", "📦 Выдача", "🔄 Возврат"],
  hall:    ["🧹 Уборка", "🪑 Стол №3", "🪑 Стол №7", "👋 Встреча"],
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function Index() {
  const [day, setDay] = useState(4); // ПТ
  const [hour, setHour] = useState(5); // 12:00
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [workers, setWorkers] = useState<WorkerState[]>(initWorkers());
  const [orders, setOrders] = useState<{ id: number; sid: string; text: string }[]>([]);
  const [busySt, setBusySt] = useState<Record<string, boolean>>({});
  const [orderCount, setOrderCount] = useState(0);

  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const lastHourRef = useRef(0);
  const lastOrderRef = useRef(0);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const dayRef = useRef(day);
  dayRef.current = day;

  const timeStr = `${String(HOURS[hour]).padStart(2,"0")}:00`;
  const totalPeople = Object.values(PEOPLE_LOAD).reduce((s, arr) => s + (arr[hour] ?? 0), 0);
  const sliderPct = (hour / (HOURS.length - 1)) * 100;

  // ── Main game loop ──
  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (!playingRef.current) { lastTickRef.current = ts; return; }

    const dt = Math.min(ts - lastTickRef.current, 80);
    lastTickRef.current = ts;
    const spd = speedRef.current;

    // Move hour forward
    if (ts - lastHourRef.current > 2500 / spd) {
      lastHourRef.current = ts;
      const nh = hourRef.current + 1;
      if (nh >= HOURS.length) { dayRef.current = (dayRef.current + 1) % 7; setDay(dayRef.current); hourRef.current = 0; }
      else { hourRef.current = nh; }
      setHour(hourRef.current);
    }

    // Spawn orders
    if (ts - lastOrderRef.current > 900 / spd) {
      lastOrderRef.current = ts;
      const st = STATIONS[Math.floor(Math.random() * STATIONS.length)];
      const tasks = TASKS[st.id];
      const text = tasks[Math.floor(Math.random() * tasks.length)];
      const oid = Date.now();
      setOrders((prev) => [...prev.slice(-6), { id: oid, sid: st.id, text }]);
      setOrderCount((c) => c + 1);
      setBusySt((prev) => ({ ...prev, [st.id]: true }));
      setTimeout(() => setBusySt((prev) => ({ ...prev, [st.id]: false })), Math.max(400, 1200 / spd));
    }

    // Move workers
    setWorkers((prev) =>
      prev.map((w) => {
        const { x, y, tx, ty, anim } = w;
        let { dir } = w;
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.4) {
          // Reached target — decide next action
          const r = Math.random();
          let newAnim: WorkerAnim = "idle";
          let ntx = tx, nty = ty;

          if (r < 0.25 * spd) {
            // Walk to another station
            const dest = STATIONS[Math.floor(Math.random() * STATIONS.length)];
            const c = stationCenter(dest);
            ntx = c.x + (Math.random() - 0.5) * 10;
            nty = c.y + (Math.random() - 0.5) * 6;
            newAnim = "walk";
          } else if (r < 0.55) {
            // Work at current station
            const st = STATIONS.find((s) => s.id === w.stationId);
            if (st) {
              ntx = st.x + Math.random() * st.w;
              nty = st.y + Math.random() * st.h;
            }
            newAnim = "work";
          } else if (r < 0.65) {
            newAnim = "carry";
          } else {
            newAnim = "idle";
          }

          const ddx = ntx - x, ddy = nty - y;
          if (Math.abs(ddx) > Math.abs(ddy)) dir = ddx > 0 ? "right" : "left";
          else dir = ddy > 0 ? "down" : "up";

          const taskList = TASKS[w.stationId] ?? [];
          const taskLabel = newAnim === "work" || newAnim === "carry"
            ? taskList[Math.floor(Math.random() * taskList.length)] ?? ""
            : "";

          return { ...w, tx: ntx, ty: nty, anim: newAnim, dir, taskLabel };
        }

        // Interpolate toward target
        const step = (dt / 1000) * 12 * spd;
        const nx = x + (dx / dist) * Math.min(step, dist);
        const ny = y + (dy / dist) * Math.min(step, dist);

        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
        else dir = dy > 0 ? "down" : "up";

        return { ...w, x: nx, y: ny, dir, anim: dist > 0.5 ? "walk" : w.anim };
      })
    );
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const reset = () => {
    setPlaying(false); setDay(4); setHour(5);
    setWorkers(initWorkers()); setOrders([]); setOrderCount(0); setBusySt({});
  };

  // ── Render worker sprite ──
  const renderWorker = (w: WorkerState) => {
    const isWalk = w.anim === "walk";
    const isWork = w.anim === "work";
    const isCarry = w.anim === "carry";
    const flip = w.dir === "left" ? "scaleX(-1)" : "scaleX(1)";

    return (
      <div key={w.id}
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          left: `${w.x}%`,
          top: `${w.y}%`,
          transform: "translate(-50%, -100%)",
          zIndex: Math.round(w.y * 10),
          transition: "left 0.1s linear, top 0.1s linear",
        }}>

        {/* Task bubble */}
        {(isWork || isCarry) && w.taskLabel && (
          <div className="mb-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap shadow-md"
            style={{
              background: "#fff",
              color: "#333",
              border: `1.5px solid ${w.color}`,
              animation: "pop-in 0.2s ease-out",
            }}>
            {w.taskLabel}
          </div>
        )}

        {/* Body */}
        <div style={{ position: "relative", transform: flip }}>
          {/* Shadow */}
          <div style={{
            position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)",
            width: 18, height: 5, borderRadius: "50%",
            background: "rgba(0,0,0,0.15)",
          }} />

          {/* Legs — walking animation */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 3,
            marginBottom: 1, height: 10,
          }}>
            <div style={{
              width: 5, height: 10, borderRadius: 3,
              background: "#6b5c4a",
              transformOrigin: "top center",
              animation: isWalk ? `leg-l ${0.45 / Math.max(1, speedRef.current * 0.5)}s ease-in-out infinite` : "none",
            }} />
            <div style={{
              width: 5, height: 10, borderRadius: 3,
              background: "#6b5c4a",
              transformOrigin: "top center",
              animation: isWalk ? `leg-r ${0.45 / Math.max(1, speedRef.current * 0.5)}s ease-in-out infinite` : "none",
            }} />
          </div>

          {/* Body */}
          <div style={{
            width: 20, height: 16, borderRadius: "6px 6px 4px 4px",
            background: w.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: isWork ? "work-bob 0.5s ease-in-out infinite" : isCarry ? "carry-sway 0.8s ease-in-out infinite" : "none",
            boxShadow: `0 2px 6px ${w.color}55`,
          }}>
            {isCarry && <span style={{ fontSize: 8 }}>📦</span>}
          </div>

          {/* Head */}
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "#f5c9a0",
            margin: "-2px auto 0",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${w.color}`,
            fontSize: 10,
            animation: isWalk ? "head-bob 0.45s ease-in-out infinite" : "none",
          }}>
            {w.hat === "👨‍🍳" || w.hat === "👩‍🍳" ? "👨‍🍳" : ""}
          </div>

          {/* Hat / name */}
          <div style={{
            position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
            background: w.color,
            borderRadius: 4,
            padding: "1px 4px",
            fontSize: 7,
            color: "#fff",
            fontWeight: 800,
            whiteSpace: "nowrap",
            fontFamily: "'Golos Text', sans-serif",
          }}>
            {w.name}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #faeee6 0%, #f5e0d0 55%, #efd5c0 100%)", fontFamily: "'Golos Text', sans-serif" }}>

      {/* ── TOP BAR ── */}
      <header className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          {[1,0.7,0.45].map((op, i) => (
            <div key={i} className="rounded-full" style={{ width: 12, height: 12, background: "#e85d44", opacity: op }} />
          ))}
        </div>

        {/* Center: time + day */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-white"
            style={{ background: "#e85d44", fontFamily: "'Unbounded', sans-serif", fontSize: 15, boxShadow: "0 4px 14px rgba(232,93,68,0.4)" }}>
            <Icon name="Clock" size={14} />
            {timeStr}
          </div>
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => setDay(i)}
              className="w-8 h-8 rounded-full text-[9px] font-black transition-all"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                background: day === i ? "#e85d44" : "rgba(232,93,68,0.1)",
                color: day === i ? "#fff" : "#e85d44",
                border: `1.5px solid ${day === i ? "#e85d44" : "rgba(232,93,68,0.25)"}`,
              }}>
              {d}
            </button>
          ))}
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full text-xs font-black"
            style={{ border: "2px solid #e85d44", color: "#e85d44", fontFamily: "'Unbounded', sans-serif" }}>
            👥 {totalPeople} чел.
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-black"
            style={{ border: "2px solid #e85d44", color: "#e85d44", fontFamily: "'Unbounded', sans-serif" }}>
            📋 {orderCount}
          </div>
        </div>
      </header>

      {/* ── GAME SCENE ── */}
      <div className="flex-1 relative mx-4 mb-2 rounded-3xl overflow-hidden"
        style={{
          background: "#f0e8dc",
          boxShadow: "inset 0 2px 20px rgba(180,120,80,0.12), 0 4px 30px rgba(180,120,80,0.15)",
          border: "2px solid rgba(200,150,110,0.3)",
          minHeight: 380,
        }}>

        {/* Floor tiles pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(200,170,140,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,170,140,0.15) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        {/* Floor area labels */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Walls */}
          <div className="absolute top-0 left-0 right-0 h-3 rounded-t-3xl"
            style={{ background: "rgba(160,120,80,0.2)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-3 rounded-b-3xl"
            style={{ background: "rgba(160,120,80,0.15)" }} />
        </div>

        {/* ── STATIONS ── */}
        {STATIONS.map((st) => {
          const load = PEOPLE_LOAD[st.id]?.[hour] ?? 0;
          const maxLoad = Math.max(...(PEOPLE_LOAD[st.id] ?? [1]));
          const isBusy = busySt[st.id];

          return (
            <div key={st.id}
              className="absolute rounded-2xl flex flex-col items-center justify-center transition-all duration-300"
              style={{
                left: `${st.x}%`, top: `${st.y}%`,
                width: `${st.w}%`, height: `${st.h}%`,
                background: `${st.color}22`,
                border: `2.5px solid ${st.color}${isBusy ? "cc" : "60"}`,
                boxShadow: isBusy
                  ? `0 0 20px ${st.color}55, inset 0 0 15px ${st.color}18`
                  : `0 2px 12px ${st.color}20`,
                transform: isBusy ? "scale(1.02)" : "scale(1)",
              }}>

              {/* Load bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-xl overflow-hidden"
                style={{ background: "rgba(0,0,0,0.08)" }}>
                <div className="h-full rounded-xl transition-all duration-500"
                  style={{ width: `${(load / maxLoad) * 100}%`, background: st.color }} />
              </div>

              <span style={{ fontSize: 20 }}>{st.icon}</span>
              <span className="font-black text-[10px] mt-0.5 text-center"
                style={{ color: st.color, fontFamily: "'Unbounded', sans-serif" }}>
                {st.label}
              </span>
              <span className="text-[9px] font-bold"
                style={{ color: `${st.color}bb`, fontFamily: "'Golos Text', sans-serif" }}>
                {load} чел.
              </span>

              {/* Busy indicator */}
              {isBusy && (
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full"
                  style={{ background: st.color, boxShadow: `0 0 8px ${st.color}`, animation: "pop-in 0.2s ease-out" }} />
              )}
            </div>
          );
        })}

        {/* ── WORKERS ── */}
        {workers.map(renderWorker)}

        {/* ── ORDER FEED (top-right corner of scene) ── */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end" style={{ maxWidth: 140 }}>
          {orders.slice(-4).reverse().map((o) => {
            const st = STATIONS.find((s) => s.id === o.sid);
            return (
              <div key={o.id}
                className="px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shadow-sm"
                style={{
                  background: `${st?.color ?? "#e85d44"}22`,
                  border: `1px solid ${st?.color ?? "#e85d44"}55`,
                  color: st?.color ?? "#e85d44",
                  animation: "slide-in-r 0.25s ease-out",
                  fontFamily: "'Golos Text', sans-serif",
                }}>
                {o.text}
              </div>
            );
          })}
        </div>

        {/* Legend bottom-left */}
        <div className="absolute bottom-5 left-3 flex gap-2 flex-wrap">
          {[{ label: "Работает", color: "#7dc87a" }, { label: "Идёт", color: "#5db8e8" }, { label: "Несёт", color: "#e8845d" }].map((item) => (
            <div key={item.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span className="text-[9px] font-bold text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="px-8 pb-1 flex-shrink-0">
        <div className="relative h-7 flex items-center cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const r = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setHour(Math.round(r * (HOURS.length - 1)));
          }}>
          <div className="absolute left-0 right-0 h-2.5 rounded-full" style={{ background: "rgba(200,130,100,0.2)" }} />
          <div className="absolute left-0 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${sliderPct}%`, background: "linear-gradient(90deg, #e85d44, #ff9070)" }} />
          <div className="absolute w-5 h-5 rounded-full -translate-x-1/2 transition-all duration-300"
            style={{ left: `${sliderPct}%`, background: "#e85d44", border: "3px solid #fff", boxShadow: "0 2px 10px rgba(232,93,68,0.5)" }} />
        </div>
        <div className="flex justify-between mt-0.5">
          {HOURS.map((h, i) => (
            <span key={h} className="text-[8px] font-bold cursor-pointer"
              onClick={() => setHour(i)}
              style={{
                color: i === hour ? "#e85d44" : "rgba(180,90,60,0.4)",
                fontFamily: "'Golos Text', sans-serif",
              }}>
              {i % 2 === 0 ? `${String(h).padStart(2,"0")}` : "·"}
            </span>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="relative flex items-center justify-center gap-6 py-3 flex-shrink-0">
        <button onClick={() => setHour((h) => Math.max(0, h - 1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color: "#e85d44" }}>
          <Icon name="Rewind" size={34} />
        </button>

        <button onClick={() => setPlaying((p) => !p)}
          className="transition-all active:scale-90"
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#e85d44", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 20px rgba(232,93,68,0.45)",
          }}>
          <Icon name={playing ? "Pause" : "Play"} size={24} />
        </button>

        <button onClick={() => setHour((h) => Math.min(HOURS.length - 1, h + 1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color: "#e85d44" }}>
          <Icon name="FastForward" size={34} />
        </button>

        {/* Speed */}
        <div className="absolute left-8 flex items-center gap-1.5">
          <span className="text-[10px] font-bold mr-1" style={{ color: "#e85d44", fontFamily: "'Golos Text', sans-serif" }}>СКОРОСТЬ</span>
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => setSpeed(s)}
              className="w-9 h-8 rounded-full text-[10px] font-black transition-all"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                background: speed === s ? "#e85d44" : "rgba(232,93,68,0.1)",
                color: speed === s ? "#fff" : "#e85d44",
                border: `1.5px solid ${speed === s ? "#e85d44" : "rgba(232,93,68,0.3)"}`,
              }}>
              {s}x
            </button>
          ))}
        </div>

        {/* Reset */}
        <div className="absolute right-8 flex items-center gap-2">
          <button onClick={reset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
            style={{
              background: "rgba(232,93,68,0.1)",
              border: "1.5px solid rgba(232,93,68,0.3)",
              color: "#e85d44",
              fontFamily: "'Golos Text', sans-serif",
            }}>
            <Icon name="RotateCcw" size={13} />
            Сброс
          </button>
        </div>
      </div>

      {/* ── CSS KEYFRAMES ── */}
      <style>{`
        @keyframes leg-l {
          0%,100% { transform: rotate(-18deg); }
          50%      { transform: rotate(18deg); }
        }
        @keyframes leg-r {
          0%,100% { transform: rotate(18deg); }
          50%      { transform: rotate(-18deg); }
        }
        @keyframes head-bob {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        @keyframes work-bob {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-3px) rotate(4deg); }
        }
        @keyframes carry-sway {
          0%,100% { transform: rotate(-3deg); }
          50%      { transform: rotate(3deg); }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes slide-in-r {
          0%   { transform: translateX(20px); opacity: 0; }
          100% { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}