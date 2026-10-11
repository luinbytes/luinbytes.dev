import * as THREE from "three";

export type DemoRenderFrame = {
  cursorX: number;
  cursorY: number;
  ripple: number;
  drift: number;
  complete: boolean;
};

export function createDemoRenderer(stage: HTMLElement, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  try {
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 10);
    camera.position.z = 4;
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xeee3ff, 3);
    light.position.set(-1, 2, 4);
    scene.add(light);

    function rounded(
      width: number,
      height: number,
      radius: number,
      frame = false,
    ) {
      const shape = new THREE.Shape();
      shape.moveTo(radius, 0);
      shape.lineTo(width - radius, 0);
      shape.quadraticCurveTo(width, 0, width, radius);
      shape.lineTo(width, height - radius);
      shape.quadraticCurveTo(width, height, width - radius, height);
      shape.lineTo(radius, height);
      shape.quadraticCurveTo(0, height, 0, height - radius);
      shape.lineTo(0, radius);
      shape.quadraticCurveTo(0, 0, radius, 0);
      if (frame) {
        const inset = 0.01;
        const hole = new THREE.Path();
        hole.moveTo(radius, inset);
        hole.lineTo(width - radius, inset);
        hole.quadraticCurveTo(width - inset, inset, width - inset, radius);
        hole.lineTo(width - inset, height - radius);
        hole.quadraticCurveTo(
          width - inset,
          height - inset,
          width - radius,
          height - inset,
        );
        hole.lineTo(radius, height - inset);
        hole.quadraticCurveTo(inset, height - inset, inset, height - radius);
        hole.lineTo(inset, radius);
        hole.quadraticCurveTo(inset, inset, radius, inset);
        shape.holes.push(hole);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.009,
        bevelSize: 0.006,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 10,
      });
      geometries.push(geometry);
      return geometry;
    }

    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: 0x665279,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.55,
    });
    materials.push(chassisMaterial);
    const backingMaterial = new THREE.MeshStandardMaterial({
      color: 0x9c83c7,
      roughness: 0.4,
      metalness: 0.08,
    });
    materials.push(backingMaterial);
    const cursorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4eaff,
      roughness: 0.3,
    });
    materials.push(cursorMaterial);
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0xbda3ed,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(rippleMaterial);
    const chassis = new THREE.Mesh(
      rounded(0.69, 0.77, 0.045, true),
      chassisMaterial,
    );
    chassis.position.set(0.29, 0.13, 0);
    scene.add(chassis);
    const backing = new THREE.Mesh(rounded(0.19, 0.29, 0.06), backingMaterial);
    backing.position.set(0.035, 0.43, 0.04);
    scene.add(backing);
    const cursorShape = new THREE.Shape();
    cursorShape.moveTo(0, 0);
    cursorShape.lineTo(0.027, -0.033);
    cursorShape.lineTo(0.014, -0.032);
    cursorShape.lineTo(0.009, -0.046);
    cursorShape.lineTo(0, 0);
    const cursorGeometry = new THREE.ExtrudeGeometry(cursorShape, {
      depth: 0.005,
      bevelEnabled: false,
    });
    geometries.push(cursorGeometry);
    const ringGeometry = new THREE.RingGeometry(0.017, 0.02, 32);
    geometries.push(ringGeometry);
    const cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    const ring = new THREE.Mesh(ringGeometry, rippleMaterial);
    scene.add(cursor, ring);
    let disposed = false;
    let aspect = 1;
    let ringScale = 1;

    function dispose() {
      if (disposed) return;
      disposed = true;
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    }

    function contextLost(event: Event) {
      event.preventDefault();
      dispose();
      onFailure();
    }

    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    stage.appendChild(renderer.domElement);
    return {
      resize(width: number, height: number, lightMode: boolean) {
        renderer.setSize(width, height, false);
        const stageBounds = stage.getBoundingClientRect();
        const avatarBounds = stage
          .querySelector("[data-demo-companion] svg")
          ?.getBoundingClientRect();
        if (avatarBounds) {
          backing.scale.set(
            (avatarBounds.width + 4) / width / 0.19,
            (avatarBounds.height + 4) / height / 0.29,
            1,
          );
          backing.position.set(
            (avatarBounds.left - stageBounds.left - 2) / width,
            1 - (avatarBounds.bottom - stageBounds.top + 2) / height,
            0.04,
          );
        }
        aspect = width / height;
        const cursorScale = 15 / (width * 0.027);
        cursor.scale.set(cursorScale, cursorScale * aspect, 1);
        ringScale = 10 / (width * 0.02);
        chassisMaterial.color.set(lightMode ? 0xd0bcdf : 0x665279);
        backingMaterial.color.set(lightMode ? 0xc7afdf : 0x9c83c7);
      },
      render(frame: DemoRenderFrame) {
        if (disposed) return;
        backing.rotation.z = frame.drift * 0.035;
        cursor.position.set(frame.cursorX, 1 - frame.cursorY, 0.3);
        ring.position.set(frame.cursorX, 1 - frame.cursorY, 0.25);
        ring.scale.x = ringScale * (1 + frame.ripple * 2);
        ring.scale.y = ringScale * aspect * (1 + frame.ripple * 2);
        rippleMaterial.opacity =
          frame.ripple > 0 ? (1 - frame.ripple) * 0.7 : 0;
        cursor.visible = !frame.complete;
        renderer.render(scene, camera);
      },
      dispose,
    };
  } catch (error) {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
}
