import { useTerminal } from "./terminal/useTerminal";

export function App() {
  const ref = useTerminal("t1", import.meta.env.VITE_CWD ?? "/");
  return <div style={{ height: "100vh", padding: 16 }}>
    <div ref={ref} style={{ width: "100%", height: "100%" }} />
  </div>;
}
