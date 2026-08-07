"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

interface PhaserNode {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  setDisplaySize(width: number, height: number): this;
  setAlpha(alpha: number): this;
  setDepth(depth: number): this;
  setInteractive(config?: { useHandCursor?: boolean }): this;
  disableInteractive(): this;
  setFillStyle(color: number, alpha?: number): this;
  setStrokeStyle(width?: number, color?: number, alpha?: number): this;
  setScale(scale: number): this;
  on(event: string, callback: () => void): this;
}

interface PhaserSceneApi {
  load: { image(key: string, url: string): void };
  add: {
    image(x: number, y: number, key: string): PhaserNode;
    text(x: number, y: number, text: string, style: object): PhaserNode;
    rectangle(x: number, y: number, width: number, height: number, color: number, alpha?: number): PhaserNode;
    ellipse(x: number, y: number, width: number, height: number, color: number, alpha?: number): PhaserNode;
    container(x: number, y: number, children: PhaserNode[]): PhaserNode;
  };
  tweens: { add(config: Record<string, unknown>): unknown };
  events: { on(event: string, callback: (time: number, delta: number) => void): void };
  input: { keyboard?: { on(event: string, callback: () => void): void } };
}

interface PhaserGameInstance { destroy(removeCanvas?: boolean): void }
interface PhaserRuntime {
  Scene: new () => PhaserSceneApi;
  Game: new (config: Record<string, unknown>) => PhaserGameInstance;
  AUTO: unknown;
  Scale: { FIT: unknown; CENTER_BOTH: unknown };
}

declare global {
  interface Window { Phaser?: PhaserRuntime; }
}

