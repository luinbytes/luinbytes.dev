"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocityX: number;
  velocityY: number;
}

const SPAWN_INTERVAL = 80;
const MAX_PARTICLES = 20;

export function CursorTrail() {
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const createParticle = (x: number, y: number): Particle => ({
      x,
      y,
      size: 3 + Math.random() * 3,
      opacity: 0.6,
      velocityX: (Math.random() - 0.5) * 1,
      velocityY: (Math.random() - 0.5) * 1,
    });

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSpawnRef.current < SPAWN_INTERVAL) return;
      if (particlesRef.current.length >= MAX_PARTICLES) return;
      lastSpawnRef.current = now;
      particlesRef.current.push(createParticle(e.clientX, e.clientY));
    };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    const animate = () => {
      if (!mountedRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.opacity -= 0.02;
        p.size *= 0.98;
        return p.opacity > 0;
      });

      if (ctx && canvas) {
        const inkPaperColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--color-paper")
          .trim();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particlesRef.current) {
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = inkPaperColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size / 2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
