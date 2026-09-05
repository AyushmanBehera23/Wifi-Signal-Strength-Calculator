/**
 * Dashboard charts using Apache ECharts.
 * Each chart includes an accessible textual summary for screen readers.
 * Colors follow the semantic signal palette — never color alone.
 */

import ReactECharts from "echarts-for-react";
import type { ChannelOccupancy, NetworkObservation } from "../../types/wifi";

// ── Signal Distribution Chart ─────────────────────────────────────────────────
export function SignalDistributionChart({ networks }: { networks: NetworkObservation[] }) {
  const buckets: Record<string, number> = {
    "Excellent\n(≥−50)": 0,
    "Good\n(−51−60)": 0,
    "Fair\n(−61−67)": 0,
    "Weak\n(−68−75)": 0,
    "Very weak\n(<−75)": 0,
  };

  for (const n of networks) {
    const d = n.signal_dbm;
    if (d == null) continue;
    if (d >= -50) buckets["Excellent\n(≥−50)"]++;
    else if (d >= -60) buckets["Good\n(−51−60)"]++;
    else if (d >= -67) buckets["Fair\n(−61−67)"]++;
    else if (d >= -75) buckets["Weak\n(−68−75)"]++;
    else buckets["Very weak\n(<−75)"]++;
  }

  const colors = ["#22c55e", "#86efac", "#facc15", "#f97316", "#ef4444"];
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} network(s)" },
    legend: {
      orient: "vertical",
      right: 0,
      top: "center",
      textStyle: { color: "#94a3b8", fontSize: 11 },
    },
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      center: ["40%", "50%"],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: Object.entries(buckets).map(([name, value], i) => ({
        name, value, itemStyle: { color: colors[i] },
      })).filter(d => d.value > 0),
    }],
  };

  const summary = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k.split("\n")[0]}`)
    .join(", ");

  return (
    <div>
      <p className="sr-only" aria-live="polite">Signal distribution: {summary}</p>
      <ReactECharts option={option} style={{ height: 200 }} notMerge opts={{ renderer: "svg" }} />
    </div>
  );
}

// ── Band Distribution Chart ───────────────────────────────────────────────────
export function BandDistributionChart({ networks }: { networks: NetworkObservation[] }) {
  const bands: Record<string, number> = { "2.4 GHz": 0, "5 GHz": 0, "6 GHz": 0, "Unknown": 0 };
  for (const n of networks) bands[n.band] = (bands[n.band] || 0) + 1;

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} network(s)" },
    series: [{
      type: "bar",
      data: [
        { name: "2.4 GHz", value: bands["2.4 GHz"], itemStyle: { color: "#3b82f6" } },
        { name: "5 GHz", value: bands["5 GHz"], itemStyle: { color: "#8b5cf6" } },
        { name: "6 GHz", value: bands["6 GHz"], itemStyle: { color: "#06b6d4" } },
        { name: "Unknown", value: bands["Unknown"], itemStyle: { color: "#475569" } },
      ].filter(d => d.value > 0),
    }],
    xAxis: { type: "category", data: ["2.4 GHz", "5 GHz", "6 GHz", "Unknown"].filter(b => bands[b] > 0), axisLabel: { color: "#94a3b8", fontSize: 11 } },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8", fontSize: 10 }, minInterval: 1 },
    grid: { left: 40, right: 10, top: 10, bottom: 30 },
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Band distribution: {Object.entries(bands).filter(([, v]) => v > 0).map(([k, v]) => `${v} on ${k}`).join(", ")}
      </p>
      <ReactECharts option={option} style={{ height: 200 }} notMerge opts={{ renderer: "svg" }} />
    </div>
  );
}

// ── Channel Congestion Chart ──────────────────────────────────────────────────
export function ChannelCongestionChart({
  occupancy,
  band,
}: {
  occupancy: ChannelOccupancy[];
  band: "2.4 GHz" | "5 GHz" | "6 GHz";
}) {
  if (!occupancy.length) return <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>No {band} networks detected.</p>;

  const displayed = occupancy.filter(o => o.network_count > 0 || o.estimated_congestion > 0).slice(0, 30);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const ch = displayed[params[0].dataIndex];
        return `Channel ${ch.channel}<br/>Networks: ${ch.network_count}<br/>Overlap: ${ch.overlapping_network_count}<br/>Est. congestion: ${(ch.estimated_congestion * 100).toFixed(0)}%`;
      },
    },
    xAxis: { type: "category", data: displayed.map(o => `Ch ${o.channel}`), axisLabel: { color: "#94a3b8", fontSize: 10, rotate: 45 } },
    yAxis: {
      type: "value",
      max: 1,
      axisLabel: { color: "#94a3b8", fontSize: 10, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
    },
    grid: { left: 45, right: 10, top: 10, bottom: 50 },
    series: [{
      type: "bar",
      data: displayed.map(o => ({
        value: o.estimated_congestion,
        itemStyle: {
          color: o.estimated_congestion < 0.3
            ? "#22c55e"
            : o.estimated_congestion < 0.6
            ? "#facc15"
            : "#ef4444",
        },
      })),
    }],
  };

  const bestCh = [...displayed].sort((a, b) => a.estimated_congestion - b.estimated_congestion)[0];

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Estimated congestion for {band}: Channel {bestCh?.channel} appears least congested at {((bestCh?.estimated_congestion ?? 0) * 100).toFixed(0)}%.
        These are estimates from visible networks only.
      </p>
      <ReactECharts option={option} style={{ height: 220 }} notMerge opts={{ renderer: "svg" }} />
    </div>
  );
}

// ── Live Signal Timeline Chart ───────────────────────────────────────────────
export function LiveSignalTimelineChart({
  history,
}: {
  history: Array<{ timestamp: string; readings: Record<string, number> }>;
}) {
  if (!history.length) {
    return (
      <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
        <p style={{ margin: 0, fontSize: "0.875rem" }}>📡 Waiting for live signal sweeps…</p>
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem" }}>Turn on Live Monitor mode to plot real-time RSSI over time.</p>
      </div>
    );
  }

  // Extract all SSIDs seen across history
  const ssidSet = new Set<string>();
  for (const h of history) {
    for (const ssid of Object.keys(h.readings)) {
      ssidSet.add(ssid);
    }
  }
  const ssids = Array.from(ssidSet).slice(0, 8); // Top 8 networks to avoid overcrowding

  const palette = ["#3b82f6", "#22c55e", "#8b5cf6", "#06b6d4", "#facc15", "#f97316", "#ec4899", "#a855f7"];

  const series = ssids.map((ssid, idx) => ({
    name: ssid,
    type: "line",
    smooth: true,
    symbol: "circle",
    symbolSize: 6,
    lineStyle: { width: 2, color: palette[idx % palette.length] },
    itemStyle: { color: palette[idx % palette.length] },
    data: history.map((h) => h.readings[ssid] ?? null),
  }));

  const times = history.map((h) => h.timestamp);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        if (!params.length) return "";
        let res = `<strong style="color: #fff;">${params[0].axisValue}</strong><br/>`;
        for (const p of params) {
          if (p.value != null) {
            res += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:${p.color};"></span>${p.seriesName}: <strong>${p.value} dBm</strong><br/>`;
          }
        }
        return res;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      type: "scroll",
    },
    grid: { left: 45, right: 20, top: 35, bottom: 25 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: times,
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: -100,
      max: -20,
      axisLabel: { color: "#94a3b8", fontSize: 10, formatter: "{value} dBm" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series,
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Live signal strength timeline chart. Displaying RSSI over {history.length} time points.
      </p>
      <ReactECharts option={option} style={{ height: 260 }} notMerge opts={{ renderer: "svg" }} />
    </div>
  );
}

