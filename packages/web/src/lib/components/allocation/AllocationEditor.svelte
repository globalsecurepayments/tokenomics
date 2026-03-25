<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import type { Allocation } from '@tokenomics/shared';
	import { ALLOCATION_COLORS } from '$utils/colors';
	import { formatPercent } from '$utils/format';

	Chart.register(...registerables);

	let {
		allocations = $bindable<Allocation[]>([]),
		onSave,
	}: {
		allocations: Allocation[];
		onSave?: (allocations: Allocation[]) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function addAllocation() {
		const idx = allocations.length;
		allocations = [...allocations, {
			id: `alloc_${crypto.randomUUID().slice(0, 8)}`,
			label: 'New Category',
			percentage: 5,
			color: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
		}];
	}

	function removeAllocation(id: string) {
		allocations = allocations.filter((a) => a.id !== id);
	}

	function updateChart() {
		if (!chart) return;
		chart.data.labels = allocations.map((a) => a.label);
		chart.data.datasets[0].data = allocations.map((a) => a.percentage);
		chart.data.datasets[0].backgroundColor = allocations.map((a) => a.color);
		chart.update('none');
	}

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: [],
				datasets: [{
					data: [],
					backgroundColor: [],
					borderColor: 'var(--color-background)',
					borderWidth: 2,
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						position: 'right',
						labels: { color: '#8888a0', padding: 12, font: { size: 11 } },
					},
					tooltip: {
						callbacks: {
							label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
						},
					},
				},
			},
		});
		updateChart();
		return () => chart?.destroy();
	});

	$effect(() => {
		void JSON.stringify(allocations);
		updateChart();
	});

	const total = $derived(allocations.reduce((s, a) => s + a.percentage, 0));
	const isValid = $derived(Math.abs(total - 100) < 0.01);
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Table -->
		<div>
			<div class="rounded-lg border border-border overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-secondary">
						<tr class="text-xs text-muted-foreground">
							<th class="w-4 px-2"></th>
							<th class="px-3 py-2 text-left">Category</th>
							<th class="px-3 py-2 text-right">%</th>
							<th class="px-3 py-2 w-8"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each allocations as alloc, i}
							<tr class="bg-card">
								<td class="px-2">
									<div class="w-3 h-3 rounded-full" style="background: {alloc.color}"></div>
								</td>
								<td class="px-3 py-1.5">
									<input type="text" bind:value={alloc.label} class="w-full bg-transparent text-sm text-foreground outline-none" />
								</td>
								<td class="px-3 py-1.5 text-right">
									<input type="number" bind:value={alloc.percentage} min="0" max="100" step="0.5"
										class="w-16 bg-transparent text-sm text-foreground text-right font-mono tabular-nums outline-none" />
								</td>
								<td class="px-2 text-center">
									<button onclick={() => removeAllocation(alloc.id)} class="text-muted-foreground hover:text-destructive text-xs">✕</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex items-center justify-between mt-3">
				<button onclick={addAllocation} class="px-3 py-1.5 rounded-md bg-secondary text-sm text-foreground hover:bg-secondary/80">
					+ Add
				</button>
				<span class="text-xs font-mono tabular-nums {isValid ? 'text-success' : 'text-destructive'}">
					Total: {formatPercent(total)} {isValid ? '✓' : '(must = 100%)'}
				</span>
			</div>
		</div>

		<!-- Pie chart -->
		<div class="flex items-center justify-center">
			<div class="w-full max-w-[320px]">
				<canvas bind:this={canvas}></canvas>
			</div>
		</div>
	</div>

	<div class="flex justify-end">
		<button
			onclick={() => onSave?.(allocations)}
			disabled={!isValid}
			class="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
		>
			Save Allocations
		</button>
	</div>
</div>
