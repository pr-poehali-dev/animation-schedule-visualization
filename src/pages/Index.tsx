import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// 5 станций — 3 сверху, 2 снизу, одинаковый размер, отступы
const STATIONS = [
  { id:"kitchen", label:"Кухня",     emoji:"🍳", col:0, row:0, color:"#D4693A" },
  { id:"fries",   label:"Картофель", emoji:"🍟", col:1, row:0, color:"#C09010" },
  { id:"drinks",  label:"Напитки",   emoji:"🥤", col:2, row:0, color:"#2878C0" },
  { id:"counter", label:"Прилавок",  emoji:"🏪", col:0, row:1, color:"#9038A8" },
  { id:"hall",    label:"Зал",       emoji:"🪑", col:1, row:1, color:"#208850" },
];

// Потребность в сотрудниках (по часам) и текущая нагрузка
const NEED: Record<string,number> = { kitchen:3, fries:2, drinks:2, counter:2, hall:3 };
const LOAD: Record<string,number[]> = {
  kitchen: [2,2,2,3,3,3,3,3,3,3,3,3,2,2,2,2],
  fries:   [1,1,1,2,2,2,2,2,2,2,2,2,1,1,1,1],
  drinks:  [1,1,2,2,2,2,2,2,2,2,2,2,2,1,1,1],
  counter: [1,1,1,2,2,2,2,2,2,2,2,2,2,2,1,1],
  hall:    [1,2,2,2,3,3,3,3,3,3,3,3,2,2,2,1],
};

const WORKER_DEFS = [
  { id:"W-001", colors:{ body:"#D4693A", skin:"#F4C08A", hair:"#2C1408" }, home:"kitchen" },
  { id:"W-002", colors:{ body:"#9038A8", skin:"#FDDBB4", hair:"#1A1030" }, home:"kitchen" },
  { id:"W-003", colors:{ body:"#C09010", skin:"#F4C08A", hair:"#5C3010" }, home:"fries"   },
  { id:"W-004", colors:{ body:"#2878C0", skin:"#FDDBB4", hair:"#1A1A30" }, home:"drinks"  },
  { id:"W-005", colors:{ body:"#C03050", skin:"#F0B090", hair:"#180808" }, home:"counter" },
  { id:"W-006", colors:{ body:"#208850", skin:"#F4C08A", hair:"#102010" }, home:"hall"    },
  { id:"W-007", colors:{ body:"#6045C0", skin:"#FDDBB4", hair:"#0A0A20" }, home:"hall"    },
  { id:"W-008", colors:{ body:"#C07020", skin:"#F0B090", hair:"#201008" }, home:"kitchen" },
];

// Позиция станции в % (сетка 3×2, col2 row1 = центр)
function stationRect(s: typeof STATIONS[0]) {
  const PAD = 2;   // % от края сцены
  const GAP = 2;   // % зазор между ячейками
  const COLS = 3;
  const cellW = (100 - PAD*2 - GAP*(COLS-1)) / COLS;
  const cellH = 44; // высота строки %
  const x = PAD + s.col*(cellW+GAP);
  let y: number;
  if (s.row === 0) y = PAD;
  else {
    // row1: две карточки по центру
    const totalW2 = 2*cellW + GAP;
    const startX2 = (100 - totalW2) / 2;
    return { x: startX2 + s.col*(cellW+GAP), y: PAD + cellH + GAP, w: cellW, h: cellH };
  }
  return { x, y, w: cellW, h: cellH };
}

interface Worker {
  id: string;
  colors: { body:string; skin:string; hair:string };
  x: number; y: number; tx: number; ty: number;
  homeStation: string;
  walkPhase: number;
  facing: "left"|"right";
}

function rndInRect(r: { x:number; y:number; w:number; h:number }) {
  return { x: r.x + 2 + Math.random()*(r.w-4), y: r.y + 4 + Math.random()*(r.h-8) };
}

