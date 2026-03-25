<script lang="ts">
	import {
		SvelteFlow,
		Controls,
		Background,
		MiniMap,
		type Node,
		type Edge,
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { StockFlowModel } from '@tokenomics/shared';
	import StockNode from './StockNode.svelte';
	import SourceSinkNode from './SourceSinkNode.svelte';

	let {
		model = $bindable({ stocks: [], flows: [], converters: [] }),
		onSave,
	}: {
		model: StockFlowModel;
		onSave?: (model: StockFlowModel) => void;
	} = $props();

	const nodeTypes = {
		stock: StockNode,
		cloud: SourceSinkNode,
	};

	// Track node positions separately (not part of the data model)
	let nodePositions = $state<Record<string, { x: number; y: number }>>({});

	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);

	// Build xyflow graph from model
	$effect(() => {
		const n: Node[] = [];
		const e: Edge[] = [];

		// Add stock nodes
		for (const s of model.stocks) {
			const pos = nodePositions[s.id] ?? { x: 200 + n.length * 200, y: 200 };
			n.push({
				id: s.id,
				type: 'stock',
				position: pos,
				data: { label: s.label, initialValue: s.initialValue, equation: s.equation },
			});
		}

		// Collect source/sink cloud nodes from flows
		const cloudIds = new Set<string>();
		for (const f of model.flows) {
			if (f.from === null) {
				const cloudId = `cloud_src_${f.id}`;
				if (!cloudIds.has(cloudId)) {
					cloudIds.add(cloudId);
					const pos = nodePositions[cloudId] ?? { x: 50, y: 150 + cloudIds.size * 80 };
					n.push({ id: cloudId, type: 'cloud', position: pos, data: { label: '∞', isSource: true } });
				}
				e.push({
					id: f.id,
					source: cloudId,
					target: f.to!,
					label: `${f.label}`,
					animated: true,
					style: 'stroke: var(--color-flow); stroke-width: 2px',
					markerEnd: { type: 'arrowclosed' as any },
				});
			} else if (f.to === null) {
				const cloudId = `cloud_sink_${f.id}`;
				if (!cloudIds.has(cloudId)) {
					cloudIds.add(cloudId);
					const pos = nodePositions[cloudId] ?? { x: 600, y: 150 + cloudIds.size * 80 };
					n.push({ id: cloudId, type: 'cloud', position: pos, data: { label: '∅', isSource: false } });
				}
				e.push({
					id: f.id,
					source: f.from!,
					target: cloudId,
					label: `${f.label}`,
					animated: true,
					style: 'stroke: var(--color-flow); stroke-width: 2px',
					markerEnd: { type: 'arrowclosed' as any },
				});
			} else {
				e.push({
					id: f.id,
					source: f.from,
					target: f.to,
					label: `${f.label}`,
					animated: true,
					style: 'stroke: var(--color-flow); stroke-width: 2px',
					markerEnd: { type: 'arrowclosed' as any },
				});
			}
		}

		nodes = n;
		edges = e;
	});

	// Add stock form state
	let newStockLabel = $state('');
	let newStockValue = $state(0);

	// Add flow form state
	let newFlowLabel = $state('');
	let newFlowFrom = $state<string | null>(null);
	let newFlowTo = $state<string | null>(null);
	let newFlowRate = $state('0');

	function addStock() {
		if (!newStockLabel.trim()) return;
		const id = `stock_${crypto.randomUUID().slice(0, 8)}`;
		model.stocks = [...model.stocks, {
			id,
			variableId: id,
			label: newStockLabel.trim(),
			initialValue: newStockValue,
		}];
		newStockLabel = '';
		newStockValue = 0;
	}

	function addFlow() {
		if (!newFlowLabel.trim()) return;
		const id = `flow_${crypto.randomUUID().slice(0, 8)}`;
		model.flows = [...model.flows, {
			id,
			label: newFlowLabel.trim(),
			from: newFlowFrom === '__source__' ? null : newFlowFrom,
			to: newFlowTo === '__sink__' ? null : newFlowTo,
			rateEquation: newFlowRate || '0',
			unit: 'tokens/step',
		}];
		newFlowLabel = '';
		newFlowRate = '0';
	}

	function handleNodeDragStop(event: any) {
		const n = event.detail?.node ?? event.node ?? event;
		if (!n?.id || !n?.position) return;
		nodePositions[n.id] = { x: n.position.x, y: n.position.y };
	}

	function save() {
		onSave?.(model);
	}
</script>

<div class="flex flex-col h-full">
	<!-- Toolbar -->
	<div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0 flex-wrap">
		<!-- Add Stock -->
		<input
			type="text"
			bind:value={newStockLabel}
			placeholder="Stock name..."
			onkeydown={(e) => e.key === 'Enter' && addStock()}
			class="h-8 rounded-md border border-border bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground w-28"
		/>
		<input
			type="number"
			bind:value={newStockValue}
			class="h-8 rounded-md border border-border bg-secondary px-2 text-sm text-foreground w-20 tabular-nums"
		/>
		<button onclick={addStock} class="h-8 px-3 rounded-md bg-stock text-white text-xs font-medium hover:opacity-90">
			+ Stock
		</button>

		<div class="w-px h-6 bg-border mx-1"></div>

		<!-- Add Flow -->
		<input
			type="text"
			bind:value={newFlowLabel}
			placeholder="Flow name..."
			class="h-8 rounded-md border border-border bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground w-24"
		/>
		<select bind:value={newFlowFrom} class="h-8 rounded-md border border-border bg-secondary px-1 text-xs text-foreground">
			<option value="__source__">Source (∞)</option>
			{#each model.stocks as s}
				<option value={s.id}>{s.label}</option>
			{/each}
		</select>
		<span class="text-xs text-muted-foreground">→</span>
		<select bind:value={newFlowTo} class="h-8 rounded-md border border-border bg-secondary px-1 text-xs text-foreground">
			<option value="__sink__">Sink (∅)</option>
			{#each model.stocks as s}
				<option value={s.id}>{s.label}</option>
			{/each}
		</select>
		<button onclick={addFlow} class="h-8 px-3 rounded-md bg-flow text-black text-xs font-medium hover:opacity-90">
			+ Flow
		</button>

		<div class="flex-1"></div>
		<span class="text-xs text-muted-foreground">{model.stocks.length}S {model.flows.length}F</span>
		<button onclick={save} class="h-8 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90">
			Save
		</button>
	</div>

	<!-- Canvas -->
	<div class="flex-1">
		<SvelteFlow {nodes} {edges} {nodeTypes} fitView onnodedragstop={handleNodeDragStop}>
			<Controls />
			<Background />
			<MiniMap />
		</SvelteFlow>
	</div>
</div>
