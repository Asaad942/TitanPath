import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let db: Database.Database | null = null;

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDates(startIso: string) {
  const dates: string[] = [];
  const start = new Date(startIso + 'T00:00:00');
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function ensureDatabase() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'habits.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new Database(dbPath);

  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );`
    )
    .run();

  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        UNIQUE(habit_id, date)
      );`
    )
    .run();

  const habitCount = database.prepare('SELECT COUNT(*) as count FROM habits').get() as { count: number };
  if (habitCount.count === 0) {
    const seedHabits = ['Drink Water', 'Read 20 mins', 'Exercise'];
    const insertHabit = database.prepare('INSERT INTO habits (name) VALUES (?)');
    const ids: number[] = [];
    database.transaction(() => {
      seedHabits.forEach((name) => {
        const info = insertHabit.run(name);
        ids.push(Number(info.lastInsertRowid));
      });
    })();

    const start = startOfWeek(new Date());
    const weekDates = getWeekDates(formatDate(start));
    const samples: Record<number, number[]> = {
      [ids[0]]: [0, 1, 2, 3, 4, 5],
      [ids[1]]: [1, 3, 5],
      [ids[2]]: [1, 3, 6]
    };
    const insertLog = database.prepare('INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)');
    database.transaction(() => {
      Object.entries(samples).forEach(([habitId, days]) => {
        days.forEach((offset) => {
          const date = weekDates[offset];
          insertLog.run(Number(habitId), date);
        });
      });
    })();
  }

  db = database;
}

function getWeekData(startDate: string) {
  if (!db) throw new Error('Database not initialized');

  const weekDates = getWeekDates(startDate);
  const habits = db.prepare('SELECT id, name FROM habits').all() as { id: number; name: string }[];
  const logs = db
    .prepare('SELECT habit_id as habitId, date FROM habit_logs WHERE date BETWEEN ? AND ?')
    .all(weekDates[0], weekDates[6]) as { habitId: number; date: string }[];

  const logSet = new Set(logs.map((l) => `${l.habitId}-${l.date}`));

  const habitWeek = habits.map((habit) => {
    const completions: Record<string, boolean> = {};
    weekDates.forEach((date) => {
      completions[date] = logSet.has(`${habit.id}-${date}`);
    });
    return { ...habit, completions };
  });

  const dayPercents = weekDates.map((date) => {
    const completed = habits.reduce((count, habit) => count + (logSet.has(`${habit.id}-${date}`) ? 1 : 0), 0);
    const percent = habits.length ? Math.round((completed / habits.length) * 100) : 0;
    return { date, percent };
  });

  const weekTotal = habits.length * weekDates.length;
  const completedCount = logs.length;
  const weekPercent = weekTotal ? Math.round((completedCount / weekTotal) * 100) : 0;

  return {
    habits: habitWeek,
    summary: { weekPercent, dayPercents },
    weekDates
  };
}

function registerHandlers() {
  ipcMain.handle('get-week-data', (_event, startDate: string) => {
    return getWeekData(startDate);
  });

  ipcMain.handle(
    'toggle-log',
    (_event, payload: { habitId: number; date: string; completed: boolean; startDate: string }) => {
      if (!db) throw new Error('Database not initialized');
      const exists = db
        .prepare('SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?')
        .get(payload.habitId, payload.date) as { id: number } | undefined;

      if (payload.completed && !exists) {
        db.prepare('INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)').run(payload.habitId, payload.date);
      }
      if (!payload.completed && exists) {
        db.prepare('DELETE FROM habit_logs WHERE id = ?').run(exists.id);
      }

      return getWeekData(payload.startDate);
    }
  );
}

async function createWindow() {
  await app.whenReady();
  ensureDatabase();
  registerHandlers();

  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      contextIsolation: true
    }
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    await win.loadFile(distPath);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

createWindow();

