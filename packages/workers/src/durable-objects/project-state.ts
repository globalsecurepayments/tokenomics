import {
	type Project,
	type CLDModel,
	type StockFlowModel,
	type BondingCurve,
	type EmissionSchedule,
	type VestingSchedule,
	type Allocation
} from '@tokenomics/shared';

interface ProjectRow {
	id: string;
	name: string;
	description: string | null;
	token_symbol: string;
	total_supply: number;
	decimals: number;
	status: string;
	created_at: number;
	updated_at: number;
}

export class ProjectState implements DurableObject {
	private sql: SqlStorage;
	private initialized = false;

	constructor(private ctx: DurableObjectState, private env: unknown) {
		this.sql = ctx.storage.sql;
	}

	private initSchema() {
		if (this.initialized) return;
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS project (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				token_symbol TEXT NOT NULL,
				total_supply REAL NOT NULL,
				decimals INTEGER NOT NULL DEFAULT 18,
				status TEXT NOT NULL DEFAULT 'draft',
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS cld_variables (
				id TEXT PRIMARY KEY,
				label TEXT NOT NULL,
				type TEXT NOT NULL,
				position_x REAL NOT NULL DEFAULT 0,
				position_y REAL NOT NULL DEFAULT 0,
				initial_value REAL,
				unit TEXT
			);
			CREATE TABLE IF NOT EXISTS cld_links (
				id TEXT PRIMARY KEY,
				source_id TEXT NOT NULL,
				target_id TEXT NOT NULL,
				polarity TEXT NOT NULL,
				delay INTEGER NOT NULL DEFAULT 0
			);
			CREATE TABLE IF NOT EXISTS cld_loops (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				label TEXT NOT NULL,
				variable_ids TEXT NOT NULL,
				position_x REAL NOT NULL DEFAULT 0,
				position_y REAL NOT NULL DEFAULT 0
			);
			CREATE TABLE IF NOT EXISTS stocks (
				id TEXT PRIMARY KEY,
				variable_id TEXT NOT NULL,
				label TEXT NOT NULL,
				initial_value REAL NOT NULL DEFAULT 0,
				equation TEXT
			);
			CREATE TABLE IF NOT EXISTS flows (
				id TEXT PRIMARY KEY,
				label TEXT NOT NULL,
				from_stock TEXT,
				to_stock TEXT,
				rate_equation TEXT NOT NULL,
				unit TEXT NOT NULL DEFAULT 'tokens/step'
			);
			CREATE TABLE IF NOT EXISTS converters (
				id TEXT PRIMARY KEY,
				label TEXT NOT NULL,
				equation TEXT NOT NULL,
				inputs TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS bonding_curves (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				params TEXT NOT NULL,
				custom_points TEXT
			);
			CREATE TABLE IF NOT EXISTS emission_schedules (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				params TEXT NOT NULL,
				custom_points TEXT
			);
			CREATE TABLE IF NOT EXISTS vesting_schedules (
				id TEXT PRIMARY KEY,
				label TEXT NOT NULL,
				allocation_percent REAL NOT NULL,
				tge_percent REAL NOT NULL DEFAULT 0,
				cliff_months INTEGER NOT NULL DEFAULT 0,
				linear_months INTEGER NOT NULL DEFAULT 0
			);
			CREATE TABLE IF NOT EXISTS allocations (
				id TEXT PRIMARY KEY,
				label TEXT NOT NULL,
				percentage REAL NOT NULL,
				color TEXT NOT NULL,
				vesting_id TEXT
			);
		`);
		this.initialized = true;
	}

	async fetch(request: Request): Promise<Response> {
		this.initSchema();
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		try {
			if (method === 'GET' && path === '/project') return this.getProject();
			if (method === 'PUT' && path === '/project') return this.putProject(await request.json());
			if (method === 'DELETE' && path === '/project') return this.deleteProject();

			if (method === 'GET' && path === '/cld') return this.getCLD();
			if (method === 'PUT' && path === '/cld') return this.putCLD(await request.json());

			if (method === 'GET' && path === '/stock-flow') return this.getStockFlow();
			if (method === 'PUT' && path === '/stock-flow') return this.putStockFlow(await request.json());

			if (method === 'GET' && path === '/bonding-curve') return this.getBondingCurves();
			if (method === 'PUT' && path === '/bonding-curve') return this.putBondingCurves(await request.json());

			if (method === 'GET' && path === '/emission') return this.getEmissionSchedules();
			if (method === 'PUT' && path === '/emission') return this.putEmissionSchedules(await request.json());

			if (method === 'GET' && path === '/vesting') return this.getVestingSchedules();
			if (method === 'PUT' && path === '/vesting') return this.putVestingSchedules(await request.json());

			if (method === 'GET' && path === '/allocation') return this.getAllocations();
			if (method === 'PUT' && path === '/allocation') return this.putAllocations(await request.json());

			if (method === 'GET' && path === '/full') return this.getFullModel();

			return json({ error: 'Not found' }, 404);
		} catch (err: any) {
			return json({ error: err.message || 'Internal error' }, 500);
		}
	}

	// --- Project ---

	private getProject(): Response {
		const row = this.sql.exec('SELECT * FROM project LIMIT 1').one() as unknown as ProjectRow | null;
		if (!row) return json({ error: 'No project' }, 404);
		return json(this.rowToProject(row));
	}

	private putProject(data: any): Response {
		const now = Date.now();
		this.sql.exec(
			`INSERT INTO project (id, name, description, token_symbol, total_supply, decimals, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				description = excluded.description,
				token_symbol = excluded.token_symbol,
				total_supply = excluded.total_supply,
				decimals = excluded.decimals,
				status = excluded.status,
				updated_at = excluded.updated_at`,
			data.id, data.name, data.description ?? null, data.tokenSymbol, data.totalSupply,
			data.decimals ?? 18, data.status ?? 'draft', data.createdAt ?? now, now
		);
		return json({ ok: true });
	}

	private deleteProject(): Response {
		this.sql.exec('DELETE FROM project');
		this.sql.exec('DELETE FROM cld_variables');
		this.sql.exec('DELETE FROM cld_links');
		this.sql.exec('DELETE FROM cld_loops');
		this.sql.exec('DELETE FROM stocks');
		this.sql.exec('DELETE FROM flows');
		this.sql.exec('DELETE FROM converters');
		this.sql.exec('DELETE FROM bonding_curves');
		this.sql.exec('DELETE FROM emission_schedules');
		this.sql.exec('DELETE FROM vesting_schedules');
		this.sql.exec('DELETE FROM allocations');
		return json({ ok: true });
	}

	// --- CLD ---

	private getCLD(): Response {
		const variables = [...this.sql.exec('SELECT * FROM cld_variables')].map((r: any) => ({
			id: r.id, label: r.label, type: r.type,
			position: { x: r.position_x, y: r.position_y },
			initialValue: r.initial_value, unit: r.unit
		}));
		const links = [...this.sql.exec('SELECT * FROM cld_links')].map((r: any) => ({
			id: r.id, source: r.source_id, target: r.target_id,
			polarity: r.polarity, delay: !!r.delay
		}));
		const loops = [...this.sql.exec('SELECT * FROM cld_loops')].map((r: any) => ({
			id: r.id, type: r.type, label: r.label,
			variableIds: JSON.parse(r.variable_ids),
			position: { x: r.position_x, y: r.position_y }
		}));
		return json({ variables, links, loops });
	}

	private putCLD(data: CLDModel): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM cld_variables');
			this.sql.exec('DELETE FROM cld_links');
			this.sql.exec('DELETE FROM cld_loops');

			for (const v of data.variables) {
				this.sql.exec(
					'INSERT INTO cld_variables (id, label, type, position_x, position_y, initial_value, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
					v.id, v.label, v.type, v.position.x, v.position.y, v.initialValue ?? null, v.unit ?? null
				);
			}
			for (const l of data.links) {
				this.sql.exec(
					'INSERT INTO cld_links (id, source_id, target_id, polarity, delay) VALUES (?, ?, ?, ?, ?)',
					l.id, l.source, l.target, l.polarity, l.delay ? 1 : 0
				);
			}
			for (const lp of data.loops) {
				this.sql.exec(
					'INSERT INTO cld_loops (id, type, label, variable_ids, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?)',
					lp.id, lp.type, lp.label, JSON.stringify(lp.variableIds), lp.position.x, lp.position.y
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Stock-Flow ---

	private getStockFlow(): Response {
		const stocks = [...this.sql.exec('SELECT * FROM stocks')].map((r: any) => ({
			id: r.id, variableId: r.variable_id, label: r.label,
			initialValue: r.initial_value, equation: r.equation
		}));
		const flows = [...this.sql.exec('SELECT * FROM flows')].map((r: any) => ({
			id: r.id, label: r.label, from: r.from_stock, to: r.to_stock,
			rateEquation: r.rate_equation, unit: r.unit
		}));
		const converters = [...this.sql.exec('SELECT * FROM converters')].map((r: any) => ({
			id: r.id, label: r.label, equation: r.equation,
			inputs: JSON.parse(r.inputs)
		}));
		return json({ stocks, flows, converters });
	}

	private putStockFlow(data: StockFlowModel): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM stocks');
			this.sql.exec('DELETE FROM flows');
			this.sql.exec('DELETE FROM converters');

			for (const s of data.stocks) {
				this.sql.exec(
					'INSERT INTO stocks (id, variable_id, label, initial_value, equation) VALUES (?, ?, ?, ?, ?)',
					s.id, s.variableId, s.label, s.initialValue, s.equation ?? null
				);
			}
			for (const f of data.flows) {
				this.sql.exec(
					'INSERT INTO flows (id, label, from_stock, to_stock, rate_equation, unit) VALUES (?, ?, ?, ?, ?, ?)',
					f.id, f.label, f.from, f.to, f.rateEquation, f.unit
				);
			}
			for (const c of data.converters) {
				this.sql.exec(
					'INSERT INTO converters (id, label, equation, inputs) VALUES (?, ?, ?, ?)',
					c.id, c.label, c.equation, JSON.stringify(c.inputs)
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Bonding Curves ---

	private getBondingCurves(): Response {
		const rows = [...this.sql.exec('SELECT * FROM bonding_curves')].map((r: any) => ({
			id: r.id, type: r.type, params: JSON.parse(r.params),
			customPoints: r.custom_points ? JSON.parse(r.custom_points) : undefined
		}));
		return json(rows);
	}

	private putBondingCurves(data: BondingCurve[]): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM bonding_curves');
			for (const c of data) {
				this.sql.exec(
					'INSERT INTO bonding_curves (id, type, params, custom_points) VALUES (?, ?, ?, ?)',
					c.id, c.type, JSON.stringify(c.params), c.customPoints ? JSON.stringify(c.customPoints) : null
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Emission Schedules ---

	private getEmissionSchedules(): Response {
		const rows = [...this.sql.exec('SELECT * FROM emission_schedules')].map((r: any) => ({
			id: r.id, type: r.type, params: JSON.parse(r.params),
			customPoints: r.custom_points ? JSON.parse(r.custom_points) : undefined
		}));
		return json(rows);
	}

	private putEmissionSchedules(data: EmissionSchedule[]): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM emission_schedules');
			for (const e of data) {
				this.sql.exec(
					'INSERT INTO emission_schedules (id, type, params, custom_points) VALUES (?, ?, ?, ?)',
					e.id, e.type, JSON.stringify(e.params), e.customPoints ? JSON.stringify(e.customPoints) : null
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Vesting Schedules ---

	private getVestingSchedules(): Response {
		const rows = [...this.sql.exec('SELECT * FROM vesting_schedules')].map((r: any) => ({
			id: r.id, label: r.label, allocationPercent: r.allocation_percent,
			tgePercent: r.tge_percent, cliffMonths: r.cliff_months, linearMonths: r.linear_months
		}));
		return json(rows);
	}

	private putVestingSchedules(data: VestingSchedule[]): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM vesting_schedules');
			for (const v of data) {
				this.sql.exec(
					'INSERT INTO vesting_schedules (id, label, allocation_percent, tge_percent, cliff_months, linear_months) VALUES (?, ?, ?, ?, ?, ?)',
					v.id, v.label, v.allocationPercent, v.tgePercent, v.cliffMonths, v.linearMonths
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Allocations ---

	private getAllocations(): Response {
		const rows = [...this.sql.exec('SELECT * FROM allocations')].map((r: any) => ({
			id: r.id, label: r.label, percentage: r.percentage,
			color: r.color, vestingId: r.vesting_id
		}));
		return json(rows);
	}

	private putAllocations(data: Allocation[]): Response {
		this.ctx.storage.transactionSync(() => {
			this.sql.exec('DELETE FROM allocations');
			for (const a of data) {
				this.sql.exec(
					'INSERT INTO allocations (id, label, percentage, color, vesting_id) VALUES (?, ?, ?, ?, ?)',
					a.id, a.label, a.percentage, a.color, a.vestingId ?? null
				);
			}
		});
		this.touchUpdatedAt();
		return json({ ok: true });
	}

	// --- Full Model ---

	private getFullModel(): Response {
		const project = this.sql.exec('SELECT * FROM project LIMIT 1').one() as unknown as ProjectRow | null;
		if (!project) return json({ error: 'No project' }, 404);

		const cld = JSON.parse((this.getCLD() as any).__body ?? '{}');
		const stockFlow = JSON.parse((this.getStockFlow() as any).__body ?? '{}');
		const bondingCurves = JSON.parse((this.getBondingCurves() as any).__body ?? '[]');
		const emissionSchedules = JSON.parse((this.getEmissionSchedules() as any).__body ?? '[]');
		const vestingSchedules = JSON.parse((this.getVestingSchedules() as any).__body ?? '[]');
		const allocations = JSON.parse((this.getAllocations() as any).__body ?? '[]');

		// Re-fetch cleanly to avoid Response body reading issues
		return json({
			project: this.rowToProject(project),
			cld: this.getCLDData(),
			stockFlow: this.getStockFlowData(),
			bondingCurves: this.getBondingCurvesData(),
			emissionSchedules: this.getEmissionSchedulesData(),
			vestingSchedules: this.getVestingSchedulesData(),
			allocations: this.getAllocationsData()
		});
	}

	// --- Data helpers (return plain objects, not Response) ---

	private getCLDData(): CLDModel {
		const variables = [...this.sql.exec('SELECT * FROM cld_variables')].map((r: any) => ({
			id: r.id, label: r.label, type: r.type,
			position: { x: r.position_x, y: r.position_y },
			initialValue: r.initial_value ?? undefined, unit: r.unit ?? undefined
		}));
		const links = [...this.sql.exec('SELECT * FROM cld_links')].map((r: any) => ({
			id: r.id, source: r.source_id, target: r.target_id,
			polarity: r.polarity, delay: !!r.delay
		}));
		const loops = [...this.sql.exec('SELECT * FROM cld_loops')].map((r: any) => ({
			id: r.id, type: r.type, label: r.label,
			variableIds: JSON.parse(r.variable_ids),
			position: { x: r.position_x, y: r.position_y }
		}));
		return { variables, links, loops } as CLDModel;
	}

	private getStockFlowData(): StockFlowModel {
		const stocks = [...this.sql.exec('SELECT * FROM stocks')].map((r: any) => ({
			id: r.id, variableId: r.variable_id, label: r.label,
			initialValue: r.initial_value, equation: r.equation ?? undefined
		}));
		const flows = [...this.sql.exec('SELECT * FROM flows')].map((r: any) => ({
			id: r.id, label: r.label, from: r.from_stock, to: r.to_stock,
			rateEquation: r.rate_equation, unit: r.unit
		}));
		const converters = [...this.sql.exec('SELECT * FROM converters')].map((r: any) => ({
			id: r.id, label: r.label, equation: r.equation,
			inputs: JSON.parse(r.inputs)
		}));
		return { stocks, flows, converters } as StockFlowModel;
	}

	private getBondingCurvesData(): BondingCurve[] {
		return [...this.sql.exec('SELECT * FROM bonding_curves')].map((r: any) => ({
			id: r.id, type: r.type, params: JSON.parse(r.params),
			customPoints: r.custom_points ? JSON.parse(r.custom_points) : undefined
		})) as BondingCurve[];
	}

	private getEmissionSchedulesData(): EmissionSchedule[] {
		return [...this.sql.exec('SELECT * FROM emission_schedules')].map((r: any) => ({
			id: r.id, type: r.type, params: JSON.parse(r.params),
			customPoints: r.custom_points ? JSON.parse(r.custom_points) : undefined
		})) as EmissionSchedule[];
	}

	private getVestingSchedulesData(): VestingSchedule[] {
		return [...this.sql.exec('SELECT * FROM vesting_schedules')].map((r: any) => ({
			id: r.id, label: r.label, allocationPercent: r.allocation_percent,
			tgePercent: r.tge_percent, cliffMonths: r.cliff_months, linearMonths: r.linear_months
		})) as VestingSchedule[];
	}

	private getAllocationsData(): Allocation[] {
		return [...this.sql.exec('SELECT * FROM allocations')].map((r: any) => ({
			id: r.id, label: r.label, percentage: r.percentage,
			color: r.color, vestingId: r.vesting_id ?? undefined
		})) as Allocation[];
	}

	private rowToProject(row: ProjectRow): Project {
		return {
			id: row.id,
			name: row.name,
			description: row.description ?? undefined,
			tokenSymbol: row.token_symbol,
			totalSupply: row.total_supply,
			decimals: row.decimals,
			status: row.status as Project['status'],
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	private touchUpdatedAt() {
		this.sql.exec('UPDATE project SET updated_at = ?', Date.now());
	}
}

function json(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
