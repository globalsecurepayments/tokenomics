import { z } from 'zod';

export const vestingScheduleSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	allocationPercent: z.number().min(0).max(100),
	tgePercent: z.number().min(0).max(100).default(0),
	cliffMonths: z.number().int().min(0).default(0),
	linearMonths: z.number().int().min(0).default(0)
});

export type VestingSchedule = z.infer<typeof vestingScheduleSchema>;
