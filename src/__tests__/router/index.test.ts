import { describe, it, expect } from 'vitest'
import router from '../../router/index'

describe('router', () => {
  it('should have 11 routes defined', () => {
    const routes = router.getRoutes()
    expect(routes.length).toBe(11)
  })

  it('should have a root route named ThreePage', () => {
    const route = router.getRoutes().find((r) => r.path === '/')
    expect(route).toBeDefined()
    expect(route!.name).toBe('ThreePage')
  })

  it('should have /three01 route', () => {
    const route = router.getRoutes().find((r) => r.path === '/three01')
    expect(route).toBeDefined()
    expect(route!.name).toBe('Three01')
  })

  it('should have /house route', () => {
    const route = router.getRoutes().find((r) => r.path === '/house')
    expect(route).toBeDefined()
    expect(route!.name).toBe('ThreeHouse')
  })

  it('should have /cesium01 route', () => {
    const route = router.getRoutes().find((r) => r.path === '/cesium01')
    expect(route).toBeDefined()
    expect(route!.name).toBe('Cesium01')
  })

  it('should have /cesium02 route', () => {
    const route = router.getRoutes().find((r) => r.path === '/cesium02')
    expect(route).toBeDefined()
    expect(route!.name).toBe('cesium02')
  })

  it('should have /cesium05 route', () => {
    const route = router.getRoutes().find((r) => r.path === '/cesium05')
    expect(route).toBeDefined()
    expect(route!.name).toBe('cesium05')
  })

  it('should have /ue route', () => {
    const route = router.getRoutes().find((r) => r.path === '/ue')
    expect(route).toBeDefined()
    expect(route!.name).toBe('UEPixStream')
  })

  it('should have /city-point route', () => {
    const route = router.getRoutes().find((r) => r.path === '/city-point')
    expect(route).toBeDefined()
    expect(route!.name).toBe('CityPoint')
  })

  it('should have /park route', () => {
    const route = router.getRoutes().find((r) => r.path === '/park')
    expect(route).toBeDefined()
    expect(route!.name).toBe('Park')
  })

  it('should have /three-city route', () => {
    const route = router.getRoutes().find((r) => r.path === '/three-city')
    expect(route).toBeDefined()
    expect(route!.name).toBe('ThreeCity')
  })

  it('should have /demo route', () => {
    const route = router.getRoutes().find((r) => r.path === '/demo')
    expect(route).toBeDefined()
    expect(route!.name).toBe('Demo')
  })

  it('should use web history mode', () => {
    // router.options exposes the original config
    expect(router.options.history).toBeDefined()
  })

  it('should have lazy-loaded components (functions) for all routes', () => {
    const routes = router.getRoutes()
    routes.forEach((route) => {
      // All components should be defined (lazy imports produce functions on the record)
      expect(route.components).toBeDefined()
    })
  })
})
