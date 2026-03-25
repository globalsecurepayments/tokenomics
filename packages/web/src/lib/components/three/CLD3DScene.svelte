<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import type { CLDModel, CLDVariable, CLDLink } from '@tokenomics/shared';
	import { VARIABLE_COLORS, LOOP_COLORS } from '$utils/colors';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { model } = $props<{ model: CLDModel }>();

	// 3D force-directed positions (simple circular layout with Y jitter)
	const nodePositions = $derived.by(() => {
		const map = new Map<string, THREE.Vector3>();
		const count = model.variables.length || 1;
		model.variables.forEach((v: CLDVariable, i: number) => {
			const angle = (i / count) * Math.PI * 2;
			const r = 3 + (i % 2) * 1;
			map.set(v.id, new THREE.Vector3(
				Math.cos(angle) * r,
				(Math.random() - 0.5) * 2,
				Math.sin(angle) * r,
			));
		});
		return map;
	});

	// Build edge tube paths
	const edgePaths = $derived.by(() => {
		return model.links.map((link: CLDLink) => {
			const from = nodePositions.get(link.source);
			const to = nodePositions.get(link.target);
			if (!from || !to) return null;

			const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
			mid.y += 0.8;
			const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
			return {
				id: link.id,
				curve,
				color: link.polarity === 'positive' ? LOOP_COLORS.reinforcing : LOOP_COLORS.balancing,
			};
		}).filter(Boolean) as Array<{ id: string; curve: THREE.QuadraticBezierCurve3; color: string }>;
	});

	let time = $state(0);
	useTask((delta: number) => { time += delta; });
</script>

<SceneWrapper title="3D Causal Loop Diagram">
	<!-- Variable nodes -->
	{#each model.variables as v}
		{@const pos = nodePositions.get(v.id)}
		{#if pos}
			<T.Mesh position={[pos.x, pos.y + Math.sin(time * 0.5 + pos.x) * 0.1, pos.z]}>
				<T.SphereGeometry args={[0.25, 16, 16]} />
				<T.MeshStandardMaterial
					color={VARIABLE_COLORS[v.type] ?? '#888'}
					emissive={VARIABLE_COLORS[v.type] ?? '#888'}
					emissiveIntensity={0.3}
					roughness={0.4}
				/>
			</T.Mesh>
		{/if}
	{/each}

	<!-- Edge tubes -->
	{#each edgePaths as edge}
		{@const tubeGeo = new THREE.TubeGeometry(edge.curve, 20, 0.03, 6, false)}
		<T.Mesh>
			<T is={tubeGeo} />
			<T.MeshStandardMaterial color={edge.color} transparent opacity={0.6} />
		</T.Mesh>
	{/each}

	<T.GridHelper args={[10, 10, '#2a2a3e', '#1a1a2e']} position.y={-3} />
</SceneWrapper>
