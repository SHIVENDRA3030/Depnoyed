"use client";

import { CounterSimulator } from "./simulators/counter-simulator";
import { StaticSimulator } from "./simulators/static-simulator";
import { NotesSimulator } from "./simulators/notes-simulator";
import { SimulatorShell } from "./simulators/simulator-shell";

export interface AppSimulatorProps {
  subdomain: string;
  simulator: string;
  running: boolean;
  status: string;
  appName: string;
  appSlug: string;
  dockerImage: string;
  containerName: string;
  volumeName: string;
  port: number | null;
  initialData: Record<string, string>;
}

export function AppSimulator(props: AppSimulatorProps) {
  const inner = (() => {
    switch (props.simulator) {
      case "counter":
        return <CounterSimulator {...props} />;
      case "notes":
        return <NotesSimulator {...props} />;
      case "static":
      default:
        return <StaticSimulator {...props} />;
    }
  })();

  return <SimulatorShell {...props}>{inner}</SimulatorShell>;
}
