import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const STATIONS = [
  {
    id: "drinks", label: "НАПИТКИ", row: 0,
    img: "https://cdn.poehali.dev/projects/5ec388a2-1992-46c7-ad2f-3b1191ee9b96/files/dd9db956-0947-4619-a198-e441130d884e.jpg",
    workers: ["Дима", "Лена"],
  },
  {
    id: "kitchen", label: "КУХНЯ", row: 0,
    img: "https://cdn.poehali.dev/projects/5ec388a2-1992-46c7-ad2f-3b1191ee9b96/files/8a5452ff-9d6e-4557-bfb9-c202464e9e2e.jpg",
    workers: ["Иван", "Марина"],
  },
  {
    id: "fries", label: "КАРТОФЕЛЬ", row: 0,
    img: "https://cdn.poehali.dev/projects/5ec388a2-1992-46c7-ad2f-3b1191ee9b96/files/5f92b916-3478-4cbf-a8d2-7a21d7033024.jpg",
    workers: ["Катя"],
  },
  {
    id: "counter", label: "ПРИЛАВОК", row: 1,
    img: "https://cdn.poehali.dev/projects/5ec388a2-1992-46c7-ad2f-3b1191ee9b96/files/ac070741-8abb-4e89-80a8-30577e050cda.jpg",
    workers: ["Света", "Коля"],
  },
  {
    id: "hall", label: "ЗАЛ", row: 1,
    img: "https://cdn.poehali.dev/projects/5ec388a2-1992-46c7-ad2f-3b1191ee9b96/files/f04ddebd-3bcb-46b9-bd6f-608e4e4db6ac.jpg",
    workers: ["Алекс", "Настя"],
  },
];

const PEOPLE_COUNTS: Record<string, number[]> = {
  drinks:  [4,5,6,9,14,18,22,28,30,26,20,15,10,8,6,4],
  kitchen: [3,4,5,8,12,16,20,25,28,24,18,13,9,7,5,3],
  fries:   [2,3,4,7,11,15,18,22,25,21,16,11,8,6,4,2],
  counter: [5,6,7,10,15,20,25,32,35,30,22,16,12,9,7,5],
  hall:    [8,10,12,16,22,28,34,40,45,38,30,22,16,12,9,7],
};

const EMOJIS = ["🧑‍🍳","👩‍🍳","🧑‍💼","👩‍💼","🧑","👩"];

type WState = "idle" | "busy" | "walking";

interface Worker { id: string; name: string; stationId: string; state: WState; }

function buildWorkers(): Worker[] {
  return STATIONS.flatMap((s) =>
    s.workers.map((name, i) => ({ id: `${s.id}-${i}`, name, stationId: s.id, state: "idle" as WState }))
  );
}