function initWorkers(): Worker[] {
  return WORKER_DEFS.map(def => {
    const st = STATIONS.find(s => s.id === def.home)!;
    const rect = stationRect(st);
    const pos = rndInRect(rect);
    return { id:def.id, colors:def.colors, x:pos.x, y:pos.y, tx:pos.x, ty:pos.y,
      homeStation:def.home, walkPhase:Math.random(), facing:"right" };
  });
}

// ── SVG персонаж ─────────────────────────────────────────────────────────────
function Char({ w }: { w: Worker }) {
  const c = w.colors;
  const moving = Math.hypot(w.tx-w.x, w.ty-w.y) > 0.5;
  const p = w.walkPhase;
  const swing = moving ? Math.sin(p*Math.PI*2)*7 : 0;
  const bob   = moving ? Math.abs(Math.sin(p*Math.PI*2))*-1.2 : 0;

  return (
    <svg width={28} height={44} viewBox="0 0 28 44"
      style={{ overflow:"visible", filter:"drop-shadow(0 3px 5px rgba(0,0,0,0.22))" }}>
      {/* shadow */}
      <ellipse cx={14} cy={42} rx={8} ry={3} fill="rgba(0,0,0,0.13)"/>
      <g transform={`translate(0,${bob})`}>
        {/* legs */}
        <rect x={7}  y={27} width={5} height={13} rx={2.5} fill={c.body} opacity={0.9}
          transform={`rotate(${swing},9.5,27)`}/>
        <ellipse cx={9.5}  cy={40} rx={4} ry={2.2} fill="#291A09" opacity={0.85}
          transform={`rotate(${swing},9.5,27)`}/>
        <rect x={16} y={27} width={5} height={13} rx={2.5} fill={c.body} opacity={0.75}
          transform={`rotate(${-swing},18.5,27)`}/>
        <ellipse cx={18.5} cy={40} rx={4} ry={2.2} fill="#291A09" opacity={0.7}
          transform={`rotate(${-swing},18.5,27)`}/>
        {/* body */}
        <rect x={5} y={14} width={18} height={15} rx={5} fill={c.body}/>
        <rect x={12} y={14} width={4} height={8} rx={2} fill="rgba(255,255,255,0.4)"/>
        {/* arms */}
        <rect x={1}  y={15} width={5} height={10} rx={2.5} fill={c.body} opacity={0.9}
          transform={`rotate(${moving ? -swing*0.6 : 14},3.5,15)`}/>
        <circle cx={3.5} cy={25} r={2.8} fill={c.skin} opacity={0.85}
          transform={`rotate(${moving ? -swing*0.6 : 14},3.5,15)`}/>
        <rect x={22} y={15} width={5} height={10} rx={2.5} fill={c.body} opacity={0.75}
          transform={`rotate(${moving ? swing*0.6 : -14},24.5,15)`}/>
        <circle cx={24.5} cy={25} r={2.8} fill={c.skin} opacity={0.75}
          transform={`rotate(${moving ? swing*0.6 : -14},24.5,15)`}/>
        {/* neck */}
        <rect x={11} y={10} width={6} height={5} rx={3} fill={c.skin}/>
        {/* head */}
        <ellipse cx={14} cy={7.5} rx={8} ry={8.5} fill={c.skin}/>
        {/* hair back */}
        <ellipse cx={14} cy={2.5} rx={7.5} ry={4.5} fill={c.hair}/>
        <ellipse cx={6.5}  cy={8} rx={2.2} ry={5} fill={c.hair}/>
        <ellipse cx={21.5} cy={8} rx={2.2} ry={5} fill={c.hair}/>
        {/* ears */}
        <ellipse cx={6}  cy={9} rx={1.8} ry={2.3} fill={c.skin}/>
        <ellipse cx={22} cy={9} rx={1.8} ry={2.3} fill={c.skin}/>
        {/* eye whites */}
        <ellipse cx={10.5} cy={9} rx={2.2} ry={2} fill="white"/>
        <ellipse cx={17.5} cy={9} rx={2.2} ry={2} fill="white"/>
        {/* pupils */}
        <ellipse cx={11}  cy={9.3} rx={1.3} ry={1.4} fill="#18122A"/>
        <ellipse cx={18}  cy={9.3} rx={1.3} ry={1.4} fill="#18122A"/>
        {/* shine */}
        <circle cx={11.5} cy={8.8} r={0.45} fill="white"/>
        <circle cx={18.5} cy={8.8} r={0.45} fill="white"/>
        {/* brows */}
        <path d="M8.5,7 Q10.5,6 12.5,7"  stroke={c.hair} strokeWidth={1.1} fill="none" strokeLinecap="round"/>
        <path d="M15.5,7 Q17.5,6 19.5,7" stroke={c.hair} strokeWidth={1.1} fill="none" strokeLinecap="round"/>
        {/* smile */}
        <path d="M11.5,12 Q14,14.2 16.5,12" stroke="#B05030" strokeWidth={0.9} fill="none" strokeLinecap="round"/>
        {/* blush */}
        <ellipse cx={8.5}  cy={11} rx={1.8} ry={1.1} fill="rgba(255,140,110,0.28)"/>
        <ellipse cx={19.5} cy={11} rx={1.8} ry={1.1} fill="rgba(255,140,110,0.28)"/>
        {/* hair front */}
        <path d="M7,5 Q14,0 21,5" fill={c.hair}/>
      </g>
    </svg>
  );
}

