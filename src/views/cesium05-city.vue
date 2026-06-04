<template>
  <div>
    <div ref="cesiumContainer" style="width: 100vw; height: 100vh"></div>
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';
import { createCesiumViewer } from '../utils/cesium-setup';

const cesiumContainer = ref(null);
let viewer = null;
let model = null;

const initCesium = async () => {
  viewer = createCesiumViewer(cesiumContainer.value, {
    imageryProvider: false,
    terrainProvider: false,
  });

  // Hide globe and sky elements
  viewer.scene.globe.show = false;
  viewer.scene.skyBox.show = false;
  viewer.scene.sun.show = false;
  viewer.scene.moon.show = false;
  viewer.scene.skyAtmosphere.show = false;
  viewer.scene.fog.enabled = false;

  const longitude = 116.404;
  const latitude = 39.915;
  const height = 0;
  const center = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

  model = await Cesium.Model.fromGltfAsync({
    url: '/gltf/city2.glb',
    scale: 100.0,
    modelMatrix: transform,
  });
  viewer.scene.primitives.add(model);

  await new Promise((resolve) => {
    const checkReady = () => {
      if (model.ready) resolve();
      else requestAnimationFrame(checkReady);
    };
    checkReady();
  });

  console.log('✅ 模型加载完成');

  const targetNodeName = "Plane";
  const node = model.getNode(targetNodeName);

  if (node) {
    console.log(`✅ 找到节点：${targetNodeName}`);
    node.show = true;
    node.scale = new Cesium.Cartesian3(1, 1, 1);
  } else {
    console.log(`❌ 未找到节点：${targetNodeName}`);
  }

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 2000),
    duration: 1,
  });
};

onMounted(() => {
  initCesium();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
}
</style>
