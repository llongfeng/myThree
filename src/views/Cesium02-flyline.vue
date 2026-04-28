<template>
  <!-- 地图容器：ref用于JS获取DOM，class设置样式 -->
  <div ref="container" class="cesium-container"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';
// 导入飞线着色器源码（?raw 表示以字符串形式导入）
import flyLineShader from '../shaders/flyline.glsl?raw';

// ==================== 全局响应式变量 ====================
/** 地图容器DOM引用 */
const container = ref(null);
/** Cesium地图实例（全局保存，方便所有函数调用） */
let viewer = null;

// ==================== 常量配置（数据与逻辑分离） ====================
/** 起点：武汉天河机场 */
const WUHAN_AIRPORT = {
  name: '武汉天河机场',
  coords: [114.208, 30.783], // [经度, 纬度]
};

/** 目的地机场列表 */
const DESTINATION_AIRPORTS = [
  { name: '北京首都国际机场', coords: [116.59, 40.08] },
  { name: '上海浦东国际机场', coords: [121.805, 31.143] },
  { name: '广州白云国际机场', coords: [113.3, 23.39] },
  { name: '成都天府国际机场', coords: [104.45, 30.31] },
  { name: '深圳宝安国际机场', coords: [113.81, 22.63] },
  { name: '昆明长水国际机场', coords: [102.93, 25.1] },
  { name: '西安咸阳国际机场', coords: [108.75, 34.44] },
  { name: '重庆江北国际机场', coords: [106.64, 29.72] },
  { name: '杭州萧山国际机场', coords: [120.43, 30.23] },
  { name: '乌鲁木齐地窝堡国际机场', coords: [87.47, 43.9] },
  { name: '哈尔滨太平国际机场', coords: [126.25, 45.62] },
  { name: '拉萨贡嘎国际机场', coords: [90.91, 29.3] },
  { name: '沈阳桃仙国际机场', coords: [123.48, 41.64] },
  { name: '长沙黄花国际机场', coords: [113.22, 28.19] },
];

/** 飞线渐变配色面板 */
const GRADIENT_PALETTE = [
  {
    start: Cesium.Color.fromCssColorString('#00E5FF'),
    end: Cesium.Color.fromCssColorString('#18A0FF'),
  },
  {
    start: Cesium.Color.fromCssColorString('#F8FF00'),
    end: Cesium.Color.fromCssColorString('#FF8C00'),
  },
  {
    start: Cesium.Color.fromCssColorString('#FF00FF'),
    end: Cesium.Color.fromCssColorString('#8A2BE2'),
  },
  {
    start: Cesium.Color.fromCssColorString('#00FF7F'),
    end: Cesium.Color.fromCssColorString('#32CD32'),
  },
  {
    start: Cesium.Color.fromCssColorString('#FF4500'),
    end: Cesium.Color.fromCssColorString('#FF0000'),
  },
];

/** 飞线着色器字符串 */
const FLYLINE_SHADER = flyLineShader;

// ==================== 生命周期：入口函数（只做调用，不写业务） ====================
onMounted(() => {
  // 容器不存在则直接退出
  if (!container.value) return;

  initCesium(); // 1. 初始化Cesium地球
  addAllFlyLines(); // 2. 批量绘制所有飞线
  add3dBuildings(); // 3. 加载3D建筑
});

// ==================== 1. 初始化Cesium地图 ====================
/**
 * 初始化Cesium Viewer实例
 * 关闭多余控件，开启地形，简化界面
 */
function initCesium() {
  viewer = new Cesium.Viewer(container.value, {
    terrain: Cesium.Terrain.fromWorldTerrain(), // 全球高精度地形
    animation: false, // 关闭动画控件
    timeline: false, // 关闭时间轴
    baseLayerPicker: false, // 关闭底图选择器
    geocoder: false, // 关闭地点搜索
    homeButton: false, // 关闭回到默认视角
    sceneModePicker: false, // 关闭2D/3D切换
    navigationHelpButton: false, // 关闭帮助按钮
    fullscreenButton: false, // 关闭全屏按钮
    creditContainer: document.createElement('div'), // 隐藏版权信息
  });
}

// ==================== 2. 工具函数：生成抛物线路径 ====================
/**
 * 生成二次贝塞尔抛物线（飞线弧形轨迹）
 * @param {Array} start 起点经纬度 [lon, lat]
 * @param {Array} end 终点经纬度 [lon, lat]
 * @param {Number} height 弧线高度
 * @param {Number} count 路径采样点数量（越多越平滑）
 * @returns {Array} 笛卡尔坐标数组
 */
