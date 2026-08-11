"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FRAME_COUNT = 500;

export function SequenceHero({ onReady }: { onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images] = useState<HTMLImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;

    const R = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (R) {
      onReady();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const currentFrame = (index: number) =>
      `/sequence/frame_${String(index).padStart(3, "0")}.jpg`;

    let lastRenderedIndex = -1;

    const render = (index: number) => {
      if (index === lastRenderedIndex) return; // Skip redundant draws
      const img = images[index];
      if (img && img.complete) {
        // Multiply by 1.15 to slightly zoom in the frame (15% zoom)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * 1.15;
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        lastRenderedIndex = index;
      }
    };

    const seqObj = { frame: 0 };

    const loadQueue = async () => {
      const loadImg = (idx: number) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = currentFrame(idx + 1);
          images[idx] = img;
          img.onload = () => {
            if (seqObj.frame === idx) {
              render(idx);
            }
            resolve(null);
          };
          img.onerror = resolve;
        });
      };

      // Load first frame immediately
      await loadImg(0);
      render(0);
      onReady();

      // Preload the rest in small batches to prevent network/CPU congestion
      const BATCH_SIZE = 8;
      for (let i = 1; i < FRAME_COUNT; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && i + j < FRAME_COUNT; j++) {
          batch.push(loadImg(i + j));
        }
        // Let the main thread breathe
        await new Promise((r) => setTimeout(r, 16)); 
        await Promise.all(batch);
      }
    };
    loadQueue();

    // Smooth pinning using ScrollTrigger instead of manual scroll locking
    const st = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "+=4000", // The scroll distance it takes to play the sequence
      pin: true,
      pinType: "transform", // Fixes position:fixed breaking when ancestor has a CSS transform
      scrub: 0.5, // Small lag for smooth scrubbing
      onUpdate: (self) => {
        // Render the correct frame based on scroll progress
        seqObj.frame = Math.round(self.progress * (FRAME_COUNT - 1));
        render(seqObj.frame);

        // Handle opacity fade out near the end
        const fadeEl = document.getElementById("seq-fade");
        if (fadeEl) {
          let opacity = 0;
          if (self.progress > 0.9) {
            opacity = (self.progress - 0.9) * 10;
          }
          fadeEl.style.opacity = String(opacity);
        }
      },
    });

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      lastRenderedIndex = -1;
      render(seqObj.frame);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
    };
  }, [onReady, images]);

  return (
    <div ref={containerRef} className="relative w-full bg-[#060608] h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <div
        id="seq-fade"
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{ background: "linear-gradient(to bottom, transparent, #060608 90%)" }}
      />
    </div>
  );
}
