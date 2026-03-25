<script lang="ts">
	import '../app.css';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Projects', icon: 'grid' },
		{ href: '/templates', label: 'Templates', icon: 'layers' },
	];
</script>

<div class="flex h-screen bg-background text-foreground overflow-hidden">
	<!-- Sidebar -->
	<nav class="w-56 border-r border-border bg-card flex flex-col shrink-0">
		<div class="p-4 border-b border-border">
			<h1 class="text-sm font-semibold tracking-wide uppercase text-primary">Tokenomics Lab</h1>
			<p class="text-xs text-muted-foreground mt-0.5">Predictive Modeling</p>
		</div>
		<div class="flex-1 p-2 space-y-0.5">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
				>
					{item.label}
				</a>
			{/each}
		</div>
		<div class="p-3 border-t border-border text-xs text-muted-foreground/50 font-mono">
			v0.1.0
		</div>
	</nav>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
