<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { api } from '$utils/api';
	import { formatCompact } from '$utils/format';

	Chart.register(...registerables);

	const projectId = $derived(page.params.id);
	const simId = $derived(new URLSearchParams(page.url.search).get('sim'));

	let loading = $state(true);
	let results = $state<any>(null);
	let fanCanvas: HTMLCanvasElement;
	let histCanvas: HTMLCanvasElement;
	let fanChart: Chart | null = null;
	let histChart: Chart | null = null;

	onMount(async () => {
		if (!simId) { loading = false; return; }
		try {
			results = await api.get(`/api/simulations/sim/${simId}/results`);
		} catch (err) { console.error(err); }
		finally { loading = false; }
	});

	// Build charts once results load
	$effect(() => {
		if (!results || !fanCanvas || !histCanvas) return;
		buildFanChart();
		buildHistogram();
	});

	function buildFanChart() {
		if (fanChart) fanChart.destroy();

		const priceSeries = results.timeseries.filter((r: any) => r.variableId === 'price');
		if (priceSeries.length === 0) return;

		const labels = priceSeries.map((r: any) => r.timestep);

		fanChart = new Chart(fanCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'p95',
						data: priceSeries.map((r: any) => r.p95),
						borderColor: 'transparent',
						backgroundColor: 'rgba(99, 102, 241, 0.08)',
						fill: '+1',
						pointRadius: 0,
					},
					{
						label: 'p75',
						data: priceSeries.map((r: any) => r.p75),
						borderColor: 'transparent',
						backgroundColor: 'rgba(99, 102, 241, 0.15)',
						fill: '+1',
						pointRadius: 0,
					},
					{
						label: 'Median',
						data: priceSeries.map((r: any) => r.p50),
						borderColor: '#6366f1',
						borderWidth: 2,
						backgroundColor: 'rgba(99, 102, 241, 0.2)',
						fill: '+1',
						pointRadius: 0,
					},
					{
						label: 'p25',
						data: priceSeries.map((r: any) => r.p25),
						borderColor: 'transparent',
						backgroundColor: 'rgba(99, 102, 241, 0.15)',
						fill: '+1',
						pointRadius: 0,
					},
					{
						label: 'p5',
						data: priceSeries.map((r: any) => r.p5),
						borderColor: 'transparent',
						backgroundColor: 'transparent',
						pointRadius: 0,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: '#8888a0', filter: (item) => item.text === 'Median' } },
					title: { display: true, text: 'Price Fan Chart (p5–p95)', color: '#e4e4ef' },
				},
				scales: {
					x: { title: { display: true, text: 'Timestep', color: '#8888a0' }, ticks: { color: '#8888a0' }, grid: { color: '#2a2a3e' } },
					y: { title: { display: true, text: 'Price', color: '#8888a0' }, ticks: { color: '#8888a0' }, grid: { color: '#2a2a3e' } },
				},
			},
		});
	}

	function buildHistogram() {
		if (histChart) histChart.destroy();

		const iterations = results.iterations;
		if (!iterations || iterations.length === 0) return;

		const prices = iterations.map((i: any) => i.finalValues.price).filter((p: number) => isFinite(p));
		if (prices.length === 0) return;

		const bins = 30;
		const min = Math.min(...prices);
		const max = Math.max(...prices);
		const binWidth = (max - min) / bins || 1;
		const counts = new Array(bins).fill(0);
		for (const p of prices) {
			const idx = Math.min(Math.floor((p - min) / binWidth), bins - 1);
			counts[idx]++;
		}

		histChart = new Chart(histCanvas, {
			type: 'bar',
			data: {
				labels: counts.map((_, i) => (min + (i + 0.5) * binWidth).toFixed(4)),
				datasets: [{
					label: 'Final Price Distribution',
					data: counts,
					backgroundColor: 'rgba(34, 211, 238, 0.5)',
					borderColor: '#22d3ee',
					borderWidth: 1,
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					title: { display: true, text: 'Final Price Distribution', color: '#e4e4ef' },
				},
				scales: {
					x: { title: { display: true, text: 'Price', color: '#8888a0' }, ticks: { color: '#8888a0', maxTicksLimit: 10 }, grid: { color: '#2a2a3e' } },
					y: { title: { display: true, text: 'Count', color: '#8888a0' }, ticks: { color: '#8888a0' }, grid: { color: '#2a2a3e' } },
				},
			},
		});
	}
</script>

<div class="p-6 max-w-5xl mx-auto">
	<h2 class="text-lg font-semibold mb-1">Simulation Results</h2>

	{#if loading}
		<p class="text-sm text-muted-foreground">Loading results...</p>
	{:else if !simId}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<p class="text-sm text-muted-foreground">No simulation selected. Run one from the Simulate tab.</p>
		</div>
	{:else if !results}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<p class="text-sm text-destructive">Failed to load results.</p>
		</div>
	{:else}
		<!-- Summary stats -->
		{#if results.meta?.summary}
			{@const s = typeof results.meta.summary === 'string' ? JSON.parse(results.meta.summary) : results.meta.summary}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
				{#if s.medianPrice != null}
					<div class="rounded-lg border border-border bg-card p-3">
						<p class="text-xs text-muted-foreground">Median Price</p>
						<p class="text-lg font-mono tabular-nums font-semibold mt-1">{s.medianPrice.toFixed(6)}</p>
					</div>
				{/if}
				{#if s.p5Price != null}
					<div class="rounded-lg border border-border bg-card p-3">
						<p class="text-xs text-muted-foreground">p5 / p95 Price</p>
						<p class="text-sm font-mono tabular-nums mt-1">{s.p5Price.toFixed(6)} – {s.p95Price.toFixed(6)}</p>
					</div>
				{/if}
				{#if s.medianCirculatingSupply != null}
					<div class="rounded-lg border border-border bg-card p-3">
						<p class="text-xs text-muted-foreground">Median Circ. Supply</p>
						<p class="text-lg font-mono tabular-nums font-semibold mt-1">{formatCompact(s.medianCirculatingSupply)}</p>
					</div>
				{/if}
				{#if s.sharpeRatio != null}
					<div class="rounded-lg border border-border bg-card p-3">
						<p class="text-xs text-muted-foreground">Sharpe Ratio</p>
						<p class="text-lg font-mono tabular-nums font-semibold mt-1">{s.sharpeRatio.toFixed(3)}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Charts -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<div class="rounded-lg border border-border bg-card p-3 h-[360px]">
				<canvas bind:this={fanCanvas}></canvas>
			</div>
			<div class="rounded-lg border border-border bg-card p-3 h-[360px]">
				<canvas bind:this={histCanvas}></canvas>
			</div>
		</div>

		<!-- Iteration count -->
		<p class="text-xs text-muted-foreground mt-4 text-center">
			{results.meta.type === 'monte_carlo'
				? `${results.iterations?.length ?? 0} iterations`
				: `ABM simulation`}
			· {results.timeseries?.length ?? 0} timeseries points
		</p>
	{/if}
</div>
