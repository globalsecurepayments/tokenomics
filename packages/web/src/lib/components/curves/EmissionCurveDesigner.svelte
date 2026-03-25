<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { emissionSeries, type EmissionSchedule, type EmissionType } from '@tokenomics/shared';

	Chart.register(...registerables);

	let {
		schedule = $bindable<EmissionSchedule>({
			id: 'default',
			type: 'linear',
			params: { totalEmission: 500_000_000, durationMonths: 48 },
		}),
		onSave,
	}: {
		schedule: EmissionSchedule;
		onSave?: (schedule: EmissionSchedule) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const emissionTypes: { value: EmissionType; label: string }[] = [
		{ value: 'linear', label: 'Linear' },
		{ value: 'halving', label: 'Halving' },
		{ value: 'sigmoid', label: 'Sigmoid (S-curve)' },
	];

	function setType(type: EmissionType) {
		const base = { totalEmission: schedule.params.totalEmission, durationMonths: schedule.params.durationMonths };
		const defaults: Record<EmissionType, EmissionSchedule['params']> = {
			linear: base,
			halving: { ...base, halvingPeriodMonths: 12, halvingFactor: 0.5 },
			sigmoid: { ...base, sigmoidMidpoint: base.durationMonths / 2, sigmoidSteepness: 0.15 },
			custom: base,
		};
		schedule = { ...schedule, type, params: defaults[type] };
	}

	function updateChart() {
		const series = emissionSeries(schedule, 200);
		if (chart) {
			chart.data.labels = series.map((p) => p.month.toFixed(0));
			chart.data.datasets[0].data = series.map((p) => p.cumulative);
			chart.data.datasets[1].data = series.map((p) => p.rate);
			chart.update('none');
		}
	}

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Cumulative',
						data: [],
						borderColor: '#22d3ee',
						backgroundColor: 'rgba(34, 211, 238, 0.08)',
						fill: true,
						pointRadius: 0,
						borderWidth: 2,
						yAxisID: 'y',
					},
					{
						label: 'Rate/month',
						data: [],
						borderColor: '#f59e0b',
						pointRadius: 0,
						borderWidth: 1.5,
						borderDash: [4, 2],
						yAxisID: 'y1',
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { labels: { color: '#8888a0' } } },
				scales: {
					x: {
						title: { display: true, text: 'Month', color: '#8888a0' },
						ticks: { color: '#8888a0' },
						grid: { color: '#2a2a3e' },
					},
					y: {
						position: 'left',
						title: { display: true, text: 'Cumulative', color: '#22d3ee' },
						ticks: { color: '#22d3ee', callback: (v) => Number(v).toLocaleString('en', { notation: 'compact' } as any) },
						grid: { color: '#2a2a3e' },
					},
					y1: {
						position: 'right',
						title: { display: true, text: 'Rate/mo', color: '#f59e0b' },
						ticks: { color: '#f59e0b', callback: (v) => Number(v).toLocaleString('en', { notation: 'compact' } as any) },
						grid: { display: false },
					},
				},
			},
		});
		updateChart();
		return () => chart?.destroy();
	});

	$effect(() => {
		void schedule.type;
		void JSON.stringify(schedule.params);
		updateChart();
	});
</script>

<div class="space-y-4">
	<!-- Type selector -->
	<div class="flex gap-2">
		{#each emissionTypes as et}
			<button
				onclick={() => setType(et.value)}
				class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors
					{schedule.type === et.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
			>
				{et.label}
			</button>
		{/each}
	</div>

	<!-- Parameters -->
	<div class="grid grid-cols-2 gap-3">
		<label class="space-y-1">
			<span class="text-xs text-muted-foreground">Total Emission</span>
			<input type="number" bind:value={schedule.params.totalEmission} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
		</label>
		<label class="space-y-1">
			<span class="text-xs text-muted-foreground">Duration (months)</span>
			<input type="number" bind:value={schedule.params.durationMonths} min="1" max="240" class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
		</label>

		{#if schedule.type === 'halving'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Halving Period (months)</span>
				<input type="range" min="3" max="48" step="1" bind:value={schedule.params.halvingPeriodMonths} class="w-full" />
				<span class="text-xs font-mono">{schedule.params.halvingPeriodMonths}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Halving Factor</span>
				<input type="range" min="0.1" max="0.9" step="0.05" bind:value={schedule.params.halvingFactor} class="w-full" />
				<span class="text-xs font-mono">{schedule.params.halvingFactor?.toFixed(2)}</span>
			</label>
		{:else if schedule.type === 'sigmoid'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Midpoint (month)</span>
				<input type="range" min="1" max={schedule.params.durationMonths} step="1" bind:value={schedule.params.sigmoidMidpoint} class="w-full" />
				<span class="text-xs font-mono">{schedule.params.sigmoidMidpoint}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Steepness</span>
				<input type="range" min="0.01" max="1" step="0.01" bind:value={schedule.params.sigmoidSteepness} class="w-full" />
				<span class="text-xs font-mono">{schedule.params.sigmoidSteepness?.toFixed(2)}</span>
			</label>
		{/if}
	</div>

	<!-- Chart -->
	<div class="rounded-lg border border-border bg-card p-3 h-[320px]">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="flex justify-end">
		<button
			onclick={() => onSave?.(schedule)}
			class="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
		>
			Save Emission Schedule
		</button>
	</div>
</div>
