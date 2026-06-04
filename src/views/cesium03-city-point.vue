<template>
  <div ref="container" class="cesium-container"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';
import { createCesiumViewer, setupCesiumClickHandler } from '../utils/cesium-setup';

const container = ref(null);
let viewer = null;

const cityData = [
  { name: '北京', lon: 116.4038, lat: 39.9149 },
  { name: '上海', lon: 121.4737, lat: 31.2304 },
  { name: '广州', lon: 113.2644, lat: 23.1291 },
  { name: '深圳', lon: 114.0579, lat: 22.5431 },
  { name: '成都', lon: 104.0657, lat: 30.6595 },
  { name: '杭州', lon: 120.1536, lat: 30.2875 },
  { name: '重庆', lon: 106.5516, lat: 29.563 },
  { name: '西安', lon: 108.948, lat: 34.2632 },
  { name: '武汉', lon: 114.3055, lat: 30.5931 },
  { name: '南京', lon: 118.7969, lat: 32.0603 },
  { name: '天津', lon: 117.2009, lat: 39.0842 },
  { name: '长沙', lon: 112.9388, lat: 28.2282 },
];

onMounted(() => {
  if (!container.value) return;
  initViewer();
  addCityPoints();
  bindClickEvent();
  flyToOverview();
});

function initViewer() {
  viewer = createCesiumViewer(container.value, {
    terrain: true,
    enableLighting: true,
  });
}

function addCityPoints() {
  cityData.forEach((city) => {
    viewer.entities.add({
      name: city.name,
      position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 1000),
      point: {
        pixelSize: 10,
        color: Cesium.Color.AQUA,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: city.name,
        font: '14px sans-serif',
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -15),
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: {
        lon: city.lon,
        lat: city.lat,
      },
    });
  });
}

function bindClickEvent() {
  setupCesiumClickHandler(viewer, (pick) => {
    if (!Cesium.defined(pick) || !Cesium.defined(pick.id)) return;

    const entity = pick.id;
    viewer.selectedEntity = entity;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        entity.properties.lon,
        entity.properties.lat,
        8000
      ),
      duration: 1.5,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
    });
  });
}

function flyToOverview() {
  const positions = cityData.map((item) =>
    Cesium.Cartesian3.fromDegrees(item.lon, item.lat)
  );

  const sphere = Cesium.BoundingSphere.fromPoints(positions);
  viewer.camera.flyToBoundingSphere(sphere, {
    duration: 2,
    offset: new Cesium.HeadingPitchRange(
      0,
      -Cesium.Math.PI_OVER_TWO * 0.8,
      sphere.radius * 1.5
    ),
  });
}
</script>

<style>
html,
body,
.cesium-container {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
