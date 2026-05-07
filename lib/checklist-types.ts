/** Uma linha do checklist **desse** dia (Firestore: `dailyChecklistDay/{yyyy-MM-dd}.items`). */
export type DailyChecklistDayItem = {
  id: number;
  title: string;
  done: boolean;
};

/** Legado: template global antigo (`dailyChecklistItems`). */
export type DailyChecklistTask = {
  id: number;
  title: string;
  done?: boolean;
};
