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
      `/sequence/frame_${String(index).padStart(3, "0")}.webp`;

    let lastRenderedIndex = -1;
    let renderRequested = false;
    const seqObj = { frame: 0 };

    const render = () => {
      let targetIndex = seqObj.frame;
      
      // If exact frame isn't loaded, find the closest loaded frame to prevent visual freezing
      if (!images[targetIndex] || !images[targetIndex].complete) {
        for (let offset = 1; offset < FRAME_COUNT; offset++) {
          const up = targetIndex + offset;
          const down = targetIndex - offset;
          if (up < FRAME_COUNT && images[up]?.complete) {
            targetIndex = up;
            break;
          }
          if (down >= 0 && images[down]?.complete) {
            targetIndex = down;
            break;
          }
        }
      }

      if (targetIndex === lastRenderedIndex) return; // Skip redundant draws

      const img = images[targetIndex];
      if (img && img.complete) {
        // Multiply by 1.15 to slightly zoom in the frame (15% zoom)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * 1.15;
        // Use Math.round to avoid sub-pixel anti-aliasing rendering costs
        const drawW = Math.round(img.width * scale);
        const drawH = Math.round(img.height * scale);
        const x = Math.round((canvas.width / 2) - (drawW / 2));
        const y = Math.round((canvas.height / 2) - (drawH / 2));

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, drawW, drawH);
        lastRenderedIndex = targetIndex;
      }
    };

    const requestRender = () => {
      if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(() => {
          render();
          renderRequested = false;
        });
      }
    };

    const loadQueue = async () => {
      const loadImg = (idx: number) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = currentFrame(idx + 1);
          images[idx] = img;
          img.onload = () => {
            if (seqObj.frame === idx) {
              requestRender();
            }
            resolve(null);
          };
          img.onerror = resolve;
        });
      };

      // Load first frame immediately
      await loadImg(0);
      requestRender();
      onReady();

      // Phase 1: Sparse load (every 10th frame) so fast scrubbing has visual feedback
      // Browser limits concurrent connections to same host (usually 6), so chunk by 4 to keep UI thread responsive
      let sparseBatch: Promise<unknown>[] = [];
      for (let i = 10; i < FRAME_COUNT; i += 10) {
        sparseBatch.push(loadImg(i));
        if (sparseBatch.length >= 4) {
          await new Promise((r) => setTimeout(r, 10)); 
          await Promise.all(sparseBatch);
          sparseBatch = [];
        }
      }
      if (sparseBatch.length > 0) await Promise.all(sparseBatch);

      // Phase 2: Fill in the remaining frames
      let fullBatch: Promise<unknown>[] = [];
      for (let i = 1; i < FRAME_COUNT; i++) {
        if (i % 10 === 0) continue; // Already loaded in Phase 1
        fullBatch.push(loadImg(i));
        if (fullBatch.length >= 4) {
          await new Promise((r) => setTimeout(r, 10)); 
          await Promise.all(fullBatch);
          fullBatch = [];
        }
      }
      if (fullBatch.length > 0) await Promise.all(fullBatch);
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
        requestRender();

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
      requestRender();
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
