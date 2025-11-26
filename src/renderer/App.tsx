import { useEffect, useMemo, useState } from 'react';
import './App.css';

type HabitWeek = {
  id: number;
  name: string;
  completions: Record<string, boolean>;
};

type DayPercent = {
  date: string;
  percent: number;
};

type WeekData = {
  habits: HabitWeek[];
  summary: {
    weekPercent: number;
    dayPercents: DayPercent[];
  };
  weekDates: string[];
};

type Screen = 'tracker' | 'dashboard';

type Api = typeof window.api;

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDisplayDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function App() {
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [screen, setScreen] = useState<Screen>('tracker');
  const [loading, setLoading] = useState(false);

  const startDateIso = useMemo(() => {
    const iso = startOfWeek(new Date()).toISOString().slice(0, 10);
    return iso;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load(api: Api) {
      setLoading(true);
      const data = await api.getWeekData(startDateIso);
      if (mounted) {
        setWeekData(data);
        setLoading(false);
      }
    }

    load(window.api);
    return () => {
      mounted = false;
    };
  }, [startDateIso]);

  const toggleCompletion = async (habitId: number, date: string, completed: boolean) => {
    setLoading(true);
    const updated = await window.api.toggleLog(habitId, date, completed, startDateIso);
    setWeekData(updated);
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>TitanPath Habit Tracker</h1>
          <p className="subtext">
            Track weekly habits and visualize progress — seeded with sample data so you can click around immediately.
          </p>
        </div>
        <nav className="tabs">
          <button className={screen === 'tracker' ? 'active' : ''} onClick={() => setScreen('tracker')}>
            Habit Tracker
          </button>
          <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>
            Dashboard
          </button>
        </nav>
      </header>

      <main className="card">
        {loading && <div className="loading">Updating…</div>}
        {!weekData && !loading && <div>Loading week data…</div>}
        {weekData && screen === 'tracker' && (
          <HabitTracker weekData={weekData} onToggle={toggleCompletion} />
        )}
        {weekData && screen === 'dashboard' && <Dashboard weekData={weekData} />}
      </main>
    </div>
  );
}

function HabitTracker({ weekData, onToggle }: { weekData: WeekData; onToggle: (habitId: number, date: string, completed: boolean) => void }) {
  return (
    <div>
      <div className="card__header">
        <div>
          <h2>Current Week</h2>
          <p className="subtext">
            {weekData.weekDates[0]} – {weekData.weekDates[6]}
          </p>
        </div>
      </div>
      <div className="table">
        <div className="table__row table__header">
          <div>Habit</div>
          {weekData.weekDates.map((date, idx) => (
            <div key={date}>
              <div className="day-label">{dayLabels[idx]}</div>
              <div className="date-label">{formatDisplayDate(date)}</div>
            </div>
          ))}
        </div>
        {weekData.habits.map((habit) => (
          <div className="table__row" key={habit.id}>
            <div className="habit-name">{habit.name}</div>
            {weekData.weekDates.map((date) => (
              <label className="checkbox" key={date}>
                <input
                  type="checkbox"
                  checked={habit.completions[date]}
                  onChange={(e) => onToggle(habit.id, date, e.target.checked)}
                />
                <span className="checkbox__custom" />
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ weekData }: { weekData: WeekData }) {
  return (
    <div className="dashboard">
      <div className="stats">
        <div className="stat-card">
          <p className="stat-label">Weekly completion</p>
          <p className="stat-value">{weekData.summary.weekPercent}%</p>
          <p className="subtext">Across all habits for the current week</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Habits tracked</p>
          <p className="stat-value">{weekData.habits.length}</p>
          <p className="subtext">Seeded with three examples you can edit</p>
        </div>
      </div>
      <div className="chart">
        <div className="chart__header">
          <h3>Daily completion</h3>
          <p className="subtext">Percentage of habits completed each day</p>
        </div>
        <div className="chart__bars">
          {weekData.summary.dayPercents.map((day, idx) => (
            <div className="chart__bar" key={day.date}>
              <div className="bar" style={{ height: `${day.percent}%` }} />
              <span className="chart__label">{dayLabels[idx]}</span>
              <span className="chart__value">{day.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

