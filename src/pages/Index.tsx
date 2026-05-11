import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// Станции как 2 промпта назад — свободное расположение на плане
const STATIONS = [
  { id:"kitchen", label:"Кухня",     emoji:"🍳", x:5,  y:6,  w:26, h:28, color:"#D4693A" },
  { id:"fries",   label:"Картофель", emoji:"🍟", x:35, y:6,  w:20, h:20, color:"#C09010" },
  { id:"drinks",  label:"Напитки",   emoji:"🥤", x:60, y:6,  w:20, h:20, color:"#2878C0" },
  { id:"counter", label:"Прилавок",  emoji:"🏪", x:5,  y:58, w:24, h:17, color:"#9038A8" },
  { id:"hall",    label:"Зал",       emoji:"🪑", x:34, y:44, w:48, h:30, color:"#208850" },
];

const NEED: Record<string,number> = { kitchen:3, fries:2, drinks:2, counter:2, hall:3 };
const LOAD: Record<string,number[]> = {
  kitchen: [2,2,2,3,3,3,3,3,3,3,3,3,2,2,2,2],
  fries:   [1,1,1,2,2,2,2,2,2,2,2,2,1,1,1,1],
  drinks:  [1,1,2,2,2,2,2,2,2,2,2,2,2,1,1,1],
  counter: [1,1,1,2,2,2,2,2,2,2,2,2,2,2,1,1],
  hall:    [1,2,2,2,3,3,3,3,3,3,3,3,2,2,2,1],
};

// Форма одежды «Вкусно и точка» — красный верх, тёмные штаны
const WORKER_DEFS = [
  { id:"W-001", skin:"#F4C08A", hair:"#2C1408", home:"kitchen" },
  { id:"W-002", skin:"#FDDBB4", hair:"#1A1030", home:"kitchen" },
  { id:"W-003", skin:"#F4C08A", hair:"#5C3010", home:"fries"   },
  { id:"W-004", skin:"#FDDBB4", hair:"#1A1A30", home:"drinks"  },
  { id:"W-005", skin:"#F0B090", hair:"#180808", home:"counter" },
  { id:"W-006", skin:"#F4C08A", hair:"#102010", home:"hall"    },
  { id:"W-007", skin:"#FDDBB4", hair:"#0A0A20", home:"hall"    },
  { id:"W-008", skin:"#F0B090", hair:"#201008", home:"kitchen" },
];

// Фирменные цвета «Вкусно и точка»
const VT_RED   = "#D0212A"; // красный
const VT_DARK  = "#2A1A0E"; // тёмные штаны
const VT_APRON = "#F5C518"; // жёлтый фартук (акцент)

interface Worker {
  id: string; skin: string; hair: string;
  x: number; y: number; tx: number; ty: number;
  homeStation: string;
  walkPhase: number;
  facing: "left"|"right";
}

function rndInStation(st: typeof STATIONS[0]) {
  return {
    x: st.x + 2 + Math.random()*(st.w - 4),
    y: st.y + 3 + Math.random()*(st.h - 6),
  };
}

function initWorkers(): Worker[] {
  return WORKER_DEFS.map(def => {
    const st  = STATIONS.find(s => s.id === def.home)!;
    const pos = rndInStation(st);
    return { id:def.id, skin:def.skin, hair:def.hair,
      x:pos.x, y:pos.y, tx:pos.x, ty:pos.y,
      homeStation:def.home, walkPhase:Math.random(), facing:"right" };
  });
}

