<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { stocks = [], flows = [] } = $props<{
		stocks: Array<{ id: string; label: string; value: number }>;
		flows: Array<{ from: string | null; to: string | null; rate: number; label: string }>;
	}>();

	// Position stocks in a circle
	const stockPositions = $derived.by(() => {
		const map = new Map<string, THREE.Vector3>();
		const count = stocks.length || 1;
		stocks.forEach((s: typeof stocks[0], i: number) => {
			const angle = (i / count) * Math.PI * 2;
			map.set(s.id, new THREE.Vector3(Math.cos(angle) * 4, 0, Math.sin(angle) * 4));
		});
		return map;
	});

	// Particle system for flowing tokens
	const PARTICLES_PER_FLOW = 30;

	let particlePositions = $state(new Float32Array(0));
	let particleColors = $state(new Float32Array(0));
	let time = $state(0);

	const particleGeo = $derived.by(() => {
		const totalParticles = flows.length * PARTICLES_PER_FLOW;
		const positions = new Float32Array(totalParticles * 3);
		const colors = new Float32Array(totalParticles * 3);

		const flowColor = new THREE.Color('#22d3ee');

		let idx = 0;
		for (const flow of flows) {
			const fromPos = flow.from ? stockPositions.get(flow.from) : new THREE.Vector3(-6, 2, 0);
			const toPos = flow.to ? stockPositions.get(flow.to) : new THREE.Vector3(6, -2, 0);
			if (!fromPos || !toPos) continue;

			for (let p = 0; p < PARTICLES_PER_FLOW; p++) {
				const t = ((p / PARTICLES_PER_FLOW) + time * flow.rate * 0.001) % 1;
				const pos = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
				pos.y += Math.sin(t * Math.PI) * 0.5; // arc

				positions[idx * 3] = pos.x;
				positions[idx * 3 + 1] = pos.y;
				positions[idx * 3 + 2] = pos.z;
				colors[idx * 3] = flowColor.r;
				colors[idx * 3 + 1] = flowColor.g;
				colors[idx * 3 + 2] = flowColor.b;
				idx++;
			}
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		return geo;
	});

	useTask((delta: number) => {
		time += delta;
	});
</script>

<SceneWrapper title="Token Flow Visualization">
	<!-- Stock nodes as glowing boxes -->
	{#each stocks as stock}
		{@const pos = stockPositions.get(stock.id)}
		{#if pos}
			<T.Mesh position={[pos.x, pos.y, pos.z]}>
				<T.BoxGeometry args={[1, 0.6, 1]} />
				<T.MeshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.3} roughness={0.4} />
			</T.Mesh>
		{/if}
	{/each}

	<!-- Particle flows -->
	{#if flows.length > 0}
		<T.Points>
			{#key time}
				<T is={particleGeo} />
			{/key}
			<T.PointsMaterial size={0.12} vertexColors sizeAttenuation transparent opacity={0.9} />
		</T.Points>
	{/if}

	<T.GridHelper args={[14, 14, '#2a2a3e', '#1a1a2e']} position.y={-1} />
</SceneWrapper>
