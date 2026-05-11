import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const STATIONS = [
  { id: "kitchen", label: "Кухня", icon: "🍳", color: "#ff7a1a", workers: ["Иван", "Марина"] },
  { id: "counter", label: "Прилавок", icon: "🏪", color: "#9b4dff", workers: ["Света"] },
  { id: "drinks", label: "Напитки", icon: "🥤", color: "#00e5ff", workers: ["Дима"] },
  { id: "fries", label: "Картофель фри", icon: "🍟", color: "#ffd700", workers: ["Катя"] },
  { id: "hall", label: "Зал", icon: "🪑", color: "#39ff14", workers: ["Алекс", "Настя"] },
];

type WorkerState = "idle" | "busy" | "walking" | "break";

interface Worker {
  id: string;
  name: string;
  stationId: string;
  state: WorkerState;
  x: number;
  targetX: number;
  emoji: string;
}

interface Order {
  id: number;
  stationId: string;
  text: string;
}

const WORKER_EMOJIS = ["🧑‍🍳", "👩‍🍳", "🧑‍💼", "👩‍💼", "🧑", "👩"];

const ORDER_TEMPLATES: Record<string, string[]> = {
  kitchen: ["Бургер x2", "Сэндвич x1", "Нагетсы x3", "Шаурма x1", "Стейк x2"],
  counter: ["Заказ #142", "Оплата", "Возврат", "Заказ #143", "Комбо x2"],
  drinks: ["Кола L", "Сок x2", "Вода x3", "Шейк ваниль", "Кофе x1"],
  fries: ["Фри M x2", "Фри L x1", "Фри S x4", "Доп. соус", "Фри XL x2"],
  hall: ["Стол №3", "Уборка", "Стол №7", "Встреча гостей", "Стол №1"],
};

function createInitialWorkers(): Worker[] {
  let wi = 0;
  const workers: Worker[] = [];
  STATIONS.forEach((station, si) => {
    station.workers.forEach((name, idx) => {
      workers.push({
        id: `${station.id}-${idx}`,
        name,
        stationId: station.id,
        state: "idle",
        x: 12 + si * 17 + idx * 5,
        targetX: 12 + si * 17 + idx * 5,
        emoji: WORKER_EMOJIS[wi++ % WORKER_EMOJIS.length],
      });
    });
  });
  return workers;
}

