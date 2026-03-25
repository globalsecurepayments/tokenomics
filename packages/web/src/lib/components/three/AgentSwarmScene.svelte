<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { snapshots = [] } = $props<{
		snapshots: Array<{
			timestep: number;
			agentType: string;
			count: number;
			avgHoldings: number;
			totalActivity: number;
		}>;
	}>();

	const AGENT_COLORS: Record<string, string> = {
		holder: '#6366f1',
		speculator: '#f59e0b',
		worker: '#22d3ee',
		whale: '#ef4444',
		funseeker: '#10b981',
	};

	// Get latest snapshot per agent type
	const latestByType = $derived.by(() => {
		const map = new Map<string, typeof snapshots[0]>();
		for (const s of snapshots) {
			const existing = map.get(s.agentType);
			if (!existing || s.timestep > existing.timestep) map.set(s.agentType, s);
		}
		return map;
	});

	// Build instanced data per agent type cluster
	const clusterData = $derived.by(() => {
		const clusters: Array<{
			type: string;
			color: THREE.Color;
			positions: THREE.Vector3[];
			scale: number;
		}> = [];

		let angle = 0;
		for (const [type, snap] of latestByType) {
			const center = new THREE.Vector3(Math.cos(angle) * 3, 0, Math.sin(angle) * 3);
			const color = new THREE.Color(AGENT_COLORS[type] ?? '#888888');
			const count = Math.min(snap.count, 200); // cap visual particles
			const positions: THREE.Vector3[] = [];

			for (let i = 0; i < count; i++) {
				const theta = Math.random() * Math.PI * 2;
				const r = Math.random() * 1.5;
				positions.push(new THREE.Vector3(
					center.x + Math.cos(theta) * r,
					(Math.random() - 0.5) * 1,
					center.z + Math.sin(theta) * r,
				));
			}

			clusters.push({ type, color, positions, scale: 0.06 + snap.avgHoldings * 0.0001 });
			angle += (Math.PI * 2) / latestByType.size;
		}
		return clusters;
	});

	let time = $state(0);
	useTask((delta: number) => { time += delta; });
</script>

<SceneWrapper title="Agent Swarm Visualization">
	{#each clusterData as cluster}
		<!-- Cluster attractor sphere -->
		<T.Mesh position={[
			cluster.positions[0]?.x ?? 0,
			-0.5,
			cluster.positions[0]?.z ?? 0
		]}>
			<T.SphereGeometry args={[0.15, 8, 8]} />
			<T.MeshStandardMaterial color={cluster.color} emissive={cluster.color} emissiveIntensity={0.5} />
		</T.Mesh>

		<!-- Agent particles -->
		{#each cluster.positions as pos, i}
			<T.Mesh position={[
				pos.x + Math.sin(time + i * 0.1) * 0.05,
				pos.y + Math.cos(time * 0.7 + i * 0.2) * 0.03,
				pos.z + Math.sin(time * 0.5 + i * 0.15) * 0.05
			]} scale={Math.min(cluster.scale, 0.15)}>
				<T.SphereGeometry args={[1, 6, 6]} />
				<T.MeshStandardMaterial color={cluster.color} transparent opacity={0.7} />
			</T.Mesh>
		{/each}
	{/each}

	<T.GridHelper args={[10, 10, '#2a2a3e', '#1a1a2e']} position.y={-1.5} />
</SceneWrapper>
