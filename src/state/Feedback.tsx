import { createContext, useContext, type ReactNode } from 'react';
interface Feedback {
  message: string | null;
  onDismiss: () => void;
  onRefresh: () => void;
}
const Context = createContext<Feedback>({
  message: null,
  onDismiss: () => {},
  onRefresh: () => {},
});
export function FeedbackProvider({ value, children }: { value: Feedback; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useFeedback = () => useContext(Context);
