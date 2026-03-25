<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import { formatCompact } from '$utils/format';
	import type { Project } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);
	let project = $state<Project | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const data = await api.get<{ project: Project }>(`/api/projects/${projectId}`);
			project = data.project;
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});
</script>

<div class="p-6 max-w-4xl mx-auto">
	{#if loading}
		<p class="text-sm text-muted-foreground">Loading project...</p>
	{:else if project}
		<div class="space-y-6">
			<div>
				<h1 class="text-xl font-semibold">{project.name}</h1>
				{#if project.description}
					<p class="text-sm text-muted-foreground mt-1">{project.description}</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="rounded-lg border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">Symbol</p>
					<p class="text-lg font-mono font-semibold mt-1">${project.tokenSymbol}</p>
				</div>
				<div class="rounded-lg border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">Total Supply</p>
					<p class="text-lg font-mono font-semibold tabular-nums mt-1">{formatCompact(project.totalSupply)}</p>
				</div>
				<div class="rounded-lg border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">Decimals</p>
					<p class="text-lg font-mono font-semibold tabular-nums mt-1">{project.decimals}</p>
				</div>
				<div class="rounded-lg border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">Status</p>
					<p class="text-lg font-semibold capitalize mt-1">{project.status}</p>
				</div>
			</div>

			<div class="rounded-lg border border-border bg-card p-4">
				<h2 class="text-sm font-medium mb-3">Getting Started</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
					<a href="/project/{projectId}/cld" class="p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
						<span class="font-medium">1. Causal Loop Diagram</span>
						<p class="text-xs text-muted-foreground mt-0.5">Map feedback loops and system dynamics</p>
					</a>
					<a href="/project/{projectId}/stock-flow" class="p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
						<span class="font-medium">2. Stock & Flow Model</span>
						<p class="text-xs text-muted-foreground mt-0.5">Define quantitative relationships</p>
					</a>
					<a href="/project/{projectId}/curves" class="p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
						<span class="font-medium">3. Bonding & Emission Curves</span>
						<p class="text-xs text-muted-foreground mt-0.5">Design pricing and supply mechanics</p>
					</a>
					<a href="/project/{projectId}/simulate" class="p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
						<span class="font-medium">4. Run Simulations</span>
						<p class="text-xs text-muted-foreground mt-0.5">Monte Carlo and agent-based testing</p>
					</a>
				</div>
			</div>
		</div>
	{:else}
		<p class="text-sm text-destructive">Project not found.</p>
	{/if}
</div>
