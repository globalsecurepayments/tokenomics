import type { EmissionSchedule } from '../schemas/emission';

/** Calculate cumulative emission at a given month */
export function cumulativeEmission(schedule: EmissionSchedule, month: number): number {
	const p = schedule.params;
	const t = Math.min(month, p.durationMonths);

	switch (schedule.type) {
		case 'linear':
			return (p.totalEmission / p.durationMonths) * t;

		case 'halving': {
			const period = p.halvingPeriodMonths ?? 12;
			const factor = p.halvingFactor ?? 0.5;
			let emitted = 0;
			let rate = p.totalEmission * (1 - factor) / period;
			let remaining = t;
			while (remaining > 0) {
				const chunk = Math.min(remaining, period);
				emitted += rate * chunk;
				remaining -= chunk;
				rate *= factor;
			}
			return Math.min(emitted, p.totalEmission);
		}

		case 'sigmoid': {
			const mid = p.sigmoidMidpoint ?? p.durationMonths / 2;
			const steep = p.sigmoidSteepness ?? 0.1;
			const sig = 1 / (1 + Math.exp(-steep * (t - mid)));
			const sig0 = 1 / (1 + Math.exp(-steep * (0 - mid)));
			const sigMax = 1 / (1 + Math.exp(-steep * (p.durationMonths - mid)));
			return p.totalEmission * (sig - sig0) / (sigMax - sig0);
		}

		case 'custom':
			return interpolateCustomEmission(schedule.customPoints ?? [], t);

		default:
			return 0;
	}
}

/** Emission rate at a given month (tokens/month) */
export function emissionRate(schedule: EmissionSchedule, month: number): number {
	const dt = 0.01;
	return Math.max(0, (cumulativeEmission(schedule, month + dt) - cumulativeEmission(schedule, month)) / dt);
}

/** Generate emission series for plotting */
export function emissionSeries(
	schedule: EmissionSchedule,
	points = 200
): Array<{ month: number; cumulative: number; rate: number }> {
	const d = schedule.params.durationMonths;
	const result: Array<{ month: number; cumulative: number; rate: number }> = [];
	for (let i = 0; i <= points; i++) {
		const month = (i / points) * d;
		result.push({
			month,
			cumulative: cumulativeEmission(schedule, month),
			rate: emissionRate(schedule, month)
		});
	}
	return result;
}

function interpolateCustomEmission(
	points: Array<{ month: number; cumulativeEmission: number }>,
	month: number
): number {
	if (points.length === 0) return 0;
	const sorted = [...points].sort((a, b) => a.month - b.month);
	if (month <= sorted[0].month) return sorted[0].cumulativeEmission;
	if (month >= sorted[sorted.length - 1].month) return sorted[sorted.length - 1].cumulativeEmission;

	for (let i = 0; i < sorted.length - 1; i++) {
		if (month >= sorted[i].month && month <= sorted[i + 1].month) {
			const t = (month - sorted[i].month) / (sorted[i + 1].month - sorted[i].month);
			return sorted[i].cumulativeEmission + t * (sorted[i + 1].cumulativeEmission - sorted[i].cumulativeEmission);
		}
	}
	return sorted[sorted.length - 1].cumulativeEmission;
}
