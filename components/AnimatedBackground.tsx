'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedBackgroundProps {
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  vrotation: number;
}

/**
 * AnimatedBackground Component - Premium 3D Technology Effect
 * Renderiza:
 * - Gradient animado dinâmico
 * - Blobs flutuantes com parallax
 * - Partículas tecnológicas
 * - Grid 3D com perspectiva
 * - Linhas de conexão interativas
 * - Efeito holograma
 */
export function AnimatedBackground({ className = '' }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [, setUpdate] = useState(0);

  // Inicializar canvas com partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resizar canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inicializar partículas
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        rotation: Math.random() * Math.PI * 2,
        vrotation: (Math.random() - 0.5) * 0.02,
      }));
    };

    initParticles();

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let animationId: number;
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      // Update and draw particles
      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vrotation;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Atração ao mouse (suave)
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 200) {
          const force = (200 - distance) / 200 * 0.01;
          p.vx += (dx / distance) * force;
          p.vy += (dy / distance) * force;

          // Limitar velocidade
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed > 2) {
            p.vx = (p.vx / speed) * 2;
            p.vy = (p.vy / speed) * 2;
          }

          // Aumentar opacidade perto do mouse
          p.opacity = Math.min(0.8, p.opacity + 0.02);
        } else {
          p.opacity *= 0.98;
        }

        // Draw particle como pequeno quadrado/círculo
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(220, 38, 38, ${p.opacity})`;

        ctx.fillStyle = `rgba(220, 38, 38, ${p.opacity})`;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

        // Borda brilhante
        ctx.strokeStyle = `rgba(239, 68, 68, ${p.opacity * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

        ctx.restore();
      });

      // Desenhar conexões entre partículas próximas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.3 * p1.opacity * p2.opacity;
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Parallax effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const parallaxElements = container.querySelectorAll(
        '.blob-primary, .blob-secondary, .blob-tertiary'
      );

      parallaxElements.forEach((element, index) => {
        const speed = 0.5 + index * 0.1;
        (element as HTMLElement).style.transform = `translateY(${scrollY * speed}px)`;
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`page-background ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-100 z-0" />

      {/* Animated Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-70 z-1"
        style={{
          background:
            'linear-gradient(45deg, rgba(255, 255, 255, 0.9), rgba(254, 226, 226, 0.6), rgba(255, 255, 255, 0.85))',
          animation: 'gradientShift 10s ease-in-out infinite',
        }}
      />

      {/* Canvas para partículas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-5"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Floating Blobs */}
      <div className="blob-primary gpu-accelerate" aria-hidden="true" />
      <div className="blob-secondary gpu-accelerate" aria-hidden="true" />
      <div className="blob-tertiary gpu-accelerate" aria-hidden="true" />

      {/* Geometric Shapes */}
      <div className="geometric-shapes gpu-accelerate" aria-hidden="true">
        <div className="shape square" aria-hidden="true" />
        <div className="shape circle" aria-hidden="true" />
        <div className="shape diamond" aria-hidden="true" />
        <div className="shape ring" aria-hidden="true" />
      </div>

      {/* Floating chips */}
      <div className="floating-chip chip-1" aria-hidden="true" />
      <div className="floating-chip chip-2" aria-hidden="true" />
      <div className="floating-chip chip-3" aria-hidden="true" />

      {/* 3D Grid Effect */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-2"
        style={{
          opacity: 0.15,
          filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.3))',
        }}
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="grid3d"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
            patternTransform="skewX(-30) scale(1 0.55)"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(220, 38, 38, 0.2)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid3d)" />
      </svg>

      {/* Radial Glow */}
      <div
        className="absolute inset-0 z-3"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      {/* Tech lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-4"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(220, 38, 38, 0.5)" />
            <stop offset="50%" stopColor="rgba(239, 68, 68, 0.25)" />
            <stop offset="100%" stopColor="rgba(220, 38, 38, 0.5)" />
          </linearGradient>
        </defs>

        {/* Animated lines */}
        <line
          x1="10%"
          y1="20%"
          x2="90%"
          y2="30%"
          stroke="url(#techGradient)"
          strokeWidth="2"
          opacity="0.3"
          style={{
            animation: 'slideLine 8s ease-in-out infinite',
          }}
        />
        <line
          x1="20%"
          y1="80%"
          x2="95%"
          y2="60%"
          stroke="url(#techGradient)"
          strokeWidth="2"
          opacity="0.2"
          style={{
            animation: 'slideLine 10s ease-in-out infinite reverse',
          }}
        />

        {/* Corner tech elements */}
        <g opacity="0.2">
          <circle cx="5%" cy="5%" r="20" stroke="rgba(220, 38, 38, 0.5)" strokeWidth="2" fill="none" />
          <circle cx="5%" cy="5%" r="15" stroke="rgba(220, 38, 38, 0.3)" strokeWidth="1" fill="none" />
          <line x1="5%" y1="5%" x2="15%" y2="15%" stroke="rgba(220, 38, 38, 0.3)" strokeWidth="1" />
        </g>

        <g opacity="0.15">
          <circle cx="95%" cy="95%" r="25" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="2" fill="none" />
          <circle cx="95%" cy="95%" r="18" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="1" fill="none" />
          <line x1="95%" y1="95%" x2="85%" y2="85%" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="1" />
        </g>
      </svg>

      {/* Blur overlay safe zone */}
      <div className="absolute inset-0 z-1 backdrop-blur-3xl opacity-20 pointer-events-none" />
    </div>
  );
}

export default AnimatedBackground;
