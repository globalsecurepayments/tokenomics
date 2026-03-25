import {
	SeededRNG,
	bondingCurvePrice,
	cumulativeEmission,
	totalVestingUnlocked,
	type BondingCurve,
	type EmissionSchedule,
	type VestingSchedule,
	type StockFlowModel,
	type MonteCarloConfig,
	type ABMConfig,
	type AgentPopulation,
	type Distribution,
} from '@tokenomics/shared';
import { initializeAgents, decideAction, type AgentState } from './agent-types';

// ─── Shared types ───

export interface SimState {
	step: number;
	circulatingSupply: number;
	stakedSupply: number;
	treasury: number;
	price: number;
	totalBurned: number;
	totalMinted: number;
}

export interface StepRecord {
	step: number;
	price: number;
	circulatingSupply: number;
	stakedSupply: number;
	treasury: number;
}

export interface IterationResult {
	iteration: number;
	finalPrice: number;
	finalCirculating: number;
	finalTreasury: number;
	finalStaked: number;
	timeseries: StepRecord[];
}

export interface ABMStepSnapshot {
	step: number;
	price: number;
	circulatingSupply: number;
	agentSnapshots: Array<{ type: string; count: number; avgHoldings: number; totalActivity: number }>;
}

// ─── Monte Carlo ───

export function runMonteCarloIteration(
	iteration: number,
	config: MonteCarloConfig,
	bondingCurve: BondingCurve | null,
	emissionSchedule: EmissionSchedule | null,
	vestingSchedules: VestingSchedule[],
	totalSupply: number,
	seed: number,
): IterationResult {
	const rng = new SeededRNG(seed + iteration * 7919);

	// Sample stochastic parameters
	const paramOverrides: Record<string, number> = {};
	for (const p of config.parameters) {
		paramOverrides[p.variableId] = sampleDistribution(p.distribution, rng);
	}

	// Initial state
	const state: SimState = {
		step: 0,
		circulatingSupply: totalSupply * 0.1, // assume 10% initial float
		stakedSupply: 0,
		treasury: totalSupply * 0.15,
		price: bondingCurve ? bondingCurvePrice(bondingCurve, totalSupply * 0.1) : 1.0,
		totalBurned: 0,
		totalMinted: 0,
	};

	const timeseries: StepRecord[] = [];
	const stepsPerMonth = config.stepUnit === 'month' ? 1 : config.stepUnit === 'week' ? 4.33 : 30;

	for (let t = 0; t < config.timesteps; t++) {
		state.step = t;
		const month = t / stepsPerMonth;

		// Apply emission schedule
		if (emissionSchedule) {
			const prevEmission = t > 0 ? cumulativeEmission(emissionSchedule, (t - 1) / stepsPerMonth) : 0;
			const currEmission = cumulativeEmission(emissionSchedule, month);
			const newTokens = currEmission - prevEmission;
			if (newTokens > 0) {
				state.circulatingSupply += newTokens;
				state.totalMinted += newTokens;
			}
		}

		// Apply vesting unlocks
		if (vestingSchedules.length > 0) {
			const prevUnlocked = t > 0 ? totalVestingUnlocked(vestingSchedules, totalSupply, (t - 1) / stepsPerMonth) : 0;
			const currUnlocked = totalVestingUnlocked(vestingSchedules, totalSupply, month);
			const newUnlocks = currUnlocked - prevUnlocked;
			if (newUnlocks > 0) {
				state.circulatingSupply += newUnlocks;
			}
		}

		// Stochastic demand/supply shock
		const demandShock = paramOverrides['demand_shock'] ?? rng.normal(0, 0.02);
		const supplyPressure = paramOverrides['supply_pressure'] ?? rng.normal(0, 0.01);

		state.circulatingSupply *= (1 + supplyPressure);
		state.circulatingSupply = Math.max(0, state.circulatingSupply);

		// Recalculate price
		if (bondingCurve) {
			state.price = bondingCurvePrice(bondingCurve, state.circulatingSupply);
		} else {
			state.price *= (1 + demandShock - supplyPressure);
			state.price = Math.max(0.0001, state.price);
		}

		// Burn mechanism (small fee burn)
		const burnAmount = state.circulatingSupply * 0.0001;
		state.circulatingSupply -= burnAmount;
		state.totalBurned += burnAmount;

		// Treasury decay
		const treasurySpend = paramOverrides['treasury_spend_rate'] ?? 0.002;
		state.treasury *= (1 - treasurySpend / stepsPerMonth);

		// Record
		timeseries.push({
			step: t,
			price: state.price,
			circulatingSupply: state.circulatingSupply,
			stakedSupply: state.stakedSupply,
			treasury: state.treasury,
		});
	}

	return {
		iteration,
		finalPrice: state.price,
		finalCirculating: state.circulatingSupply,
		finalTreasury: state.treasury,
		finalStaked: state.stakedSupply,
		timeseries,
	};
}

