import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMainStore = defineStore('main', () => {
  const userName = ref('3D 开发者')
  const sceneConfig = ref({
    bgColor: '#000011',
    cameraZ: 10
  })

  return {
    userName,
    sceneConfig
  }
})
