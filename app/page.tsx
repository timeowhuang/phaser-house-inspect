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
  const [hint, setHint] = useState("寻找房间里微微发光的物品");

  useEffect(() => {
    let game: any;
    let cancelled = false;
    Promise.all([loadScript(PHASER_URL), loadScript(MODEL_VIEWER_URL, true)]).then(() => {
      if (cancelled || !gameRef.current || !window.Phaser) return;
      const Phaser = window.Phaser;
      class RoomScene extends Phaser.Scene {
        create() {
          const w = 1280, h = 720;
          const g = this.add.graphics();
          g.fillGradientStyle(0x272522, 0x272522, 0x0b0d10, 0x0b0d10, 1);
          g.fillRect(0, 0, w, h);
          g.fillStyle(0x17191b); g.fillTriangle(0, 500, w, 500, w, h); g.fillTriangle(0, 500, 0, h, w, h);
          for (let i = 0; i < 11; i++) { g.lineStyle(1, 0x36322c, .5); g.lineBetween(i * 128, 500, w / 2 + (i - 5) * 80, h); }
          g.fillStyle(0x050607); g.fillRect(90, 115, 300, 310); g.lineStyle(12, 0x4b4032); g.strokeRect(90, 115, 300, 310);
          g.fillStyle(0x15212a); g.fillRect(107, 132, 266, 276); g.lineStyle(3, 0x918064, .55); g.lineBetween(240, 132, 240, 408); g.lineBetween(107, 270, 373, 270);
          g.fillStyle(0x383029); g.fillRect(925, 130, 250, 385); g.lineStyle(10, 0x201b17); g.strokeRect(925, 130, 250, 385);
          g.fillStyle(0xb6a57b, .38); g.fillCircle(1135, 327, 8);
          g.fillStyle(0x1c1713); g.fillRect(435, 405, 420, 28); g.fillRect(470, 433, 24, 112); g.fillRect(800, 433, 24, 112);
          g.fillStyle(0x7d6845); g.fillEllipse(650, 397, 70, 22);
          g.fillStyle(0x27231e); g.fillRect(610, 315, 80, 78); g.fillStyle(0xc4ad75, .9); g.fillCircle(650, 340, 16);
          const glow = this.add.circle(650, 345, 58, 0xd7ba73, .07).setInteractive({ useHandCursor: true });
          this.tweens.add({ targets: glow, alpha: .25, scale: 1.18, yoyo: true, repeat: -1, duration: 1400 });
          glow.on("pointerover", () => { glow.setFillStyle(0xe3c47b, .22); setHint("点击检查：来源不明的金属雕像"); });
          glow.on("pointerout", () => { glow.setFillStyle(0xd7ba73, .07); setHint("寻找房间里微微发光的物品"); });
          glow.on("pointerdown", () => setInspectOpen(true));
          this.add.text(52, 48, "THE SILENT HOUSE", { fontFamily: "Georgia", fontSize: "22px", color: "#c5b68c", letterSpacing: 7 });
          this.add.text(54, 80, "书房 · 00:17", { fontFamily: "Arial", fontSize: "14px", color: "#77736a", letterSpacing: 2 });
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
        <div className="controls"><kbd>鼠标</kbd> 探索　<kbd>点击</kbd> 检查物品</div>
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
