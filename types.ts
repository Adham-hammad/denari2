
export interface Transaction {
  id: string;
  name: string;
  amount: number;
  note: string;
  timestamp: number;
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface MonthData {
  [dateKey: string]: Transaction[];
}

export const MONTHLY_LIMIT = 1015;
