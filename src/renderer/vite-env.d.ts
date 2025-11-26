/// <reference types="vite/client" />

interface Window {
  api: {
    getWeekData: (startDate: string) => Promise<{
      habits: { id: number; name: string; completions: Record<string, boolean> }[];
      summary: {
        weekPercent: number;
        dayPercents: { date: string; percent: number }[];
      };
      weekDates: string[];
    }>;
    toggleLog: (habitId: number, date: string, completed: boolean, startDate: string) => Promise<{
      habits: { id: number; name: string; completions: Record<string, boolean> }[];
      summary: {
        weekPercent: number;
        dayPercents: { date: string; percent: number }[];
      };
      weekDates: string[];
    }>;
  };
}
