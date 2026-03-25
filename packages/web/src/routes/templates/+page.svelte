<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$utils/api';

	const templates = [
		{
			slug: 'amm-dex',
			name: 'AMM DEX Token',
			description: 'Automated market maker with LP rewards, governance, and fee-sharing. Based on Uniswap/Curve tokenomics patterns.',
			supply: '1B',
			categories: ['Team (15%)', 'Community (40%)', 'LPs (25%)', 'Treasury (10%)', 'Investors (10%)'],
			tags: ['DeFi', 'AMM', 've(3,3)'],
		},
		{
			slug: 'staking-protocol',
			name: 'Staking Protocol',
			description: 'Proof-of-stake network token with validator rewards, slashing, and deflationary burn. Based on Ethereum/Cosmos patterns.',
			supply: '100M',
			categories: ['Validators (30%)', 'Foundation (20%)', 'Ecosystem (25%)', 'Team (15%)', 'Investors (10%)'],
			tags: ['L1', 'Staking', 'Deflationary'],
		},
		{
			slug: 'gaming-token',
			name: 'Gaming Economy',
			description: 'Dual-token gaming economy with play-to-earn rewards, marketplace fees, and anti-inflation burn. Based on Axie/StepN patterns.',
			supply: '10B',
			categories: ['Play Rewards (35%)', 'Treasury (20%)', 'Team (12%)', 'Investors (8%)', 'Ecosystem (25%)'],
			tags: ['Gaming', 'P2E', 'Dual-Token'],
		},
		{
			slug: 'governance-token',
			name: 'Governance Token',
			description: 'DAO governance token with vote-escrowed locking, proposal rewards, and fee redistribution. Based on Compound/Aave patterns.',
			supply: '500M',
			categories: ['DAO Treasury (40%)', 'Community (25%)', 'Team (15%)', 'Investors (15%)', 'Advisors (5%)'],
			tags: ['DAO', 'Governance', 'veToken'],
		},
		{
			slug: 'depin',
			name: 'DePIN Network',
			description: 'Decentralized physical infrastructure token with worker rewards, burn-and-mint equilibrium, and service fees. Based on Helium/Render patterns.',
			supply: '2B',
			categories: ['Network Rewards (50%)', 'Foundation (15%)', 'Team (10%)', 'Investors (15%)', 'Reserve (10%)'],
			tags: ['DePIN', 'Infrastructure', 'BME'],
		},
	];

	let creating = $state<string | null>(null);

	async function useTemplate(slug: string) {
		creating = slug;
		const tmpl = templates.find(t => t.slug === slug)!;
		try {
			const project = await api.post<{ id: string }>('/api/projects', {
				name: tmpl.name,
				description: tmpl.description,
				tokenSymbol: slug.toUpperCase().slice(0, 4),
				totalSupply: parseSupply(tmpl.supply),
				decimals: 18,
			});
			goto(`/project/${project.id}`);
		} catch (err) {
			console.error('Failed to create from template:', err);
		} finally {
			creating = null;
		}
	}

	function parseSupply(s: string): number {
		const n = parseFloat(s);
		if (s.includes('B')) return n * 1_000_000_000;
		if (s.includes('M')) return n * 1_000_000;
		return n;
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<h1 class="text-xl font-semibold mb-2">Template Library</h1>
	<p class="text-sm text-muted-foreground mb-6">Pre-built tokenomics models. Start from a proven pattern, then customize.</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each templates as tmpl}
			<div class="rounded-lg border border-border bg-card p-4 flex flex-col">
				<div class="flex items-start justify-between mb-2">
					<h3 class="text-sm font-semibold">{tmpl.name}</h3>
					<span class="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{tmpl.supply}</span>
				</div>
				<p class="text-xs text-muted-foreground flex-1 mb-3">{tmpl.description}</p>
				<div class="flex flex-wrap gap-1 mb-3">
					{#each tmpl.tags as tag}
						<span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{tag}</span>
					{/each}
				</div>
				<div class="text-[10px] text-muted-foreground mb-3">
					{tmpl.categories.join(' · ')}
				</div>
				<button
					onclick={() => useTemplate(tmpl.slug)}
					disabled={creating === tmpl.slug}
					class="w-full py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
				>
					{creating === tmpl.slug ? 'Creating...' : 'Use Template'}
				</button>
			</div>
		{/each}
	</div>
</div>
