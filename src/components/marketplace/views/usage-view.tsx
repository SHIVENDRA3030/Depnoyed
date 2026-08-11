"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth, api, navigate, type DeploymentItem } from "@/lib/store";
import { Activity, Cpu, HardDrive, MemoryStick, Database, Zap, Download, Wifi, BarChart3 } from "lucide-react";
import { getContainerMetrics } from "@/lib/metrics";
import { generateTimeSeries } from "@/components/marketplace/sparkline";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function UsageView() {
  const user = useAuth((s) => s.user);
  const [deployments, setDeployments] = useState<DeploymentItem[] | null>(null);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    async function load() {
      try {
        const { deployments } = await api<{ deployments: DeploymentItem[] }>("/api/deployments");
        setDeployments(deployments);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!user) {
    navigate({ name: "login" });
    return null;
  }

  // Aggregate metrics
  const aggregated = useMemo(() => {
    if (!deployments) return { cpu: 0, memory: 0, storage: 0, bandwidth: 0, runningCount: 0 };
    const running = deployments.filter((d) => d.status === "running");
    let cpu = 0;
    let memory = 0;
    for (const d of running) {
      const metrics = getContainerMetrics(d.containerId ?? d.id);
      cpu += metrics.cpuUsagePercent;
      memory += metrics.memoryUsagePercent;
    }
    const storage = deployments.reduce((a, d) => a + (d.volumeDataSize ?? 0), 0) / (1024 * 1024); // MB
    return {
      cpu: running.length > 0 ? Math.round(cpu / running.length) : 0,
      memory: running.length > 0 ? Math.round(memory / running.length) : 0,
      storage,
      bandwidth: running.length * 15.4, // Mock GB
      runningCount: running.length,
    };
  }, [deployments]);

  // Generate some mock history for the charts based on timeframe
  const history = useMemo(() => {
    const dataPoints = timeframe === "24h" ? 24 : timeframe === "7d" ? 7 : 30;
    
    const cpuRaw = generateTimeSeries(aggregated.cpu, dataPoints, aggregated.cpu > 0 ? 10 : 0, `usage-cpu-${timeframe}`);
    const memRaw = generateTimeSeries(aggregated.memory, dataPoints, aggregated.memory > 0 ? 5 : 0, `usage-mem-${timeframe}`);
    const netRaw = generateTimeSeries(aggregated.runningCount > 0 ? 40 : 5, dataPoints, 20, `usage-net-${timeframe}`);

    const cpuData = cpuRaw.map((val, i) => ({
      time: timeframe === "24h" ? `${i}:00` : `Day ${i + 1}`,
      value: val,
    }));
    
    const memData = memRaw.map((val, i) => ({
      time: timeframe === "24h" ? `${i}:00` : `Day ${i + 1}`,
      value: val,
    }));
    
    const netData = netRaw.map((val, i) => ({
      time: timeframe === "24h" ? `${i}:00` : `Day ${i + 1}`,
      value: val,
    }));

    return { cpu: cpuData, memory: memData, network: netData };
  }, [aggregated, timeframe]);

  const isEmpty = deployments !== null && aggregated.runningCount === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your application resource consumption and system performance over time.
          </p>
        </div>
        
        {/* Timeframe Selectors */}
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          {(["24h", "7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeframe === tf 
                  ? "bg-background text-foreground shadow-sm border border-border" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <UsageStatCard
          icon={<Cpu className="size-4" />}
          title="Average CPU"
          value={`${aggregated.cpu}%`}
          desc="Across all running containers"
          color="brand"
        />
        <UsageStatCard
          icon={<MemoryStick className="size-4" />}
          title="Average Memory"
          value={`${aggregated.memory}%`}
          desc="Across all running containers"
          color="emerald"
        />
        <UsageStatCard
          icon={<HardDrive className="size-4" />}
          title="Total Storage"
          value={`${aggregated.storage.toFixed(1)} MB`}
          desc="Across persistent volumes"
          color="amber"
        />
        <UsageStatCard
          icon={<Wifi className="size-4" />}
          title="Network Egress"
          value={`${aggregated.bandwidth.toFixed(1)} GB`}
          desc="Data out this billing cycle"
          color="purple"
        />
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-border bg-card p-12 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Active Data</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You don't have any active deployments running right now. Deploy an application to start monitoring resource usage and traffic.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* CPU Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand/10 text-brand">
                  <Cpu className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">CPU Utilization</h3>
              </div>
              <span className="text-xl font-bold text-brand">{aggregated.cpu}%</span>
            </div>
            <div className="h-56 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.cpu} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--color-foreground)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--color-brand)" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <MemoryStick className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">Memory Utilization</h3>
              </div>
              <span className="text-xl font-bold text-emerald-500">{aggregated.memory}%</span>
            </div>
            <div className="h-56 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.memory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">Network Traffic</h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Requests / minute</span>
            </div>
            <div className="h-64 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.network} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageStatCard({
  icon,
  title,
  value,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  desc: string;
  color: "brand" | "emerald" | "amber" | "purple";
}) {
  const colorClasses = {
    brand: "bg-brand/10 text-brand",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    purple: "bg-purple-500/10 text-purple-500",
  }[color];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${colorClasses}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