const PHASER_URL = "https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (found) { if (src === PHASER_URL && window.Phaser) resolve(); else found.addEventListener("load", () => resolve(), { once: true }); return; }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Home() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [boxRotation, setBoxRotation] = useState({ x: -18, y: -26 });
  const [boxScale, setBoxScale] = useState(1);
  const boxDrag = useRef({ active: false, pointerId: -1, x: 0, y: 0, rotationX: -18, rotationY: -26 });
  const boxPointers = useRef(new Map<number, { x: number; y: number }>());
  const boxPinch = useRef({ distance: 0, scale: 1 });

  const pointerDistance = () => {
    const points = [...boxPointers.current.values()];
    return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const beginBoxDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    boxPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (boxPointers.current.size > 1) {
      boxDrag.current.active = false;
      boxPinch.current = { distance: pointerDistance(), scale: boxScale };
      return;
    }
    boxDrag.current = { active: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, rotationX: boxRotation.x, rotationY: boxRotation.y };
  };
  const moveBox = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!boxPointers.current.has(event.pointerId)) return;
    boxPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (boxPointers.current.size > 1) {
      const distance = pointerDistance();
      if (boxPinch.current.distance > 0) setBoxScale(Math.max(.72, Math.min(1.42, boxPinch.current.scale * distance / boxPinch.current.distance)));
      return;
    }
    if (!boxDrag.current.active || boxDrag.current.pointerId !== event.pointerId) return;
    const nextX = Math.max(-55, Math.min(35, boxDrag.current.rotationX - (event.clientY - boxDrag.current.y) * .28));
    const nextY = boxDrag.current.rotationY + (event.clientX - boxDrag.current.x) * .38;
    setBoxRotation({ x: nextX, y: nextY });
  };
  const endBoxDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    boxPointers.current.delete(event.pointerId);
    boxDrag.current.active = false;
    if (boxPointers.current.size === 1) {
      const [pointerId, point] = [...boxPointers.current.entries()][0];
      boxDrag.current = { active: true, pointerId, x: point.x, y: point.y, rotationX: boxRotation.x, rotationY: boxRotation.y };
    } else {
      boxPinch.current.distance = 0;
    }
  };
  const zoomBox = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setBoxScale((scale) => Math.max(.72, Math.min(1.42, scale - event.deltaY * .0007)));
  };

  useEffect(() => {
    let game: PhaserGameInstance | undefined;
    let cancelled = false;
    loadScript(PHASER_URL).then(() => {
      if (cancelled || !gameRef.current || !window.Phaser) return;
      const Phaser = window.Phaser;
      class RoomScene extends Phaser.Scene {
        preload() {
          this.load.image("village-chief-bedroom", "/rooms/village-chief-bedroom.png?v=zombie2");
          this.load.image("village-chief-ladder", "/rooms/village-chief-ladder.png?v=roses");
          this.load.image("village-chief-window", "/rooms/village-chief-window.png?v=sunset");
          this.load.image("village-chief-yard", "/rooms/village-chief-yard.png?v=game-reference");
        }
        create() {
          const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
          const views = [
            this.add.image(640, 360, "village-chief-window").setDisplaySize(1280, 720).setAlpha(0),
            this.add.image(640, 360, "village-chief-ladder").setDisplaySize(1280, 720).setAlpha(0),
            this.add.image(640, 360, "village-chief-bedroom").setDisplaySize(1280, 720),
            this.add.image(640, 360, "village-chief-yard").setDisplaySize(1280, 720).setAlpha(0),
          ];
          let currentView = 2;
          const buttonStyle = { fontFamily: "Georgia", fontSize: "72px", color: "#ddd3bd", backgroundColor: "rgba(5,6,7,.42)", padding: { left: 18, right: 18, top: 2, bottom: 8 } };
          const left = this.add.text(34, 310, "‹", buttonStyle).setDepth(5);
          const right = this.add.text(1178, 310, "›", buttonStyle).setDepth(5);
          const down = this.add.text(601, 606, "⌄", buttonStyle).setDepth(5);
          const leftHit = this.add.rectangle(86, 360, coarsePointer ? 172 : 120, coarsePointer ? 260 : 190, 0xffffff, 0).setDepth(6);
          const rightHit = this.add.rectangle(1194, 360, coarsePointer ? 172 : 120, coarsePointer ? 260 : 190, 0xffffff, 0).setDepth(6);
          const downHit = this.add.rectangle(640, 662, coarsePointer ? 300 : 210, coarsePointer ? 116 : 96, 0xffffff, 0).setDepth(6);
          const windowHotspot = this.add.rectangle(555, 215, coarsePointer ? 390 : 320, coarsePointer ? 470 : 400, 0xd7b66d, 0).setDepth(4);
          const jewelryHotspot = this.add.rectangle(477, 292, coarsePointer ? 190 : 104, coarsePointer ? 124 : 58, 0xd7b66d, 0).setDepth(4);
          const dogHotspot = this.add.rectangle(1012, 548, coarsePointer ? 380 : 320, coarsePointer ? 250 : 205, 0xd7b66d, 0).setDepth(4);
          const bedroom = views[2];
          const bedroomBase = { x: bedroom.x, y: bedroom.y, scaleX: bedroom.scaleX, scaleY: bedroom.scaleY };
          let corpseFocused = false;

          const flies = Array.from({ length: 9 }, (_, index) => {
            const leftWing = this.add.ellipse(-2.2, -1, 3.5, 1.5, 0xc7bda4, .42);
            const rightWing = this.add.ellipse(2.2, -1, 3.5, 1.5, 0xc7bda4, .42);
            const body = this.add.ellipse(0, 0, 5.5, 2.5, 0x0c0a08, 1);
            return this.add.container(640, 360, [leftWing, rightWing, body]).setDepth(12).setAlpha(0).setScale(.8 + index % 3 * .16);
          });
          let flyClock = 0;
          this.events.on("update", (_time: number, delta: number) => {
            if (!corpseFocused) return;
            flyClock += delta * .001;
            flies.forEach((fly, index) => {
              const phase = flyClock * (1.35 + index % 4 * .22) + index * 1.91;
              const radiusX = 62 + index % 3 * 34;
              const radiusY = 27 + index % 4 * 13;
              fly.x = 650 + Math.cos(phase) * radiusX + Math.sin(phase * 2.6) * 13;
              fly.y = 360 + Math.sin(phase * 1.55) * radiusY + Math.cos(phase * 3.1) * 9;
              fly.rotation = phase * 1.7;
            });
          });

          const updateControls = () => {
            [left, right, down, leftHit, rightHit, downHit].forEach((button) => button.setAlpha(0).disableInteractive());
            [windowHotspot, jewelryHotspot, dogHotspot].forEach((hotspot) => hotspot.disableInteractive().setFillStyle(0xd7b66d, 0).setStrokeStyle(0));
            if (corpseFocused) {
              down.setAlpha(1);
              downHit.setAlpha(1).setInteractive({ useHandCursor: true });
              return;
            }
            if (currentView === 2) {
              left.setAlpha(1);
              down.setAlpha(1);
              leftHit.setAlpha(1).setInteractive({ useHandCursor: true });
              downHit.setAlpha(1).setInteractive({ useHandCursor: true });
              jewelryHotspot.setInteractive({ useHandCursor: true });
              dogHotspot.setInteractive({ useHandCursor: true });
            } else if (currentView === 1) {
              right.setAlpha(1);
              rightHit.setAlpha(1).setInteractive({ useHandCursor: true });
            } else if (currentView === 0) {
              down.setAlpha(1);
              downHit.setAlpha(1).setInteractive({ useHandCursor: true });
              windowHotspot.setInteractive({ useHandCursor: true });
            } else {
              down.setAlpha(1);
              downHit.setAlpha(1).setInteractive({ useHandCursor: true });
            }
          };
          const openCorpse = () => {
            if (currentView !== 2 || corpseFocused) return;
            corpseFocused = true;
            updateControls();
            const zoom = 1.86;
            const dogX = 1012;
            const dogY = 548;
            flies.forEach((fly) => this.tweens.add({ targets: fly, alpha: .9, duration: 260, delay: Math.random() * 180 }));
            this.tweens.add({
              targets: bedroom,
              x: 640 - (dogX - 640) * zoom,
              y: 360 - (dogY - 360) * zoom,
              scaleX: bedroomBase.scaleX * zoom,
              scaleY: bedroomBase.scaleY * zoom,
              duration: 620,
              ease: "Sine.easeInOut",
            });
          };
          const closeCorpse = () => {
            if (!corpseFocused) return;
            corpseFocused = false;
            flies.forEach((fly) => fly.setAlpha(0));
            this.tweens.add({ targets: bedroom, ...bedroomBase, duration: 520, ease: "Sine.easeInOut" });
            updateControls();
          };
          const turn = (next: number) => {
            if (next === currentView) return;
            const previous = views[currentView];
            const incoming = views[next].setAlpha(0);
            currentView = next;
            updateControls();
            this.tweens.add({ targets: previous, alpha: 0, duration: 330, ease: "Sine.easeInOut" });
            this.tweens.add({ targets: incoming, alpha: 1, duration: 330, ease: "Sine.easeInOut" });
          };
          leftHit.on("pointerdown", () => currentView === 2 && turn(1));
          rightHit.on("pointerdown", () => currentView === 1 && turn(2));
          downHit.on("pointerdown", () => corpseFocused ? closeCorpse() : currentView === 2 ? turn(0) : currentView === 0 ? turn(2) : currentView === 3 && turn(0));
          windowHotspot.on("pointerover", () => currentView === 0 && windowHotspot.setFillStyle(0xd7b66d, .045).setStrokeStyle(2, 0xd7b66d, .55));
          windowHotspot.on("pointerout", () => windowHotspot.setFillStyle(0xd7b66d, 0).setStrokeStyle(0));
          windowHotspot.on("pointerdown", () => currentView === 0 && turn(3));
          jewelryHotspot.on("pointerover", () => currentView === 2 && !corpseFocused && jewelryHotspot.setFillStyle(0x9f2030, .1).setStrokeStyle(2, 0xd7b66d, .62));
          jewelryHotspot.on("pointerout", () => jewelryHotspot.setFillStyle(0xd7b66d, 0).setStrokeStyle(0));
          jewelryHotspot.on("pointerdown", () => {
            if (currentView !== 2 || corpseFocused) return;
            setBoxRotation({ x: -18, y: -26 });
            setBoxScale(1);
            setInspectOpen(true);
          });
          dogHotspot.on("pointerover", () => currentView === 2 && !corpseFocused && dogHotspot.setFillStyle(0x4f311f, .055).setStrokeStyle(2, 0x8d7652, .42));
          dogHotspot.on("pointerout", () => dogHotspot.setFillStyle(0xd7b66d, 0).setStrokeStyle(0));
          dogHotspot.on("pointerdown", openCorpse);
          this.input.keyboard?.on("keydown-LEFT", () => currentView === 2 && turn(1));
          this.input.keyboard?.on("keydown-RIGHT", () => currentView === 1 && turn(2));
          this.input.keyboard?.on("keydown-DOWN", () => corpseFocused ? closeCorpse() : currentView === 2 ? turn(0) : currentView === 0 ? turn(2) : currentView === 3 && turn(0));
          this.input.keyboard?.on("keydown-ENTER", () => currentView === 0 && turn(3));
          this.input.keyboard?.on("keydown-ESC", () => corpseFocused ? closeCorpse() : currentView === 3 && turn(0));
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
      <div className="mobile-hint" aria-hidden="true">
        <span>横屏体验更佳</span>
        <span>点击箭头移动 · 点击物品查看</span>
      </div>

      <section className={`inspect ${inspectOpen ? "is-open" : ""}`} aria-hidden={!inspectOpen}>
        <div className="inspect-grain" />
        <button className="close" onClick={() => setInspectOpen(false)} aria-label="关闭道具检视">×</button>
        <div className="item-copy">
          <span className="eyebrow">ARCHIVE ITEM · 001</span>
          <h1>红锦珠宝盒</h1>
          <p>厚重的长方形盒身包覆着暗红锦绸，金色锁扣没有钥匙孔。里面似乎有什么东西正在轻轻晃动。</p>
          <div className="rule" />
          <small>拖动旋转 · 双指或滚轮缩放 · ESC / × 返回</small>
        </div>
        <div
          className="jewel-stage"
          onPointerDown={beginBoxDrag}
          onPointerMove={moveBox}
          onPointerUp={endBoxDrag}
          onPointerCancel={endBoxDrag}
          onWheel={zoomBox}
          aria-label="可拖动旋转观察的红锦珠宝盒"
        >
          <div className="jewel-shadow" />
          <div className="jewel-box-3d" style={{ transform: `scale(${boxScale}) rotateX(${boxRotation.x}deg) rotateY(${boxRotation.y}deg)` }}>
            <div className="jewel-face jewel-front"><span className="jewel-clasp" /></div>
            <div className="jewel-face jewel-back" />
            <div className="jewel-face jewel-left" />
            <div className="jewel-face jewel-right" />
            <div className="jewel-face jewel-top"><span className="jewel-crest">✦</span></div>
            <div className="jewel-face jewel-bottom" />
          </div>
        </div>
      </section>
    </main>
  );
}
