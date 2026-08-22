import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "./auth";

const BACKGROUND_IMAGES = [
  "https://wallpaperaccess.com/full/902518.jpg",
  "https://png.pngtree.com/background/20250124/original/pngtree-tropical-sunset-ocean-view-at-cozy-beach-resort-terrace-picture-image_16248681.jpg",
  "https://wallpaperaccess.com/full/259735.jpg",
];

export default function Login() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === BACKGROUND_IMAGES.length - 1 ? 0 : prevIndex + 1,
      );
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Dolphin {
      x = -100;
      y = ctx!.canvas.height * 0.7;
      speed = 2.5;
      angle = 0;

      update() {
        const cWidth = ctx!.canvas.width;
        const cHeight = ctx!.canvas.height;

        this.x += this.speed;
        this.angle += 0.03;
        this.y = cHeight * 0.6 + Math.sin(this.angle) * 40;

        if (this.x > cWidth + 100) {
          this.x = -100;
          this.angle = 0;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = "rgba(147, 197, 253, 0.8)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, Math.sin(this.angle) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-26, -6);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    class Fish {
      x = Math.random() * ctx!.canvas.width;
      y = Math.random() * (ctx!.canvas.height - 100) + 50;
      speed = Math.random() * 1 + 0.5;
      size = Math.random() * 4 + 3;
      color = `rgba(34, 211, 238, ${Math.random() * 0.4 + 0.3})`;

      update() {
        const cWidth = ctx!.canvas.width;
        const cHeight = ctx!.canvas.height;

        this.x -= this.speed;
        if (this.x < -20) {
          this.x = cWidth + 20;
          this.y = Math.random() * (cHeight - 100) + 50;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(
          this.x,
          this.y,
          this.size,
          this.size / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.x + this.size, this.y);
        ctx.lineTo(this.x + this.size + 4, this.y - 3);
        ctx.lineTo(this.x + this.size + 4, this.y + 3);
        ctx.closePath();
        ctx.fill();
      }
    }

    class Bubble {
      x = Math.random() * ctx!.canvas.width;
      y = ctx!.canvas.height + 20;
      speed = Math.random() * 1 + 0.5;
      radius = Math.random() * 3 + 1;

      update() {
        const cWidth = ctx!.canvas.width;
        const cHeight = ctx!.canvas.height;

        this.y -= this.speed;
        this.x += Math.sin(this.y / 20) * 0.3;
        if (this.y < -10) {
          this.y = cHeight + 20;
          this.x = Math.random() * cWidth;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const dolphin = new Dolphin();
    const fishes = Array.from({ length: 12 }, () => new Fish());
    const bubbles = Array.from({ length: 20 }, () => new Bubble());

    const render = () => {
      if (!ctx) return;
      const cWidth = ctx.canvas.width;
      const cHeight = ctx.canvas.height;

      ctx.clearRect(0, 0, cWidth, cHeight);

      const time = Date.now() * 0.002;
      ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= cWidth; x++) {
        const y = Math.sin(x * 0.02 + time) * 8 + 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cWidth, 0);
      ctx.closePath();
      ctx.fill();

      bubbles.forEach((bubble) => {
        bubble.update();
        bubble.draw();
      });

      fishes.forEach((fish) => {
        fish.update();
        fish.draw();
      });

      dolphin.update();
      dolphin.draw();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const user = await loginUser(email, password);
      const role = String(user.role).toLowerCase();
      if (role === "administrator" || role === "admin") navigate("/admin");
      else if (role === "manager") navigate("/manager");
      else if (role === "receptionist") navigate("/receptionist");
      else if (role === "staff") navigate("/staff");
      else setError("Your account does not have a valid role.");
    } catch (error: any) {
      console.error(error);
      setError(error.message || error.code || "Unknown error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">
      {BACKGROUND_IMAGES.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 bg-cover bg-center transform transition-all duration-[2500ms] ease-in-out
            ${index === currentImageIndex ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"}`}
          style={{ backgroundImage: `url('${image}')` }}
        />
      ))}

      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px] z-10"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 relative z-20 border border-white/20 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-0 rounded-2xl"
        />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white text-center tracking-tight drop-shadow-md animate-pulse">
            Resort Management System
          </h1>

          <p className="text-gray-200 text-center mt-1.5 mb-6 text-sm drop-shadow-sm">
            Sign in to your account
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm backdrop-blur-md">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2.5 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2.5 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 mt-2"
            >
              Loginsss
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
