"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { Phaser?: any; }
  namespace JSX { interface IntrinsicElements { "model-viewer": any; } }
}

const PHASER_URL = "https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js";
const MODEL_VIEWER_URL = "https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js";

function loadScript(src: string, module = false) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (found) { if (src === PHASER_URL && window.Phaser) resolve(); else found.addEventListener("load", () => resolve(), { once: true }); return; }
    const script = document.createElement("script");
    script.src = src;
    if (module) script.type = "module";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Home() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [inspectOpen, setInspectOpen] = useState(false);

  useEffect(() => {
    let game: any;
    let cancelled = false;
    Promise.all([loadScript(PHASER_URL), loadScript(MODEL_VIEWER_URL, true)]).then(() => {
      if (cancelled || !gameRef.current || !window.Phaser) return;
      const Phaser = window.Phaser;
      class RoomScene extends Phaser.Scene {
        preload() {
          this.load.image("village-chief-bedroom", "/rooms/village-chief-bedroom.png");
          this.load.image("village-chief-ladder", "/rooms/village-chief-ladder.png");
          this.load.image("village-chief-window", "/rooms/village-chief-window.png?v=sunset");
        }
        create() {
          const views = [
            this.add.image(640, 360, "village-chief-window").setDisplaySize(1280, 720).setAlpha(0),
            this.add.image(640, 360, "village-chief-ladder").setDisplaySize(1280, 720).setAlpha(0),
            this.add.image(640, 360, "village-chief-bedroom").setDisplaySize(1280, 720),
          ];
          let currentView = 2;
          const buttonStyle = { fontFamily: "Georgia", fontSize: "72px", color: "#ddd3bd", backgroundColor: "rgba(5,6,7,.42)", padding: { left: 18, right: 18, top: 2, bottom: 8 } };
          const left = this.add.text(34, 310, "‹", buttonStyle).setDepth(5).setInteractive({ useHandCursor: true });
          const right = this.add.text(1178, 310, "›", buttonStyle).setDepth(5);
          const dots = [0, 1, 2].map((i) => this.add.circle(616 + i * 24, 680, 4, 0xd5c6a5, i === currentView ? .9 : .25).setDepth(5));

          const updateControls = () => {
            if (currentView > 0) left.setAlpha(1).setInteractive({ useHandCursor: true }); else left.setAlpha(0).disableInteractive();
            if (currentView < views.length - 1) right.setAlpha(1).setInteractive({ useHandCursor: true }); else right.setAlpha(0).disableInteractive();
            dots.forEach((dot, i) => dot.setAlpha(i === currentView ? .9 : .25));
          };
          const turn = (direction: number) => {
            const next = Phaser.Math.Clamp(currentView + direction, 0, views.length - 1);
            if (next === currentView) return;
            const previous = views[currentView];
            const incoming = views[next].setAlpha(0);
            currentView = next;
            updateControls();
            this.tweens.add({ targets: previous, alpha: 0, duration: 330, ease: "Sine.easeInOut" });
            this.tweens.add({ targets: incoming, alpha: 1, duration: 330, ease: "Sine.easeInOut" });
          };
          left.on("pointerdown", () => turn(-1));
          right.on("pointerdown", () => turn(1));
          this.input.keyboard?.on("keydown-LEFT", () => turn(-1));
          this.input.keyboard?.on("keydown-RIGHT", () => turn(1));
          updateControls();
        }
      }
      game = new Phaser.Game({ type: Phaser.AUTO, parent: gameRef.current, width: 1280, height: 720, backgroundColor: "#090a0c", scene: RoomScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
    });
    return () => { cancelled = true; game?.destroy(true); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setInspectOpen(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="game-shell">
      <div className="game-frame" aria-label="互动书房场景">
        <div ref={gameRef} className="phaser-stage" />
      </div>

      <section className={`inspect ${inspectOpen ? "is-open" : ""}`} aria-hidden={!inspectOpen}>
        <div className="inspect-grain" />
        <button className="close" onClick={() => setInspectOpen(false)} aria-label="关闭道具检视">×</button>
        <div className="item-copy">
          <span className="eyebrow">ARCHIVE ITEM · 001</span>
          <h1>无名访客</h1>
          <p>在书房的旧木桌上发现。金属表面没有氧化，也摸不到任何接缝。</p>
          <div className="rule" />
          <small>拖动旋转 · 滚轮缩放 · ESC 返回</small>
        </div>
        <model-viewer
          class="model"
          src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
          alt="一尊可旋转观察的神秘金属人像"
          camera-controls
          disable-pan
          shadow-intensity="1.4"
          shadow-softness=".8"
          environment-image="neutral"
          exposure="0.65"
          camera-orbit="35deg 75deg 2.4m"
          min-camera-orbit="auto auto 1.6m"
          max-camera-orbit="auto auto 4m"
        />
      </section>
    </main>
  );
}
