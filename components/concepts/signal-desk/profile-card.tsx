"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./profile-card.module.css";

export function ProfileCard({ reducedMotion, compact = false }: { reducedMotion: boolean; compact?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const foilCanvasRef = useRef<HTMLCanvasElement>(null);
  const foilDrawRef = useRef<(x: number, y: number, immediate?: boolean) => void>(() => {});
  const [localTime, setLocalTime] = useState("UK time");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    const updateTime = () => setLocalTime(formatter.format(new Date()));
    updateTime();
    const interval = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = foilCanvasRef.current;
    const portrait = canvas?.parentElement;
    if (!canvas || !portrait) return;

    portrait.dataset.foilRenderer = "fallback";
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    };
    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec2 u_view;
      uniform vec4 u_panel_bounds;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float value_noise(vec2 p) {
        vec2 cell = floor(p);
        vec2 local = fract(p);
        local = local * local * (3.0 - 2.0 * local);
        float a = hash21(cell);
        float b = hash21(cell + vec2(1.0, 0.0));
        float c = hash21(cell + vec2(0.0, 1.0));
        float d = hash21(cell + vec2(1.0, 1.0));
        return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
      }

      vec3 spectrum(float t) {
        return clamp(0.56 + 0.44 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))), 0.0, 1.0);
      }

      void main() {
        const float tiles = 15.0;
        vec2 panel_size = u_panel_bounds.zw - u_panel_bounds.xy;
        vec2 panel_uv = min(clamp((v_uv - u_panel_bounds.xy) / panel_size, 0.0, 1.0), vec2(0.999999));
        vec2 tiled = panel_uv * tiles;
        vec2 tile_id = floor(tiled);
        vec2 local_uv = fract(tiled);
        vec2 tile_center = (tile_id + 0.5) / tiles;

        float h1 = hash21(tile_id + 1.7);
        float h2 = hash21(tile_id + 9.2);
        float h3 = hash21(tile_id + 23.4);
        vec2 coherent_slope = vec2(
          value_noise(tile_center * 3.2 + vec2(1.8, 7.1)),
          value_noise(tile_center * 3.2 + vec2(8.4, 2.7))
        ) - 0.5;
        vec2 facet_slope = coherent_slope * 0.46 + (vec2(h1, h2) - 0.5) * 0.075;
        vec3 normal = normalize(vec3(facet_slope, 1.0));
        vec2 view_shift = (u_view - 0.5) * 0.82;
        vec3 view_dir = normalize(vec3(view_shift, 1.0));
        vec3 light_dir = normalize(vec3(-0.24, 0.18, 1.0));
        vec3 reflection_dir = normalize(light_dir + view_dir);
        float facing = clamp(dot(normal, view_dir), 0.0, 1.0);
        float fresnel = pow(1.0 - facing, 2.2);

        float alignment = clamp(dot(normal, reflection_dir), 0.0, 1.0);
        float normal_specular = 0.56 + 0.44 * pow(smoothstep(0.91, 0.998, alignment), 1.8);
        vec2 reflection_center = vec2(0.4, 0.6) + vec2(view_shift.x * 0.72, -view_shift.y * 0.58);
        mat2 lobe_rotation = mat2(0.88, -0.48, 0.48, 0.88);
        vec2 primary_delta = lobe_rotation * (tile_center - reflection_center) / vec2(0.5, 0.32);
        float boundary_warp = (value_noise(tile_center * 3.0 + vec2(4.6, 1.9)) - 0.5) * 0.16;
        float primary_lobe = 1.0 - smoothstep(0.16 + boundary_warp, 1.04 + boundary_warp, dot(primary_delta, primary_delta));
        vec2 secondary_center = reflection_center + vec2(0.24, -0.18);
        vec2 secondary_delta = lobe_rotation * (tile_center - secondary_center) / vec2(0.42, 0.26);
        float secondary_lobe = (1.0 - smoothstep(0.14, 1.02, dot(secondary_delta, secondary_delta))) * 0.3;
        float reflection_envelope = max(primary_lobe, secondary_lobe);
        float facet_variation = 0.96 + (h3 - 0.5) * 0.08;
        float specular = reflection_envelope * normal_specular * facet_variation;

        vec2 panel_edge_room = min(panel_uv, 1.0 - panel_uv);
        float safe_displacement = smoothstep(0.0, 0.075, min(panel_edge_room.x, panel_edge_room.y));
        vec2 refraction_offset = facet_slope * (0.016 + specular * 0.018);
        refraction_offset += (local_uv - 0.5) * facet_slope * (0.006 + specular * 0.008);
        vec2 refracted_uv = clamp(panel_uv + refraction_offset * safe_displacement, 0.001, 0.999);
        float low_wave = sin(refracted_uv.x * 5.1 + sin(refracted_uv.y * 3.8) * 0.72) * 0.028;
        float shared_hue = fract(refracted_uv.x * 0.64 + refracted_uv.y * 0.38 + low_wave + dot(view_shift, vec2(0.055, -0.04)));
        float local_hue = fract(shared_hue + dot(facet_slope, view_shift) * 0.12 + (h3 - 0.5) * 0.018 + specular * 0.04);

        float local_plane = 1.0 + dot(local_uv - 0.5, facet_slope) * 0.2;
        vec3 shared_field = spectrum(shared_hue);
        vec3 refracted_field = spectrum(local_hue);
        vec3 base_colour = mix(shared_field, refracted_field, 0.34) * (0.14 + 0.08 * facing) * local_plane;
        vec3 reflection_colour = mix(spectrum(fract(local_hue + 0.045)), vec3(0.83, 1.0, 0.97), 0.44);
        vec3 colour = base_colour + reflection_colour * specular * (1.02 + 0.12 * h3);

        float edge_distance = min(min(local_uv.x, 1.0 - local_uv.x), min(local_uv.y, 1.0 - local_uv.y));
        float soft_bevel = 1.0 - smoothstep(0.018, 0.13, edge_distance);
        float seam = mix(0.92, 1.0, smoothstep(0.012, 0.055, edge_distance));
        colour += vec3(0.76, 0.98, 0.95) * soft_bevel * (0.014 + fresnel * 0.035 + specular * 0.075);
        colour *= seam;

        float distance_from_center = length(tile_center - vec2(0.5));
        float panel_depth = 1.0 - distance_from_center * 0.08;
        float material_edge = min(min(panel_uv.x, 1.0 - panel_uv.x), min(panel_uv.y, 1.0 - panel_uv.y));
        panel_depth *= mix(0.88, 1.0, smoothstep(0.0, 0.055, material_edge));
        float alpha = (0.34 + 0.1 * facing + 0.48 * specular) * seam * panel_depth;
        gl_FragColor = vec4(colour * alpha, alpha);
      }
    `);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const position = gl.getAttribLocation(program, "a_position");
    const view = gl.getUniformLocation(program, "u_view");
    const panelBounds = gl.getUniformLocation(program, "u_panel_bounds");
    const buffer = gl.createBuffer();
    if (position < 0 || !view || !panelBounds || !buffer) {
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.uniform4f(panelBounds, 0, 0, 1, 1);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let live = true;
    let inView = true;
    let active = !document.hidden;
    let springFrame = 0;
    let lastTime = 0;
    let currentX = 0.38;
    let currentY = 0.56;
    let targetX = currentX;
    let targetY = currentY;
    let velocityX = 0;
    let velocityY = 0;

    const render = (x: number, y: number) => {
      if (!live) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.min(192, Math.round(canvas.clientWidth * scale)));
      const height = Math.max(1, Math.min(192, Math.round(canvas.clientHeight * scale)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(view, x, 1 - y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (process.env.NODE_ENV !== "production") canvas.dataset.foilView = `${x.toFixed(3)},${y.toFixed(3)}`;
    };

    const stopSpring = () => {
      if (springFrame) cancelAnimationFrame(springFrame);
      springFrame = 0;
    };
    const stepSpring = (time: number) => {
      springFrame = 0;
      if (!live || !active) return;
      const delta = lastTime ? Math.min(0.032, (time - lastTime) / 1000) : 0.016;
      lastTime = time;
      velocityX += ((targetX - currentX) * 130 - velocityX * 21) * delta;
      velocityY += ((targetY - currentY) * 130 - velocityY * 21) * delta;
      currentX += velocityX * delta;
      currentY += velocityY * delta;
      render(currentX, currentY);
      const remaining = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      const momentum = Math.abs(velocityX) + Math.abs(velocityY);
      if (remaining > 0.001 || momentum > 0.006) {
        springFrame = requestAnimationFrame(stepSpring);
      } else {
        currentX = targetX;
        currentY = targetY;
        velocityX = 0;
        velocityY = 0;
        render(currentX, currentY);
      }
    };
    const startSpring = () => {
      if (!springFrame && live && active) {
        lastTime = performance.now();
        springFrame = requestAnimationFrame(stepSpring);
      }
    };
    const setView = (x: number, y: number, immediate = false) => {
      targetX = Math.max(0, Math.min(1, x));
      targetY = Math.max(0, Math.min(1, y));
      if (process.env.NODE_ENV !== "production") canvas.dataset.foilTarget = `${targetX.toFixed(3)},${targetY.toFixed(3)}`;
      if (immediate) {
        stopSpring();
        currentX = targetX;
        currentY = targetY;
        velocityX = 0;
        velocityY = 0;
        if (active) render(currentX, currentY);
        return;
      }
      startSpring();
    };

    const resizeObserver = new ResizeObserver(() => {
      if (active) render(currentX, currentY);
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      active = inView && !document.hidden;
      if (active) {
        render(currentX, currentY);
        startSpring();
      } else {
        stopSpring();
      }
    }, { threshold: 0.01 });
    const onVisibilityChange = () => {
      active = inView && !document.hidden;
      if (active) {
        render(currentX, currentY);
        startSpring();
      } else {
        stopSpring();
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      live = false;
      stopSpring();
      portrait.dataset.foilRenderer = "fallback";
    };

    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibilityChange);
    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    portrait.dataset.foilRenderer = "webgl";
    foilDrawRef.current = setView;
    setView(currentX, currentY, true);

    return () => {
      live = false;
      stopSpring();
      foilDrawRef.current = () => {};
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let frame = 0;
    let pending: { x: number; y: number; strength: number } | null = null;
    let visible = true;

    const settle = (immediate = false) => {
      pending = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      card.style.setProperty("--profile-motion", immediate ? "0ms" : "320ms");
      card.style.setProperty("--profile-tilt-x", "0deg");
      card.style.setProperty("--profile-tilt-y", "0deg");
      card.style.setProperty("--profile-foil-x", "0px");
      card.style.setProperty("--profile-foil-y", "0px");
      card.style.setProperty("--profile-foil-opacity", "0.46");
      card.style.setProperty("--profile-hue", "0deg");
      card.style.setProperty("--profile-press", "1");
      foilDrawRef.current(0.38, 0.56, immediate || reducedMotion);
    };

    const applyLight = (x: number, y: number, strength: number) => {
      card.style.setProperty("--profile-motion", "55ms");
      card.style.setProperty("--profile-tilt-x", `${((0.5 - y) * 7 * strength).toFixed(2)}deg`);
      card.style.setProperty("--profile-tilt-y", `${((x - 0.5) * 9 * strength).toFixed(2)}deg`);
      card.style.setProperty("--profile-foil-x", `${((0.5 - x) * 16).toFixed(1)}px`);
      card.style.setProperty("--profile-foil-y", `${((0.5 - y) * 12).toFixed(1)}px`);
      card.style.setProperty("--profile-foil-opacity", `${(0.46 + 0.3 * strength).toFixed(2)}`);
      card.style.setProperty("--profile-hue", `${((x + y - 1) * 20).toFixed(1)}deg`);
      foilDrawRef.current(x, y);
    };

    const queueLight = (x: number, y: number, strength: number) => {
      pending = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), strength };
      if (frame || !visible || document.hidden) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending) return;
        applyLight(pending.x, pending.y, pending.strength);
        pending = null;
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch" || event.pointerType === "pen") return;
      const bounds = card.getBoundingClientRect();
      queueLight((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height, 1);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!reducedMotion && event.pointerType !== "touch" && event.button === 0) card.style.setProperty("--profile-press", "0.985");
    };
    const onPointerUp = () => card.style.setProperty("--profile-press", "1");
    const onPointerLeave = () => settle();
    const onResize = () => settle(true);
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      const x = 0.5 + Math.max(-18, Math.min(18, event.gamma)) / 90;
      const y = 0.5 + Math.max(-24, Math.min(24, event.beta - 45)) / 120;
      queueLight(x, y, 0.48);
    };
    const onVisibilityChange = () => {
      if (document.hidden) settle(true);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) settle(true);
    }, { threshold: 0.01 });
    observer.observe(card);

    card.addEventListener("pointermove", onPointerMove, { passive: true });
    card.addEventListener("pointerleave", onPointerLeave);
    card.addEventListener("pointerdown", onPointerDown, { passive: true });
    card.addEventListener("pointerup", onPointerUp, { passive: true });
    card.addEventListener("pointercancel", onPointerUp, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize, { passive: true });

    const orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    const useOrientation = window.matchMedia("(pointer: coarse)").matches && orientation !== undefined;
    if (!reducedMotion && useOrientation) window.addEventListener("deviceorientation", onOrientation, { passive: true });
    if (reducedMotion) settle(true);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", onPointerLeave);
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("pointerup", onPointerUp);
      card.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      if (useOrientation) window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [reducedMotion]);

  return (
    <div ref={cardRef} className={`${styles.profileTilt} ${compact ? styles.compact : ""}`}>
      <div className={styles.profileLine}>
        <span className={styles.profilePortrait}>
          <Image src="/images/portfolio/lu-avatar.jpg" alt="Lu's illustrated avatar wearing a pink cap" width={72} height={72} priority />
          <canvas ref={foilCanvasRef} className={styles.profileFoilCanvas} width={72} height={72} aria-hidden="true" />
        </span>
        <span className={styles.profileDetails}>
          <span className={styles.profileIdentity}>
            <strong>Lu</strong>
            <span className={styles.profileMeta}>
              <small>@x6c75</small>
              <span aria-hidden="true" />
              <small>United Kingdom</small>
            </span>
          </span>
          <span className={styles.profileStatus}>
            <span><i aria-hidden="true" /> Android at Orchid.ai</span>
            <time>{localTime}</time>
          </span>
        </span>
      </div>
    </div>
  );
}
