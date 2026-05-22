import { useEffect, useRef, useState } from "react";

// Simplex noise implementation for smooth particle movement
class SimplexNoise {
  constructor() {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    
    let n0, n1, n2;
    
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70 * (n0 + n1 + n2);
  }

  dot(g, x, y) {
    return g[0] * x + g[1] * y;
  }
}

SimplexNoise.prototype.grad3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [1, 0], [-1, 0],
  [0, 1], [0, -1], [0, 1], [0, -1]
];

export default function ParticleBackground() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const noiseRef = useRef(new SimplexNoise());
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const noise = noiseRef.current;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Track mouse position
    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      const particleCount = Math.floor((width * height) / 1500);
      const particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: Math.random() * width,
          baseY: Math.random() * height,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 0.5 + 0.3,
        });
      }
      
      particlesRef.current = particles;
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 0.0015;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      particlesRef.current.forEach((particle) => {
        const noiseScale = 0.001;
        const timeScale = 0.2;
        
        // Base noise movement
        const noiseX = noise.noise2D(
          particle.baseX * noiseScale,
          particle.baseY * noiseScale + time * timeScale
        );
        
        const noiseY = noise.noise2D(
          particle.baseX * noiseScale + time * timeScale,
          particle.baseY * noiseScale
        );
        
        // Mouse influence - particles flow away from mouse
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseRadius = 250;
        const mouseForce = Math.max(0, 1 - distance / mouseRadius);
        
        let finalX = particle.baseX + noiseX * 120;
        let finalY = particle.baseY + noiseY * 120;
        
        // Add mouse repulsion
        if (mouseForce > 0.01) {
          const angle = Math.atan2(dy, dx);
          finalX += Math.cos(angle) * mouseForce * 80;
          finalY += Math.sin(angle) * mouseForce * 80;
        }
        
        particle.x = finalX;
        particle.y = finalY;
        
        // Fade particles toward edges and center (for text space)
        const centerX = width / 2;
        const centerY = height / 2;
        const distFromCenter = Math.sqrt(
          Math.pow(particle.x - centerX, 2) + 
          Math.pow(particle.y - centerY, 2)
        );
        
        const maxDistance = Math.min(width, height) * 0.5;
        const centerFade = Math.max(0, 1 - distFromCenter / maxDistance);
        
        // Edge fade
        const edgeFadeX = Math.min(particle.x / width, 1 - particle.x / width);
        const edgeFadeY = Math.min(particle.y / height, 1 - particle.y / height);
        const edgeFade = Math.min(edgeFadeX, edgeFadeY) * 2;
        
        const alpha = Math.min(centerFade, edgeFade) * 0.7;
        
        if (alpha > 0.02) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(26, 26, 26, ${alpha})`;
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isClient]);

  if (!isClient) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
