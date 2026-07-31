import { HexagonBackground } from './HexagonBackground';
import { ThemeManager, DesignLanguage } from '../common/theme/ThemeManager';

export class BackgroundRenderer {
    private static initialized = false;
    private static quantumBg: HTMLDivElement | null = null;

    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        HexagonBackground.init();
        this.createQuantumBackground();

        this.updateBackgroundVisibility(ThemeManager.getDesignLanguage());

        window.addEventListener('appearanceChanged', ((e: CustomEvent) => {
            this.updateBackgroundVisibility(e.detail.designLanguage);
        }) as EventListener);
    }

    private static createQuantumBackground(): void {
        const el = document.createElement('div');
        el.id = 'quantum-bg-global';
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-1',
            pointerEvents: 'none',
            backgroundImage: `url('/src/assets/Stream.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: '0',
            transition: 'opacity 0.6s ease'
        });
        document.body.prepend(el);
        this.quantumBg = el;
    }

    private static updateBackgroundVisibility(designLanguage: DesignLanguage): void {
        const hexCanvas = document.getElementById('hex-bg-global');
        
        if (hexCanvas) {
            hexCanvas.style.opacity = designLanguage === 'hexagon-blue' ? '1' : '0';
            hexCanvas.style.transition = 'opacity 0.6s ease';
        }

        if (this.quantumBg) {
            this.quantumBg.style.opacity = designLanguage === 'quantum' ? '0.35' : '0';
        }
    }
}
