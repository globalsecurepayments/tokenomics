<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$utils/api';
	import { formatCompact } from '$utils/format';
	import type { Project } from '@tokenomics/shared';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let deleting = $state<string | null>(null);

	async function deleteProject(id: string, name: string) {
		if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
		deleting = id;
		try {
			await api.del(`/api/projects/${id}`);
			projects = projects.filter(p => p.id !== id);
		} catch (err) {
			console.error('Failed to delete:', err);
		} finally {
			deleting = null;
		}
	}

	// Create modal state
	let showCreate = $state(false);
	let newName = $state('My Token');
	let newSymbol = $state('TKN');
	let newSupply = $state(1_000_000_000);
	let newDecimals = $state(18);
	let newDescription = $state('');

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

	function openCreate() {
		newName = 'My Token';
		newSymbol = 'TKN';
		newSupply = 1_000_000_000;
		newDecimals = 18;
		newDescription = '';
		showCreate = true;
	}

	async function createProject() {
		if (!newName.trim() || !newSymbol.trim() || newSupply <= 0) return;
		creating = true;
		try {
			const project = await api.post<Project>('/api/projects', {
				name: newName.trim(),
				tokenSymbol: newSymbol.trim().toUpperCase(),
				totalSupply: newSupply,
				decimals: newDecimals,
				description: newDescription.trim() || undefined,
			});
			showCreate = false;
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
			onclick={openCreate}
			class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
		>
			New Project
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
				onclick={openCreate}
				class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
			>
				Create Project
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each projects as project}
				<div class="relative rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors group">
					<button
						onclick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProject(project.id, project.name); }}
						disabled={deleting === project.id}
						class="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all z-10"
						title="Delete project"
					>
						{#if deleting === project.id}
							<span class="text-xs animate-spin">...</span>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
						{/if}
					</button>
					<a href="/project/{project.id}" class="block">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium group-hover:text-primary transition-colors">
							{project.name}
						</span>
						<span class="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mr-6">
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
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Project Modal -->
{#if showCreate}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
		onclick={() => showCreate = false}
		onkeydown={(e) => e.key === 'Escape' && (showCreate = false)}
		role="button"
		tabindex="-1"
	></div>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="px-5 py-4 border-b border-border">
				<h2 class="text-base font-semibold">New Project</h2>
				<p class="text-xs text-muted-foreground mt-0.5">Configure your token parameters</p>
			</div>

			<div class="px-5 py-4 space-y-4">
				<!-- Name -->
				<label class="block space-y-1">
					<span class="text-xs font-medium text-muted-foreground">Project Name</span>
					<input
						type="text"
						bind:value={newName}
						placeholder="My Token"
						class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					/>
				</label>

				<!-- Symbol + Decimals row -->
				<div class="grid grid-cols-2 gap-3">
					<label class="block space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Token Symbol</span>
						<input
							type="text"
							bind:value={newSymbol}
							placeholder="TKN"
							maxlength="10"
							class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</label>
					<label class="block space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Decimals</span>
						<input
							type="number"
							bind:value={newDecimals}
							min="0"
							max="18"
							class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</label>
				</div>

				<!-- Total Supply -->
				<label class="block space-y-1">
					<span class="text-xs font-medium text-muted-foreground">Total Supply</span>
					<input
						type="number"
						bind:value={newSupply}
						min="1"
						step="1000000"
						class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					/>
					<span class="text-[10px] text-muted-foreground">{formatCompact(newSupply)} tokens</span>
				</label>

				<!-- Supply presets -->
				<div class="flex gap-1.5 flex-wrap">
					{#each [
						{ label: '1M', value: 1_000_000 },
						{ label: '10M', value: 10_000_000 },
						{ label: '100M', value: 100_000_000 },
						{ label: '1B', value: 1_000_000_000 },
						{ label: '10B', value: 10_000_000_000 },
						{ label: '21M', value: 21_000_000 },
					] as preset}
						<button
							onclick={() => newSupply = preset.value}
							class="px-2 py-1 rounded text-[10px] font-mono transition-colors
								{newSupply === preset.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
						>
							{preset.label}
						</button>
					{/each}
				</div>

				<!-- Description -->
				<label class="block space-y-1">
					<span class="text-xs font-medium text-muted-foreground">Description <span class="text-muted-foreground/50">(optional)</span></span>
					<textarea
						bind:value={newDescription}
						placeholder="Brief description of your token economy..."
						rows="2"
						class="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
					></textarea>
				</label>
			</div>

			<div class="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
				<button
					onclick={() => showCreate = false}
					class="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={createProject}
					disabled={creating || !newName.trim() || !newSymbol.trim() || newSupply <= 0}
					class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					{creating ? 'Creating...' : 'Create Project'}
				</button>
			</div>
		</div>
	</div>
{/if}
