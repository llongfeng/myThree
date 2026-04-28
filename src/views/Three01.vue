<template>
  <div class="three01">
    <div ref="container" id="container" class="three-container"></div>
  </div>
</template>
<script lang="ts" setup>
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ref, onMounted } from 'vue';

let scene: THREE.Scene | null = null;
let controls: OrbitControls | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.PerspectiveCamera | null = null;
//获取容器元素
const container = ref<HTMLDivElement | null>(null);
const init = () => {
  //创建场景
  scene = new THREE.Scene();

  //创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  //设置相机位置
  camera.position.set(5, 5, 5);

  //创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  //设置渲染器大小
  renderer.setSize(window.innerWidth, window.innerHeight);
  //像素比适配高清屏
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //创建控制器
  controls = new OrbitControls(camera, renderer.domElement);
  //控制器启用阻尼效果
  controls.enableDamping = true;
  //阻尼器系数
  controls.dampingFactor = 0.5;
  //允许缩放
  controls.enableZoom = true;
  //允许旋转
  controls.enableRotate = true;
  //允许平移
  controls.enablePan = true;

  //将渲染器添加到容器中
  container.value && container.value.appendChild(renderer.domElement);
};

//添加几何体
const addGeometry = () => {
  //创建一个立方体几何体
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  //创建一个基本材质
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xff0000 }), // 右 0
    new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // 左 1
    new THREE.MeshStandardMaterial({ color: 0x0000ff }), // 上 2
    new THREE.MeshStandardMaterial({ color: 0xffff00 }), // 下 3
    new THREE.MeshStandardMaterial({ color: 0xff00ff }), // 前 4
    new THREE.MeshStandardMaterial({ color: 0x00ffff }), // 后 5
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  scene?.add(mesh);

  //添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene?.add(ambientLight);

  //添加灯光
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene?.add(light);
};

//动画循环
const animate = () => {
  // 浏览器帧循环
  requestAnimationFrame(animate);
  if (controls) controls.update();

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

const resize = () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
};
onMounted(() => {
  console.log('Three01.vue mounted');
  //初始化实例
  init();
  //添加几何体
  addGeometry();
  //开始动画循环
  animate();
  //监听窗口大小变化
  window.addEventListener('resize', resize);
});
</script>