// ── Персонаж в форме «Вкусно и точка» ────────────────────────────────────────
function Char({ w }: { w: Worker }) {
  const moving = Math.hypot(w.tx-w.x, w.ty-w.y) > 0.5;
  const p = w.walkPhase;
  const sw = moving ? Math.sin(p*Math.PI*2)*8 : 0;
  const bob = moving ? Math.abs(Math.sin(p*Math.PI*2))*-1.5 : 0;

  return (
    <svg width={30} height={46} viewBox="0 0 30 46"
      style={{ overflow:"visible", filter:"drop-shadow(0 4px 6px rgba(0,0,0,0.25))" }}>
      {/* Тень на полу */}
      <ellipse cx={15} cy={44} rx={9} ry={3.5} fill="rgba(0,0,0,0.15)"/>

      <g transform={`translate(0,${bob})`}>
        {/* ── НОГИ (тёмные штаны) ── */}
        <rect x={8}  y={28} width={6} height={14} rx={3} fill={VT_DARK}
          transform={`rotate(${sw},11,28)`} opacity={0.95}/>
        {/* Левая обувь */}
        <ellipse cx={11} cy={42} rx={4.5} ry={2.5} fill="#1A0A00"
          transform={`rotate(${sw},11,28)`}/>
        <rect x={16} y={28} width={6} height={14} rx={3} fill={VT_DARK}
          transform={`rotate(${-sw},19,28)`} opacity={0.8}/>
        {/* Правая обувь */}
        <ellipse cx={19} cy={42} rx={4.5} ry={2.5} fill="#1A0A00"
          transform={`rotate(${-sw},19,28)`} opacity={0.85}/>

        {/* ── ТЕЛО (красная форма) ── */}
        <rect x={6} y={15} width={18} height={15} rx={5} fill={VT_RED}/>
        {/* Воротник-V */}
        <path d="M13,15 L15,21 L17,15" fill="rgba(255,255,255,0.35)"/>
        {/* Жёлтый фартук-полоска */}
        <rect x={10} y={22} width={10} height={6} rx={2} fill={VT_APRON} opacity={0.85}/>
        {/* Пуговицы */}
        <circle cx={15} cy={17} r={0.9} fill="rgba(255,255,255,0.6)"/>
        <circle cx={15} cy={20} r={0.9} fill="rgba(255,255,255,0.6)"/>

        {/* ── РУКИ ── */}
        <rect x={1} y={16} width={5} height={11} rx={2.5} fill={VT_RED}
          transform={`rotate(${moving ? -sw*0.55 : 16},3.5,16)`} opacity={0.9}/>
        <ellipse cx={3.5} cy={27} rx={3} ry={2.5} fill={w.skin} opacity={0.9}
          transform={`rotate(${moving ? -sw*0.55 : 16},3.5,16)`}/>
        <rect x={24} y={16} width={5} height={11} rx={2.5} fill={VT_RED}
          transform={`rotate(${moving ? sw*0.55 : -16},26.5,16)`} opacity={0.75}/>
        <ellipse cx={26.5} cy={27} rx={3} ry={2.5} fill={w.skin} opacity={0.75}
          transform={`rotate(${moving ? sw*0.55 : -16},26.5,16)`}/>

        {/* ── ШЕЯ ── */}
        <rect x={12} y={11} width={6} height={5} rx={3} fill={w.skin}/>

        {/* ── ГОЛОВА ── */}
        <ellipse cx={15} cy={8} rx={8.5} ry={9} fill={w.skin}/>

        {/* Волосы — задник */}
        <ellipse cx={15} cy={2.5} rx={8} ry={5} fill={w.hair}/>
        <ellipse cx={6.5}  cy={9} rx={2.3} ry={5.5} fill={w.hair}/>
        <ellipse cx={23.5} cy={9} rx={2.3} ry={5.5} fill={w.hair}/>

        {/* Уши */}
        <ellipse cx={6}  cy={9.5} rx={2}  ry={2.5} fill={w.skin}/>
        <ellipse cx={24} cy={9.5} rx={2}  ry={2.5} fill={w.skin}/>

        {/* ── КРАСНАЯ КЕПКА (фирменная) ── */}
        <path d="M5.5,6 Q15,-3 24.5,6 L24,4 Q15,-5 6,4 Z" fill={VT_RED}/>
        <rect x={5} y={4} width={20} height={4} rx={2} fill={VT_RED}/>
        {/* Козырёк */}
        <rect x={3} y={6} width={24} height={2.5} rx={1.5} fill="#A01020"/>
        {/* Жёлтая точка на кепке */}
        <circle cx={15} cy={2} r={2.5} fill={VT_APRON}/>

        {/* Белки глаз */}
        <ellipse cx={11} cy={9.5} rx={2.4} ry={2.2} fill="white"/>
        <ellipse cx={19} cy={9.5} rx={2.4} ry={2.2} fill="white"/>
        {/* Зрачки */}
        <ellipse cx={11.5} cy={9.8} rx={1.4} ry={1.5} fill="#1A0A0A"/>
        <ellipse cx={19.5} cy={9.8} rx={1.4} ry={1.5} fill="#1A0A0A"/>
        {/* Блики */}
        <circle cx={12}  cy={9.2} r={0.5} fill="white"/>
        <circle cx={20}  cy={9.2} r={0.5} fill="white"/>
        {/* Брови */}
        <path d="M9,7.5 Q11,6.2 13,7.5"  stroke={w.hair} strokeWidth={1.2} fill="none" strokeLinecap="round"/>
        <path d="M17,7.5 Q19,6.2 21,7.5" stroke={w.hair} strokeWidth={1.2} fill="none" strokeLinecap="round"/>
        {/* Улыбка */}
        <path d="M12,12.5 Q15,15.2 18,12.5" stroke="#B05030" strokeWidth={1} fill="none" strokeLinecap="round"/>
        {/* Румянец */}
        <ellipse cx={9}  cy={11.5} rx={2} ry={1.2} fill="rgba(255,130,100,0.3)"/>
        <ellipse cx={21} cy={11.5} rx={2} ry={1.2} fill="rgba(255,130,100,0.3)"/>
      </g>
    </svg>
  );
}

