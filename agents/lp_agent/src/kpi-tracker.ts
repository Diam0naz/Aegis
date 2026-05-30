// ── KPI Tracker ──────────────────────────────────────────────────────
// Tracks and validates the four LP Management Agent KPIs:
//
// ┌─────────────────────────────┬─────────────────────────────────┬────────────────────────────────────────┐
// │ Metric                      │ Target                          │ Why It Matters                         │
// ├─────────────────────────────┼─────────────────────────────────┼────────────────────────────────────────┤
// │ PDL tracking accuracy       │ Within 1% of on-chain calc      │ Wrong math → wrong alerts              │
// │ Alert latency               │ <30s from on-chain event        │ LPs need time to act                   │
// │ False positive rate         │ <5% on loss alerts              │ Too many false alarms → distrust       │
// │ Pools monitored             │ >20 at launch                   │ Proves agent scales across markets     │
// └─────────────────────────────┴─────────────────────────────────┴────────────────────────────────────────┘

export interface KpiTargets {
  pdlAccuracyPct: number;     // Target: ≤1.0%
  alertLatencyMs: number;     // Target: ≤30,000ms
  falsePositiveMaxPct: number; // Target: ≤5.0%
  minPoolsMonitored: number;  // Target: ≥20
}

export interface KpiSnapshot {
  timestamp: number;
  pdlAccuracy: PdlAccuracyKpi;
  alertLatency: AlertLatencyKpi;
  falsePositiveRate: FalsePositiveKpi;
  poolsMonitored: PoolCoverageKpi;
  overallHealthy: boolean;
}

export interface PdlAccuracyKpi {
  /** Number of PDL calculations we've verified against on-chain */
  totalChecks: number;
  /** Number that deviated more than the target threshold */
  failedChecks: number;
  /** Max observed deviation in percent (should be <1%) */
  maxDeviationPct: number;
  /** Average deviation across all checks */
  avgDeviationPct: number;
  /** Whether this KPI is within target */
  healthy: boolean;
}

export interface AlertLatencyKpi {
  /** Total alerts fired */
  totalAlerts: number;
  /** Alerts delivered within the target window */
  alertsWithinTarget: number;
  /** Max observed latency in ms */
  maxLatencyMs: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** p95 latency in ms */
  p95LatencyMs: number;
  healthy: boolean;
}

export interface FalsePositiveKpi {
  /** Total loss alerts fired */
  totalLossAlerts: number;
  /** Alerts that were confirmed as actual losses (true positives) */
  confirmedLosses: number;
  /** Alerts that resolved without actual loss (false positives) */
  falsePositives: number;
  /** Current false positive rate as a percentage */
  falsePositiveRatePct: number;
  healthy: boolean;
}

export interface PoolCoverageKpi {
  /** Currently monitored pool count */
  currentPools: number;
  /** Target pool count */
  targetPools: number;
  /** Peak concurrent pools monitored */
  peakPools: number;
  healthy: boolean;
}

// ── Alert record for latency tracking ────────────────────────────────
interface AlertRecord {
  alertId: string;
  onChainSlot: number;
  onChainTimestamp: number;
  alertFiredTimestamp: number;
  latencyMs: number;
}

// ── PDL verification record ──────────────────────────────────────────
interface PdlVerification {
  market: string;
  agentPdlBps: number;
  onChainPdlBps: number;
  deviationPct: number;
  timestamp: number;
}

// ── Loss alert tracking ──────────────────────────────────────────────
interface LossAlertRecord {
  alertId: string;
  market: string;
  predictedLossBps: number;
  actualLossBps: number | null;
  isFalsePositive: boolean | null;
  timestamp: number;
}

export class KpiTracker {
  private targets: KpiTargets;
  private pdlVerifications: PdlVerification[] = [];
  private alertRecords: AlertRecord[] = [];
  private lossAlerts: LossAlertRecord[] = [];
  private currentPoolCount: number = 0;
  private peakPoolCount: number = 0;
  private alertCounter: number = 0;
  private startTime: number = Date.now();

  constructor(targets: KpiTargets) {
    this.targets = targets;
  }

  // ── PDL Accuracy Tracking ──────────────────────────────────────────

