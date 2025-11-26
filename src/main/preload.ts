import { contextBridge, ipcRenderer } from 'electron';

type WeekData = {
  habits: { id: number; name: string; completions: Record<string, boolean> }[];
  summary: {
    weekPercent: number;
    dayPercents: { date: string; percent: number }[];
  };
  weekDates: string[];
};

contextBridge.exposeInMainWorld('api', {
  getWeekData: (startDate: string): Promise<WeekData> => ipcRenderer.invoke('get-week-data', startDate),
  toggleLog: (habitId: number, date: string, completed: boolean, startDate: string): Promise<WeekData> =>
    ipcRenderer.invoke('toggle-log', { habitId, date, completed, startDate })
});

declare global {
  interface Window {
    api: {
      getWeekData: (startDate: string) => Promise<WeekData>;
      toggleLog: (habitId: number, date: string, completed: boolean, startDate: string) => Promise<WeekData>;
    };
  }
}
