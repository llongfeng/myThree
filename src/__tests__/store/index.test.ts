import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMainStore } from '../../store/index'

describe('useMainStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have default userName', () => {
    const store = useMainStore()
    expect(store.userName).toBe('3D 开发者')
  })

  it('should have default sceneConfig', () => {
    const store = useMainStore()
    expect(store.sceneConfig).toEqual({
      bgColor: '#000011',
      cameraZ: 10
    })
  })

  it('should allow updating userName', () => {
    const store = useMainStore()
    store.userName = 'New User'
    expect(store.userName).toBe('New User')
  })

  it('should allow updating sceneConfig', () => {
    const store = useMainStore()
    store.sceneConfig = { bgColor: '#ffffff', cameraZ: 20 }
    expect(store.sceneConfig.bgColor).toBe('#ffffff')
    expect(store.sceneConfig.cameraZ).toBe(20)
  })

  it('should return the same instance within the same pinia scope', () => {
    const store1 = useMainStore()
    const store2 = useMainStore()
    expect(store1).toBe(store2)
  })
})
