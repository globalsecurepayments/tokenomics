import { SeededRNG } from '@tokenomics/shared';
import type { AgentPopulation } from '@tokenomics/shared';

export interface AgentState {
	type: string;
	holdings: number;
	staked: number;
	lastAction: 'buy' | 'sell' | 'hold' | 'stake';
	holdTimer: number; // steps remaining before can sell
}

export function initializeAgents(populations: AgentPopulation[], rng: SeededRNG): AgentState[] {
	const agents: AgentState[] = [];
	for (const pop of populations) {
		for (let i = 0; i < pop.count; i++) {
			agents.push({
				type: pop.type,
				holdings: 0,
				staked: 0,
				lastAction: 'hold',
				holdTimer: 0,
			});
		}
	}
	return agents;
}

export interface AgentAction {
	type: 'buy' | 'sell' | 'stake' | 'unstake' | 'hold';
	amount: number;
}

export function decideAction(
	agent: AgentState,
	pop: AgentPopulation,
	price: number,
	rng: SeededRNG
): AgentAction {
	// Decrement hold timer
	if (agent.holdTimer > 0) {
		agent.holdTimer--;
		return { type: 'hold', amount: 0 };
	}

	const r = rng.next();

	// Buy decision
	if (r < pop.behavior.buyProbability) {
		// Buy amount scaled by agent type
		const baseAmount = price > 0 ? (100 / price) : 100;
		const amount = baseAmount * (pop.type === 'whale' ? 50 : pop.type === 'speculator' ? 5 : 1);
		agent.holdTimer = Math.max(0, Math.round(rng.normal(pop.behavior.holdDuration.mean, pop.behavior.holdDuration.std)));
		return { type: 'buy', amount };
	}

	// Sell decision (only if has holdings)
	if (r < pop.behavior.buyProbability + pop.behavior.sellProbability && agent.holdings > 0) {
		const sellFraction = pop.type === 'worker' ? 0.8 : pop.type === 'speculator' ? 0.5 : 0.2;
		return { type: 'sell', amount: agent.holdings * sellFraction };
	}

	// Stake decision
	if (pop.behavior.stakeProbability && rng.next() < pop.behavior.stakeProbability && agent.holdings > 0) {
		return { type: 'stake', amount: agent.holdings * 0.3 };
	}

	return { type: 'hold', amount: 0 };
}
