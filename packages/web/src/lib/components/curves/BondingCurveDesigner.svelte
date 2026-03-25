<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { bondingCurveSeries, type BondingCurve, type BondingCurveType } from '@tokenomics/shared';

	Chart.register(...registerables);

	let {
		curve = $bindable<BondingCurve>({
			id: 'default',
			type: 'linear',
			params: { slope: 0.001, intercept: 0.1 },
		}),
		maxSupply = 1_000_000_000,
		onSave,
	}: {
		curve: BondingCurve;
		maxSupply?: number;
		onSave?: (curve: BondingCurve) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const curveTypes: { value: BondingCurveType; label: string }[] = [
		{ value: 'linear', label: 'Linear (mx + b)' },
		{ value: 'exponential', label: 'Exponential (a·eᵏˢ)' },
		{ value: 'logarithmic', label: 'Logarithmic (a·ln(s))' },
		{ value: 'sigmoid', label: 'Sigmoid (S-curve)' },
	];

	function setType(type: BondingCurveType) {
		const defaults: Record<BondingCurveType, BondingCurve['params']> = {
			linear: { slope: 0.001, intercept: 0.1 },
			exponential: { intercept: 0.01, base: Math.E, exponent: 0.00000001 },
			logarithmic: { slope: 0.5, logBase: Math.E, intercept: 0 },
			sigmoid: { maxPrice: 10, steepness: 0.00000002, midpoint: maxSupply / 2 },
			custom: {},
		};
		curve = { ...curve, type, params: defaults[type] };
	}

	function updateChart() {
		const series = bondingCurveSeries(curve, maxSupply, 300);
		const labels = series.map((p) => p.supply);
		const data = series.map((p) => p.price);

		if (chart) {
			chart.data.labels = labels;
			chart.data.datasets[0].data = data;
			chart.update('none');
		}
	}

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: [],
				datasets: [{
					label: 'Price',
					data: [],
					borderColor: '#6366f1',
					backgroundColor: 'rgba(99, 102, 241, 0.1)',
					fill: true,
					pointRadius: 0,
					borderWidth: 2,
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => `Price: ${(ctx.parsed?.y ?? 0).toFixed(6)}`,
							title: (ctx) => `Supply: ${Number(ctx[0].label).toLocaleString()}`,
						},
					},
				},
				scales: {
					x: {
						title: { display: true, text: 'Supply', color: '#8888a0' },
						ticks: { color: '#8888a0', callback: (v) => Number(v).toLocaleString('en', { notation: 'compact' } as any) },
						grid: { color: '#2a2a3e' },
					},
					y: {
						title: { display: true, text: 'Price', color: '#8888a0' },
						ticks: { color: '#8888a0' },
						grid: { color: '#2a2a3e' },
					},
				},
			},
		});
		updateChart();
		return () => chart?.destroy();
	});

	$effect(() => {
		// Re-render chart when curve params change
		void curve.type;
		void JSON.stringify(curve.params);
		updateChart();
	});
</script>

<div class="space-y-4">
	<!-- Curve type selector -->
	<div class="flex gap-2 flex-wrap">
		{#each curveTypes as ct}
			<button
				onclick={() => setType(ct.value)}
				class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors
					{curve.type === ct.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
			>
				{ct.label}
			</button>
		{/each}
	</div>

	<!-- Parameter sliders -->
	<div class="grid grid-cols-2 gap-3">
		{#if curve.type === 'linear'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Slope (m)</span>
				<input type="range" min="0.0000001" max="0.01" step="0.0000001" bind:value={curve.params.slope} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.slope?.toFixed(7)}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Intercept (b)</span>
				<input type="range" min="0" max="10" step="0.01" bind:value={curve.params.intercept} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.intercept?.toFixed(2)}</span>
			</label>
		{:else if curve.type === 'exponential'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Base Price (a)</span>
				<input type="range" min="0.001" max="1" step="0.001" bind:value={curve.params.intercept} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.intercept?.toFixed(4)}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Growth Rate (k)</span>
				<input type="range" min="0.000000001" max="0.0000001" step="0.000000001" bind:value={curve.params.exponent} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.exponent?.toExponential(2)}</span>
			</label>
		{:else if curve.type === 'logarithmic'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Scale (a)</span>
				<input type="range" min="0.01" max="5" step="0.01" bind:value={curve.params.slope} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.slope?.toFixed(2)}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Offset (b)</span>
				<input type="range" min="-5" max="5" step="0.01" bind:value={curve.params.intercept} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.intercept?.toFixed(2)}</span>
			</label>
		{:else if curve.type === 'sigmoid'}
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Max Price</span>
				<input type="range" min="0.1" max="100" step="0.1" bind:value={curve.params.maxPrice} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.maxPrice?.toFixed(1)}</span>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Steepness</span>
				<input type="range" min="0.000000001" max="0.0000001" step="0.000000001" bind:value={curve.params.steepness} class="w-full" />
				<span class="text-xs font-mono tabular-nums">{curve.params.steepness?.toExponential(2)}</span>
			</label>
		{/if}
	</div>

	<!-- Chart -->
	<div class="rounded-lg border border-border bg-card p-3 h-[320px]">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="flex justify-end">
		<button
			onclick={() => onSave?.(curve)}
			class="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
		>
			Save Bonding Curve
		</button>
	</div>
</div>
