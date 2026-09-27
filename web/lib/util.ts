export const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
export const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
