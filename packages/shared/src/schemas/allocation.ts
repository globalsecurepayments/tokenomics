import { z } from 'zod';

export const allocationSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	percentage: z.number().min(0).max(100),
	color: z.string(),
	vestingId: z.string().optional()
});

export type Allocation = z.infer<typeof allocationSchema>;
