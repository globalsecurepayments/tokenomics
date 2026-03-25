import type { BondingCurve } from '../schemas/bonding-curve';

/** Calculate price at a given supply for a bonding curve */
export function bondingCurvePrice(curve: BondingCurve, supply: number): number {
	const p = curve.params;
	switch (curve.type) {
		case 'linear':
			return (p.slope ?? 1) * supply + (p.intercept ?? 0);
		case 'exponential':
			return (p.intercept ?? 1) * Math.pow(p.base ?? Math.E, (p.exponent ?? 0.001) * supply);
		case 'logarithmic':
			return (p.slope ?? 1) * Math.log(supply + 1) / Math.log(p.logBase ?? Math.E) + (p.intercept ?? 0);
		case 'sigmoid':
			return (p.maxPrice ?? 1) / (1 + Math.exp(-(p.steepness ?? 0.001) * (supply - (p.midpoint ?? 0))));
		case 'custom':
			return interpolateCustom(curve.customPoints ?? [], supply);
		default:
			return 0;
	}
}

/** Area under bonding curve from 0 to supply = total collateral (reserve) */
export function bondingCurveReserve(curve: BondingCurve, supply: number, steps = 100): number {
	const dx = supply / steps;
	let total = 0;
	for (let i = 0; i < steps; i++) {
		const s = i * dx;
		total += bondingCurvePrice(curve, s) * dx;
	}
	return total;
}

/** Generate price series for plotting */
export function bondingCurveSeries(
	curve: BondingCurve,
	maxSupply: number,
	points = 200
): Array<{ supply: number; price: number }> {
	const result: Array<{ supply: number; price: number }> = [];
	for (let i = 0; i <= points; i++) {
		const supply = (i / points) * maxSupply;
		result.push({ supply, price: bondingCurvePrice(curve, supply) });
	}
	return result;
}

function interpolateCustom(
	points: Array<{ supply: number; price: number }>,
	supply: number
): number {
	if (points.length === 0) return 0;
	if (points.length === 1) return points[0].price;

	const sorted = [...points].sort((a, b) => a.supply - b.supply);
	if (supply <= sorted[0].supply) return sorted[0].price;
	if (supply >= sorted[sorted.length - 1].supply) return sorted[sorted.length - 1].price;

	for (let i = 0; i < sorted.length - 1; i++) {
		if (supply >= sorted[i].supply && supply <= sorted[i + 1].supply) {
			const t = (supply - sorted[i].supply) / (sorted[i + 1].supply - sorted[i].supply);
			return sorted[i].price + t * (sorted[i + 1].price - sorted[i].price);
		}
	}
	return sorted[sorted.length - 1].price;
}
