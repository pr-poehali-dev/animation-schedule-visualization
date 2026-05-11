import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// Станции — позиции в % от размера сцены
const STATIONS = [
  { id: "kitchen", label: "Кухня",      emoji: "🍳", x: 8,  y: 8,  w: 22, h: 26, color: "#E07850", light: "#FFF0E8" },
  { id: "fries",   label: "Картофель",  emoji: "🍟", x: 38, y: 5,  w: 18, h: 22, color: "#C8A020", light: "#FFF8DC" },
  { id: "drinks",  label: "Напитки",    emoji: "🥤", x: 64, y: 8,  w: 20, h: 22, color: "#4A9CC8", light: "#E8F4FF" },
  { id: "counter", label: "Прилавок",   emoji: "🏪", x: 8,  y: 58, w: 26, h: 18, color: "#C060A0", light: "#FFE8F8" },
  { id: "hall",    label: "Зал",        emoji: "🪑", x: 44, y: 52, w: 42, h: 26, color: "#50A870", light: "#E8FFF0" },
];

const PEOPLE_LOAD: Record<string, number[]> = {
  kitchen: [3,4,5,8,12,16,20,25,28,24,18,13,9,7,5,3],
  fries:   [2,3,4,7,11,15,18,22,25,21,16,11,8,6,4,2],
  drinks:  [4,5,6,9,14,18,22,28,30,26,20,15,10,8,6,4],
  counter: [5,6,7,10,15,20,25,32,35,30,22,16,12,9,7,5],
  hall:    [8,10,12,16,22,28,34,40,45,38,30,22,16,12,9,7],
};

// Цвета одежды сотрудников
const WORKER_COLORS = [
  { body: "#E07850", skin: "#F4C08A", hair: "#3A2010" },
  { body: "#C060A0", skin: "#F9D4B0", hair: "#1A1A2E" },
  { body: "#4A9CC8", skin: "#F4C08A", hair: "#8B4513" },
  { body: "#50A870", skin: "#F0B090", hair: "#2C1810" },
  { body: "#9060C8", skin: "#F9D4B0", hair: "#1A1A1A" },
  { body: "#C84040", skin: "#F4C08A", hair: "#4A3020" },
  { body: "#50A8A8", skin: "#F0B090", hair: "#1A1A2E" },
  { body: "#C8A020", skin: "#F9D4B0", hair: "#2C1810" },
];

const WORKER_NAMES = ["Иван", "Марина", "Катя", "Дима", "Света", "Коля", "Алекс", "Настя"];

interface Worker {
  id: number;
  name: string;
  colors: typeof WORKER_COLORS[0];
  x: number; y: number;
  tx: number; ty: number;
  homeStation: string;
  walkPhase: number; // 0–1 for leg animation
  facing: "left" | "right";
  busy: boolean;
}

function randomInStation(st: typeof STATIONS[0]) {
  return {
    x: st.x + 2 + Math.random() * (st.w - 4),
    y: st.y + 3 + Math.random() * (st.h - 6),
  };
}

function initWorkers(): Worker[] {
  const stationAssign = ["kitchen","kitchen","fries","drinks","counter","counter","hall","hall"];
  return WORKER_NAMES.map((name, i) => {
    const sid = stationAssign[i];
    const st = STATIONS.find(s => s.id === sid)!;
    const pos = randomInStation(st);
    return {
      id: i, name, colors: WORKER_COLORS[i],
      x: pos.x, y: pos.y, tx: pos.x, ty: pos.y,
      homeStation: sid, walkPhase: Math.random(),
      facing: "right", busy: false,
    };
  });
}