  /**
   * Record a PDL calculation and compare against on-chain truth.
   * Called after every PDL recalculation cycle.
   */
  recordPdlCheck(
    market: string,
    agentPdlBps: number,
    onChainPdlBps: number,
  ): void {
    const deviationPct =
      onChainPdlBps === 0
        ? agentPdlBps === 0
          ? 0
          : 100
        : Math.abs(agentPdlBps - onChainPdlBps) / onChainPdlBps * 100;

    this.pdlVerifications.push({
      market,
      agentPdlBps,
      onChainPdlBps,
      deviationPct,
      timestamp: Date.now(),
    });

    // Keep a rolling window of the last 1000 checks to bound memory
    if (this.pdlVerifications.length > 1000) {
      this.pdlVerifications = this.pdlVerifications.slice(-1000);
    }

    if (deviationPct > this.targets.pdlAccuracyPct) {
      console.warn(
        `  ⚠ KPI VIOLATION: PDL accuracy ${deviationPct.toFixed(2)}% > ${this.targets.pdlAccuracyPct}% target ` +
        `(market=${market.slice(0, 8)}... agent=${agentPdlBps}bps on-chain=${onChainPdlBps}bps)`,
      );
    }
  }

  // ── Alert Latency Tracking ─────────────────────────────────────────

  /**
   * Record an alert's latency from on-chain event detection to alert fire.
   * onChainTimestamp: unix ms when the on-chain event occurred (from slot clock)
   */
  recordAlert(onChainTimestamp: number): string {
    const alertId = `alert-${++this.alertCounter}`;
    const alertFiredTimestamp = Date.now();
    const latencyMs = alertFiredTimestamp - onChainTimestamp;

    this.alertRecords.push({
      alertId,
      onChainSlot: 0,
      onChainTimestamp,
      alertFiredTimestamp,
      latencyMs: Math.max(0, latencyMs),
    });

    // Rolling window
    if (this.alertRecords.length > 500) {
      this.alertRecords = this.alertRecords.slice(-500);
    }

    if (latencyMs > this.targets.alertLatencyMs) {
      console.warn(
        `  ⚠ KPI VIOLATION: Alert latency ${latencyMs}ms > ${this.targets.alertLatencyMs}ms target`,
      );
    }

    return alertId;
  }

  // ── False Positive Tracking ────────────────────────────────────────

  /**
   * Record a loss alert being fired. Call confirmLossAlert() later
   * once the batch settles to verify the loss was real.
   */
  recordLossAlert(market: string, predictedLossBps: number): string {
    const alertId = `loss-${++this.alertCounter}`;

    this.lossAlerts.push({
      alertId,
      market,
      predictedLossBps,
      actualLossBps: null,
      isFalsePositive: null,
      timestamp: Date.now(),
    });

    // Rolling window
    if (this.lossAlerts.length > 500) {
      this.lossAlerts = this.lossAlerts.slice(-500);
    }

    return alertId;
  }

  /**
   * Confirm whether a loss alert was a true or false positive.
   * Called after the batch settles and we can verify the actual PDL.
   */
  confirmLossAlert(alertId: string, actualLossBps: number): void {
    const alert = this.lossAlerts.find((a) => a.alertId === alertId);
    if (!alert) return;

    alert.actualLossBps = actualLossBps;
    // A false positive is when we predicted a material loss but none occurred
    // (the predicted loss didn't materialize within a 50% tolerance band)
    alert.isFalsePositive = actualLossBps < alert.predictedLossBps * 0.5;
  }

  // ── Pool Coverage Tracking ─────────────────────────────────────────

  updatePoolCount(count: number): void {
    this.currentPoolCount = count;
    if (count > this.peakPoolCount) {
      this.peakPoolCount = count;
    }

    if (count < this.targets.minPoolsMonitored) {
      console.warn(
        `  ⚠ KPI WARNING: Only ${count} pools monitored (target: ≥${this.targets.minPoolsMonitored})`,
      );
    }
  }

  // ── Snapshot: Get Current KPI State ────────────────────────────────

  getSnapshot(): KpiSnapshot {
    const pdlAccuracy = this.getPdlAccuracyKpi();
    const alertLatency = this.getAlertLatencyKpi();
    const falsePositiveRate = this.getFalsePositiveKpi();
    const poolsMonitored = this.getPoolCoverageKpi();

    return {
      timestamp: Date.now(),
      pdlAccuracy,
      alertLatency,
      falsePositiveRate,
      poolsMonitored,
      overallHealthy:
        pdlAccuracy.healthy &&
        alertLatency.healthy &&
        falsePositiveRate.healthy &&
        poolsMonitored.healthy,
    };
  }

  private getPdlAccuracyKpi(): PdlAccuracyKpi {
    const checks = this.pdlVerifications;
    if (checks.length === 0) {
      return {
        totalChecks: 0,
        failedChecks: 0,
        maxDeviationPct: 0,
        avgDeviationPct: 0,
        healthy: true,
      };
    }

    const failedChecks = checks.filter(
      (c) => c.deviationPct > this.targets.pdlAccuracyPct,
    ).length;
    const maxDeviationPct = Math.max(...checks.map((c) => c.deviationPct));
    const avgDeviationPct =
      checks.reduce((sum, c) => sum + c.deviationPct, 0) / checks.length;

    return {
      totalChecks: checks.length,
      failedChecks,
      maxDeviationPct,
      avgDeviationPct,
      healthy: maxDeviationPct <= this.targets.pdlAccuracyPct,
    };
  }

