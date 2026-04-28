#define SPEED_STEP 0.01

// 修正：用 vec4 接收颜色（兼容 Cesium 颜色传递）
uniform vec4 startColor;
uniform vec4 endColor;
uniform float speed;
uniform float headsize;
uniform float tailsize;
uniform float widthoffset;
uniform float coresize;

vec4 drawLight(float xPos, vec2 st, float headOffset, float tailOffset, float widthOffset) {
    float len = smoothstep(xPos + headOffset, xPos, st.x) - smoothstep(xPos, xPos - tailOffset, st.x);
    float wid = smoothstep(widthOffset, 0.5, st.y) - smoothstep(0.5, 1.0 - widthOffset, st.y);
    return vec4(len * wid);
}

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material m = czm_getDefaultMaterial(materialInput);
    
    // 修正：用 mix 处理 vec4 颜色，取 rgb 通道
    vec3 color = mix(startColor.rgb, endColor.rgb, materialInput.st.x);
    float st = sin(czm_frameNumber * SPEED_STEP * speed);
    float x;

    if (st < 0.0) {
        x = cos(czm_frameNumber * SPEED_STEP * speed) + 1.0 - tailsize;
    } else {
        x = -cos(czm_frameNumber * SPEED_STEP * speed) + 1.0 - tailsize;
    }

    vec4 core = drawLight(x, materialInput.st, coresize, coresize * 2.0, widthoffset * 2.0);
    vec4 colorLayer = drawLight(x, materialInput.st, headsize, tailsize, widthoffset);

    m.diffuse = color + core.xyz * 0.8;
    m.alpha = pow(colorLayer.w, 3.0);

    return m;
}