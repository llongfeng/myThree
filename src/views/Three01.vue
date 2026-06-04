<template>
  <div class="three01">
    <div ref="container" id="container" class="three-container"></div>
  </div>
</template>
<script lang="ts" setup>
import * as THREE from 'three';
import { ref, onMounted } from 'vue';
import {
  initThreeScene,
  addStandardLights,
  setupResizeHandler,
  startAnimationLoop,
} from '../utils/three-setup';
import type { ThreeContext } from '../utils/three-setup';

const container = ref<HTMLDivElement | null>(null);
let ctx: ThreeContext | null = null;

const init = () => {
  if (!container.value) return;

  ctx = initThreeScene(
    container.value,
    { fov: 75, near: 0.1, far: 1000, cameraPosition: [5, 5, 5] },
    { dampingFactor: 0.5, enableZoom: true, enableRotate: true, enablePan: true }
  );
};

const addGeometry = () => {
  if (!ctx) return;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
    new THREE.MeshStandardMaterial({ color: 0x0000ff }),
    new THREE.MeshStandardMaterial({ color: 0xffff00 }),
    new THREE.MeshStandardMaterial({ color: 0xff00ff }),
    new THREE.MeshStandardMaterial({ color: 0x00ffff }),
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  ctx.scene.add(mesh);

  addStandardLights(ctx.scene, {
    ambientIntensity: 0.5,
    directionalPosition: [5, 5, 5],
  });
};

onMounted(() => {
  console.log('Three01.vue mounted');
  init();
  addGeometry();
  if (ctx) {
    startAnimationLoop(ctx);
    setupResizeHandler(ctx);
  }
});
</script>
