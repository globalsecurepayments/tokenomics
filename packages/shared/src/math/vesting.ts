import type { VestingSchedule } from '../schemas/vesting';

/** Calculate percentage unlocked at a given month for one vesting schedule */
export function vestingUnlocked(schedule: VestingSchedule, month: number): number {
	let unlocked = schedule.tgePercent;

	if (month < schedule.cliffMonths) {
		return unlocked;
	}

	if (schedule.linearMonths <= 0) {
		return month >= schedule.cliffMonths ? 100 : unlocked;
	}

	const monthsAfterCliff = month - schedule.cliffMonths;
	const linearProgress = Math.min(monthsAfterCliff / schedule.linearMonths, 1);
	const remainingAfterTge = 100 - schedule.tgePercent;
	unlocked += remainingAfterTge * linearProgress;

	return Math.min(unlocked, 100);
}

/** Calculate tokens unlocked at a given month */
export function vestingTokensUnlocked(
	schedule: VestingSchedule,
	totalSupply: number,
	month: number
): number {
	const pctUnlocked = vestingUnlocked(schedule, month);
	const allocation = totalSupply * (schedule.allocationPercent / 100);
	return allocation * (pctUnlocked / 100);
}

/** Generate vesting series for plotting */
export function vestingSeries(
	schedule: VestingSchedule,
	totalSupply: number,
	maxMonths?: number
): Array<{ month: number; percentUnlocked: number; tokensUnlocked: number }> {
	const duration = maxMonths ?? schedule.cliffMonths + schedule.linearMonths + 6;
	const result: Array<{ month: number; percentUnlocked: number; tokensUnlocked: number }> = [];
	for (let m = 0; m <= duration; m++) {
		result.push({
			month: m,
			percentUnlocked: vestingUnlocked(schedule, m),
			tokensUnlocked: vestingTokensUnlocked(schedule, totalSupply, m)
		});
	}
	return result;
}

/** Aggregate total circulating from vesting across all schedules at a given month */
export function totalVestingUnlocked(
	schedules: VestingSchedule[],
	totalSupply: number,
	month: number
): number {
	return schedules.reduce((sum, s) => sum + vestingTokensUnlocked(s, totalSupply, month), 0);
}
