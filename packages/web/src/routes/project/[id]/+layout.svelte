<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const projectId = $derived(page.params.id);

	const tabDefs = [
		{ suffix: '', label: 'Overview' },
		{ suffix: '/cld', label: 'Causal Loops' },
		{ suffix: '/stock-flow', label: 'Stock & Flow' },
		{ suffix: '/curves', label: 'Curves' },
		{ suffix: '/vesting', label: 'Vesting' },
		{ suffix: '/allocation', label: 'Allocation' },
		{ suffix: '/simulate', label: 'Simulate' },
		{ suffix: '/results', label: 'Results' },
		{ suffix: '/health', label: 'Health' },
		{ suffix: '/3d', label: '3D' },
	];

	const tabs = $derived(tabDefs.map(t => ({
		href: `/project/${projectId}${t.suffix}`,
		label: t.label
	})));
</script>

<div class="flex flex-col h-full">
	<!-- Tab bar -->
	<div class="border-b border-border bg-card/50 px-4 flex items-center gap-1 overflow-x-auto shrink-0">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
					{page.url.pathname === tab.href
						? 'text-primary border-b-2 border-primary'
						: 'text-muted-foreground hover:text-foreground'}"
			>
				{tab.label}
			</a>
		{/each}
	</div>

	<!-- Page content -->
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
