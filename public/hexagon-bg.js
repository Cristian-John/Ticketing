/**
 * Animated Hexagonal Grid Background
 * Single global canvas fixed behind all content.
 * Dark hex cells with glowing cyan edges and a subtle center radial glow.
 */
(function () {
  'use strict';

  const GLOW_COLOR = '#00e5ff';
  const HEX_RADIUS = 32;
  const LINE_WIDTH = 0.8;
  const GLOW_LINE_WIDTH = 1.8;
  const CLUSTER_COUNT = 5;
  const CLUSTER_SIZE = 6;
  const CYCLE_DURATION = 5000;
  const FPS_CAP = 24;

  const sqrt3 = Math.sqrt(3);
  const hexW = sqrt3 * HEX_RADIUS;
  const hexH = 2 * HEX_RADIUS;
  const frameInterval = 1000 / FPS_CAP;

  // Create a single global canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'hex-bg-global';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '-1',
    pointerEvents: 'none'
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let cols, rows, hexagons = [], clusters = [], lastFrame = 0;
  let w, h, centerX, centerY, maxDist;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = w / 2;
    centerY = h / 2;
    maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    buildGrid();
    buildClusters();
  }

  function buildGrid() {
    cols = Math.ceil(w / hexW) + 2;
    rows = Math.ceil(h / (hexH * 0.75)) + 2;
    hexagons = [];
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * hexW + (r % 2 !== 0 ? hexW / 2 : 0);
        const y = r * hexH * 0.75;
        hexagons.push({ x, y, glow: 0 });
      }
    }
  }

  function buildClusters() {
    clusters = [];
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      clusters.push(newCluster(Math.random() * CYCLE_DURATION));
    }
  }

  function newCluster(phaseOffset) {
    if (!hexagons.length) return { indices: [], startTime: performance.now() };
    const seed = Math.floor(Math.random() * hexagons.length);
    const indices = [seed];
    const added = new Set([seed]);
    for (let i = 0; i < CLUSTER_SIZE - 1; i++) {
      const base = indices[Math.floor(Math.random() * indices.length)];
      const bx = hexagons[base].x;
      const by = hexagons[base].y;
      let best = -1, bestDist = Infinity;
      for (let j = 0; j < hexagons.length; j++) {
        if (added.has(j)) continue;
        const dx = hexagons[j].x - bx;
        const dy = hexagons[j].y - by;
        const d = dx * dx + dy * dy;
        if (d < bestDist && d < (hexW * 2.5) * (hexW * 2.5)) {
          bestDist = d;
          best = j;
        }
      }
      if (best >= 0) {
        indices.push(best);
        added.add(best);
      }
    }
    return { indices, startTime: performance.now() - (phaseOffset || 0) };
  }

  function hexPath(cx, cy) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + HEX_RADIUS * Math.cos(angle);
      const py = cy + HEX_RADIUS * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);

    // Subtle radial center glow (like the reference image)
    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxDist * 0.85);
    grad.addColorStop(0, 'rgba(0,60,80,0.25)');
    grad.addColorStop(0.35, 'rgba(0,30,40,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Reset glow
    for (let i = 0; i < hexagons.length; i++) hexagons[i].glow = 0;

    // Cluster glow calculation
    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];
      const elapsed = now - cluster.startTime;
      const progress = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;
      const intensity = Math.sin(progress * Math.PI);

      if (elapsed > CYCLE_DURATION) {
        clusters[c] = newCluster(0);
        continue;
      }

      for (let i = 0; i < cluster.indices.length; i++) {
        const idx = cluster.indices[i];
        if (idx < hexagons.length) {
          hexagons[idx].glow = Math.max(hexagons[idx].glow, intensity);
        }
      }
    }

    // Draw hexagons
    for (let i = 0; i < hexagons.length; i++) {
      const hex = hexagons[i];

      // Distance-based edge brightness (brighter near center, like the reference)
      const dx = hex.x - centerX;
      const dy = hex.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = 1 - Math.min(dist / (maxDist * 0.8), 1);
      const baseAlpha = 0.04 + proximity * 0.12;

      // Fill hex cell
      hexPath(hex.x, hex.y);
      ctx.fillStyle = `rgba(6,10,9,${(0.7 + proximity * 0.2).toFixed(2)})`;
      ctx.fill();

      // Base edges (distance-tinted)
      hexPath(hex.x, hex.y);
      ctx.strokeStyle = `rgba(0,180,212,${baseAlpha.toFixed(3)})`;
      ctx.lineWidth = LINE_WIDTH;
      ctx.stroke();

      // Animated glow edges
      if (hex.glow > 0.05) {
        hexPath(hex.x, hex.y);
        const alpha = hex.glow * 0.65;
        ctx.strokeStyle = `rgba(0,229,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = GLOW_LINE_WIDTH;
        ctx.shadowColor = GLOW_COLOR;
        ctx.shadowBlur = 10 * hex.glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  let animId;
  function loop(now) {
    if (now - lastFrame >= frameInterval) {
      lastFrame = now;
      draw(now);
    }
    animId = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { resize(); animId = requestAnimationFrame(loop); });
  } else {
    resize();
    animId = requestAnimationFrame(loop);
  }
})();
