<template>
  <div class="ue-stream-container">
    <video ref="videoEl" class="ue-video" autoplay playsinline muted></video>

    <div v-if="loading" class="loading">正在连接 UE5 流...</div>
    <div v-if="error" class="error">
      连接失败：{{ error }}
      <button @click="reconnect">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Config,
  PixelStreaming,
} from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.3';

const videoEl = ref(null);
const loading = ref(true);
const error = ref('');
let stream = null;

const initStreaming = async () => {
  try {
    loading.value = true;
    error.value = '';

    const config = new Config({
      initialSettings: {
        OfferToReceive: true,
        AutoPlayVideo: true,
        StartVideoMuted: true,
        HoveringMouse: true,
      },
      signalingUrl: 'ws://localhost:8888', // 你的信令服务器地址
    });

    stream = new PixelStreaming(config);

    // 关键：把流绑定到 Vue 的 video 元素
    stream.videoElement = videoEl.value;

    // 监听连接事件
    stream.addEventListener('open', () => {
      loading.value = false;
      console.log('连接成功');
    });

    stream.addEventListener('videoEnabled', () => {
      console.log('视频流已就绪');
    });

    stream.addEventListener('error', (err) => {
      error.value = err.message;
      loading.value = false;
    });
  } catch (err) {
    error.value = err.message;
    loading.value = false;
  }
};

const subscribeUeMessages = () => {
  if (!stream) {
    reconnect();
    return;
  }
  stream.addEventListener('message', (event) => {
    console.log('收到 UE 消息:', event.data);
    // 这里可以根据消息内容进行处理
  });
};

const sendConmmand = () => {
  if (!stream) {
    reconnect();
    return;
  }
  // 发送一个简单的命令到 UE
  const command = { action: 'changeColor', color: 'red' };
  stream.emitUIInteraction(command);
};

const reconnect = () => {
  if (stream) {
    stream.destroy();
  }
  initStreaming();
};

onMounted(() => {
  initStreaming();

  //接收消息
  subscribeUeMessages();
  //发送消息
  sendConmmand();
});

onUnmounted(() => {
  if (stream) {
    stream.destroy();
  }
});
</script>

<style scoped>
.ue-stream-container {
  width: 100%;
  height: 100vh;
  background: #000;
  position: relative;
}

.ue-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading,
.error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 18px;
}

.error button {
  margin-top: 10px;
  padding: 6px 16px;
  cursor: pointer;
}
</style>
