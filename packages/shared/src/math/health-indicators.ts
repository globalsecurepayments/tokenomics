import type { HealthIndicator } from '../schemas/health';

/** Normalized Treasury Decrease: actual / target (0.025/month) */
export function normalizedTreasuryDecrease(
	actualDecrease: number,
	targetDecrease = 0.025
): HealthIndicator {
	const value = actualDecrease / targetDecrease;
	return {
		name: 'Normalized Treasury Decrease',
		value,
		target: 1.0,
		status: value <= 1.2 ? 'healthy' : value <= 2.0 ? 'warning' : 'critical',
		description: value > 1 ? 'Treasury depleting faster than planned' : 'Treasury on track'
	};
}

/** Normalized Emission per Unit Staked: actual / target */
export function normalizedEmissionPerStaked(
	actualEmission: number,
	targetEmission: number
): HealthIndicator {
	const value = targetEmission === 0 ? 0 : actualEmission / targetEmission;
	return {
		name: 'Normalized Emission per Staked',
		value,
		target: 1.0,
		status: Math.abs(value - 1) <= 0.2 ? 'healthy' : Math.abs(value - 1) <= 0.5 ? 'warning' : 'critical',
		description: 'Deviation from target emission rate per staked token'
	};
}

/** Log Normalized Inflation: ln(actual_inflation / target_inflation) */
export function logNormalizedInflation(
	actualInflation: number,
	targetInflation: number
): HealthIndicator {
	const ratio = targetInflation === 0 ? 1 : actualInflation / targetInflation;
	const value = Math.log(Math.max(ratio, 1e-10));
	return {
		name: 'Log Normalized Inflation',
		value,
		target: 0,
		status: Math.abs(value) <= 0.1 ? 'healthy' : Math.abs(value) <= 0.5 ? 'warning' : 'critical',
		description: value > 0 ? 'Inflation above target' : 'Inflation below target'
	};
}

/** FDV/TVL Ratio: fully diluted valuation / total value locked */
export function fdvTvlRatio(fdv: number, tvl: number): HealthIndicator {
	const value = tvl === 0 ? Infinity : fdv / tvl;
	return {
		name: 'FDV/TVL Ratio',
		value,
		target: 5.0,
		status: value <= 10 ? 'healthy' : value <= 20 ? 'warning' : 'critical',
		description: value > 10 ? 'Overvalued relative to locked value' : 'Valuation aligned with TVL'
	};
}

/** Float Analysis: circulating / total supply */
export function floatAnalysis(circulatingSupply: number, totalSupply: number): HealthIndicator {
	const value = totalSupply === 0 ? 0 : (circulatingSupply / totalSupply) * 100;
	return {
		name: 'Float Analysis',
		value,
		target: 50,
		status: value >= 30 ? 'healthy' : value >= 20 ? 'warning' : 'critical',
		description: value < 20 ? 'Low float — high dilution risk from future unlocks' : 'Balanced float'
	};
}
