<script lang="ts">
	import { page } from '$app/state';
	import {
		normalizedTreasuryDecrease,
		normalizedEmissionPerStaked,
		logNormalizedInflation,
		fdvTvlRatio,
		floatAnalysis,
		type HealthIndicator,
	} from '@tokenomics/shared';
	import HealthGauge from '$components/health/HealthGauge.svelte';

	const projectId = $derived(page.params.id);

	// For now, use sample data — in production these come from latest sim results
	let treasuryDecreaseRate = $state(0.03);
	let emissionActual = $state(12000);
	let emissionTarget = $state(10000);
	let inflationActual = $state(0.08);
	let inflationTarget = $state(0.05);
	let fdv = $state(500_000_000);
	let tvl = $state(30_000_000);
	let circulating = $state(200_000_000);
	let total = $state(1_000_000_000);

	const indicators = $derived<HealthIndicator[]>([
		normalizedTreasuryDecrease(treasuryDecreaseRate),
		normalizedEmissionPerStaked(emissionActual, emissionTarget),
		logNormalizedInflation(inflationActual, inflationTarget),
		fdvTvlRatio(fdv, tvl),
		floatAnalysis(circulating, total),
	]);

	const overallScore = $derived(
		Math.round(
			(indicators.filter(i => i.status === 'healthy').length / indicators.length) * 100
		)
	);

	const overallStatus = $derived(
		overallScore >= 80 ? 'healthy' : overallScore >= 50 ? 'warning' : 'critical'
	);
</script>

<div class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h2 class="text-lg font-semibold">Ecosystem Health</h2>
			<p class="text-sm text-muted-foreground">Real-time health indicators from simulation data</p>
		</div>
		<div class="text-center">
			<p class="text-3xl font-bold font-mono tabular-nums {overallStatus === 'healthy' ? 'text-success' : overallStatus === 'warning' ? 'text-warning' : 'text-destructive'}">
				{overallScore}
			</p>
			<p class="text-xs text-muted-foreground">Health Score</p>
		</div>
	</div>

	<!-- Gauges grid -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
		{#each indicators as indicator}
			<HealthGauge {indicator} />
		{/each}
	</div>

	<!-- Parameter inputs for manual testing -->
	<details class="rounded-lg border border-border bg-card">
		<summary class="px-4 py-3 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
			Adjust Parameters (Manual Override)
		</summary>
		<div class="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Treasury Decrease Rate/mo</span>
				<input type="number" bind:value={treasuryDecreaseRate} step="0.005" class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Actual Emission</span>
				<input type="number" bind:value={emissionActual} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Target Emission</span>
				<input type="number" bind:value={emissionTarget} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">FDV ($)</span>
				<input type="number" bind:value={fdv} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">TVL ($)</span>
				<input type="number" bind:value={tvl} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
			<label class="space-y-1">
				<span class="text-xs text-muted-foreground">Circulating Supply</span>
				<input type="number" bind:value={circulating} class="w-full h-8 rounded-md border border-border bg-secondary px-2 text-sm font-mono tabular-nums text-foreground" />
			</label>
		</div>
	</details>
</div>
