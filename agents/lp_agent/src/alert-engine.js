// ── Alert Engine ─────────────────────────────────────────────────────
// Evaluates pool metrics and fires alerts when LP positions are at risk.
// All alerts are timestamped and fed into the KPI tracker for
// latency and false positive rate measurement.
// ── Alert Severity ───────────────────────────────────────────────────
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "INFO";
    AlertSeverity["WARN"] = "WARN";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertType;
(function (AlertType) {
    AlertType["PDL_WARNING"] = "PDL_WARNING";
    AlertType["PDL_CRITICAL"] = "PDL_CRITICAL";
    AlertType["LOW_DEPTH"] = "LOW_DEPTH";
    AlertType["HIGH_UTILIZATION"] = "HIGH_UTILIZATION";
    AlertType["PRICE_EXTREME"] = "PRICE_EXTREME";
    AlertType["FEE_APY_DROP"] = "FEE_APY_DROP";
})(AlertType || (AlertType = {}));
// ── Cooldown per market per alert type (prevents spam) ───────────────
const ALERT_COOLDOWN_MS = 60_000; // 1 minute between same alert on same market
export class AlertEngine {
    thresholds;
    kpi;
    cooldowns = new Map();
    alertHistory = [];
    constructor(thresholds, kpi) {
        this.thresholds = thresholds;
        this.kpi = kpi;
    }
    /**
     * Evaluate a pool's metrics and fire any relevant alerts.
     * Returns all alerts generated for this cycle.
     */
    evaluate(metrics, onChainTimestamp) {
        const alerts = [];
        // ── PDL Critical ──────────────────────────────────────────────
        if (metrics.pdlBps <= -this.thresholds.pdlCriticalBps) {
            const alert = this.maybeFireAlert(AlertType.PDL_CRITICAL, AlertSeverity.CRITICAL, metrics.market, `🔴 CRITICAL PDL LOSS: ${(metrics.pdlBps / 100).toFixed(2)}% on market ${metrics.market.slice(0, 8)}...`, metrics.pdlBps, -this.thresholds.pdlCriticalBps, onChainTimestamp);
            if (alert) {
                alerts.push(alert);
                // Track as a loss alert for false positive KPI
                this.kpi.recordLossAlert(metrics.market, Math.abs(metrics.pdlBps));
            }
        }
        // ── PDL Warning ───────────────────────────────────────────────
        else if (metrics.pdlBps <= -this.thresholds.pdlWarnBps) {
            const alert = this.maybeFireAlert(AlertType.PDL_WARNING, AlertSeverity.WARN, metrics.market, `⚠️  PDL LOSS WARNING: ${(metrics.pdlBps / 100).toFixed(2)}% on market ${metrics.market.slice(0, 8)}...`, metrics.pdlBps, -this.thresholds.pdlWarnBps, onChainTimestamp);
            if (alert) {
                alerts.push(alert);
                this.kpi.recordLossAlert(metrics.market, Math.abs(metrics.pdlBps));
            }
        }
        // ── Low Depth ─────────────────────────────────────────────────
        if (Number(metrics.depthUsdc) < this.thresholds.depthWarnUsdc) {
            const alert = this.maybeFireAlert(AlertType.LOW_DEPTH, AlertSeverity.WARN, metrics.market, `⚠️  LOW POOL DEPTH: ${(Number(metrics.depthUsdc) / 1_000_000).toFixed(2)} USDC on market ${metrics.market.slice(0, 8)}...`, Number(metrics.depthUsdc), this.thresholds.depthWarnUsdc, onChainTimestamp);
            if (alert)
                alerts.push(alert);
        }
        // ── High Utilization ──────────────────────────────────────────
        if (metrics.utilizationPct > 80) {
            const alert = this.maybeFireAlert(AlertType.HIGH_UTILIZATION, AlertSeverity.WARN, metrics.market, `⚠️  HIGH UTILIZATION: ${metrics.utilizationPct.toFixed(1)}% on market ${metrics.market.slice(0, 8)}... — pool near capacity`, metrics.utilizationPct, 80, onChainTimestamp);
            if (alert)
                alerts.push(alert);
        }
        // ── Price Extreme ─────────────────────────────────────────────
        if (metrics.yesPriceBps >= 9500 || metrics.yesPriceBps <= 500) {
            const alert = this.maybeFireAlert(AlertType.PRICE_EXTREME, AlertSeverity.INFO, metrics.market, `ℹ️  PRICE EXTREME: YES=${(metrics.yesPriceBps / 100).toFixed(1)}% on market ${metrics.market.slice(0, 8)}... — approaching certainty`, metrics.yesPriceBps, metrics.yesPriceBps >= 9500 ? 9500 : 500, onChainTimestamp);
            if (alert)
                alerts.push(alert);
        }
        return alerts;
    }
    /**
     * Fire an alert only if the cooldown for this market+type has expired.
     */
    maybeFireAlert(type, severity, market, message, value, threshold, onChainTimestamp) {
        const cooldownKey = `${market}:${type}`;
        const lastFired = this.cooldowns.get(cooldownKey) ?? 0;
        const now = Date.now();
        if (now - lastFired < ALERT_COOLDOWN_MS)
            return null;
        this.cooldowns.set(cooldownKey, now);
        // Record alert latency in KPI tracker
        const alertId = this.kpi.recordAlert(onChainTimestamp);
        const alert = {
            id: alertId,
            severity,
            type,
            market,
            message,
            value,
            threshold,
            timestamp: now,
        };
        this.alertHistory.push(alert);
        // Trim history
        if (this.alertHistory.length > 200) {
            this.alertHistory = this.alertHistory.slice(-200);
        }
        // Log the alert
        console.log(`  ${alert.message}`);
        return alert;
    }
    getRecentAlerts(count = 10) {
        return this.alertHistory.slice(-count);
    }
}
