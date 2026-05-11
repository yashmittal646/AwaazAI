import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  opacity: number;
}

const COLORS = ["#818CF8", "#6366F1", "#F59E0B", "#A5B4FC", "#C4B5FD"];
const MAX_DIST = 140;
const COUNT    = 70;

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame     = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialise particles
    particles.current = Array.from({ length: COUNT }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      vx:      (Math.random() - 0.5) * 0.3,
      vy:      (Math.random() - 0.5) * 0.3,
      r:       Math.random() * 1.8 + 0.8,
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = particles.current;

      // Draw connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.12;
            ctx.strokeStyle = `rgba(129,140,248,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
      }

      frame.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {/* Canvas particle network */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.85 }}
      />

      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-left indigo orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: "600px", height: "600px",
            top: "-200px", left: "-150px",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            animation: "orb-drift-1 18s ease-in-out infinite alternate",
          }}
        />
        {/* Bottom-right amber orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: "500px", height: "500px",
            bottom: "-150px", right: "-100px",
            background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 70%)",
            animation: "orb-drift-2 22s ease-in-out infinite alternate",
          }}
        />
        {/* Centre-right soft violet */}
        <div
          className="absolute rounded-full"
          style={{
            width: "400px", height: "400px",
            top: "40%", right: "20%",
            background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
            animation: "orb-drift-3 26s ease-in-out infinite alternate",
          }}
        />
      </div>
    </>
  );
}