  private getAlertLatencyKpi(): AlertLatencyKpi {
    const records = this.alertRecords;
    if (records.length === 0) {
      return {
        totalAlerts: 0,
        alertsWithinTarget: 0,
        maxLatencyMs: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        healthy: true,
      };
    }

    const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b);
    const alertsWithinTarget = records.filter(
      (r) => r.latencyMs <= this.targets.alertLatencyMs,
    ).length;
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Idx] ?? latencies[latencies.length - 1]!;

    return {
      totalAlerts: records.length,
      alertsWithinTarget,
      maxLatencyMs: Math.max(...latencies),
      avgLatencyMs:
        latencies.reduce((s, l) => s + l, 0) / latencies.length,
      p95LatencyMs: p95Latency,
      healthy: p95Latency <= this.targets.alertLatencyMs,
    };
  }

  private getFalsePositiveKpi(): FalsePositiveKpi {
    const resolved = this.lossAlerts.filter(
      (a) => a.isFalsePositive !== null,
    );

    if (resolved.length === 0) {
      return {
        totalLossAlerts: this.lossAlerts.length,
        confirmedLosses: 0,
        falsePositives: 0,
        falsePositiveRatePct: 0,
        healthy: true,
      };
    }

    const falsePositives = resolved.filter((a) => a.isFalsePositive).length;
    const confirmedLosses = resolved.filter((a) => !a.isFalsePositive).length;
    const rate = (falsePositives / resolved.length) * 100;

    return {
      totalLossAlerts: this.lossAlerts.length,
      confirmedLosses,
      falsePositives,
      falsePositiveRatePct: rate,
      healthy: rate <= this.targets.falsePositiveMaxPct,
    };
  }

  private getPoolCoverageKpi(): PoolCoverageKpi {
    return {
      currentPools: this.currentPoolCount,
      targetPools: this.targets.minPoolsMonitored,
      peakPools: this.peakPoolCount,
      healthy: this.currentPoolCount >= this.targets.minPoolsMonitored,
    };
  }

  // ── Pretty Print ───────────────────────────────────────────────────

  printReport(): void {
    const snap = this.getSnapshot();
    const uptime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);

    console.log(`\n${"═".repeat(70)}`);
    console.log(`  📊 LP MANAGEMENT AGENT — KPI DASHBOARD`);
    console.log(`  Uptime: ${uptime} min | ${snap.overallHealthy ? "✅ ALL KPIs HEALTHY" : "⚠️  KPI VIOLATIONS DETECTED"}`);
    console.log(`${"═".repeat(70)}`);

    // PDL Accuracy
    const pdl = snap.pdlAccuracy;
    console.log(`\n  ${pdl.healthy ? "✅" : "❌"} PDL Tracking Accuracy       Target: ≤${this.targets.pdlAccuracyPct}%`);
    console.log(`     Checks: ${pdl.totalChecks} | Failed: ${pdl.failedChecks}`);
    console.log(`     Max deviation: ${pdl.maxDeviationPct.toFixed(3)}% | Avg: ${pdl.avgDeviationPct.toFixed(3)}%`);

    // Alert Latency
    const lat = snap.alertLatency;
    console.log(`\n  ${lat.healthy ? "✅" : "❌"} Alert Latency                Target: ≤${this.targets.alertLatencyMs}ms`);
    console.log(`     Total alerts: ${lat.totalAlerts} | Within target: ${lat.alertsWithinTarget}`);
    console.log(`     Avg: ${lat.avgLatencyMs.toFixed(0)}ms | p95: ${lat.p95LatencyMs.toFixed(0)}ms | Max: ${lat.maxLatencyMs.toFixed(0)}ms`);

    // False Positive Rate
    const fp = snap.falsePositiveRate;
    console.log(`\n  ${fp.healthy ? "✅" : "❌"} False Positive Rate          Target: ≤${this.targets.falsePositiveMaxPct}%`);
    console.log(`     Loss alerts: ${fp.totalLossAlerts} | Confirmed: ${fp.confirmedLosses} | False: ${fp.falsePositives}`);
    console.log(`     Rate: ${fp.falsePositiveRatePct.toFixed(1)}%`);

    // Pool Coverage
    const pools = snap.poolsMonitored;
    console.log(`\n  ${pools.healthy ? "✅" : "❌"} Pools Monitored              Target: ≥${pools.targetPools}`);
    console.log(`     Current: ${pools.currentPools} | Peak: ${pools.peakPools}`);

    console.log(`\n${"═".repeat(70)}\n`);
  }
}