// ─── Agent-Based Modeling ───

export function runABMSimulation(
	config: ABMConfig,
	bondingCurve: BondingCurve | null,
	totalSupply: number,
	seed: number,
): ABMStepSnapshot[] {
	const rng = new SeededRNG(seed);
	const agents = initializeAgents(config.agentPopulations, rng);

	let circulatingSupply = totalSupply * 0.1;
	let price = bondingCurve ? bondingCurvePrice(bondingCurve, circulatingSupply) : 1.0;

	const snapshots: ABMStepSnapshot[] = [];
	const popMap = new Map<string, AgentPopulation>();
	for (const p of config.agentPopulations) popMap.set(p.type, p);

	for (let t = 0; t < config.timesteps; t++) {
		let buyVolume = 0;
		let sellVolume = 0;

		for (const agent of agents) {
			const pop = popMap.get(agent.type)!;
			const action = decideAction(agent, pop, price, rng);

			switch (action.type) {
				case 'buy':
					agent.holdings += action.amount;
					circulatingSupply += action.amount * 0.01; // small supply impact
					buyVolume += action.amount;
					agent.lastAction = 'buy';
					break;
				case 'sell':
					agent.holdings -= action.amount;
					circulatingSupply -= action.amount * 0.005;
					sellVolume += action.amount;
					agent.lastAction = 'sell';
					break;
				case 'stake':
					agent.staked += action.amount;
					agent.holdings -= action.amount;
					circulatingSupply -= action.amount;
					agent.lastAction = 'stake';
					break;
				case 'unstake':
					agent.holdings += action.amount;
					agent.staked -= action.amount;
					circulatingSupply += action.amount;
					agent.lastAction = 'hold';
					break;
				default:
					agent.lastAction = 'hold';
			}
		}

		circulatingSupply = Math.max(1, circulatingSupply);

		// Price impact from buy/sell pressure
		if (bondingCurve) {
			price = bondingCurvePrice(bondingCurve, circulatingSupply);
		} else {
			const netPressure = (buyVolume - sellVolume) / Math.max(1, circulatingSupply);
			price *= (1 + netPressure * 0.01);
			price = Math.max(0.0001, price);
		}

		// Aggregate agent snapshots by type
		const typeGroups = new Map<string, { count: number; totalHoldings: number; activity: number }>();
		for (const agent of agents) {
			const g = typeGroups.get(agent.type) ?? { count: 0, totalHoldings: 0, activity: 0 };
			g.count++;
			g.totalHoldings += agent.holdings;
			g.activity += agent.lastAction !== 'hold' ? 1 : 0;
			typeGroups.set(agent.type, g);
		}

		snapshots.push({
			step: t,
			price,
			circulatingSupply,
			agentSnapshots: [...typeGroups.entries()].map(([type, g]) => ({
				type,
				count: g.count,
				avgHoldings: g.totalHoldings / g.count,
				totalActivity: g.activity,
			})),
		});
	}

	return snapshots;
}

// ─── Distribution sampling ───

function sampleDistribution(dist: Distribution, rng: SeededRNG): number {
	const p = dist.params;
	switch (dist.type) {
		case 'normal': return rng.normal(p.mean ?? 0, p.std ?? 1);
		case 'uniform': return rng.uniform(p.min ?? 0, p.max ?? 1);
		case 'lognormal': return rng.lognormal(p.mu ?? 0, p.sigma ?? 1);
		case 'triangular': return rng.triangular(p.min ?? 0, p.mode ?? 0.5, p.max ?? 1);
		default: return 0;
	}
}

// ─── Statistics helpers ───

export function computePercentile(values: number[], p: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	const idx = (p / 100) * (sorted.length - 1);
	const lower = Math.floor(idx);
	const upper = Math.ceil(idx);
	if (lower === upper) return sorted[lower];
	return sorted[lower] + (idx - lower) * (sorted[upper] - sorted[lower]);
}

export function computeSummary(iterations: IterationResult[]) {
	const prices = iterations.map(i => i.finalPrice);
	const supplies = iterations.map(i => i.finalCirculating);
	const treasuries = iterations.map(i => i.finalTreasury);

	const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
	const std = (arr: number[]) => {
		const m = mean(arr);
		return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
	};

	const avgReturn = mean(prices) / (prices[0] || 1) - 1;
	const stdReturn = std(prices) / mean(prices);
	const sharpe = stdReturn > 0 ? avgReturn / stdReturn : 0;

	return {
		medianPrice: computePercentile(prices, 50),
		p5Price: computePercentile(prices, 5),
		p95Price: computePercentile(prices, 95),
		medianCirculatingSupply: computePercentile(supplies, 50),
		finalTreasury: computePercentile(treasuries, 50),
		sharpeRatio: sharpe,
	};
}
