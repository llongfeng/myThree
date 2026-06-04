<template>
  <div class="campus-page">
    <!-- Layer control panel -->
    <div class="layer-control">
      <label
        ><input type="checkbox" v-model="showBuilding" @change="changeLayer" />
        🏢 建筑</label
      >
      <label
        ><input type="checkbox" v-model="showDevice" @change="changeLayer" /> 🖥️
        设备</label
      >
      <label
        ><input type="checkbox" v-model="showCamera" @change="changeLayer" /> 🎥
        摄像头</label
      >
      <label
        ><input type="checkbox" v-model="showFire" @change="changeLayer" /> 🧯
        消防栓</label
      >
      <label
        ><input type="checkbox" v-model="showPeople" @change="changeLayer" /> 👤
        人员</label
      >
    </div>

    <div ref="container" class="cesium-container"></div>
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';
import { createCesiumViewer, setupCesiumClickHandler } from '../utils/cesium-setup';

const container = ref(null);
let viewer = null;

const showBuilding = ref(true);
const showDevice = ref(true);
const showCamera = ref(true);
const showFire = ref(true);
const showPeople = ref(true);

const entityGroup = {
  buildingTileset: null,
  devices: [],
  cameras: [],
  fires: [],
  peoples: [],
};

const pointData = [
  {
    type: 'device',
    name: '一号服务器机房',
    lon: 116.4035,
    lat: 39.9145,
    height: 12,
    status: '运行中',
    param: 'CPU: 28% | 温度: 23℃',
  },
  {
    type: 'device',
    name: '二号配电房',
    lon: 116.4039,
    lat: 39.9147,
    height: 12,
    status: '正常',
    param: '电压: 220V | 电流: 15A',
  },
  {
    type: 'camera',
    name: '北门摄像头',
    lon: 116.4033,
    lat: 39.915,
    height: 8,
    status: '在线',
    param: '实时监控中',
  },
  {
    type: 'camera',
    name: '车库摄像头',
    lon: 116.4041,
    lat: 39.9143,
    height: 8,
    status: '在线',
    param: '实时监控中',
  },
  {
    type: 'fire',
    name: 'A区消防栓',
    lon: 116.4036,
    lat: 39.9142,
    height: 5,
    status: '正常',
    param: '压力: 3.5MPa',
  },
  {
    type: 'fire',
    name: 'B区消防栓',
    lon: 116.404,
    lat: 39.9149,
    height: 5,
    status: '正常',
    param: '压力: 3.4MPa',
  },
  {
    type: 'people',
    name: '运维-张三',
    lon: 116.4037,
    lat: 39.9146,
    height: 3,
    status: '在岗',
    param: '正在巡检',
  },
  {
    type: 'people',
    name: '安保-李四',
    lon: 116.4034,
    lat: 39.9148,
    height: 3,
    status: '在岗',
    param: '门口执勤',
  },
];

onMounted(() => {
  if (!container.value) return;
  initCesium();
  loadBuilding();
  addAllPoints();
  bindClickEvent();
  flyToCampus();
});

function initCesium() {
  viewer = createCesiumViewer(container.value, {
    terrain: true,
    enableLighting: true,
  });
}

function loadBuilding() {
  Cesium.createOsmBuildingsAsync().then((tileset) => {
    entityGroup.buildingTileset = viewer.scene.primitives.add(tileset);
  });
}

function addAllPoints() {
  pointData.forEach((item) => {
    const entity = viewer.entities.add({
      name: item.name,
      position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, item.height),
      point: {
        pixelSize: item.type === 'people' ? 13 : 11,
        color: getPointColor(item.type),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: item.name,
        font: '14px sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, -22),
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: item,
    });

    if (item.type === 'device') entityGroup.devices.push(entity);
    if (item.type === 'camera') entityGroup.cameras.push(entity);
    if (item.type === 'fire') entityGroup.fires.push(entity);
    if (item.type === 'people') entityGroup.peoples.push(entity);
  });
}

function getPointColor(type) {
  switch (type) {
    case 'device':
      return Cesium.Color.SKYBLUE;
    case 'camera':
      return Cesium.Color.ORANGE;
    case 'fire':
      return Cesium.Color.RED;
    case 'people':
      return Cesium.Color.LIME;
    default:
      return Cesium.Color.WHITE;
  }
}

function bindClickEvent() {
  setupCesiumClickHandler(viewer, (pick) => {
    if (!Cesium.defined(pick) || !Cesium.defined(pick.id)) return;

    const target = pick.id;
    viewer.selectedEntity = target;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        target.properties.lon,
        target.properties.lat,
        150
      ),
      duration: 1.3,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
    });
  });
}

function changeLayer() {
  if (entityGroup.buildingTileset) {
    entityGroup.buildingTileset.show = showBuilding.value;
  }
  entityGroup.devices.forEach((i) => (i.show = showDevice.value));
  entityGroup.cameras.forEach((i) => (i.show = showCamera.value));
  entityGroup.fires.forEach((i) => (i.show = showFire.value));
  entityGroup.peoples.forEach((i) => (i.show = showPeople.value));
}

function flyToCampus() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.4037, 39.9146, 700),
    duration: 2,
  });
}
</script>

<style scoped>
.campus-page {
  position: relative;
  width: 100%;
  height: 100vh;
}

.layer-control {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  user-select: none;
}

.layer-control label {
  display: block;
  margin: 6px 0;
  cursor: pointer;
}

.cesium-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
