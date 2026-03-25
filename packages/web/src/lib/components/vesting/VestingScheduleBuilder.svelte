<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { vestingSeries, totalVestingUnlocked, type VestingSchedule } from '@tokenomics/shared';
	import { formatCompact, formatPercent } from '$utils/format';
	import { ALLOCATION_COLORS } from '$utils/colors';

	Chart.register(...registerables);

	let {
		schedules = $bindable<VestingSchedule[]>([]),
		totalSupply = 1_000_000_000,
		onSave,
	}: {
		schedules: VestingSchedule[];
		totalSupply?: number;
		onSave?: (schedules: VestingSchedule[]) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function addSchedule() {
		schedules = [...schedules, {
			id: `vest_${crypto.randomUUID().slice(0, 8)}`,
			label: 'New Category',
			allocationPercent: 10,
			tgePercent: 0,
			cliffMonths: 6,
			linearMonths: 24,
		}];
	}

	function removeSchedule(id: string) {
		schedules = schedules.filter((s) => s.id !== id);
	}

	function updateChart() {
		if (!chart || schedules.length === 0) {
			if (chart) { chart.data.labels = []; chart.data.datasets = []; chart.update('none'); }
			return;
		}

		const maxMonth = Math.max(...schedules.map((s) => s.cliffMonths + s.linearMonths + 6), 12);
		const months = Array.from({ length: maxMonth + 1 }, (_, i) => i);

		const datasets = schedules.map((s, i) => ({
			label: s.label,
			data: months.map((m) => vestingSeries(s, totalSupply, maxMonth).find((p) => p.month === m)?.tokensUnlocked ?? 0),
			borderColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
			backgroundColor: 'transparent',
			pointRadius: 0,
			borderWidth: 2,
		}));

		// Total unlocked line
		datasets.push({
			label: 'Total Unlocked',
			data: months.map((m) => totalVestingUnlocked(schedules, totalSupply, m)),
			borderColor: '#ffffff',
			backgroundColor: 'rgba(255,255,255,0.05)',
			pointRadius: 0,
			borderWidth: 2.5,
		});

		chart.data.labels = months;
		chart.data.datasets = datasets;
		chart.update('none');
	}

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: { labels: [], datasets: [] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { labels: { color: '#8888a0' } } },
				scales: {
					x: { title: { display: true, text: 'Month', color: '#8888a0' }, ticks: { color: '#8888a0' }, grid: { color: '#2a2a3e' } },
					y: { title: { display: true, text: 'Tokens Unlocked', color: '#8888a0' }, ticks: { color: '#8888a0', callback: (v) => Number(v).toLocaleString('en', { notation: 'compact' } as any) }, grid: { color: '#2a2a3e' } },
				},
			},
		});
		updateChart();
		return () => chart?.destroy();
	});

	$effect(() => {
		void JSON.stringify(schedules);
		updateChart();
	});
</script>

<div class="space-y-4">
	<!-- Schedule table -->
	<div class="rounded-lg border border-border overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-secondary">
				<tr class="text-xs text-muted-foreground">
					<th class="px-3 py-2 text-left">Category</th>
					<th class="px-3 py-2 text-right">Allocation %</th>
					<th class="px-3 py-2 text-right">TGE %</th>
					<th class="px-3 py-2 text-right">Cliff (mo)</th>
					<th class="px-3 py-2 text-right">Linear (mo)</th>
					<th class="px-3 py-2 w-10"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border">
				{#each schedules as schedule, i}
					<tr class="bg-card">
						<td class="px-3 py-1.5">
							<input type="text" bind:value={schedule.label} class="w-full bg-transparent text-sm text-foreground outline-none" />
						</td>
						<td class="px-3 py-1.5 text-right">
							<input type="number" bind:value={schedule.allocationPercent} min="0" max="100" step="0.5" class="w-16 bg-transparent text-sm text-foreground text-right font-mono tabular-nums outline-none" />
						</td>
						<td class="px-3 py-1.5 text-right">
							<input type="number" bind:value={schedule.tgePercent} min="0" max="100" step="1" class="w-14 bg-transparent text-sm text-foreground text-right font-mono tabular-nums outline-none" />
						</td>
						<td class="px-3 py-1.5 text-right">
							<input type="number" bind:value={schedule.cliffMonths} min="0" max="48" step="1" class="w-14 bg-transparent text-sm text-foreground text-right font-mono tabular-nums outline-none" />
						</td>
						<td class="px-3 py-1.5 text-right">
							<input type="number" bind:value={schedule.linearMonths} min="0" max="120" step="1" class="w-14 bg-transparent text-sm text-foreground text-right font-mono tabular-nums outline-none" />
						</td>
						<td class="px-3 py-1.5 text-center">
							<button onclick={() => removeSchedule(schedule.id)} class="text-muted-foreground hover:text-destructive text-xs">✕</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex items-center justify-between">
		<button onclick={addSchedule} class="px-3 py-1.5 rounded-md bg-secondary text-sm text-foreground hover:bg-secondary/80">
			+ Add Category
		</button>
		<span class="text-xs text-muted-foreground">
			Total: {formatPercent(schedules.reduce((s, v) => s + v.allocationPercent, 0))}
		</span>
	</div>

	<!-- Chart -->
	<div class="rounded-lg border border-border bg-card p-3 h-[300px]">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="flex justify-end">
		<button onclick={() => onSave?.(schedules)} class="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
			Save Vesting
		</button>
	</div>
</div>
