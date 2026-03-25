<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$utils/api';
	import type { Project } from '@tokenomics/shared';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let creating = $state(false);

	onMount(async () => {
		try {
			const data = await api.get<{ projects: Project[] }>('/api/projects');
			projects = data.projects;
		} catch {
			// API not running — show empty state
		} finally {
			loading = false;
		}
	});

	async function createProject() {
		creating = true;
		try {
			const project = await api.post<Project>('/api/projects', {
				name: 'Untitled Token',
				tokenSymbol: 'TKN',
				totalSupply: 1_000_000_000,
				decimals: 18,
			});
			goto(`/project/${project.id}`);
		} catch (err) {
			console.error('Failed to create project:', err);
		} finally {
			creating = false;
		}
	}
</script>

<div class="p-6 max-w-5xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-xl font-semibold">Projects</h1>
			<p class="text-sm text-muted-foreground">Token economic models and simulations</p>
		</div>
		<button
			onclick={createProject}
			disabled={creating}
			class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
		>
			{creating ? 'Creating...' : 'New Project'}
		</button>
	</div>

	{#if loading}
		<div class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
			Loading projects...
		</div>
	{:else if projects.length === 0}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<p class="text-muted-foreground mb-4">No projects yet. Create your first token model.</p>
			<button
				onclick={createProject}
				class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
			>
				Create Project
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each projects as project}
				<a
					href="/project/{project.id}"
					class="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors group"
				>
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium group-hover:text-primary transition-colors">
							{project.name}
						</span>
						<span class="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
							${project.tokenSymbol}
						</span>
					</div>
					{#if project.description}
						<p class="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
					{/if}
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span class="capitalize px-1.5 py-0.5 rounded bg-secondary">{project.status}</span>
						<span class="tabular-nums">{new Date(project.updatedAt).toLocaleDateString()}</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