// ── Индикатор-кружок: жирная обводка, крупные цифры ──────────────────────────
function StaffBadge({ current, need, color }: { current:number; need:number; color:string }) {
  const ok = current >= need;
  return (
    <div style={{
      width:44, height:44, borderRadius:"50%",
      background: ok ? `${color}18` : "rgba(208,33,42,0.1)",
      border:`3.5px solid ${ok ? color : "#D0212A"}`,
      display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0,
      boxShadow: ok
        ? `0 0 0 2px ${color}28`
        : "0 0 0 2px rgba(208,33,42,0.2)",
    }}>
      <span style={{
        fontSize:12, fontWeight:900, lineHeight:1,
        color: ok ? color : "#D0212A",
        fontFamily:"'Unbounded',sans-serif",
        letterSpacing:"-0.5px",
      }}>
        {current}/{need}
      </span>
    </div>
  );
}

// ── Лого «Вкусно — и точка» SVG ──────────────────────────────────────────────
function VTLogo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {/* Красный круг с галочкой */}
      <div style={{
        width:36, height:36, borderRadius:"50%",
        background:"#D0212A",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 2px 10px rgba(208,33,42,0.35)",
        flexShrink:0,
      }}>
        <svg width={20} height={20} viewBox="0 0 20 20">
          <path d="M4,10 Q7,7 10,13 Q13,6 17,4" stroke="white" strokeWidth={2.5}
            fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {/* Текст */}
      <div style={{ lineHeight:1 }}>
        <div style={{
          fontSize:11, fontWeight:900, color:"#D0212A",
          fontFamily:"'Unbounded',sans-serif",
          letterSpacing:"0.03em",
        }}>
          ВКУСНО
        </div>
        <div style={{
          fontSize:8.5, fontWeight:700, color:"#888",
          fontFamily:"'Golos Text',sans-serif",
          letterSpacing:"0.08em",
        }}>
          — И ТОЧКА
        </div>
      </div>
    </div>
  );
}