function createParabolicPath(start, end, height, count = 100) {
  // 经纬度转Cesium 3D坐标
  const startPoint = Cesium.Cartesian3.fromDegrees(start[0], start[1], 0);
  const endPoint = Cesium.Cartesian3.fromDegrees(end[0], end[1], 0);

  // 计算起点与终点的中心点
  const midPoint = Cesium.Cartesian3.add(
    startPoint,
    endPoint,
    new Cesium.Cartesian3()
  );
  Cesium.Cartesian3.multiplyByScalar(midPoint, 0.5, midPoint);

  // 计算垂直向上的方向向量
  const up = Cesium.Cartesian3.normalize(midPoint, new Cesium.Cartesian3());
  // 计算贝塞尔曲线控制点（弧线最高点）
  const controlPoint = Cesium.Cartesian3.add(
    midPoint,
    Cesium.Cartesian3.multiplyByScalar(up, height, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  // 根据贝塞尔公式生成路径点
  const positions = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    // 二次贝塞尔曲线系数
    const p0 = (1 - t) ** 2;
    const p1 = 2 * (1 - t) * t;
    const p2 = t ** 2;

    // 计算当前点坐标
    const point = new Cesium.Cartesian3();
    Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(
        startPoint,
        p0,
        new Cesium.Cartesian3()
      ),
      Cesium.Cartesian3.multiplyByScalar(
        controlPoint,
        p1,
        new Cesium.Cartesian3()
      ),
      point
    );
    Cesium.Cartesian3.add(
      point,
      Cesium.Cartesian3.multiplyByScalar(endPoint, p2, new Cesium.Cartesian3()),
      point
    );

    positions.push(point);
  }
  return positions;
}

// ==================== 3. 工具函数：生成渐变色数组 ====================
/**
 * 生成从起始色到结束色的线性渐变颜色
 * @param {Color} startColor 起始颜色
 * @param {Color} endColor 结束颜色
 * @param {Number} count 渐变分段数
 * @returns {Array} 颜色数组
 */
function createGradientColors(startColor, endColor, count = 100) {
  const colors = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    // Cesium颜色线性插值
    colors.push(Cesium.Color.lerp(startColor, endColor, t, new Cesium.Color()));
  }
  return colors;
}

// ==================== 4. 创建单条动态流光飞线 ====================
/**
 * 创建带Shader动画的动态流动线（上层高亮）
 * @param {Array} positions 路径坐标
 * @param {Object} colorPair 配色对象 {start, end}
 * @returns {Primitive} 飞线图元
 */
function createDynamicFlowLine(positions, colorPair) {
  // 创建自定义Shader材质
  const material = new Cesium.Material({
    fabric: {
      type: 'GradientFlowingLineMaterial',
      uniforms: {
        startColor: colorPair.start, // 起点颜色
        endColor: colorPair.end, // 终点颜色
        speed: 1 + Math.random() * 0.8, // 流动速度（随机更自然）
        headsize: 0.05, // 流光头部大小
        tailsize: 0.5, // 流光尾部长度
        widthoffset: 0.1, // 宽度偏移
        coresize: 0.05, // 亮光核心大小
      },
      source: FLYLINE_SHADER, // 着色器源码
    },
  });

  // 返回高性能Primitive飞线
  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: 12, // 线条宽度
        vertexFormat: Cesium.VertexFormat.ALL,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({ material }),
  });
}

// ==================== 5. 创建单条静态底线 ====================
/**
 * 创建静态透明底线（下层底色轨迹）
 * @param {Array} positions 路径坐标
 * @returns {Primitive} 底线图元
 */
function createStaticLine(positions) {
  // 生成半透明渐变颜色
  const colors = createGradientColors(
    Cesium.Color.fromCssColorString('#00E5FF88'),
    Cesium.Color.fromCssColorString('#00E5FF22'),
    100
  );

  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: 3, // 细线条
        colors, // 逐点颜色
        colorMode: Cesium.COLORS,
      }),
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  });
}

// ==================== 6. 批量绘制所有飞线 ====================
/**
 * 循环所有机场，绘制武汉出发的双层飞线
 * 绘制完成后自动调整相机视角
 */
function addAllFlyLines() {
  const allPositions = []; // 存储所有点，用于相机定位
  const linePointCount = 100;

  // 遍历机场绘制飞线
  DESTINATION_AIRPORTS.forEach((airport, index) => {
    // 随机弧线高度（30万~70万米）
    const height = 300000 + Math.random() * 400000;
    // 生成抛物线路径
    const positions = createParabolicPath(
      WUHAN_AIRPORT.coords,
      airport.coords,
      height,
      linePointCount
    );
    allPositions.push(...positions);

    // 循环取色板配色
    const colorPair = GRADIENT_PALETTE[index % GRADIENT_PALETTE.length];

    // 创建双层线
    const dynamicLine = createDynamicFlowLine(positions, colorPair);
    const staticLine = createStaticLine(positions);

    // 添加到场景
    viewer.scene.primitives.add(dynamicLine);
    viewer.scene.primitives.add(staticLine);
  });

  // 相机自动聚焦到所有飞线
  if (allPositions.length) {
    const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 3, // 动画3秒
      offset: new Cesium.HeadingPitchRange(
        0,
        -Cesium.Math.PI_OVER_TWO * 0.9, // 俯视角度
        sphere.radius * 2 // 视距
      ),
    });
  }
}

// ==================== 7. 加载3D建筑 ====================
/**
 * 加载OSM全球3D建筑白膜
 */
function add3dBuildings() {
  Cesium.createOsmBuildingsAsync().then((tileset) => {
    viewer.scene.primitives.add(tileset);
  });
}
</script>

<!-- 样式：让地图铺满全屏 -->
<style>
html,
body,
.cesium-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
