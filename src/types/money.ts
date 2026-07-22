export type Expense = {
  date: string; // yyyy-mm-dd
  amount: number;
  category: string;
  note: string;
};

export type MoneyData = {
  expenses: Expense[];
};
