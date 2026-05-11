import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// Станции — расположены как план ресторана: кухня сзади, зал спереди
const STATIONS = [
  { id: "kitchen", label: "Кухня",     emoji: "🍳", x: 2,  y: 5,  w: 28, h: 30, color: "#D4693A", light: "#FFF2EA" },
  { id: "fries",   label: "Картофель", emoji: "🍟", x: 34, y: 5,  w: 20, h: 22, color: "#B8900A", light: "#FFFBEA" },
  { id: "drinks",  label: "Напитки",   emoji: "🥤", x: 58, y: 5,  w: 20, h: 22, color: "#2E86C8", light: "#EAF4FF" },
  { id: "counter", label: "Прилавок",  emoji: "🏪", x: 82, y: 5,  w: 16, h: 50, color: "#A040A0", light: "#F8E8FF" },
  { id: "hall",    label: "Зал",       emoji: "🪑", x: 2,  y: 58, w: 76, h: 36, color: "#2E8A50", light: "#EAFFF2" },
];

const PEOPLE_LOAD: Record<string, number[]> = {
  kitchen: [3,4,5,8,12,16,20,25,28,24,18,13,9,7,5,3],
  fries:   [2,3,4,7,11,15,18,22,25,21,16,11,8,6,4,2],
  drinks:  [4,5,6,9,14,18,22,28,30,26,20,15,10,8,6,4],
  counter: [5,6,7,10,15,20,25,32,35,30,22,16,12,9,7,5],
  hall:    [8,10,12,16,22,28,34,40,45,38,30,22,16,12,9,7],
};

// Сотрудники с айдишниками
const WORKER_DEFS = [
  { id: "W-001", colors: { body:"#D4693A", skin:"#F4C08A", hair:"#2C1408" }, home:"kitchen" },
  { id: "W-002", colors: { body:"#A040A0", skin:"#FDDBB4", hair:"#1A1030" }, home:"kitchen" },
  { id: "W-003", colors: { body:"#B8900A", skin:"#F4C08A", hair:"#5C3010" }, home:"fries"   },
  { id: "W-004", colors: { body:"#2E86C8", skin:"#FDDBB4", hair:"#1A1A30" }, home:"drinks"  },
  { id: "W-005", colors: { body:"#C03050", skin:"#F0B090", hair:"#180808" }, home:"counter" },
  { id: "W-006", colors: { body:"#2E8A50", skin:"#F4C08A", hair:"#102010" }, home:"hall"    },
  { id: "W-007", colors: { body:"#7050C8", skin:"#FDDBB4", hair:"#0A0A20" }, home:"hall"    },
  { id: "W-008", colors: { body:"#C87020", skin:"#F0B090", hair:"#201008" }, home:"kitchen" },
];

interface Worker {
  id: string;
  colors: { body:string; skin:string; hair:string };
  x: number; y: number;
  tx: number; ty: number;
  homeStation: string;
  walkPhase: number;
  facing: "left"|"right";
}

function rndInStation(st: typeof STATIONS[0]) {
  return {
    x: st.x + 1.5 + Math.random() * (st.w - 3),
    y: st.y + 2 + Math.random() * (st.h - 5),
  };
}

function initWorkers(): Worker[] {
  return WORKER_DEFS.map(def => {
    const st = STATIONS.find(s => s.id === def.home)!;
    const pos = rndInStation(st);
    return { id: def.id, colors: def.colors, x: pos.x, y: pos.y, tx: pos.x, ty: pos.y,
      homeStation: def.home, walkPhase: Math.random(), facing: "right" };
  });
}

