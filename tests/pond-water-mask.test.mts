import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachFishBend, attachPondWaterMask } from "../components/concepts/signal-desk/pond-three.ts";

test("water mask composes with fish bend and shares live uniforms", () => {
  const material = new THREE.MeshBasicMaterial();
  const bend = { time: { value: 0 }, curve: { value: 0 }, amount: { value: 1 } };
  attachFishBend(material, bend);
  const mask = {
    texture: { value: new THREE.Texture() },
    origin: { value: new THREE.Vector2(10, 20) },
    size: { value: new THREE.Vector2(100, 200) },
    enabled: { value: 0 },
  };
  attachPondWaterMask(material, mask);
  const shader = {
    uniforms: {},
    vertexShader: "#include <begin_vertex>\n#include <project_vertex>",
    fragmentShader: "#include <clipping_planes_fragment>",
  } as unknown as Parameters<THREE.Material["onBeforeCompile"]>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  assert.equal(shader.uniforms.uPondWaterMaskEnabled, mask.enabled);
  assert.equal(shader.uniforms.uPondWaterOrigin, mask.origin);
  assert.equal(shader.uniforms.uBendTime, bend.time);
  assert.match(shader.vertexShader, /pondWave/);
  assert.match(shader.vertexShader, /modelMatrix \* vec4\(transformed/);
  assert.match(shader.fragmentShader, /1\.0 - pondMaskPoint\.y/);
  assert.match(shader.fragmentShader, /greaterThanEqual\(pondMaskPoint/);
  assert.match(material.customProgramCacheKey(), /pond-fish-bend:pond-water-mask/);
  material.dispose();
  mask.texture.value.dispose();
});