// ── Кружок-индикатор есть/надо ───────────────────────────────────────────────
function StaffBadge({ current, need, color }: { current:number; need:number; color:string }) {
  const ok = current >= need;
  const bg = ok ? `${color}22` : "rgba(220,50,50,0.12)";
  const border = ok ? `${color}66` : "rgba(220,50,50,0.5)";
  const textColor = ok ? color : "#CC2020";
  return (
    <div style={{
      width:38, height:38, borderRadius:"50%",
      background:bg, border:`2px solid ${border}`,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      lineHeight:1,
    }}>
      <span style={{ fontSize:11, fontWeight:900, color:textColor, fontFamily:"'Unbounded',sans-serif" }}>
        {current}/{need}
      </span>
    </div>
  );
}

// ── Экспорт ──────────────────────────────────────────────────────────────────
function exportSchedule(hour:number, day:number, workerStations:Record<string,string>) {
  const dayNames = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
  const lines = [
    "РАСПИСАНИЕ РЕСТОРАНА",
    "=".repeat(30),
    `День: ${dayNames[day]}   Время: ${String(HOURS[hour]).padStart(2,"0")}:00`,
    "",
    "РАССТАНОВКА СОТРУДНИКОВ:",
    ...WORKER_DEFS.map(w => {
      const sid = workerStations[w.id] ?? w.home;
      const st  = STATIONS.find(s=>s.id===sid);
      return `  ${w.id}  →  ${st?.label ?? sid}`;
    }),
    "",
    "НАГРУЗКА:",
    ...STATIONS.map(st => {
      const cur = LOAD[st.id]?.[hour]??0;
      const nd  = NEED[st.id]??0;
      const bar = "█".repeat(cur) + "░".repeat(Math.max(0,nd-cur));
      return `  ${st.label.padEnd(12)} ${bar}  ${cur}/${nd}`;
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type:"text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `schedule_${DAYS[day]}_${String(HOURS[hour]).padStart(2,"0")}00.txt`;
  a.click();
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [day,    setDay]    = useState(4);
  const [hour,   setHour]   = useState(5);
  const [playing,setPlaying]= useState(false);
  const [speed,  setSpeed]  = useState(1);
  const [workers,setWorkers]= useState<Worker[]>(initWorkers());
  const [busySt, setBusySt] = useState<Record<string,boolean>>({});
  const [orderCount,setOrderCount] = useState(0);
  const [orders, setOrders] = useState<{id:number;sid:string;text:string}[]>([]);

  const rafRef  = useRef<number>(0);
  const lastTs  = useRef(0);
  const accH    = useRef(0);
  const accO    = useRef(0);
  const playRef = useRef(playing); playRef.current = playing;
  const spdRef  = useRef(speed);   spdRef.current  = speed;
  const hourRef = useRef(hour);    hourRef.current = hour;
  const dayRef  = useRef(day);     dayRef.current  = day;

  const timeStr   = `${String(HOURS[hour]).padStart(2,"0")}:00`;
  const sliderPct = (hour/(HOURS.length-1))*100;

  const TASKS: Record<string,string[]> = {
    kitchen:["🍔 Бургер","🥩 Стейк","🥪 Сэндвич","🍗 Нагетсы"],
    fries:  ["🍟 Фри M","🍟 Фри L","🧂 Соус"],
    drinks: ["🥤 Кола","🧃 Сок","☕ Кофе"],
    counter:["💳 Оплата","📦 Выдача","🔄 Возврат"],
    hall:   ["🧹 Уборка","🪑 Стол №3","🪑 Стол №7"],
  };

  const tick = useCallback((ts:number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (!playRef.current) { lastTs.current=ts; return; }
    const dt  = Math.min(ts-lastTs.current, 60);
    lastTs.current = ts;
    const spd = spdRef.current;

    accH.current += dt;
    if (accH.current > 2200/spd) {
      accH.current = 0;
      let nh = hourRef.current+1;
      if (nh>=HOURS.length){ nh=0; dayRef.current=(dayRef.current+1)%7; setDay(dayRef.current); }
      hourRef.current=nh; setHour(nh);
    }
    accO.current += dt;
    if (accO.current > 820/spd) {
      accO.current = 0;
      const st   = STATIONS[Math.floor(Math.random()*STATIONS.length)];
      const list = TASKS[st.id];
      const text = list[Math.floor(Math.random()*list.length)];
      setOrders(p=>[...p.slice(-5),{id:Date.now()+Math.random(),sid:st.id,text}]);
      setOrderCount(c=>c+1);
      setBusySt(p=>({...p,[st.id]:true}));
      const t=setTimeout(()=>setBusySt(p=>({...p,[st.id]:false})),Math.max(350,1100/spd));
      void t;
    }
    setWorkers(prev=>prev.map(w=>{
      const dx=w.tx-w.x, dy=w.ty-w.y;
      const dist=Math.hypot(dx,dy);
      let {x,y,tx,ty,walkPhase,facing}=w;
      if (dist<0.25) {
        const r=Math.random()*1000;
        if (r<22*spd){
          const dest=STATIONS[Math.floor(Math.random()*STATIONS.length)];
          const pos=rndInRect(stationRect(dest));
          tx=pos.x; ty=pos.y;
        } else if (r<65){
          const home=STATIONS.find(s=>s.id===w.homeStation)??STATIONS[0];
          const pos=rndInRect(stationRect(home));
          tx=pos.x; ty=pos.y;
        }
        walkPhase=(walkPhase+0.01)%1;
      } else {
        const step=(dt/1000)*9*spd;
        x+=dx/dist*Math.min(step,dist);
        y+=dy/dist*Math.min(step,dist);
        facing=dx>0?"right":"left";
        walkPhase=(walkPhase+dt*0.005*spd)%1;
      }
      return {...w,x,y,tx,ty,walkPhase,facing};
    }));
  }, []); // eslint-disable-line

  useEffect(()=>{
    rafRef.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[tick]);

  const reset=()=>{
    setPlaying(false); setDay(4); setHour(5);
    setWorkers(initWorkers()); setOrderCount(0); setOrders([]); setBusySt({});
    accH.current=0; accO.current=0;
  };

  // Текущая расстановка воркеров по станциям
  const workerStations: Record<string,string> = {};
  workers.forEach(w=>{ workerStations[w.id]=w.homeStation; });

  // Сколько воркеров сейчас на каждой станции
  const stationStaffCount: Record<string,number> = {};
  STATIONS.forEach(st=>{ stationStaffCount[st.id]=0; });
  workers.forEach(w=>{ stationStaffCount[w.homeStation]=(stationStaffCount[w.homeStation]??0)+1; });

  return (
    <div className="min-h-screen flex flex-col overflow-hidden select-none"
      style={{ background:"#F2E8D8", fontFamily:"'Golos Text',sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 20px", flexShrink:0,
        background:"rgba(255,255,255,0.55)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(200,160,110,0.2)",
      }}>
        {/* Left: logo + clock */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", gap:5 }}>
            {[1,0.55,0.28].map((op,i)=>(
              <div key={i} style={{ width:9,height:9,borderRadius:"50%",background:"#D4693A",opacity:op }}/>
            ))}
          </div>
          <div style={{
            display:"flex", alignItems:"center", gap:7,
            background:"#D4693A", borderRadius:12,
            padding:"6px 14px", color:"#fff",
            fontFamily:"'Unbounded',sans-serif", fontSize:15, fontWeight:900,
            boxShadow:"0 3px 14px #D4693A44",
          }}>
            <Icon name="Clock" size={14}/>
            {timeStr}
          </div>
        </div>

        {/* Center: days */}
        <div style={{ display:"flex", gap:5 }}>
          {DAYS.map((d,i)=>(
            <button key={d} onClick={()=>setDay(i)}
              style={{
                width:34, height:34, borderRadius:10,
                fontSize:8, fontFamily:"'Unbounded',sans-serif", fontWeight:900,
                background: day===i ? "#D4693A" : "rgba(212,105,58,0.08)",
                color: day===i ? "#fff" : "#C06030",
                border:`1.5px solid ${day===i?"#D4693A":"rgba(212,105,58,0.2)"}`,
                cursor:"pointer", transition:"all 0.15s",
              }}>
              {d}
            </button>
          ))}
        </div>

        {/* Right: orders counter + export */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            padding:"6px 12px", borderRadius:10,
            border:"1.5px solid rgba(212,105,58,0.3)",
            color:"#C06030", fontSize:11, fontWeight:800,
            fontFamily:"'Unbounded',sans-serif",
            background:"rgba(212,105,58,0.06)",
          }}>
            📋 {orderCount}
          </div>
          <button onClick={()=>exportSchedule(hour,day,workerStations)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"7px 16px", borderRadius:12,
              background:"#D4693A", color:"#fff",
              fontFamily:"'Unbounded',sans-serif", fontSize:9, fontWeight:900,
              letterSpacing:"0.07em", border:"none", cursor:"pointer",
              boxShadow:"0 3px 12px #D4693A44", transition:"opacity 0.15s",
            }}>
            <Icon name="Download" size={13}/>
            ЭКСПОРТ
          </button>
        </div>
      </header>

      {/* ── SCENE ── */}
      <div className="flex-1 relative mx-4 my-3 rounded-3xl overflow-hidden"
        style={{
          background:"#E8DCCA",
          boxShadow:"0 4px 32px rgba(150,100,50,0.1)",
          border:"1.5px solid rgba(190,150,100,0.25)",
          minHeight:380,
        }}>

        {/* Тёплый градиентный пол — никакой шахматки */}
        <div className="absolute inset-0 rounded-3xl" style={{
          background:"radial-gradient(ellipse at 50% 100%, #DDD0B8 0%, #E8DCCA 60%)",
        }}/>
        {/* Лёгкие линии пола */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{ opacity:0.35 }}>
          <defs>
            <pattern id="lines" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2="80" y2="0"  stroke="#C8A870" strokeWidth="0.6"/>
              <line x1="0" y1="20" x2="40" y2="0"  stroke="#C8A870" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lines)"/>
        </svg>

        {/* ── STATION ZONES ── */}
        {STATIONS.map(st=>{
          const rect  = stationRect(st);
          const busy  = busySt[st.id];
          const cur   = stationStaffCount[st.id]??0;
          const need  = NEED[st.id]??0;

          return (
            <div key={st.id} className="absolute flex flex-col rounded-2xl transition-all duration-300"
              style={{
                left:`${rect.x}%`, top:`${rect.y}%`,
                width:`${rect.w}%`, height:`${rect.h}%`,
                background: busy
                  ? `linear-gradient(150deg,${st.color}28,${st.color}10)`
                  : `linear-gradient(150deg,rgba(255,255,255,0.55),rgba(255,255,255,0.25))`,
                border:`2px solid ${busy?st.color+"AA":st.color+"38"}`,
                boxShadow: busy
                  ? `0 0 24px ${st.color}40,inset 0 0 16px ${st.color}14`
                  : `0 2px 16px rgba(0,0,0,0.06)`,
                transform: busy?"scale(1.015)":"scale(1)",
                backdropFilter:"blur(4px)",
              }}>

              {/* Цветная полоска сверху */}
              <div style={{
                height:4, borderRadius:"12px 12px 0 0",
                background:`linear-gradient(90deg,${st.color},${st.color}55)`,
              }}/>

              {/* Контент */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"8px 10px 10px" }}>
                {/* Верх: иконка + название + пульс */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"auto" }}>
                  <span style={{ fontSize:20 }}>{st.emoji}</span>
                  <span style={{ fontSize:10, fontWeight:900, color:st.color, fontFamily:"'Unbounded',sans-serif", lineHeight:1.1 }}>
                    {st.label}
                  </span>
                  {busy && (
                    <div style={{
                      marginLeft:"auto", width:7, height:7, borderRadius:"50%",
                      background:st.color, boxShadow:`0 0 7px ${st.color}`,
                      animation:"pls 0.7s ease-in-out infinite",
                    }}/>
                  )}
                </div>

                {/* Низ: кружок-индикатор */}
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                  <StaffBadge current={cur} need={need} color={st.color}/>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── WORKERS ── */}
        {workers.map(w=>(
          <div key={w.id} className="absolute pointer-events-none"
            style={{
              left:`${w.x}%`, top:`${w.y}%`,
              transform:`translate(-50%,-100%) scaleX(${w.facing==="left"?-1:1})`,
              zIndex:Math.round(w.y*10)+50,
              transition:"left 0.07s linear,top 0.07s linear",
            }}>
            <Char w={w}/>
            {/* ID tag */}
            <div style={{
              position:"absolute", bottom:-15, left:"50%",
              transform:`translateX(-50%) scaleX(${w.facing==="left"?-1:1})`,
              background:w.colors.body, color:"#fff",
              borderRadius:5, padding:"1px 5px",
              fontSize:7, fontWeight:800, whiteSpace:"nowrap",
              fontFamily:"'Golos Text',sans-serif",
              boxShadow:`0 1px 5px ${w.colors.body}55`,
            }}>
              {w.id}
            </div>
          </div>
        ))}

        {/* ── ORDER FEED ── */}
        <div style={{
          position:"absolute", top:10, right:10,
          display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end",
          zIndex:100, pointerEvents:"none",
        }}>
          {orders.slice(-4).reverse().map(o=>{
            const st=STATIONS.find(s=>s.id===o.sid);
            return (
              <div key={o.id} style={{
                padding:"4px 10px", borderRadius:20,
                background:`${st?.color??"#D4693A"}18`,
                border:`1.5px solid ${st?.color??"#D4693A"}44`,
                color:st?.color??"#D4693A",
                fontSize:9, fontWeight:700,
                whiteSpace:"nowrap",
                fontFamily:"'Golos Text',sans-serif",
                backdropFilter:"blur(6px)",
                animation:"slr 0.2s ease-out",
              }}>
                {o.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div style={{ padding:"0 28px 4px", flexShrink:0 }}>
        <div style={{ position:"relative", height:24, display:"flex", alignItems:"center", cursor:"pointer" }}
          onClick={e=>{
            const r=Math.min(1,Math.max(0,(e.clientX-e.currentTarget.getBoundingClientRect().left)/e.currentTarget.getBoundingClientRect().width));
            setHour(Math.round(r*(HOURS.length-1)));
          }}>
          <div style={{ position:"absolute", inset:"0 0",
            height:10, top:"50%", transform:"translateY(-50%)",
            borderRadius:99, background:"rgba(200,150,100,0.2)" }}/>
          <div style={{ position:"absolute", left:0, height:10, top:"50%", transform:"translateY(-50%)",
            borderRadius:99, width:`${sliderPct}%`,
            background:"linear-gradient(90deg,#D4693A,#F08055)", transition:"width 0.3s" }}/>
          <div style={{
            position:"absolute", left:`${sliderPct}%`, width:20, height:20,
            borderRadius:"50%", transform:"translateX(-50%)",
            background:"#D4693A", border:"3px solid #fff",
            boxShadow:"0 2px 10px #D4693A55", transition:"left 0.3s",
          }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
          {HOURS.map((h,i)=>(
            <button key={h} onClick={()=>setHour(i)}
              style={{ fontSize:8, fontWeight:700, width:20, textAlign:"center", border:"none", background:"none", cursor:"pointer",
                color:i===hour?"#D4693A":"rgba(170,100,50,0.4)", fontFamily:"'Golos Text',sans-serif" }}>
              {i%2===0?String(h).padStart(2,"0"):"·"}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
        gap:20, padding:"6px 0 18px", flexShrink:0 }}>

        {/* Speed — left */}
        <div style={{ position:"absolute", left:24, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:8, fontWeight:700, color:"rgba(180,90,40,0.5)", fontFamily:"'Golos Text',sans-serif" }}>СКОРОСТЬ</span>
          {[1,2,3].map(s=>(
            <button key={s} onClick={()=>setSpeed(s)}
              style={{
                width:34, height:32, borderRadius:10,
                fontSize:10, fontWeight:900, fontFamily:"'Unbounded',sans-serif",
                background:speed===s?"#D4693A":"rgba(212,105,58,0.09)",
                color:speed===s?"#fff":"#C06030",
                border:`1.5px solid ${speed===s?"#D4693A":"rgba(212,105,58,0.25)"}`,
                cursor:"pointer", transition:"all 0.15s",
              }}>
              {s}x
            </button>
          ))}
        </div>

        {/* Playback */}
        <button onClick={()=>setHour(h=>Math.max(0,h-1))}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#D4693A",transition:"opacity 0.15s" }}>
          <Icon name="Rewind" size={28}/>
        </button>
        <button onClick={()=>setPlaying(p=>!p)}
          style={{
            width:52,height:52,borderRadius:"50%",border:"none",cursor:"pointer",
            background:"#D4693A",color:"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 6px 22px #D4693A55",transition:"transform 0.1s",
          }}>
          <Icon name={playing?"Pause":"Play"} size={22}/>
        </button>
        <button onClick={()=>setHour(h=>Math.min(HOURS.length-1,h+1))}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#D4693A" }}>
          <Icon name="FastForward" size={28}/>
        </button>

        {/* Reset — right */}
        <button onClick={reset}
          style={{
            position:"absolute", right:24,
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 16px", borderRadius:12,
            background:"rgba(212,105,58,0.08)",
            border:"1.5px solid rgba(212,105,58,0.25)",
            color:"#C06030", fontSize:11, fontWeight:700,
            fontFamily:"'Golos Text',sans-serif", cursor:"pointer",
          }}>
          <Icon name="RotateCcw" size={13}/>
          Сброс
        </button>
      </div>

      <style>{`
        @keyframes pls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.6)} }
        @keyframes slr { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
