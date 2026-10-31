import * as T from "three";
/** Small warm contact shadows anchor live geometry without blurring the photograph. */
export function contactShadow(width: number, depth: number, opacity = 0.25) {
  const m = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    clipping: true,
    uniforms: { strength: { value: opacity } },
    vertexShader: `#include <clipping_planes_pars_vertex>
 varying vec2 vUv;void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
 varying vec2 vUv;uniform float strength;void main(){
 #include <clipping_planes_fragment>
 float r=length((vUv-.5)*2.);float a=exp(-r*r*4.)*(1.-smoothstep(.75,1.,r))*strength;gl_FragColor=vec4(.15,.085,.035,a);}`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(width, depth), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
/** Fine roughness variations retain full geometry/texture resolution. */
export function snowMaterial() {
  const m = new T.MeshStandardMaterial({ color: 0xf9eddb, roughness: 0.96 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 vSnowGrain;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n vSnowGrain=position;",
    );
    shader.fragmentShader =
      "varying vec3 vSnowGrain;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\n float grain=fract(sin(dot(floor(vSnowGrain*720.),vec3(12.9898,78.233,39.425)))*43758.5453);roughnessFactor=clamp(roughnessFactor*(.91+.09*grain),.65,1.);",
    );
  };
  return m;
}
