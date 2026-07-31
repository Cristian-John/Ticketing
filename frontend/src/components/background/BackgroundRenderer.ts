import { HexagonBackground } from './HexagonBackground';
import { QuantumBackground } from './QuantumBackground';
import { ThemeManager, DesignLanguage } from '../common/theme/ThemeManager';

export class BackgroundRenderer {
    private static initialized = false;

    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        HexagonBackground.init();
        QuantumBackground.init();

        this.updateBackgroundVisibility(ThemeManager.getDesignLanguage());

        window.addEventListener('appearanceChanged', ((e: CustomEvent) => {
            this.updateBackgroundVisibility(e.detail.designLanguage);
        }) as EventListener);
    }



    private static updateBackgroundVisibility(designLanguage: DesignLanguage): void {
        const hexCanvas = document.getElementById('hex-bg-global');
        
        if (hexCanvas) {
            hexCanvas.style.opacity = designLanguage === 'hexagon-blue' ? '1' : '0';
            hexCanvas.style.transition = 'opacity 0.6s ease';
        }

        const quantumCanvas = document.getElementById('quantum-bg-global');
        if (quantumCanvas) {
            quantumCanvas.style.opacity = designLanguage === 'quantum' ? '1' : '0';
        }
    }
}
