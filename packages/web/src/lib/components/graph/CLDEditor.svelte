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
	import type { CLDModel, CLDVariable, CLDLink } from '@tokenomics/shared';
	import { VARIABLE_COLORS, LOOP_COLORS } from '$utils/colors';
	import CLDNode from './CLDNode.svelte';

	let {
		model = $bindable({ variables: [], links: [], loops: [] }),
		onSave,
	}: {
		model: CLDModel;
		onSave?: (model: CLDModel) => void;
	} = $props();

	const nodeTypes = { cldVariable: CLDNode };

	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);

	// Sync model → xyflow nodes/edges
	$effect(() => {
		nodes = model.variables.map((v) => ({
			id: v.id,
			type: 'cldVariable',
			position: { x: v.position.x, y: v.position.y },
			data: { label: v.label, type: v.type, initialValue: v.initialValue },
		}));
		edges = model.links.map((l) => ({
			id: l.id,
			source: l.source,
			target: l.target,
			label: l.polarity === 'positive' ? '+' : '−',
			style: `stroke: ${l.polarity === 'positive' ? LOOP_COLORS.reinforcing : LOOP_COLORS.balancing}; stroke-width: 2px`,
			animated: l.delay,
			markerEnd: { type: 'arrowclosed' as any },
		}));
	});

	// Variable type for new nodes
	let newVarType = $state<CLDVariable['type']>('auxiliary');
	let newVarLabel = $state('');

	function addVariable() {
		if (!newVarLabel.trim()) return;
		const id = `var_${crypto.randomUUID().slice(0, 8)}`;
		model.variables = [
			...model.variables,
			{
				id,
				label: newVarLabel.trim(),
				type: newVarType,
				position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
			},
		];
		newVarLabel = '';
	}

	function handleNodeDragStop(event: any) {
		const n = event.detail?.node ?? event.node ?? event;
		if (!n?.id || !n?.position) return;
		model.variables = model.variables.map((v) =>
			v.id === n.id ? { ...v, position: { x: n.position.x, y: n.position.y } } : v
		);
	}

	function handleConnect(event: any) {
		const detail = event.detail ?? event;
		const source = detail.source;
		const target = detail.target;
		if (source === target) return;
		const id = `link_${crypto.randomUUID().slice(0, 8)}`;
		model.links = [
			...model.links,
			{ id, source, target, polarity: 'positive', delay: false },
		];
	}

	function save() {
		onSave?.(model);
	}
</script>

<div class="flex flex-col h-full">
	<!-- Toolbar -->
	<div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0 flex-wrap">
		<input
			type="text"
			bind:value={newVarLabel}
			placeholder="Variable name..."
			onkeydown={(e) => e.key === 'Enter' && addVariable()}
			class="h-8 rounded-md border border-border bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground w-40"
		/>
		<select
			bind:value={newVarType}
			class="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
		>
			<option value="stock">Stock</option>
			<option value="flow">Flow</option>
			<option value="auxiliary">Auxiliary</option>
			<option value="parameter">Parameter</option>
			<option value="source">Source</option>
			<option value="sink">Sink</option>
		</select>
		<button
			onclick={addVariable}
			class="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
		>
			Add Variable
		</button>

		<div class="flex-1"></div>

		<span class="text-xs text-muted-foreground">
			{model.variables.length} variables, {model.links.length} links
		</span>
		<button
			onclick={save}
			class="h-8 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90"
		>
			Save CLD
		</button>
	</div>

	<!-- Flow canvas -->
	<div class="flex-1">
		<SvelteFlow
			{nodes}
			{edges}
			{nodeTypes}
			fitView
			onnodedragstop={handleNodeDragStop}
			onconnect={handleConnect}
		>
			<Controls />
			<Background />
			<MiniMap />
		</SvelteFlow>
	</div>
</div>
