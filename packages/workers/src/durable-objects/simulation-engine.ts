import type { BondingCurve, EmissionSchedule, VestingSchedule } from '@tokenomics/shared';
import {
	runMonteCarloIteration,
	runABMSimulation,
	computeSummary,
	computePercentile,
	type IterationResult,
	type StepRecord,
} from '../lib/simulation-runner';

const BATCH_SIZE = 50; // iterations per alarm tick

interface SimConfig {
	projectId: string;
	type: 'monte_carlo' | 'abm';
	// MC fields
	iterations?: number;
	timesteps?: number;
	stepUnit?: string;
	seed?: number;
	parameters?: any[];
	// ABM fields
	agentPopulations?: any[];
	// Model context (injected at launch)
	bondingCurve?: BondingCurve | null;
	emissionSchedule?: EmissionSchedule | null;
	vestingSchedules?: VestingSchedule[];
	totalSupply?: number;
}

export class SimulationEngine implements DurableObject {
	private sql: SqlStorage;
	private initialized = false;

	constructor(private ctx: DurableObjectState, private env: unknown) {
		this.sql = ctx.storage.sql;
	}

	private initSchema() {
		if (this.initialized) return;
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS sim_meta (
				id TEXT PRIMARY KEY,
				project_id TEXT NOT NULL,
				type TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'queued',
				config TEXT NOT NULL,
				progress REAL NOT NULL DEFAULT 0,
				completed_iteration INTEGER NOT NULL DEFAULT 0,
				started_at INTEGER,
				completed_at INTEGER,
				summary TEXT
			);
			CREATE TABLE IF NOT EXISTS sim_timeseries (
				sim_id TEXT NOT NULL,
				timestep INTEGER NOT NULL,
				variable_id TEXT NOT NULL,
				p5 REAL, p25 REAL, p50 REAL, p75 REAL, p95 REAL
			);
			CREATE TABLE IF NOT EXISTS sim_iterations (
				sim_id TEXT NOT NULL,
				iteration INTEGER NOT NULL,
				final_values TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS sim_agent_snapshots (
				sim_id TEXT NOT NULL,
				timestep INTEGER NOT NULL,
				agent_type TEXT NOT NULL,
				count INTEGER NOT NULL,
				avg_holdings REAL,
				total_activity REAL
			);
			CREATE INDEX IF NOT EXISTS idx_ts ON sim_timeseries(sim_id, variable_id, timestep);
		`);
		this.initialized = true;
	}

	async fetch(request: Request): Promise<Response> {
		this.initSchema();
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		if (method === 'POST' && path === '/launch') return this.launchSimulation(await request.json());
		if (method === 'GET' && path === '/status') return this.getStatus();
		if (method === 'GET' && path === '/results') return this.getResults();
		if (method === 'DELETE' && path === '/cancel') return this.cancelSimulation();

		if (request.headers.get('Upgrade') === 'websocket') {
			const [client, server] = Object.values(new WebSocketPair());
			this.ctx.acceptWebSocket(server);
			return new Response(null, { status: 101, webSocket: client });
		}

		return json({ error: 'Not found' }, 404);
	}

	async alarm(): Promise<void> {
		const meta = this.sql.exec('SELECT * FROM sim_meta WHERE status = ? LIMIT 1', 'running').one() as any;
		if (!meta) return;

		const config: SimConfig = JSON.parse(meta.config);

		if (config.type === 'monte_carlo') {
			await this.runMCBatch(meta.id, config, meta.completed_iteration);
		} else if (config.type === 'abm') {
			await this.runABMFull(meta.id, config);
		}
	}

	webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {}
	webSocketClose(_ws: WebSocket): void {}

	// ─── Monte Carlo batched execution ───

	private async runMCBatch(simId: string, config: SimConfig, startIteration: number) {
		const totalIterations = config.iterations ?? 1000;
		const seed = config.seed ?? Date.now();
		const endIteration = Math.min(startIteration + BATCH_SIZE, totalIterations);

		const results: IterationResult[] = [];

		for (let i = startIteration; i < endIteration; i++) {
			const result = runMonteCarloIteration(
				i,
				{
					iterations: totalIterations,
					timesteps: config.timesteps ?? 365,
					stepUnit: (config.stepUnit as any) ?? 'day',
					seed,
					parameters: config.parameters ?? [],
				},
				config.bondingCurve ?? null,
				config.emissionSchedule ?? null,
				config.vestingSchedules ?? [],
				config.totalSupply ?? 1_000_000_000,
				seed,
			);
			results.push(result);

			// Store iteration final values
			this.sql.exec(
				'INSERT INTO sim_iterations (sim_id, iteration, final_values) VALUES (?, ?, ?)',
				simId, i, JSON.stringify({
					price: result.finalPrice,
					circulating: result.finalCirculating,
					treasury: result.finalTreasury,
					staked: result.finalStaked,
				})
			);
		}

		const progress = Math.round((endIteration / totalIterations) * 100);
		this.sql.exec(
			'UPDATE sim_meta SET completed_iteration = ?, progress = ? WHERE id = ?',
			endIteration, progress, simId
		);
		this.broadcastProgress(progress, 'running');

		if (endIteration >= totalIterations) {
			// Finalize: compute percentile timeseries + summary
			this.finalizeMonteCarloResults(simId, config, seed, totalIterations);
		} else {
			// Schedule next batch
			this.ctx.storage.setAlarm(Date.now() + 10);
		}
	}

	private finalizeMonteCarloResults(simId: string, config: SimConfig, seed: number, totalIterations: number) {
		// Re-run a subset for timeseries percentiles (sample up to 100 iterations)
		const sampleSize = Math.min(totalIterations, 100);
		const sampleStep = Math.max(1, Math.floor(totalIterations / sampleSize));
		const allTimeseries: StepRecord[][] = [];

		for (let i = 0; i < totalIterations; i += sampleStep) {
			const result = runMonteCarloIteration(
				i,
				{
					iterations: totalIterations,
					timesteps: config.timesteps ?? 365,
					stepUnit: (config.stepUnit as any) ?? 'day',
					seed,
					parameters: config.parameters ?? [],
				},
				config.bondingCurve ?? null,
				config.emissionSchedule ?? null,
				config.vestingSchedules ?? [],
				config.totalSupply ?? 1_000_000_000,
				seed,
			);
			allTimeseries.push(result.timeseries);
		}

		// Compute percentile bands for price and circulating supply
		const timesteps = config.timesteps ?? 365;
		for (let t = 0; t < timesteps; t += Math.max(1, Math.floor(timesteps / 200))) {
			const pricesAtT = allTimeseries.map(ts => ts[t]?.price ?? 0);
			const suppliesAtT = allTimeseries.map(ts => ts[t]?.circulatingSupply ?? 0);

			this.sql.exec(
				'INSERT INTO sim_timeseries (sim_id, timestep, variable_id, p5, p25, p50, p75, p95) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				simId, t, 'price',
				computePercentile(pricesAtT, 5), computePercentile(pricesAtT, 25),
				computePercentile(pricesAtT, 50), computePercentile(pricesAtT, 75),
				computePercentile(pricesAtT, 95)
			);
			this.sql.exec(
				'INSERT INTO sim_timeseries (sim_id, timestep, variable_id, p5, p25, p50, p75, p95) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				simId, t, 'circulating_supply',
				computePercentile(suppliesAtT, 5), computePercentile(suppliesAtT, 25),
				computePercentile(suppliesAtT, 50), computePercentile(suppliesAtT, 75),
				computePercentile(suppliesAtT, 95)
			);
		}

		// Compute summary from all iterations
		const iterRows = [...this.sql.exec('SELECT final_values FROM sim_iterations WHERE sim_id = ?', simId)];
		const iterResults: IterationResult[] = iterRows.map((r: any, i) => {
			const fv = JSON.parse(r.final_values);
			return { iteration: i, finalPrice: fv.price, finalCirculating: fv.circulating, finalTreasury: fv.treasury, finalStaked: fv.staked, timeseries: [] };
		});
		const summary = computeSummary(iterResults);

		this.sql.exec(
			'UPDATE sim_meta SET status = ?, progress = 100, completed_at = ?, summary = ? WHERE id = ?',
			'complete', Date.now(), JSON.stringify(summary), simId
		);
		this.broadcastProgress(100, 'complete');
	}

	// ─── ABM single-pass execution ───

	private async runABMFull(simId: string, config: SimConfig) {
		const seed = config.seed ?? Date.now();
		const snapshots = runABMSimulation(
			{
				timesteps: config.timesteps ?? 365,
				stepUnit: (config.stepUnit as any) ?? 'day',
				agentPopulations: config.agentPopulations ?? [],
			},
			config.bondingCurve ?? null,
			config.totalSupply ?? 1_000_000_000,
			seed,
		);

		// Store agent snapshots (sample every Nth step to keep DB small)
		const sampleRate = Math.max(1, Math.floor(snapshots.length / 200));
		for (let i = 0; i < snapshots.length; i += sampleRate) {
			const snap = snapshots[i];
			for (const as of snap.agentSnapshots) {
				this.sql.exec(
					'INSERT INTO sim_agent_snapshots (sim_id, timestep, agent_type, count, avg_holdings, total_activity) VALUES (?, ?, ?, ?, ?, ?)',
					simId, snap.step, as.type, as.count, as.avgHoldings, as.totalActivity
				);
			}
			// Also store price/supply as timeseries
			this.sql.exec(
				'INSERT INTO sim_timeseries (sim_id, timestep, variable_id, p50) VALUES (?, ?, ?, ?)',
				simId, snap.step, 'price', snap.price
			);
			this.sql.exec(
				'INSERT INTO sim_timeseries (sim_id, timestep, variable_id, p50) VALUES (?, ?, ?, ?)',
				simId, snap.step, 'circulating_supply', snap.circulatingSupply
			);
		}

		const lastSnap = snapshots[snapshots.length - 1];
		const summary = {
			medianPrice: lastSnap.price,
			medianCirculatingSupply: lastSnap.circulatingSupply,
		};

		this.sql.exec(
			'UPDATE sim_meta SET status = ?, progress = 100, completed_at = ?, summary = ? WHERE id = ?',
			'complete', Date.now(), JSON.stringify(summary), simId
		);
		this.broadcastProgress(100, 'complete');
	}

	// ─── Handlers ───

	private launchSimulation(config: any): Response {
		const id = crypto.randomUUID();
		this.sql.exec(
			'INSERT INTO sim_meta (id, project_id, type, status, config, progress, completed_iteration, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			id, config.projectId, config.type ?? 'monte_carlo', 'running', JSON.stringify(config), 0, 0, Date.now()
		);
		this.ctx.storage.setAlarm(Date.now() + 50);
		return json({ id, status: 'running' });
	}

	private getStatus(): Response {
		const meta = this.sql.exec('SELECT * FROM sim_meta LIMIT 1').one() as any;
		if (!meta) return json({ error: 'No simulation' }, 404);
		return json({
			id: meta.id, projectId: meta.project_id, type: meta.type,
			status: meta.status, progress: meta.progress,
			startedAt: meta.started_at, completedAt: meta.completed_at,
			summary: meta.summary ? JSON.parse(meta.summary) : undefined,
		});
	}

	private getResults(): Response {
		const meta = this.sql.exec('SELECT * FROM sim_meta LIMIT 1').one() as any;
		if (!meta) return json({ error: 'No simulation' }, 404);

		const timeseries = [...this.sql.exec(
			'SELECT * FROM sim_timeseries WHERE sim_id = ? ORDER BY variable_id, timestep', meta.id
		)].map((r: any) => ({
			timestep: r.timestep, variableId: r.variable_id,
			p5: r.p5, p25: r.p25, p50: r.p50, p75: r.p75, p95: r.p95,
		}));

		const iterations = [...this.sql.exec(
			'SELECT iteration, final_values FROM sim_iterations WHERE sim_id = ? ORDER BY iteration', meta.id
		)].map((r: any) => ({ iteration: r.iteration, finalValues: JSON.parse(r.final_values) }));

		const agentSnapshots = [...this.sql.exec(
			'SELECT * FROM sim_agent_snapshots WHERE sim_id = ? ORDER BY timestep, agent_type', meta.id
		)].map((r: any) => ({
			timestep: r.timestep, agentType: r.agent_type,
			count: r.count, avgHoldings: r.avg_holdings, totalActivity: r.total_activity,
		}));

		return json({
			meta: { id: meta.id, type: meta.type, status: meta.status, summary: meta.summary ? JSON.parse(meta.summary) : undefined },
			timeseries, iterations, agentSnapshots,
		});
	}

	private cancelSimulation(): Response {
		this.sql.exec("UPDATE sim_meta SET status = 'failed' WHERE status IN ('queued', 'running')");
		return json({ ok: true });
	}

	private broadcastProgress(progress: number, status: string) {
		const msg = JSON.stringify({ type: 'progress', progress, status });
		for (const ws of this.ctx.getWebSockets()) {
			try { ws.send(msg); } catch { /* disconnected */ }
		}
	}
}

function json(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status, headers: { 'Content-Type': 'application/json' }
	});
}