// SVG worker sprite — вид сверху/3/4, стильный
function WorkerSprite({ w, scale = 1 }: { w: Worker; scale?: number }) {
  const c = w.colors;
  const isWalking = Math.abs(w.tx - w.x) + Math.abs(w.ty - w.y) > 0.8;
  const phase = w.walkPhase;
  const legSwing = isWalking ? Math.sin(phase * Math.PI * 2) * 5 : 0;
  const flip = w.facing === "left" ? -1 : 1;

  return (
    <svg width={28 * scale} height={42 * scale} viewBox="0 0 28 42"
      style={{ overflow: "visible", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.18))" }}>
      {/* Shadow */}
      <ellipse cx={14} cy={40} rx={8} ry={3} fill="rgba(0,0,0,0.15)" />

      {/* Legs */}
      <g transform={`translate(14,28)`}>
        <rect x={-6 * flip} y={legSwing > 0 ? 0 : -2}
          width={5} height={12} rx={2.5}
          fill={c.body} opacity={0.85}
          transform={`rotate(${-legSwing * flip},0,0)`} />
        <rect x={1 * flip} y={legSwing < 0 ? 0 : -2}
          width={5} height={12} rx={2.5}
          fill={c.body} opacity={0.75}
          transform={`rotate(${legSwing * flip},0,0)`} />
        {/* Shoes */}
        <ellipse cx={-3 * flip} cy={12 + (legSwing > 0 ? 0 : -2)} rx={4} ry={2.5} fill="#3A2A1A" opacity={0.9}
          transform={`rotate(${-legSwing * flip},0,0)`} />
        <ellipse cx={4 * flip} cy={12 + (legSwing < 0 ? 0 : -2)} rx={4} ry={2.5} fill="#3A2A1A" opacity={0.7}
          transform={`rotate(${legSwing * flip},0,0)`} />
      </g>

      {/* Body */}
      <rect x={5} y={14} width={18} height={16} rx={5}
        fill={c.body}
        style={{ filter: `drop-shadow(0 1px 2px ${c.body}88)` }} />

      {/* Collar / uniform detail */}
      <rect x={11} y={14} width={6} height={7} rx={2} fill="white" opacity={0.5} />

      {/* Arms */}
      <rect x={1} y={16} width={5} height={9} rx={2.5} fill={c.body} opacity={0.8}
        transform={`rotate(${isWalking ? legSwing * 0.5 * flip : 8 * flip},3,16)`} />
      <rect x={22} y={16} width={5} height={9} rx={2.5} fill={c.body} opacity={0.7}
        transform={`rotate(${isWalking ? -legSwing * 0.5 * flip : -8 * flip},25,16)`} />

      {/* Neck */}
      <rect x={11} y={10} width={6} height={5} rx={3} fill={c.skin} />

      {/* Head */}
      <ellipse cx={14} cy={8} rx={8} ry={8} fill={c.skin} />

      {/* Hair */}
      <path d={`M6,6 Q14,-4 22,6`} fill={c.hair} stroke={c.hair} strokeWidth={1} />
      <ellipse cx={14} cy={2} rx={7} ry={4} fill={c.hair} />

      {/* Eyes */}
      <ellipse cx={10.5} cy={8} rx={1.5} ry={1.8} fill="#1A1A2E" />
      <ellipse cx={17.5} cy={8} rx={1.5} ry={1.8} fill="#1A1A2E" />
      <ellipse cx={10.9} cy={7.5} rx={0.5} ry={0.5} fill="white" />
      <ellipse cx={17.9} cy={7.5} rx={0.5} ry={0.5} fill="white" />

      {/* Smile */}
      <path d="M11,11 Q14,13.5 17,11" stroke="#8B4513" strokeWidth={1} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Index() {
  const [day, setDay] = useState(4);
  const [hour, setHour] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [workers, setWorkers] = useState<Worker[]>(initWorkers());
  const [busySt, setBusySt] = useState<Record<string, boolean>>({});
  const [orderCount, setOrderCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<{id:number;sid:string;text:string}[]>([]);

  const rafRef = useRef<number>(0);
  const lastTs = useRef(0);
  const accHour = useRef(0);
  const accOrder = useRef(0);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const dayRef = useRef(day);
  dayRef.current = day;

  const timeStr = `${String(HOURS[hour]).padStart(2,"0")}:00`;
  const totalPeople = Object.values(PEOPLE_LOAD).reduce((s, arr) => s + (arr[hour] ?? 0), 0);
  const sliderPct = (hour / (HOURS.length - 1)) * 100;

  const TASKS: Record<string,string[]> = {
    kitchen: ["🍔 Бургер","🥩 Стейк","🥪 Сэндвич","🍗 Нагетсы"],
    fries:   ["🍟 Фри M","🍟 Фри L","🧂 Соус"],
    drinks:  ["🥤 Кола","🧃 Сок","☕ Кофе"],
    counter: ["💳 Оплата","📦 Выдача","🔄 Возврат"],
    hall:    ["🧹 Уборка","🪑 Стол №3","🪑 Стол №7"],
  };

  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (!playingRef.current) { lastTs.current = ts; return; }

    const dt = Math.min(ts - lastTs.current, 60);
    lastTs.current = ts;
    const spd = speedRef.current;

    // Hour advance
    accHour.current += dt;
    if (accHour.current > 2200 / spd) {
      accHour.current = 0;
      let nh = hourRef.current + 1;
      if (nh >= HOURS.length) { nh = 0; dayRef.current = (dayRef.current + 1) % 7; setDay(dayRef.current); }
      hourRef.current = nh;
      setHour(nh);
    }

    // Order spawn
    accOrder.current += dt;
    if (accOrder.current > 850 / spd) {
      accOrder.current = 0;
      const st = STATIONS[Math.floor(Math.random() * STATIONS.length)];
      const tasks = TASKS[st.id];
      const text = tasks[Math.floor(Math.random() * tasks.length)];
      const oid = Date.now() + Math.random();
      setRecentOrders(prev => [...prev.slice(-5), { id: oid, sid: st.id, text }]);
      setOrderCount(c => c + 1);
      setBusySt(prev => ({ ...prev, [st.id]: true }));
      const t = setTimeout(() => setBusySt(prev => ({ ...prev, [st.id]: false })), Math.max(350, 1100 / spd));
      void t;
    }

    // Move workers
    setWorkers(prev => prev.map(w => {
      const dx = w.tx - w.x;
      const dy = w.ty - w.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      let { x, y, tx, ty, walkPhase, facing, busy } = w;

      if (dist < 0.3) {
        // Pick new target
        const r = Math.random() * 1000;
        if (r < 30 * spd) {
          // Walk to random station
          const dest = STATIONS[Math.floor(Math.random() * STATIONS.length)];
          const pos = randomInStation(dest);
          tx = pos.x; ty = pos.y;
        } else if (r < 80) {
          // Wander within home station
          const home = STATIONS.find(s => s.id === w.homeStation) ?? STATIONS[0];
          const pos = randomInStation(home);
          tx = pos.x; ty = pos.y;
        }
        busy = r < 150;
        walkPhase = (walkPhase + 0.02 * spd) % 1;
      } else {
        // Move toward target
        const step = (dt / 1000) * 10 * spd;
        x = x + (dx / dist) * Math.min(step, dist);
        y = y + (dy / dist) * Math.min(step, dist);
        facing = dx > 0 ? "right" : "left";
        walkPhase = (walkPhase + dt * 0.006 * spd) % 1;
      }

      return { ...w, x, y, tx, ty, walkPhase, facing, busy };
    }));
  }, []); // eslint-disable-line

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const reset = () => {
    setPlaying(false); setDay(4); setHour(5);
    setWorkers(initWorkers()); setOrderCount(0); setRecentOrders([]); setBusySt({});
    accHour.current = 0; accOrder.current = 0;
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg,#FDF0E8 0%,#F8E4D0 60%,#F0D8C0 100%)", fontFamily: "'Golos Text',sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        {/* Logo */}
        <div className="flex gap-1.5">
          {[1, 0.65, 0.35].map((op, i) => (
            <div key={i} style={{ width:11, height:11, borderRadius:"50%", background:"#E07850", opacity:op }} />
          ))}
        </div>

        {/* Clock badge */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-white"
          style={{ background:"#E07850", fontFamily:"'Unbounded',sans-serif", fontSize:16, boxShadow:"0 4px 16px #E0785066" }}>
          <Icon name="Clock" size={15} />
          {timeStr}
        </div>

        {/* Days */}
        <div className="flex gap-1">
          {DAYS.map((d,i) => (
            <button key={d} onClick={() => setDay(i)}
              className="w-8 h-8 rounded-xl text-[9px] font-black transition-all"
              style={{
                fontFamily:"'Unbounded',sans-serif",
                background: day===i ? "#E07850" : "rgba(224,120,80,0.1)",
                color: day===i ? "#fff" : "#E07850",
                border:`1.5px solid ${day===i ? "#E07850" : "rgba(224,120,80,0.25)"}`,
              }}>
              {d}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          {[{icon:"👥", val:`${totalPeople} чел.`},{icon:"📋", val:`${orderCount}`}].map(item => (
            <div key={item.icon} className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1"
              style={{ border:"2px solid #E07850", color:"#E07850", fontFamily:"'Unbounded',sans-serif", background:"rgba(224,120,80,0.05)" }}>
              {item.icon} {item.val}
            </div>
          ))}
        </div>
      </header>

      {/* ── SCENE ── */}
      <div className="flex-1 relative mx-4 mb-2 rounded-3xl overflow-hidden"
        style={{
          minHeight: 400,
          background: "#F5EDE0",
          boxShadow: "inset 0 0 60px rgba(180,120,80,0.08), 0 4px 30px rgba(160,100,60,0.12)",
          border: "2px solid rgba(210,170,130,0.35)",
        }}>

        {/* Floor texture — warm parquet lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="parquet" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
              <rect width="60" height="30" fill="none" />
              <line x1="0" y1="15" x2="60" y2="15" stroke="rgba(180,140,100,0.12)" strokeWidth="1" />
              <line x1="30" y1="0" x2="30" y2="15" stroke="rgba(180,140,100,0.08)" strokeWidth="1" />
              <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(180,140,100,0.1)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#parquet)" />
        </svg>

        {/* ── STATION ZONES ── */}
        {STATIONS.map(st => {
          const load = PEOPLE_LOAD[st.id]?.[hour] ?? 0;
          const maxLoad = Math.max(...(PEOPLE_LOAD[st.id] ?? [1]));
          const busy = busySt[st.id];
          const pct = load / maxLoad;

          return (
            <div key={st.id}
              className="absolute flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                left:`${st.x}%`, top:`${st.y}%`,
                width:`${st.w}%`, height:`${st.h}%`,
                background: busy
                  ? `linear-gradient(135deg, ${st.light}, ${st.color}30)`
                  : `linear-gradient(135deg, ${st.light}ee, ${st.color}18)`,
                border:`2px solid ${busy ? st.color+"bb" : st.color+"44"}`,
                boxShadow: busy ? `0 0 22px ${st.color}40` : `0 2px 10px ${st.color}18`,
                transform: busy ? "scale(1.015)" : "scale(1)",
              }}>

              {/* Inner shadow top */}
              <div className="absolute inset-x-0 top-0 h-3 rounded-t-2xl"
                style={{ background:`linear-gradient(${st.color}20, transparent)` }} />

              {/* Header row */}
              <div className="flex items-center gap-1.5 px-2.5 pt-2">
                <span style={{ fontSize:16 }}>{st.emoji}</span>
                <span className="font-black text-[10px] leading-none"
                  style={{ color:st.color, fontFamily:"'Unbounded',sans-serif" }}>
                  {st.label}
                </span>
                {busy && (
                  <div className="ml-auto w-2 h-2 rounded-full"
                    style={{ background:st.color, boxShadow:`0 0 6px ${st.color}`, animation:"pulse-dot 0.8s ease-in-out infinite" }} />
                )}
              </div>

              {/* Load bar */}
              <div className="mx-2.5 mt-auto mb-2 h-1.5 rounded-full overflow-hidden"
                style={{ background:`${st.color}20` }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${pct*100}%`, background:`linear-gradient(90deg, ${st.color}aa, ${st.color})` }} />
              </div>

              {/* People count */}
              <div className="absolute bottom-2 right-2.5 text-[9px] font-bold"
                style={{ color:`${st.color}99`, fontFamily:"'Golos Text',sans-serif" }}>
                {load} чел.
              </div>
            </div>
          );
        })}

        {/* ── WORKERS ── */}
        {workers.map(w => (
          <div key={w.id}
            className="absolute pointer-events-none"
            style={{
              left:`${w.x}%`, top:`${w.y}%`,
              transform:`translate(-50%,-100%) scaleX(${w.facing==="left"?-1:1})`,
              zIndex: Math.round(w.y * 10 + 50),
              transition:"left 0.08s linear, top 0.08s linear",
            }}>
            <WorkerSprite w={w} />
            {/* Name tag */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[7px] font-bold whitespace-nowrap"
              style={{
                background: w.colors.body,
                color:"#fff",
                fontFamily:"'Golos Text',sans-serif",
                boxShadow:`0 1px 4px ${w.colors.body}66`,
              }}>
              {w.name}
            </div>
          </div>
        ))}

        {/* ── ORDER FEED ── */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          {recentOrders.slice(-4).reverse().map(o => {
            const st = STATIONS.find(s => s.id === o.sid);
            return (
              <div key={o.id}
                className="px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shadow-sm"
                style={{
                  background:`${st?.color ?? "#E07850"}18`,
                  border:`1.5px solid ${st?.color ?? "#E07850"}44`,
                  color: st?.color ?? "#E07850",
                  fontFamily:"'Golos Text',sans-serif",
                  animation:"slide-r 0.25s ease-out",
                }}>
                {o.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="px-8 pb-1 flex-shrink-0">
        <div className="relative h-6 flex items-center cursor-pointer"
          onClick={e => {
            const r = Math.min(1, Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width));
            setHour(Math.round(r * (HOURS.length - 1)));
          }}>
          <div className="absolute inset-x-0 h-2.5 rounded-full" style={{ background:"rgba(200,140,100,0.2)" }} />
          <div className="absolute left-0 h-2.5 rounded-full transition-all duration-300"
            style={{ width:`${sliderPct}%`, background:"linear-gradient(90deg,#E07850,#F09070)" }} />
          <div className="absolute w-5 h-5 rounded-full -translate-x-1/2 transition-all duration-300"
            style={{ left:`${sliderPct}%`, background:"#E07850", border:"3px solid #fff", boxShadow:"0 2px 10px #E0785055" }} />
        </div>
        <div className="flex justify-between mt-0.5">
          {HOURS.map((h,i) => (
            <button key={h} onClick={() => setHour(i)}
              className="text-[8px] font-bold w-5 text-center"
              style={{ color: i===hour ? "#E07850" : "rgba(180,100,60,0.4)", fontFamily:"'Golos Text',sans-serif" }}>
              {i%2===0 ? String(h).padStart(2,"0") : "·"}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="relative flex items-center justify-center gap-6 pt-1 pb-5 flex-shrink-0">
        <button onClick={() => setHour(h => Math.max(0, h-1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color:"#E07850" }}>
          <Icon name="Rewind" size={30} />
        </button>

        <button onClick={() => setPlaying(p => !p)}
          className="transition-all active:scale-90"
          style={{
            width:52, height:52, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            background:"#E07850", color:"#fff", boxShadow:"0 6px 20px #E0785055",
          }}>
          <Icon name={playing ? "Pause" : "Play"} size={22} />
        </button>

        <button onClick={() => setHour(h => Math.min(HOURS.length-1, h+1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color:"#E07850" }}>
          <Icon name="FastForward" size={30} />
        </button>

        {/* Speed — left */}
        <div className="absolute left-6 flex items-center gap-1.5">
          <span className="text-[9px] font-bold mr-0.5" style={{ color:"rgba(224,120,80,0.6)", fontFamily:"'Golos Text',sans-serif" }}>СКОРОСТЬ</span>
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className="w-9 h-8 rounded-xl font-black text-[10px] transition-all"
              style={{
                fontFamily:"'Unbounded',sans-serif",
                background: speed===s ? "#E07850" : "rgba(224,120,80,0.1)",
                color: speed===s ? "#fff" : "#E07850",
                border:`1.5px solid ${speed===s ? "#E07850" : "rgba(224,120,80,0.3)"}`,
              }}>
              {s}x
            </button>
          ))}
        </div>

        {/* Reset — right */}
        <button onClick={reset}
          className="absolute right-6 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background:"rgba(224,120,80,0.1)", border:"1.5px solid rgba(224,120,80,0.3)", color:"#E07850", fontFamily:"'Golos Text',sans-serif" }}>
          <Icon name="RotateCcw" size={13} />
          Сброс
        </button>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(1.4); }
        }
        @keyframes slide-r {
          from { opacity:0; transform:translateX(12px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>
    </div>
  );
}
