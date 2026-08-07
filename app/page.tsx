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
  const [hint] = useState("场景准备完成 · 等待设置互动对象");

  useEffect(() => {
    let game: any;
    let cancelled = false;
    Promise.all([loadScript(PHASER_URL), loadScript(MODEL_VIEWER_URL, true)]).then(() => {
      if (cancelled || !gameRef.current || !window.Phaser) return;
      const Phaser = window.Phaser;
      class RoomScene extends Phaser.Scene {
        preload() {
          this.load.image("village-chief-bedroom", "/rooms/village-chief-bedroom.png");
        }
        create() {
          this.add.image(640, 360, "village-chief-bedroom").setDisplaySize(1280, 720);
          this.add.text(52, 48, "VILLAGE CHIEF'S MANOR", { fontFamily: "Georgia", fontSize: "22px", color: "#c5b68c", letterSpacing: 6 });
          this.add.text(54, 80, "二楼卧室 · 00:17", { fontFamily: "Arial", fontSize: "14px", color: "#8c877b", letterSpacing: 2 });
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
        <div className="hud"><span className="pulse" />{hint}</div>
        <div className="controls"><kbd>下一步</kbd> 指定需要互动的物品</div>
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
