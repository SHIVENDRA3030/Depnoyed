"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { api, useAuth, navigate, ApiError } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import gsap from "gsap";
import "./login-styles.css";

export function LoginView() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const hydrate = useAuth((s) => s.hydrate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, name, password }),
        });
      }

      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        throw new Error(res.error);
      }

      await hydrate();
      toast.success(mode === "login" ? "Signed in" : "Account created");
      navigate({ name: "dashboard" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  // --- Animation Hooks ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Noise
    const c = document.getElementById('noise') as HTMLCanvasElement;
    if (c) {
      const x = c.getContext('2d');
      if (x) {
        const s = 128;
        c.width = s; c.height = s;
        const img = x.createImageData(s, s);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        c.style.width = '100%'; c.style.height = '100%';
      }
    }

    // Fade in form on mount
    gsap.fromTo(".login-card", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });

    // Subtle background ambient glows
    gsap.to(".ambient-glow-1", {
      x: "2vw",
      y: "2vh",
      duration: 20,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    gsap.to(".ambient-glow-2", {
      x: "-2vw",
      y: "-2vh",
      duration: 18,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, []);

  return (
    <div className="flex min-h-screen bg-[#050505] text-[#d8d4cc] font-sans selection:bg-[#FF6B00]/30 selection:text-white">
      {/* Optional Noise Canvas for texture */}
      <canvas id="noise" className="fixed inset-0 z-[9998] pointer-events-none mix-blend-overlay opacity-30"></canvas>

      {/* Left Panel - Abstract Tech Background */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0a0a0c] border-r border-white/5 items-center justify-center overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#FF6B00]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#FF6B00] rounded-sm shadow-[0_0_20px_rgba(255,107,0,0.4)]"></div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-['Syne'] font-bold text-white tracking-tight">Deployment Engine</h1>
          <p className="text-white/50 mt-4 max-w-md mx-auto text-[15px] font-light">
            Advanced infrastructure control and automated deployment workflows for modern engineering teams.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Nav */}
        <nav className="absolute top-0 w-full flex items-center justify-between p-8 md:px-12">
          {/* Logo only visible on mobile in the right panel since desktop has big left panel */}
          <a href="#/landing" className="lg:hidden flex items-center gap-2 font-['JetBrains_Mono'] text-[13px] font-medium tracking-[0.15em] uppercase text-[#f2f2f2] hover:opacity-80 transition-opacity" onClick={() => navigate({ name: "landing" })}>
            <i className="w-[6px] h-[6px] bg-[#FF6B00]"></i>
            DEPLOYED
          </a>
          {/* Empty div for spacing if logo is hidden on desktop */}
          <div className="hidden lg:block"></div>
          
          <div className="flex items-center gap-6 ml-auto">
            <button className="font-['JetBrains_Mono'] text-[12px] tracking-[0.15em] uppercase text-white/50 hover:text-white transition-colors" onClick={() => setMode("login")}>Log In</button>
            <button className="font-['JetBrains_Mono'] text-[11px] tracking-[0.15em] uppercase text-white/80 border border-white/10 rounded-lg px-5 py-2 hover:bg-white/5 hover:text-white transition-colors" onClick={() => setMode("register")}>Get Started</button>
          </div>
        </nav>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 mt-12 lg:mt-0">
          <div className="login-card w-full max-w-[400px]">
            
            {/* Header */}
            <div className="mb-8 text-left">
              <h2 className="text-[32px] font-bold text-white tracking-tight">
                {mode === "login" ? "Welcome back." : "Create account."}
              </h2>
              <p className="text-[15px] text-gray-400 mt-2 font-light">
                {mode === "login" ? "Enter credentials to access deployment engine." : "Initialize your workspace and start deploying."}
              </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-5">
              {mode === "register" && (
                <div className="flex flex-col">
                  <Label htmlFor="name" className="text-[13px] text-white/70 font-medium mb-2">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="h-[52px] bg-white/[0.03] border-white/10 text-[15px] text-white placeholder:text-white/30 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FF6B00]/20 focus-visible:border-[#FF6B00] hover:border-white/20 transition-all px-4 shadow-sm"
                  />
                </div>
              )}
              
              <div className="flex flex-col">
                <Label htmlFor="email" className="text-[13px] text-white/70 font-medium mb-2">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sys@example.com"
                  className="h-[52px] bg-white/[0.03] border-white/10 text-[15px] text-white placeholder:text-white/30 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FF6B00]/20 focus-visible:border-[#FF6B00] hover:border-white/20 transition-all px-4 shadow-sm"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-[13px] text-white/70 font-medium">Password</Label>
                  {mode === "login" && (
                      <a href="#" className="text-[12px] text-white/40 hover:text-[#FF6B00] transition-colors">Forgot?</a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-[52px] bg-white/[0.03] border-white/10 text-[15px] text-white placeholder:text-white/30 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FF6B00]/20 focus-visible:border-[#FF6B00] hover:border-white/20 transition-all px-4 shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-[52px] mt-2 rounded-lg font-bold text-[14px] bg-[#FF6B00] text-white hover:bg-[#ff7b1a] shadow-[0_0_15px_rgba(255,107,0,0.2)] hover:shadow-[0_4px_25px_rgba(255,107,0,0.4)] transition-all duration-300 flex items-center justify-center group"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center">
                    {mode === "login" ? "INITIALIZE SESSION" : "CREATE INSTANCE"}
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[14px] text-gray-500">
                {mode === "login" ? "No access?" : "Already initialized?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-gray-400 hover:text-white transition-colors ml-1"
                >
                  {mode === "login" ? "Request allocation" : "Authenticate"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