// ── Экспорт ───────────────────────────────────────────────────────────────────
function exportSchedule(hour:number, day:number) {
  const dayNames = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
  const lines = [
    "РАСПИСАНИЕ — ВКУСНО И ТОЧКА", "=".repeat(32),
    `${dayNames[day]}, ${String(HOURS[hour]).padStart(2,"0")}:00`, "",
    "СОТРУДНИКИ:", ...WORKER_DEFS.map(w=>{
      const st = STATIONS.find(s=>s.id===w.home);
      return `  ${w.id}  →  ${st?.label}`;
    }), "",
    "ЗАГРУЗКА:", ...STATIONS.map(st=>{
      const cur=LOAD[st.id]?.[hour]??0, nd=NEED[st.id]??0;
      return `  ${st.label.padEnd(12)} ${"█".repeat(cur)}${"░".repeat(Math.max(0,nd-cur))}  ${cur}/${nd}`;
    }),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"}));
  a.download = `schedule_${DAYS[day]}_${String(HOURS[hour]).padStart(2,"0")}00.txt`;
  a.click();
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Index() {
  const [day,    setDay]     = useState(4);
  const [hour,   setHour]    = useState(5);
  const [playing,setPlaying] = useState(false);
  const [speed,  setSpeed]   = useState(1);
  const [workers,setWorkers] = useState<Worker[]>(initWorkers());
  const [busySt, setBusySt]  = useState<Record<string,boolean>>({});
  const [orderCount,setOrderCount] = useState(0);
  const [orders, setOrders]  = useState<{id:number;sid:string;text:string}[]>([]);

  const raf  = useRef<number>(0);
  const lts  = useRef(0);
  const accH = useRef(0);
  const accO = useRef(0);
  const pRef = useRef(playing); pRef.current = playing;
  const sRef = useRef(speed);   sRef.current = speed;
  const hRef = useRef(hour);    hRef.current = hour;
  const dRef = useRef(day);     dRef.current = day;

  const timeStr   = `${String(HOURS[hour]).padStart(2,"0")}:00`;
  const sliderPct = (hour/(HOURS.length-1))*100;

  const TASKS: Record<string,string[]> = {
    kitchen:["🍔 Бургер","🥩 Стейк","🥪 Сэндвич","🍗 Нагетсы"],
    fries:  ["🍟 Фри M","🍟 Фри L","🧂 Соус"],
    drinks: ["🥤 Кола","🧃 Сок","☕ Кофе"],
    counter:["💳 Оплата","📦 Выдача","🔄 Возврат"],
    hall:   ["🧹 Уборка","🪑 Стол №3","🪑 Стол №7"],
  };

  const tick = useCallback((ts:number)=>{
    raf.current = requestAnimationFrame(tick);
    if (!pRef.current){ lts.current=ts; return; }
    const dt = Math.min(ts-lts.current, 60);
    lts.current = ts;
    const spd = sRef.current;

    accH.current += dt;
    if (accH.current > 2200/spd){
      accH.current=0;
      let nh=hRef.current+1;
      if (nh>=HOURS.length){ nh=0; dRef.current=(dRef.current+1)%7; setDay(dRef.current); }
      hRef.current=nh; setHour(nh);
    }
    accO.current += dt;
    if (accO.current > 820/spd){
      accO.current=0;
      const st=STATIONS[Math.floor(Math.random()*STATIONS.length)];
      const list=TASKS[st.id];
      setOrders(p=>[...p.slice(-5),{id:Date.now()+Math.random(),sid:st.id,text:list[Math.floor(Math.random()*list.length)]}]);
      setOrderCount(c=>c+1);
      setBusySt(p=>({...p,[st.id]:true}));
      const t=setTimeout(()=>setBusySt(p=>({...p,[st.id]:false})),Math.max(350,1100/spd));
      void t;
    }
    setWorkers(prev=>prev.map(w=>{
      const dx=w.tx-w.x, dy=w.ty-w.y, dist=Math.hypot(dx,dy);
      let {x,y,tx,ty,walkPhase,facing}=w;
      if (dist<0.25){
        const r=Math.random()*1000;
        if (r<22*spd){
          const dest=STATIONS[Math.floor(Math.random()*STATIONS.length)];
          const p=rndInStation(dest); tx=p.x; ty=p.y;
        } else if (r<70){
          const home=STATIONS.find(s=>s.id===w.homeStation)??STATIONS[0];
          const p=rndInStation(home); tx=p.x; ty=p.y;
        }
        walkPhase=(walkPhase+0.01)%1;
      } else {
        const step=(dt/1000)*9*spd;
        x+=dx/dist*Math.min(step,dist); y+=dy/dist*Math.min(step,dist);
        facing=dx>0?"right":"left";
        walkPhase=(walkPhase+dt*0.005*spd)%1;
      }
      return {...w,x,y,tx,ty,walkPhase,facing};
    }));
  },[]); // eslint-disable-line

  useEffect(()=>{ raf.current=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf.current); },[tick]);

  const reset=()=>{
    setPlaying(false); setDay(4); setHour(5);
    setWorkers(initWorkers()); setOrderCount(0); setOrders([]); setBusySt({});
    accH.current=0; accO.current=0;
  };

  const stationStaff: Record<string,number> = {};
  STATIONS.forEach(st=>{ stationStaff[st.id]=0; });
  workers.forEach(w=>{ stationStaff[w.homeStation]=(stationStaff[w.homeStation]??0)+1; });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", overflow:"hidden",
      background:"linear-gradient(170deg,#FBF0E4 0%,#F5E6D0 100%)",
      fontFamily:"'Golos Text',sans-serif" }}>

      {/* ── ХЕДЕР ── */}
      <header style={{
        display:"flex", alignItems:"center", gap:16,
        padding:"10px 20px", flexShrink:0,
        background:"rgba(255,255,255,0.6)",
        backdropFilter:"blur(14px)",
        borderBottom:"1px solid rgba(208,33,42,0.1)",
      }}>
        {/* Логотип */}
        <VTLogo/>

        {/* Разделитель */}
        <div style={{ width:1, height:28, background:"rgba(0,0,0,0.1)", margin:"0 4px" }}/>

        {/* Часы */}
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          background:"#D0212A", borderRadius:12, padding:"6px 14px",
          color:"#fff", fontFamily:"'Unbounded',sans-serif", fontSize:15, fontWeight:900,
          boxShadow:"0 3px 14px rgba(208,33,42,0.35)",
        }}>
          <Icon name="Clock" size={14}/>
          {timeStr}
        </div>

        {/* Дни */}
        <div style={{ display:"flex", gap:4, marginLeft:4 }}>
          {DAYS.map((d,i)=>(
            <button key={d} onClick={()=>setDay(i)} style={{
              width:32, height:32, borderRadius:9,
              fontSize:8, fontWeight:900, fontFamily:"'Unbounded',sans-serif",
              background: day===i ? "#D0212A" : "rgba(208,33,42,0.07)",
              color: day===i ? "#fff" : "#C03030",
              border:`1.5px solid ${day===i?"#D0212A":"rgba(208,33,42,0.18)"}`,
              cursor:"pointer", transition:"all 0.15s",
            }}>{d}</button>
          ))}
        </div>

        {/* Спейсер */}
        <div style={{ flex:1 }}/>

        {/* Счётчик заказов */}
        <div style={{
          padding:"5px 12px", borderRadius:9,
          border:"1.5px solid rgba(208,33,42,0.2)",
          color:"#B02020", fontSize:11, fontWeight:800,
          fontFamily:"'Unbounded',sans-serif",
          background:"rgba(208,33,42,0.05)",
        }}>
          📋 {orderCount}
        </div>

        {/* Экспорт */}
        <button onClick={()=>exportSchedule(hour,day)} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"7px 16px", borderRadius:11,
          background:"#D0212A", color:"#fff", border:"none", cursor:"pointer",
          fontFamily:"'Unbounded',sans-serif", fontSize:9, fontWeight:900, letterSpacing:"0.07em",
          boxShadow:"0 3px 12px rgba(208,33,42,0.4)", transition:"opacity 0.15s",
        }}>
          <Icon name="Download" size={13}/>
          ЭКСПОРТ
        </button>
      </header>

      {/* ── СЦЕНА ── */}
      <div style={{
        flex:1, position:"relative", margin:"12px 16px 8px",
        borderRadius:24, overflow:"hidden", minHeight:380,
        background:"#EDE0CC",
        boxShadow:"0 4px 32px rgba(140,90,40,0.12)",
        border:"1.5px solid rgba(180,140,90,0.22)",
      }}>
        {/* Тёплый пол — градиент без шахматки */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse at 40% 110%, #D8C9A8 0%, #EDE0CC 65%)",
        }}/>
        {/* Еле заметные линии пола */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.22 }}
          preserveAspectRatio="none">
          <defs>
            <pattern id="fl" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
              <line x1="0" y1="30" x2="60" y2="0" stroke="#A08050" strokeWidth="0.7"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fl)"/>
        </svg>

        {/* ── СТАНЦИИ ── */}
        {STATIONS.map(st=>{
          const busy = busySt[st.id];
          const cur  = stationStaff[st.id]??0;
          const need = NEED[st.id]??0;

          return (
            <div key={st.id} style={{
              position:"absolute",
              left:`${st.x}%`, top:`${st.y}%`,
              width:`${st.w}%`, height:`${st.h}%`,
              borderRadius:18,
              background: busy
                ? `linear-gradient(145deg,rgba(255,255,255,0.7),${st.color}22)`
                : "rgba(255,255,255,0.52)",
              border:`2.5px solid ${busy ? st.color+"CC" : st.color+"50"}`,
              boxShadow: busy
                ? `0 0 28px ${st.color}44, inset 0 0 18px ${st.color}14`
                : `0 2px 16px rgba(0,0,0,0.06)`,
              backdropFilter:"blur(6px)",
              transform: busy?"scale(1.012)":"scale(1)",
              transition:"all 0.25s",
              display:"flex", flexDirection:"column",
              overflow:"hidden",
            }}>
              {/* Цветная полоска */}
              <div style={{ height:4, background:`linear-gradient(90deg,${st.color},${st.color}44)`, flexShrink:0 }}/>

              <div style={{ flex:1, padding:"8px 10px 8px", display:"flex", flexDirection:"column" }}>
                {/* Иконка + название */}
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:18 }}>{st.emoji}</span>
                  <span style={{
                    fontSize:10, fontWeight:900, color:st.color,
                    fontFamily:"'Unbounded',sans-serif", lineHeight:1.1,
                  }}>{st.label}</span>
                  {busy && <div style={{
                    marginLeft:"auto", width:7, height:7, borderRadius:"50%",
                    background:st.color, boxShadow:`0 0 8px ${st.color}`,
                    animation:"pls 0.65s ease-in-out infinite",
                  }}/>}
                </div>

                {/* Индикатор — снизу справа */}
                <div style={{ marginTop:"auto", display:"flex", justifyContent:"flex-end" }}>
                  <StaffBadge current={cur} need={need} color={st.color}/>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── ВОРКЕРЫ ── */}
        {workers.map(w=>(
          <div key={w.id} style={{
            position:"absolute",
            left:`${w.x}%`, top:`${w.y}%`,
            transform:`translate(-50%,-100%) scaleX(${w.facing==="left"?-1:1})`,
            zIndex:Math.round(w.y*10)+50,
            transition:"left 0.07s linear,top 0.07s linear",
            pointerEvents:"none",
          }}>
            <Char w={w}/>
            <div style={{
              position:"absolute", bottom:-15, left:"50%",
              transform:`translateX(-50%) scaleX(${w.facing==="left"?-1:1})`,
              background:"#D0212A", color:"#fff",
              borderRadius:5, padding:"1px 5px",
              fontSize:7, fontWeight:800, whiteSpace:"nowrap",
              fontFamily:"'Golos Text',sans-serif",
              boxShadow:"0 1px 5px rgba(208,33,42,0.4)",
            }}>{w.id}</div>
          </div>
        ))}

        {/* ── Лента заказов ── */}
        <div style={{
          position:"absolute", top:10, right:10,
          display:"flex", flexDirection:"column", gap:4,
          alignItems:"flex-end", zIndex:100, pointerEvents:"none",
        }}>
          {orders.slice(-4).reverse().map(o=>{
            const st=STATIONS.find(s=>s.id===o.sid);
            return (
              <div key={o.id} style={{
                padding:"4px 10px", borderRadius:20,
                background:`${st?.color??"#D0212A"}18`,
                border:`1.5px solid ${st?.color??"#D0212A"}44`,
                color:st?.color??"#D0212A",
                fontSize:9, fontWeight:700, whiteSpace:"nowrap",
                fontFamily:"'Golos Text',sans-serif",
                backdropFilter:"blur(6px)",
                animation:"slr 0.2s ease-out",
              }}>{o.text}</div>
            );
          })}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div style={{ padding:"0 24px 4px", flexShrink:0 }}>
        <div style={{ position:"relative", height:24, display:"flex", alignItems:"center", cursor:"pointer" }}
          onClick={e=>{
            const rect=e.currentTarget.getBoundingClientRect();
            setHour(Math.round(Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width))*(HOURS.length-1)));
          }}>
          <div style={{ position:"absolute", inset:0, margin:"auto", height:10,
            borderRadius:99, background:"rgba(200,150,100,0.2)" }}/>
          <div style={{ position:"absolute", left:0, height:10, top:"50%", transform:"translateY(-50%)",
            borderRadius:99, width:`${sliderPct}%`,
            background:"linear-gradient(90deg,#D0212A,#F05050)", transition:"width 0.3s" }}/>
          <div style={{
            position:"absolute", left:`${sliderPct}%`, width:20, height:20,
            borderRadius:"50%", transform:"translateX(-50%)",
            background:"#D0212A", border:"3px solid #fff",
            boxShadow:"0 2px 10px rgba(208,33,42,0.5)", transition:"left 0.3s",
          }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
          {HOURS.map((h,i)=>(
            <button key={h} onClick={()=>setHour(i)} style={{
              fontSize:8, fontWeight:700, width:20, textAlign:"center",
              border:"none", background:"none", cursor:"pointer",
              color:i===hour?"#D0212A":"rgba(160,90,50,0.45)",
              fontFamily:"'Golos Text',sans-serif",
            }}>{i%2===0?String(h).padStart(2,"0"):"·"}</button>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ position:"relative", display:"flex", alignItems:"center",
        justifyContent:"center", gap:18, padding:"4px 0 16px", flexShrink:0 }}>

        <div style={{ position:"absolute", left:20, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:8, fontWeight:700, color:"rgba(170,70,50,0.5)", fontFamily:"'Golos Text',sans-serif" }}>СКОРОСТЬ</span>
          {[1,2,3].map(s=>(
            <button key={s} onClick={()=>setSpeed(s)} style={{
              width:32, height:30, borderRadius:9,
              fontSize:10, fontWeight:900, fontFamily:"'Unbounded',sans-serif",
              background:speed===s?"#D0212A":"rgba(208,33,42,0.08)",
              color:speed===s?"#fff":"#C02020",
              border:`1.5px solid ${speed===s?"#D0212A":"rgba(208,33,42,0.22)"}`,
              cursor:"pointer", transition:"all 0.15s",
            }}>{s}x</button>
          ))}
        </div>

        <button onClick={()=>setHour(h=>Math.max(0,h-1))}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#D0212A" }}>
          <Icon name="Rewind" size={28}/>
        </button>
        <button onClick={()=>setPlaying(p=>!p)} style={{
          width:52,height:52,borderRadius:"50%",border:"none",cursor:"pointer",
          background:"#D0212A",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 6px 22px rgba(208,33,42,0.45)",transition:"transform 0.1s",
        }}>
          <Icon name={playing?"Pause":"Play"} size={22}/>
        </button>
        <button onClick={()=>setHour(h=>Math.min(HOURS.length-1,h+1))}
          style={{ background:"none",border:"none",cursor:"pointer",color:"#D0212A" }}>
          <Icon name="FastForward" size={28}/>
        </button>

        <button onClick={reset} style={{
          position:"absolute", right:20,
          display:"flex", alignItems:"center", gap:6,
          padding:"6px 14px", borderRadius:10,
          background:"rgba(208,33,42,0.07)",
          border:"1.5px solid rgba(208,33,42,0.22)",
          color:"#C02020", fontSize:11, fontWeight:700,
          fontFamily:"'Golos Text',sans-serif", cursor:"pointer",
        }}>
          <Icon name="RotateCcw" size={13}/>
          Сброс
        </button>
      </div>

      <style>{`
        @keyframes pls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.7)} }
        @keyframes slr { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