// ── Красивый SVG персонаж (вид 3/4 сверху) ──────────────────────────────────
function CharSprite({ w }: { w: Worker }) {
  const c = w.colors;
  const dist = Math.hypot(w.tx - w.x, w.ty - w.y);
  const isWalk = dist > 0.6;
  const p = w.walkPhase;
  const leg1 = isWalk ? Math.sin(p * Math.PI * 2) * 6 : 0;
  const leg2 = -leg1;
  const arm1 = isWalk ? Math.sin(p * Math.PI * 2) * 10 : 12;
  const arm2 = isWalk ? -arm1 : -12;
  const bob  = isWalk ? Math.abs(Math.sin(p * Math.PI * 2)) * -1.5 : 0;

  return (
    <svg width={30} height={46} viewBox="0 0 30 46" style={{ overflow:"visible", filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.2))" }}>
      {/* Ground shadow */}
      <ellipse cx={15} cy={44} rx={9} ry={3.5} fill="rgba(0,0,0,0.12)" />

      <g transform={`translate(0,${bob})`}>
        {/* Legs */}
        <g>
          <rect x={8} y={29} width={6} height={13} rx={3} fill={c.body}
            transform={`rotate(${leg1},11,29)`} opacity={0.9} />
          <ellipse cx={11} cy={42} rx={4.5} ry={2.5} fill="#2A1A0A" opacity={0.85}
            transform={`rotate(${leg1},11,29)`} />
          <rect x={16} y={29} width={6} height={13} rx={3} fill={c.body}
            transform={`rotate(${leg2},19,29)`} opacity={0.75} />
          <ellipse cx={19} cy={42} rx={4.5} ry={2.5} fill="#2A1A0A" opacity={0.7}
            transform={`rotate(${leg2},19,29)`} />
        </g>

        {/* Body */}
        <rect x={6} y={16} width={18} height={15} rx={5} fill={c.body} />
        {/* Uniform collar stripe */}
        <rect x={13} y={16} width={4} height={8} rx={2} fill="rgba(255,255,255,0.45)" />
        {/* Uniform pocket */}
        <rect x={8} y={21} width={5} height={4} rx={1.5} fill="rgba(255,255,255,0.25)" />

        {/* Arms */}
        <rect x={1} y={17} width={5} height={11} rx={2.5} fill={c.body}
          transform={`rotate(${arm1},3.5,17)`} opacity={0.9} />
        {/* Left hand */}
        <circle cx={3.5} cy={28} r={3} fill={c.skin} opacity={0.9}
          transform={`rotate(${arm1},3.5,17)`} />

        <rect x={24} y={17} width={5} height={11} rx={2.5} fill={c.body}
          transform={`rotate(${arm2},26.5,17)`} opacity={0.75} />
        {/* Right hand */}
        <circle cx={26.5} cy={28} r={3} fill={c.skin} opacity={0.75}
          transform={`rotate(${arm2},26.5,17)`} />

        {/* Neck */}
        <rect x={12} y={11} width={6} height={6} rx={3} fill={c.skin} />

        {/* Head base */}
        <ellipse cx={15} cy={8} rx={8.5} ry={9} fill={c.skin} />

        {/* Hair — back */}
        <ellipse cx={15} cy={3} rx={8} ry={5} fill={c.hair} />
        <ellipse cx={7} cy={8} rx={2.5} ry={5} fill={c.hair} />
        <ellipse cx={23} cy={8} rx={2.5} ry={5} fill={c.hair} />

        {/* Ear */}
        <ellipse cx={6.5} cy={9} rx={2} ry={2.5} fill={c.skin} />
        <ellipse cx={23.5} cy={9} rx={2} ry={2.5} fill={c.skin} />

        {/* Eye whites */}
        <ellipse cx={11} cy={9.5} rx={2.5} ry={2.2} fill="white" />
        <ellipse cx={19} cy={9.5} rx={2.5} ry={2.2} fill="white" />
        {/* Pupils */}
        <ellipse cx={11.5} cy={9.8} rx={1.4} ry={1.5} fill="#1A1230" />
        <ellipse cx={19.5} cy={9.8} rx={1.4} ry={1.5} fill="#1A1230" />
        {/* Eye shine */}
        <circle cx={12} cy={9.3} r={0.5} fill="white" />
        <circle cx={20} cy={9.3} r={0.5} fill="white" />

        {/* Eyebrows */}
        <path d="M9,7.5 Q11,6.5 13,7.5" stroke={c.hair} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <path d="M17,7.5 Q19,6.5 21,7.5" stroke={c.hair} strokeWidth={1.2} fill="none" strokeLinecap="round" />

        {/* Smile */}
        <path d="M12,12.5 Q15,15 18,12.5" stroke="#C06040" strokeWidth={1} fill="none" strokeLinecap="round" />
        {/* Blush */}
        <ellipse cx={9} cy={11.5} rx={2} ry={1.2} fill="rgba(255,150,120,0.3)" />
        <ellipse cx={21} cy={11.5} rx={2} ry={1.2} fill="rgba(255,150,120,0.3)" />

        {/* Hair front */}
        <path d="M7,5 Q15,-1 23,5" fill={c.hair} />
      </g>
    </svg>
  );
}

