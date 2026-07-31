/**
 * Animated Quantum Flux Background
 * Generates vertical glowing ribbons/streams of light.
 * Supports interactive parallax based on mouse movement.
 */

export class QuantumBackground {
    private static initialized = false;

    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        const canvas = document.createElement('canvas');
        canvas.id = 'quantum-bg-global';
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-1',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.6s ease'
        });
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let w: number, h: number;
        let lastFrame = performance.now();
        const FPS_CAP = 60;
        const frameInterval = 1000 / FPS_CAP;

        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let currentOffsetX = 0;
        let currentOffsetY = 0;

        document.addEventListener('mousemove', (e) => {
            const dx = (e.clientX / window.innerWidth - 0.5) * 40;
            const dy = (e.clientY / window.innerHeight - 0.5) * 20;
            targetOffsetX = -dx;
            targetOffsetY = -dy;
        });

        const getComputedLight = () => {
            const mode = document.documentElement.getAttribute('data-color-mode');
            if (mode === 'system') return window.matchMedia('(prefers-color-scheme: light)').matches ? 1.0 : 0.0;
            return mode === 'light' ? 1.0 : 0.0;
        };
        
        let themeProgress = getComputedLight();
        let lastThemeTime = performance.now();

        interface Ribbon {
            xOffset: number;
            color: string;
            width: number;
            speed: number;
            frequency1: number;
            frequency2: number;
            amplitude1: number;
            amplitude2: number;
            phase1: number;
            phase2: number;
        }

        let ribbons: Ribbon[] = [];

        function initRibbons() {
            ribbons = [];
            const colors = [
                '255, 191, 0',   // Amber
                '255, 230, 0',   // Yellow-Gold
                '255, 0, 127',   // Magenta
                '255, 120, 0'    // Orange
            ];

            const ribbonCount = 14;
            for (let i = 0; i < ribbonCount; i++) {
                ribbons.push({
                    xOffset: (Math.random() - 0.5) * (w * 0.9),
                    color: colors[Math.floor(Math.random() * colors.length)],
                    width: 15 + Math.random() * 40,
                    // Very slow speeds for elegant flowing
                    speed: 0.0005 + Math.random() * 0.001,
                    frequency1: 0.002 + Math.random() * 0.002,
                    frequency2: 0.001 + Math.random() * 0.003,
                    amplitude1: 50 + Math.random() * 100,
                    amplitude2: 30 + Math.random() * 60,
                    phase1: Math.random() * Math.PI * 2,
                    phase2: Math.random() * Math.PI * 2
                });
            }
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            initRibbons();
        }

        function draw(now: number) {
            ctx!.clearRect(0, 0, w, h);

            currentOffsetX += (targetOffsetX - currentOffsetX) * 0.05;
            currentOffsetY += (targetOffsetY - currentOffsetY) * 0.05;

            const targetLight = getComputedLight();
            const timeDelta = Math.min(now - lastThemeTime, 100); // Cap delta to prevent jumps
            lastThemeTime = now;
            
            const rate = 1 / 300;
            const step = timeDelta * rate;
            if (themeProgress !== targetLight) {
                if (Math.abs(themeProgress - targetLight) < step) {
                    themeProgress = targetLight;
                } else {
                    themeProgress += themeProgress < targetLight ? step : -step;
                }
            }

            const globalAlpha = 1.0 - (themeProgress * 0.5); // Dimmer in light mode

            ctx!.save();
            ctx!.translate(w / 2 + currentOffsetX, currentOffsetY);
            
            // Additive blending for gorgeous glows without expensive shadowBlur
            ctx!.globalCompositeOperation = 'lighter';

            for (let i = 0; i < ribbons.length; i++) {
                const r = ribbons[i];
                r.phase1 -= r.speed * timeDelta;
                r.phase2 -= (r.speed * 1.5) * timeDelta;

                ctx!.beginPath();
                const stepY = 30;
                for (let y = -200; y <= h + 200; y += stepY) {
                    // Double sine wave for organic fluidity
                    const x = r.xOffset 
                            + Math.sin(y * r.frequency1 + r.phase1) * r.amplitude1
                            + Math.sin(y * r.frequency2 + r.phase2) * r.amplitude2;
                    
                    if (y === -200) {
                        ctx!.moveTo(x, y);
                    } else {
                        ctx!.lineTo(x, y);
                    }
                }

                ctx!.lineCap = 'round';
                ctx!.lineJoin = 'round';
                
                const shimmer = 0.6 + Math.sin(now * 0.002 + i) * 0.4;
                const baseAlpha = shimmer * globalAlpha;

                // Draw layered strokes for a bloom effect
                
                // Outer glow
                ctx!.lineWidth = r.width * 2;
                ctx!.strokeStyle = `rgba(${r.color}, ${baseAlpha * 0.1})`;
                ctx!.stroke();

                // Mid glow
                ctx!.lineWidth = r.width;
                ctx!.strokeStyle = `rgba(${r.color}, ${baseAlpha * 0.3})`;
                ctx!.stroke();

                // Inner bright core
                ctx!.lineWidth = r.width * 0.3;
                ctx!.strokeStyle = `rgba(${r.color}, ${baseAlpha * 0.8})`;
                ctx!.stroke();
                
                // Pure white hot center
                ctx!.lineWidth = r.width * 0.1;
                ctx!.strokeStyle = `rgba(255, 255, 255, ${baseAlpha * 0.9})`;
                ctx!.stroke();
            }

            ctx!.restore();
        }

        function loop(now: number) {
            if (now - lastFrame >= frameInterval) {
                draw(now);
                lastFrame = now;
            }
            requestAnimationFrame(loop);
        }

        let resizeTimer: number;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resize, 150);
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { 
                resize(); 
                requestAnimationFrame(loop); 
            });
        } else {
            resize();
            requestAnimationFrame(loop);
        }
    }
}