export default function Index() {
  const [day, setDay] = useState(6);
  const [hour, setHour] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [workers, setWorkers] = useState<Worker[]>(buildWorkers());
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [busyStations, setBusyStations] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentHour = HOURS[hour];
  const timeStr = `${String(currentHour).padStart(2, "0")}:00`;
  const totalPeople = Object.values(PEOPLE_COUNTS).reduce((s, arr) => s + (arr[hour] ?? 0), 0);
  const sliderPct = (hour / (HOURS.length - 1)) * 100;

  const tickWorkers = useCallback(() => {
    setWorkers((prev) =>
      prev.map((w) => {
        const r = Math.random();
        return { ...w, state: r < 0.35 ? "busy" : r < 0.5 ? "walking" : "idle" };
      })
    );
    const sid = STATIONS[Math.floor(Math.random() * STATIONS.length)].id;
    setBusyStations((prev) => ({ ...prev, [sid]: true }));
    const t = setTimeout(() => setBusyStations((prev) => ({ ...prev, [sid]: false })), Math.max(300, 1100 / speed));
    return () => clearTimeout(t);
  }, [speed]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (workerTimerRef.current) clearInterval(workerTimerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setHour((h) => {
        if (h + 1 >= HOURS.length) { setDay((d) => (d + 1) % 7); return 0; }
        return h + 1;
      });
    }, 2000 / speed);
    workerTimerRef.current = setInterval(tickWorkers, 650 / speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (workerTimerRef.current) clearInterval(workerTimerRef.current);
    };
  }, [isPlaying, speed, tickWorkers]);

  const reset = () => {
    setIsPlaying(false); setDay(6); setHour(5);
    setWorkers(buildWorkers()); setBusyStations({});
  };

  const StationCard = ({ station }: { station: typeof STATIONS[0] }) => {
    const isBusy = busyStations[station.id];
    const isActive = activeStation === station.id;
    const sw = workers.filter((w) => w.stationId === station.id);
    const count = PEOPLE_COUNTS[station.id]?.[hour] ?? 0;

    return (
      <button
        onClick={() => setActiveStation(isActive ? null : station.id)}
        className="relative rounded-3xl overflow-hidden transition-all duration-200 w-full"
        style={{
          aspectRatio: "16/9",
          boxShadow: isActive
            ? "0 12px 48px rgba(232,93,68,0.55), 0 0 0 3.5px #e85d44"
            : isBusy
            ? "0 8px 32px rgba(232,93,68,0.28)"
            : "0 4px 24px rgba(180,100,80,0.13)",
          transform: isActive ? "scale(1.04)" : isBusy ? "scale(1.015)" : "scale(1)",
        }}
      >
        {/* Photo */}
        <img src={station.img} alt={station.label}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
          style={{ filter: isBusy ? "brightness(1.08) saturate(1.15)" : "brightness(0.92) saturate(1.05)" }} />

        {/* Coral overlay */}
        <div className="absolute inset-0 transition-opacity duration-300"
          style={{ background: "rgba(232,93,68,0.52)", opacity: isBusy ? 0.7 : 1 }} />

        {/* Busy ring flash */}
        {isBusy && (
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ border: "4px solid rgba(255,255,255,0.7)", boxShadow: "inset 0 0 20px rgba(255,200,150,0.3)" }} />
        )}

        {/* Workers (shown when active) */}
        {isActive && (
          <div className="absolute top-3 left-3 flex gap-2">
            {sw.map((w, i) => (
              <div key={w.id} className="flex flex-col items-center bg-black/25 rounded-lg px-1.5 py-1 backdrop-blur-sm">
                <span className="text-xl leading-none"
                  style={{
                    animation: w.state === "busy" ? "worker-busy 0.55s ease-in-out infinite"
                      : w.state === "walking" ? "worker-walk 1.2s ease-in-out infinite"
                      : "none",
                  }}>
                  {EMOJIS[i % EMOJIS.length]}
                </span>
                <span className="text-[8px] text-white font-bold leading-tight mt-0.5"
                  style={{ fontFamily: "'Golos Text',sans-serif" }}>
                  {w.name}
                </span>
                <span className="text-[7px] leading-none"
                  style={{ color: w.state === "busy" ? "#7fff7f" : w.state === "walking" ? "#7fd4ff" : "rgba(255,255,255,0.5)" }}>
                  {w.state === "busy" ? "раб." : w.state === "walking" ? "идёт" : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom label */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 flex items-end justify-between">
          <span className="font-black text-white text-base md:text-xl leading-none drop-shadow-lg"
            style={{ fontFamily: "'Unbounded',sans-serif" }}>
            {station.label}
          </span>
          <span className="text-white/85 text-xs md:text-sm font-semibold bg-black/25 rounded-full px-2 py-0.5"
            style={{ fontFamily: "'Golos Text',sans-serif" }}>
            {count} чел.
          </span>
        </div>
      </button>
    );
  };

  const row0 = STATIONS.filter((s) => s.row === 0);
  const row1 = STATIONS.filter((s) => s.row === 1);

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: "linear-gradient(155deg, #faeee6 0%, #f5e0d0 55%, #efd5c0 100%)" }}>

      {/* TOP BAR */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 relative">
        {/* Logo dots */}
        <div className="flex items-center gap-1.5">
          {[0,1,2].map((i) => (
            <div key={i} className="rounded-full" style={{ width: 14, height: 14, background: "#e85d44", opacity: 1 - i * 0.25 }} />
          ))}
        </div>

        {/* Save */}
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#e85d44] hover:text-white group"
          style={{
            border: "2px solid #e85d44", color: "#e85d44", background: "transparent",
            fontFamily: "'Unbounded',sans-serif", letterSpacing: "0.1em",
          }}>
          СОХРАНИТЬ РАСПИСАНИЕ
          <Icon name="Download" size={13} />
        </button>

        {/* Right badges */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black"
            style={{
              background: "#e85d44", color: "#fff",
              fontFamily: "'Unbounded',sans-serif", fontSize: 16,
              boxShadow: "0 4px 18px rgba(232,93,68,0.4)",
            }}>
            <Icon name="Clock" size={16} />
            {timeStr}
          </div>

          <div className="px-4 py-2.5 rounded-full font-black text-xs"
            style={{
              border: "2px solid #e85d44", color: "#e85d44",
              fontFamily: "'Unbounded',sans-serif",
            }}>
            {DAYS[day]}
          </div>

          <div className="px-4 py-2.5 rounded-full font-black text-xs"
            style={{
              border: "2px solid #e85d44", color: "#e85d44",
              fontFamily: "'Unbounded',sans-serif",
            }}>
            {totalPeople} чел.
          </div>
        </div>
      </header>

      {/* STATION CARDS */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-10 gap-4 py-2">
        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-4">
          {row0.map((s) => <StationCard key={s.id} station={s} />)}
        </div>
        {/* Row 2 — centered */}
        <div className="flex justify-center gap-4">
          {row1.map((s) => (
            <div key={s.id} style={{ width: "calc(33.333% - 8px)" }}>
              <StationCard station={s} />
            </div>
          ))}
        </div>
      </main>

      {/* TIMELINE SLIDER */}
      <div className="px-10 md:px-14 pb-1 pt-2">
        <div className="relative h-8 flex items-center cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            setHour(Math.round(ratio * (HOURS.length - 1)));
          }}>
          {/* Track background */}
          <div className="absolute left-0 right-0 h-3 rounded-full"
            style={{ background: "rgba(200,130,100,0.22)" }} />
          {/* Track fill */}
          <div className="absolute left-0 h-3 rounded-full transition-all duration-300"
            style={{ width: `${sliderPct}%`, background: "linear-gradient(90deg, #e85d44, #ff8a70)" }} />
          {/* Thumb */}
          <div className="absolute w-5 h-5 rounded-full -translate-x-1/2 transition-all duration-300"
            style={{
              left: `${sliderPct}%`,
              background: "#e85d44",
              border: "3px solid #fff",
              boxShadow: "0 3px 14px rgba(232,93,68,0.5)",
            }} />
        </div>

        {/* Hour ticks */}
        <div className="flex justify-between mt-0.5">
          {HOURS.map((h, i) => (
            <button key={h} onClick={() => setHour(i)}
              className="text-[9px] font-bold transition-colors"
              style={{
                fontFamily: "'Golos Text',sans-serif",
                color: i === hour ? "#e85d44" : "rgba(180,90,60,0.45)",
              }}>
              {i % 2 === 0 ? `${String(h).padStart(2,"0")}` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYBACK CONTROLS */}
      <div className="relative flex items-center justify-center gap-8 pb-6 pt-3">
        <button onClick={() => setHour((h) => Math.max(0, h - 1))}
          className="transition-all active:scale-90 hover:opacity-70"
          style={{ color: "#e85d44" }}>
          <Icon name="Rewind" size={38} />
        </button>

        <button onClick={() => setIsPlaying((p) => !p)}
          className="transition-all active:scale-90 hover:opacity-80"
          style={{ color: "#e85d44" }}>
          <Icon name={isPlaying ? "Pause" : "Play"} size={52} />
        </button>

        <button onClick={() => setHour((h) => Math.min(HOURS.length - 1, h + 1))}
          className="transition-all active:scale-90 hover:opacity-70"
          style={{ color: "#e85d44" }}>
          <Icon name="FastForward" size={38} />
        </button>

        {/* Speed + Day + Reset — right side */}
        <div className="absolute right-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => setSpeed(s)}
              className="w-10 h-8 rounded-full text-[11px] font-black transition-all"
              style={{
                fontFamily: "'Unbounded',sans-serif",
                background: speed === s ? "#e85d44" : "rgba(232,93,68,0.1)",
                color: speed === s ? "#fff" : "#e85d44",
                border: `1.5px solid ${speed === s ? "#e85d44" : "rgba(232,93,68,0.3)"}`,
              }}>
              {s}x
            </button>
          ))}

          <div className="ml-2 flex gap-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDay(i)}
                className="w-9 h-8 rounded-full text-[8px] font-black transition-all"
                style={{
                  fontFamily: "'Unbounded',sans-serif",
                  background: day === i ? "#e85d44" : "rgba(232,93,68,0.08)",
                  color: day === i ? "#fff" : "#e85d44",
                  border: `1.5px solid ${day === i ? "#e85d44" : "rgba(232,93,68,0.2)"}`,
                }}>
                {d}
              </button>
            ))}
          </div>

          <button onClick={reset}
            className="ml-1 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(232,93,68,0.1)", border: "1.5px solid rgba(232,93,68,0.3)", color: "#e85d44" }}>
            <Icon name="RotateCcw" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
