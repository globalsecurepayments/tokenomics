<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { iterations = [] } = $props<{
		iterations: Array<{ finalValues: { price: number; circulating: number; treasury: number } }>;
	}>();

	const pointData = $derived.by(() => {
		if (iterations.length === 0) return null;

		const positions = new Float32Array(iterations.length * 3);
		const colors = new Float32Array(iterations.length * 3);

		// Normalize to scene space
		type Iter = typeof iterations[0];
		const prices = iterations.map((i: Iter) => i.finalValues.price);
		const supplies = iterations.map((i: Iter) => i.finalValues.circulating);
		const treasuries = iterations.map((i: Iter) => i.finalValues.treasury);

		const norm = (arr: number[], v: number) => {
			const min = Math.min(...arr);
			const max = Math.max(...arr);
			return max > min ? ((v - min) / (max - min)) * 8 - 4 : 0;
		};

		for (let i = 0; i < iterations.length; i++) {
			const fv = iterations[i].finalValues;
			positions[i * 3] = norm(prices, fv.price);
			positions[i * 3 + 1] = norm(treasuries, fv.treasury);
			positions[i * 3 + 2] = norm(supplies, fv.circulating);

			// Color by price percentile (green = high, red = low)
			const t = prices.length > 1 ? (fv.price - Math.min(...prices)) / (Math.max(...prices) - Math.min(...prices) || 1) : 0.5;
			const color = new THREE.Color();
			color.setHSL(t * 0.35, 0.8, 0.55);
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g;
			colors[i * 3 + 2] = color.b;
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		return geo;
	});
</script>

<SceneWrapper title="Monte Carlo Outcome Cloud">
	{#if pointData}
		<T.Points>
			{#key pointData}
				<T is={pointData} />
			{/key}
			<T.PointsMaterial size={0.08} vertexColors sizeAttenuation transparent opacity={0.7} />
		</T.Points>
	{:else}
		<!-- Empty state marker -->
		<T.Mesh>
			<T.SphereGeometry args={[0.3, 16, 16]} />
			<T.MeshStandardMaterial color="#6366f1" wireframe />
		</T.Mesh>
	{/if}

	<T.GridHelper args={[10, 10, '#2a2a3e', '#1a1a2e']} position.y={-4} />
</SceneWrapper>