export default function Index() {
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [workers, setWorkers] = useState<Worker[]>(createInitialWorkers());
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const [orderCounter, setOrderCounter] = useState(0);
  const [busyStations, setBusyStations] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentTime = HOURS[hour];
  const timeStr = `${String(currentTime).padStart(2, "0")}:00`;

  const spawnOrder = useCallback(() => {
    const station = STATIONS[Math.floor(Math.random() * STATIONS.length)];
    const templates = ORDER_TEMPLATES[station.id];
    const text = templates[Math.floor(Math.random() * templates.length)];
    const newOrder: Order = { id: Date.now() + Math.random(), stationId: station.id, text };
    setOrders((prev) => [...prev.slice(-10), newOrder]);
    setOrderCounter((c) => c + 1);

    setBusyStations((prev) => ({ ...prev, [station.id]: true }));
    const timeout = setTimeout(() => {
      setBusyStations((prev) => ({ ...prev, [station.id]: false }));
    }, Math.max(400, 2000 / speed));

    const px = 10 + STATIONS.findIndex((s) => s.id === station.id) * 19;
    setParticles((prev) => [...prev.slice(-6), { id: Date.now(), x: px, y: 40, text: "+1", color: station.color }]);
    const pTimeout = setTimeout(() => setParticles((prev) => prev.slice(1)), 1500);

    return () => { clearTimeout(timeout); clearTimeout(pTimeout); };
  }, [speed]);

  const moveWorkers = useCallback(() => {
    setWorkers((prev) =>
      prev.map((w) => {
        const r = Math.random();
        let newState: WorkerState = w.state;
        let newTarget = w.targetX;

        if (r < 0.2) {
          const si = Math.floor(Math.random() * STATIONS.length);
          newTarget = 8 + si * 17 + Math.random() * 8;
          newState = "walking";
        } else if (r < 0.4) {
          newState = "busy";
        } else if (r < 0.5) {
          newState = "break";
        } else {
          newState = "idle";
        }

        const newX = w.x + (newTarget - w.x) * 0.35;
        return { ...w, state: newState, x: newX, targetX: newTarget };
      })
    );
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (orderTimerRef.current) clearInterval(orderTimerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setHour((h) => {
        const next = h + 1;
        if (next >= HOURS.length) {
          setDay((d) => (d + 1) % 7);
          return 0;
        }
        return next;
      });
      moveWorkers();
    }, 1500 / speed);

    orderTimerRef.current = setInterval(() => {
      spawnOrder();
    }, 900 / speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (orderTimerRef.current) clearInterval(orderTimerRef.current);
    };
  }, [isPlaying, speed, moveWorkers, spawnOrder]);

  const reset = () => {
    setIsPlaying(false);
    setDay(0);
    setHour(0);
    setOrders([]);
    setWorkers(createInitialWorkers());
    setOrderCounter(0);
    setBusyStations({});
    setParticles([]);
  };

  const stationOrders = (sid: string) => orders.filter((o) => o.stationId === sid).slice(-3);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden floor-grid scanlines">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ff7a1a 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-20 w-[450px] h-[450px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #9b4dff 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full opacity-6"
          style={{ background: "radial-gradient(circle, #00e5ff 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-black/30">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍔</span>
            <div>
              <h1 className="font-['Unbounded'] text-base md:text-lg font-black leading-none"
                style={{ background: "linear-gradient(90deg, #ff7a1a, #ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                RESTO SIM
              </h1>
              <p className="text-[10px] text-white/30 font-['Golos_Text']">симулятор ресторанной смены</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5 text-xs text-white/40 font-['Golos_Text']">
            <span>Заказов: <span className="font-bold" style={{ color: "#ffd700" }}>{orderCounter}</span></span>
            <span>Сотрудников: <span className="font-bold" style={{ color: "#39ff14" }}>{workers.filter((w) => w.state !== "break").length}</span></span>
            <span>Активных станций: <span className="font-bold" style={{ color: "#00e5ff" }}>{Object.values(busyStations).filter(Boolean).length}</span></span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? "animate-blink" : ""}`}
              style={{ backgroundColor: isPlaying ? "#39ff14" : "#555", boxShadow: isPlaying ? "0 0 8px #39ff14" : "none" }} />
            <span className="text-[10px] font-['Unbounded'] text-white/40">{isPlaying ? "LIVE" : "СТОП"}</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 p-4 md:p-6 space-y-4">

        {/* Clock + Day picker */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-baseline gap-3">
            <div className="font-['Unbounded'] text-5xl md:text-6xl font-black leading-none"
              style={{ color: "#00e5ff", textShadow: "0 0 30px rgba(0,229,255,0.6)" }}>
              {timeStr}
            </div>
            <div>
              <div className="text-[10px] text-white/30 font-['Golos_Text'] uppercase tracking-widest">День</div>
              <div className="font-['Unbounded'] text-2xl font-black text-white">{DAYS[day]}</div>
            </div>
          </div>

          <div className="flex gap-1.5">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => { setDay(i); setHour(0); }}
                className="w-9 h-9 rounded-xl text-[10px] font-['Unbounded'] font-bold transition-all duration-200"
                style={{
                  background: day === i ? "linear-gradient(135deg, #ff7a1a, #ffd700)" : "rgba(255,255,255,0.05)",
                  color: day === i ? "#000" : "rgba(255,255,255,0.4)",
                  boxShadow: day === i ? "0 0 18px rgba(255,122,26,0.5)" : "none",
                  border: `1px solid ${day === i ? "rgba(255,200,50,0.5)" : "rgba(255,255,255,0.08)"}`,
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Hour timeline */}
        <div className="relative rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: `linear-gradient(90deg, rgba(255,122,26,0.12) 0%, rgba(255,122,26,0.06) ${(hour / (HOURS.length - 1)) * 100}%, transparent ${(hour / (HOURS.length - 1)) * 100}%)`,
              transition: "background 0.6s ease",
            }} />
          <div className="relative flex gap-0.5 p-2">
            {HOURS.map((h, i) => {
              const isCurrent = i === hour;
              const isPast = i < hour;
              return (
                <button key={h} onClick={() => setHour(i)}
                  className="flex-1 flex flex-col items-center py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: isCurrent ? "rgba(255,122,26,0.2)" : "transparent",
                    border: `1px solid ${isCurrent ? "rgba(255,122,26,0.5)" : "transparent"}`,
                    boxShadow: isCurrent ? "0 0 10px rgba(255,122,26,0.3)" : "none",
                  }}>
                  <span className="text-[9px] font-['Unbounded'] font-bold"
                    style={{ color: isCurrent ? "#ff7a1a" : isPast ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)" }}>
                    {String(h).padStart(2, "0")}
                  </span>
                  <div className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: isCurrent ? "#ff7a1a" : isPast ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)" }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Restaurant floor */}
        <div className="relative rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(8,10,18,0.97) 0%, rgba(4,6,12,0.99) 100%)", minHeight: 300 }}>

          <div className="absolute top-3 left-4 text-[9px] font-['Unbounded'] tracking-widest uppercase text-white/15">
            Ресторанный зал
          </div>

          {/* Floating particles */}
          {particles.map((p) => (
            <div key={p.id} className="absolute animate-float-up font-['Unbounded'] font-black text-base pointer-events-none z-20"
              style={{ left: `${p.x}%`, top: "32%", color: p.color, textShadow: `0 0 12px ${p.color}` }}>
              {p.text}
            </div>
          ))}

          {/* Stations grid */}
          <div className="grid grid-cols-5 gap-2 p-4 pt-8">
            {STATIONS.map((station, si) => {
              const isBusy = busyStations[station.id];
              const isActive = activeStation === station.id;
              const stOrders = stationOrders(station.id);

              return (
                <button key={station.id}
                  onClick={() => setActiveStation(isActive ? null : station.id)}
                  className="relative flex flex-col items-center rounded-xl p-2 md:p-3 transition-all duration-300"
                  style={{
                    background: isActive ? `${station.color}15` : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isActive ? station.color + "55" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: isBusy ? `0 0 28px ${station.color}35, inset 0 0 18px ${station.color}08` : "none",
                  }}>

                  {isBusy && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-blink"
                      style={{ backgroundColor: station.color, boxShadow: `0 0 8px ${station.color}` }} />
                  )}

                  <span className={`text-2xl md:text-3xl mb-1 ${isBusy ? "animate-worker-busy" : ""}`}>
                    {station.icon}
                  </span>

                  <span className="font-['Unbounded'] font-bold text-[7px] md:text-[9px] text-center leading-tight"
                    style={{ color: station.color }}>
                    {station.label}
                  </span>

                  <div className="flex gap-0.5 mt-1.5">
                    {station.workers.map((_, wi) => {
                      const worker = workers.find((w) => w.id === `${station.id}-${wi}`);
                      return (
                        <span key={wi} className="text-sm leading-none"
                          style={{ filter: worker?.state === "break" ? "grayscale(1) opacity(0.35)" : "none" }}>
                          {worker?.emoji || "🧑"}
                        </span>
                      );
                    })}
                  </div>

                  {isActive && stOrders.length > 0 && (
                    <div className="mt-2 w-full space-y-0.5">
                      {stOrders.map((o) => (
                        <div key={o.id} className="text-[7px] md:text-[8px] rounded-md px-1.5 py-0.5 animate-order-appear font-['Golos_Text'] truncate"
                          style={{
                            background: `${station.color}18`,
                            border: `1px solid ${station.color}35`,
                            color: station.color,
                          }}>
                          {o.text}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Movement track */}
          <div className="relative mx-4 mb-3 h-14 rounded-xl border border-white/5"
            style={{ background: "rgba(0,229,255,0.015)" }}>
            <span className="absolute left-2 top-1 text-[7px] font-['Unbounded'] text-white/15 uppercase tracking-widest">
              движение персонала
            </span>
            {workers.map((worker) => (
              <div key={worker.id}
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ease-in-out"
                style={{ left: `${Math.min(95, Math.max(2, worker.x))}%` }}>
                <span className={`text-lg leading-none ${worker.state === "walking" ? "animate-worker-walk" : worker.state === "busy" ? "animate-worker-busy" : ""}`}
                  style={{ filter: worker.state === "break" ? "grayscale(1) brightness(0.4)" : "none" }}>
                  {worker.emoji}
                </span>
                <span className="text-[6px] font-['Golos_Text'] text-white/25 leading-none whitespace-nowrap">{worker.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {/* Playback */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying((p) => !p)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-['Unbounded'] font-bold text-xs md:text-sm transition-all duration-200"
              style={{
                background: isPlaying ? "linear-gradient(135deg, #ff3d9a, #9b4dff)" : "linear-gradient(135deg, #ff7a1a, #ffd700)",
                color: "#000",
                boxShadow: isPlaying ? "0 0 22px rgba(255,61,154,0.45)" : "0 0 22px rgba(255,122,26,0.45)",
              }}>
              <Icon name={isPlaying ? "Pause" : "Play"} size={15} />
              {isPlaying ? "Пауза" : "Старт"}
            </button>

            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-['Golos_Text'] font-semibold text-sm transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.55)",
              }}>
              <Icon name="RotateCcw" size={13} />
              Сброс
            </button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Golos_Text'] text-white/35">Скорость:</span>
            {[1, 2, 3].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className="w-11 h-9 rounded-xl font-['Unbounded'] font-bold text-sm transition-all duration-200"
                style={{
                  background: speed === s ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${speed === s ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: speed === s ? "#00e5ff" : "rgba(255,255,255,0.35)",
                  boxShadow: speed === s ? "0 0 14px rgba(0,229,255,0.3)" : "none",
                }}>
                {s}x
              </button>
            ))}
          </div>

          {/* Recent orders mini-feed */}
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[9px] font-['Unbounded'] text-white/25 whitespace-nowrap">Лента:</span>
            <div className="flex gap-1 overflow-hidden max-w-[240px]">
              {orders.slice(-4).reverse().map((o) => {
                const st = STATIONS.find((s) => s.id === o.stationId);
                return (
                  <span key={o.id} className="text-[8px] px-1.5 py-0.5 rounded font-['Golos_Text'] whitespace-nowrap animate-order-appear flex-shrink-0"
                    style={{ background: `${st?.color}16`, border: `1px solid ${st?.color}28`, color: st?.color }}>
                    {st?.icon} {o.text}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Station stats */}
        <div className="grid grid-cols-5 gap-2">
          {STATIONS.map((station) => {
            const sw = workers.filter((w) => w.id.startsWith(station.id));
            return (
              <div key={station.id} className="rounded-xl p-2 md:p-3 border border-white/6"
                style={{ background: "rgba(255,255,255,0.018)" }}>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-sm">{station.icon}</span>
                  <span className="font-['Unbounded'] text-[7px] md:text-[8px] font-bold leading-tight"
                    style={{ color: station.color }}>
                    {station.label}
                  </span>
                </div>
                <div className="space-y-0.5 text-[7px] md:text-[8px] font-['Golos_Text'] text-white/40">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#39ff14" }} />
                    Занято: {sw.filter((w) => w.state === "busy").length}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#00e5ff" }} />
                    Движение: {sw.filter((w) => w.state === "walking").length}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#555" }} />
                    Перерыв: {sw.filter((w) => w.state === "break").length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