// ── Экспорт расписания ────────────────────────────────────────────────────────
function exportSchedule(hour: number, day: number) {
  const lines: string[] = [
    "РАСПИСАНИЕ РЕСТОРАНА",
    "===================",
    `День: ${["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"][day]}`,
    `Время: ${String(HOURS[hour]).padStart(2,"0")}:00`,
    "",
    "СОТРУДНИКИ:",
    ...WORKER_DEFS.map((w, i) => {
      const st = STATIONS.find(s => s.id === w.home)!;
      return `  ${w.id}  →  ${st.label}`;
    }),
    "",
    "НАГРУЗКА ПО СТАНЦИЯМ:",
    ...STATIONS.map(st => {
      const load = PEOPLE_LOAD[st.id]?.[hour] ?? 0;
      const bar = "█".repeat(Math.round(load/3)) + "░".repeat(Math.max(0,15-Math.round(load/3)));
      return `  ${st.label.padEnd(12)} ${bar} ${load} чел.`;
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `schedule_${DAYS[day]}_${String(HOURS[hour]).padStart(2,"0")}00.txt`;
  a.click();
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [day, setDay] = useState(4);
  const [hour, setHour] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [workers, setWorkers] = useState<Worker[]>(initWorkers());
  const [busySt, setBusySt] = useState<Record<string,boolean>>({});
  const [orderCount, setOrderCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<{id:number;sid:string;text:string}[]>([]);

  const rafRef   = useRef<number>(0);
  const lastTs   = useRef(0);
  const accHour  = useRef(0);
  const accOrder = useRef(0);

  const playRef  = useRef(playing); playRef.current  = playing;
  const spdRef   = useRef(speed);   spdRef.current   = speed;
  const hourRef  = useRef(hour);    hourRef.current  = hour;
  const dayRef   = useRef(day);     dayRef.current   = day;

  const timeStr     = `${String(HOURS[hour]).padStart(2,"0")}:00`;
  const totalPeople = Object.values(PEOPLE_LOAD).reduce((s,a) => s + (a[hour]??0), 0);
  const sliderPct   = (hour / (HOURS.length-1)) * 100;

  const TASKS: Record<string,string[]> = {
    kitchen: ["🍔 Бургер","🥩 Стейк","🥪 Сэндвич","🍗 Нагетсы"],
    fries:   ["🍟 Фри M","🍟 Фри L","🧂 Соус"],
    drinks:  ["🥤 Кола","🧃 Сок","☕ Кофе"],
    counter: ["💳 Оплата","📦 Выдача","🔄 Возврат"],
    hall:    ["🧹 Уборка","🪑 Стол №3","🪑 Стол №7"],
  };

  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (!playRef.current) { lastTs.current = ts; return; }

    const dt  = Math.min(ts - lastTs.current, 60);
    lastTs.current = ts;
    const spd = spdRef.current;

    // ── Advance hour
    accHour.current += dt;
    if (accHour.current > 2200/spd) {
      accHour.current = 0;
      let nh = hourRef.current + 1;
      if (nh >= HOURS.length) { nh=0; dayRef.current=(dayRef.current+1)%7; setDay(dayRef.current); }
      hourRef.current = nh; setHour(nh);
    }

    // ── Spawn order
    accOrder.current += dt;
    if (accOrder.current > 800/spd) {
      accOrder.current = 0;
      const st    = STATIONS[Math.floor(Math.random()*STATIONS.length)];
      const tasks = TASKS[st.id];
      const text  = tasks[Math.floor(Math.random()*tasks.length)];
      const oid   = Date.now() + Math.random();
      setRecentOrders(p => [...p.slice(-5), { id:oid, sid:st.id, text }]);
      setOrderCount(c => c+1);
      setBusySt(p => ({ ...p, [st.id]:true }));
      const t = setTimeout(() => setBusySt(p => ({ ...p, [st.id]:false })), Math.max(350,1100/spd));
      void t;
    }

    // ── Move workers
    setWorkers(prev => prev.map(w => {
      const dx = w.tx - w.x;
      const dy = w.ty - w.y;
      const dist = Math.hypot(dx, dy);
      let { x, y, tx, ty, walkPhase, facing } = w;

      if (dist < 0.25) {
        const r = Math.random()*1000;
        if (r < 25*spd) {
          const dest = STATIONS[Math.floor(Math.random()*STATIONS.length)];
          const pos  = rndInStation(dest);
          tx = pos.x; ty = pos.y;
        } else if (r < 70) {
          const home = STATIONS.find(s => s.id === w.homeStation) ?? STATIONS[0];
          const pos  = rndInStation(home);
          tx = pos.x; ty = pos.y;
        }
        walkPhase = (walkPhase + 0.01) % 1;
      } else {
        const step = (dt/1000)*9*spd;
        x += (dx/dist)*Math.min(step,dist);
        y += (dy/dist)*Math.min(step,dist);
        facing = dx > 0 ? "right" : "left";
        walkPhase = (walkPhase + dt*0.005*spd) % 1;
      }
      return { ...w, x, y, tx, ty, walkPhase, facing };
    }));
  }, []); // eslint-disable-line

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const reset = () => {
    setPlaying(false); setDay(4); setHour(5);
    setWorkers(initWorkers()); setOrderCount(0);
    setRecentOrders([]); setBusySt({});
    accHour.current=0; accOrder.current=0;
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden select-none"
      style={{ background:"linear-gradient(160deg,#FEF2E8 0%,#F8E6D0 55%,#F0D8BC 100%)", fontFamily:"'Golos Text',sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-5 py-3 flex-shrink-0 gap-3">

        {/* Logo */}
        <div className="flex gap-1.5 items-center">
          {[1,0.6,0.3].map((op,i) => (
            <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#D4693A",opacity:op }} />
          ))}
        </div>

        {/* Clock */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-white"
          style={{ background:"#D4693A", fontFamily:"'Unbounded',sans-serif", fontSize:15, boxShadow:"0 4px 16px #D4693A55" }}>
          <Icon name="Clock" size={14} />
          {timeStr}
        </div>

        {/* Days */}
        <div className="flex gap-1">
          {DAYS.map((d,i) => (
            <button key={d} onClick={() => setDay(i)}
              className="w-8 h-8 rounded-xl font-black transition-all"
              style={{
                fontSize:8, fontFamily:"'Unbounded',sans-serif",
                background: day===i ? "#D4693A" : "rgba(212,105,58,0.1)",
                color: day===i ? "#fff" : "#D4693A",
                border:`1.5px solid ${day===i ? "#D4693A" : "rgba(212,105,58,0.25)"}`,
              }}>
              {d}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-2 items-center">
          <div className="px-3 py-1.5 rounded-xl text-[11px] font-black"
            style={{ border:"2px solid #D4693A",color:"#D4693A",fontFamily:"'Unbounded',sans-serif",background:"rgba(212,105,58,0.05)" }}>
            👥 {totalPeople}
          </div>
          <div className="px-3 py-1.5 rounded-xl text-[11px] font-black"
            style={{ border:"2px solid #D4693A",color:"#D4693A",fontFamily:"'Unbounded',sans-serif",background:"rgba(212,105,58,0.05)" }}>
            📋 {orderCount}
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={() => exportSchedule(hour, day)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs transition-all hover:opacity-90 active:scale-95"
          style={{
            background:"#D4693A", color:"#fff",
            fontFamily:"'Unbounded',sans-serif", fontSize:9,
            letterSpacing:"0.08em",
            boxShadow:"0 3px 12px #D4693A44",
          }}>
          <Icon name="Download" size={13} />
          ЭКСПОРТ
        </button>
      </header>

      {/* ── GAME SCENE ── */}
      <div className="flex-1 relative mx-4 mb-2 rounded-3xl overflow-hidden"
        style={{
          minHeight:400,
          background:"#EDE4D4",
          boxShadow:"inset 0 0 80px rgba(160,110,60,0.1), 0 4px 30px rgba(150,100,50,0.12)",
          border:"2px solid rgba(200,160,110,0.3)",
        }}>

        {/* Parquet floor */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="floor" x="0" y="0" width="50" height="25" patternUnits="userSpaceOnUse">
              <rect width="50" height="25" fill="none"/>
              <rect x="0"  y="0"  width="25" height="12.5" fill="rgba(180,140,90,0.07)" />
              <rect x="25" y="12.5" width="25" height="12.5" fill="rgba(180,140,90,0.07)" />
              <line x1="0" y1="12.5" x2="50" y2="12.5" stroke="rgba(160,120,70,0.1)" strokeWidth="0.8"/>
              <line x1="25" y1="0" x2="25" y2="12.5" stroke="rgba(160,120,70,0.08)" strokeWidth="0.8"/>
              <line x1="0" y1="12.5" x2="0" y2="25" stroke="rgba(160,120,70,0.08)" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#floor)"/>
        </svg>

        {/* Wall (top) */}
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
          style={{ background:"rgba(140,100,60,0.15)" }}/>

        {/* ── STATIONS ── */}
        {STATIONS.map(st => {
          const load   = PEOPLE_LOAD[st.id]?.[hour] ?? 0;
          const maxL   = Math.max(...(PEOPLE_LOAD[st.id]??[1]));
          const busy   = busySt[st.id];

          return (
            <div key={st.id}
              className="absolute flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                left:`${st.x}%`, top:`${st.y}%`,
                width:`${st.w}%`, height:`${st.h}%`,
                background:`linear-gradient(145deg,${st.light}F0,${st.color}18)`,
                border:`2px solid ${busy ? st.color+"CC" : st.color+"50"}`,
                boxShadow: busy
                  ? `0 0 24px ${st.color}44,inset 0 0 20px ${st.color}18`
                  : `0 2px 12px ${st.color}20`,
                transform: busy ? "scale(1.012)" : "scale(1)",
              }}>

              {/* Station top stripe */}
              <div className="h-1 w-full flex-shrink-0 rounded-t-xl"
                style={{ background:`linear-gradient(90deg,${st.color}88,${st.color}22)` }}/>

              {/* Header */}
              <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-0.5">
                <span style={{ fontSize:15 }}>{st.emoji}</span>
                <span className="font-black leading-none" style={{ fontSize:9, color:st.color, fontFamily:"'Unbounded',sans-serif" }}>
                  {st.label}
                </span>
                {busy && (
                  <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background:st.color, boxShadow:`0 0 6px ${st.color}`, animation:"pls 0.7s ease-in-out infinite" }}/>
                )}
              </div>

              {/* People + bar */}
              <div className="px-2.5 mt-auto mb-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{ fontSize:8,color:`${st.color}99`,fontFamily:"'Golos Text',sans-serif",fontWeight:700 }}>
                    {load} чел.
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:`${st.color}18` }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${(load/maxL)*100}%`, background:`linear-gradient(90deg,${st.color}88,${st.color})` }}/>
                </div>
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
              zIndex: Math.round(w.y*10)+50,
              transition:"left 0.07s linear,top 0.07s linear",
            }}>
            <CharSprite w={w}/>
            {/* ID badge */}
            <div
              style={{
                position:"absolute", bottom:-16, left:"50%",
                transform:"translateX(-50%) scaleX(" + (w.facing==="left"?-1:1) + ")",
                background:w.colors.body, color:"#fff",
                borderRadius:6, padding:"1px 5px",
                fontSize:7, fontWeight:800, whiteSpace:"nowrap",
                fontFamily:"'Golos Text',sans-serif",
                boxShadow:`0 1px 5px ${w.colors.body}66`,
              }}>
              {w.id}
            </div>
          </div>
        ))}

        {/* ── ORDER FEED ── */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end pointer-events-none" style={{ zIndex:100 }}>
          {recentOrders.slice(-4).reverse().map(o => {
            const st = STATIONS.find(s => s.id === o.sid);
            return (
              <div key={o.id}
                className="px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shadow"
                style={{
                  background:`${st?.color??"#D4693A"}18`,
                  border:`1.5px solid ${st?.color??"#D4693A"}44`,
                  color:st?.color??"#D4693A",
                  fontFamily:"'Golos Text',sans-serif",
                  animation:"slr 0.22s ease-out",
                  backdropFilter:"blur(4px)",
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
            const r = Math.min(1,Math.max(0,(e.clientX-e.currentTarget.getBoundingClientRect().left)/e.currentTarget.getBoundingClientRect().width));
            setHour(Math.round(r*(HOURS.length-1)));
          }}>
          <div className="absolute inset-x-0 h-2.5 rounded-full" style={{ background:"rgba(200,140,100,0.2)" }}/>
          <div className="absolute left-0 h-2.5 rounded-full transition-all duration-300"
            style={{ width:`${sliderPct}%`,background:"linear-gradient(90deg,#D4693A,#F08060)" }}/>
          <div className="absolute w-5 h-5 rounded-full -translate-x-1/2 transition-all duration-300"
            style={{ left:`${sliderPct}%`,background:"#D4693A",border:"3px solid #fff",boxShadow:"0 2px 10px #D4693A66" }}/>
        </div>
        <div className="flex justify-between mt-0.5">
          {HOURS.map((h,i) => (
            <button key={h} onClick={() => setHour(i)}
              className="text-[8px] font-bold w-5 text-center"
              style={{ color:i===hour?"#D4693A":"rgba(180,100,60,0.4)",fontFamily:"'Golos Text',sans-serif" }}>
              {i%2===0 ? String(h).padStart(2,"0") : "·"}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="relative flex items-center justify-center gap-5 py-3 pb-5 flex-shrink-0">

        <button onClick={() => setHour(h=>Math.max(0,h-1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color:"#D4693A" }}>
          <Icon name="Rewind" size={28}/>
        </button>

        <button onClick={() => setPlaying(p=>!p)}
          className="transition-all active:scale-90"
          style={{ width:52,height:52,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
            background:"#D4693A",color:"#fff",boxShadow:"0 6px 22px #D4693A55" }}>
          <Icon name={playing?"Pause":"Play"} size={22}/>
        </button>

        <button onClick={() => setHour(h=>Math.min(HOURS.length-1,h+1))}
          className="transition-all active:scale-90 hover:opacity-70" style={{ color:"#D4693A" }}>
          <Icon name="FastForward" size={28}/>
        </button>

        {/* Speed — left */}
        <div className="absolute left-6 flex items-center gap-1.5">
          <span style={{ fontSize:8,color:"rgba(212,105,58,0.55)",fontFamily:"'Golos Text',sans-serif",fontWeight:700 }}>СКОРОСТЬ</span>
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className="w-9 h-8 rounded-xl font-black transition-all"
              style={{
                fontSize:10,fontFamily:"'Unbounded',sans-serif",
                background:speed===s?"#D4693A":"rgba(212,105,58,0.1)",
                color:speed===s?"#fff":"#D4693A",
                border:`1.5px solid ${speed===s?"#D4693A":"rgba(212,105,58,0.3)"}`,
              }}>
              {s}x
            </button>
          ))}
        </div>

        {/* Reset — right */}
        <button onClick={reset}
          className="absolute right-6 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background:"rgba(212,105,58,0.1)",border:"1.5px solid rgba(212,105,58,0.3)",color:"#D4693A",fontFamily:"'Golos Text',sans-serif" }}>
          <Icon name="RotateCcw" size={13}/>
          Сброс
        </button>
      </div>

      <style>{`
        @keyframes pls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes slr { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
