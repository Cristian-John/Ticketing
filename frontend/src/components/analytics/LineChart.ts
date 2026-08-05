import { createElement } from '../../utils/dom';

export interface LineChartProps {
    data: { label: string; value: number }[];
    height?: string;
    colorVar?: string;
}

export class LineChart {
    private element: HTMLElement;

    constructor(private props: LineChartProps) {
        this.element = this.render();
    }

    private render(): HTMLElement {
        const container = createElement('div', { className: 'line-chart-container fade-in' });
        container.style.position = 'relative';
        container.style.width = '100%';
        if (this.props.height) {
            container.style.height = this.props.height;
        } else {
            container.style.height = '200px';
        }
        
        if (this.props.data.length === 0) {
            container.innerHTML = '<div class="empty-state">No trend data available.</div>';
            return container;
        }

        const maxVal = Math.max(...this.props.data.map(d => d.value), 1);
        const padding = 20;
        
        // Use a viewBox so the SVG scales automatically
        // We will assume a 400x200 drawing area coordinate system
        const svgW = 400;
        const svgH = 200;
        
        const pts = this.props.data.map((d, i) => {
            const x = padding + (i / Math.max(this.props.data.length - 1, 1)) * (svgW - padding * 2);
            const y = svgH - padding - (d.value / maxVal) * (svgH - padding * 2);
            return `${x},${y}`;
        }).join(' ');
        
        const pathData = `M ${pts}`;
        
        const color = `var(${this.props.colorVar || '--color-primary'})`;

        container.innerHTML = `
            <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" preserveAspectRatio="none">
                <!-- X and Y axis lines if desired, or just the line -->
                <path d="${pathData}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="line-chart-path" />
                ${this.props.data.map((d, i) => {
                    const x = padding + (i / Math.max(this.props.data.length - 1, 1)) * (svgW - padding * 2);
                    const y = svgH - padding - (d.value / maxVal) * (svgH - padding * 2);
                    return `<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="${color}" stroke-width="2"><title>${d.label}: ${d.value}</title></circle>`;
                }).join('')}
            </svg>
            <div style="display: flex; justify-content: space-between; margin-top: 8px; color: var(--color-text-secondary); font-size: 0.75rem;">
                <span>${this.props.data[0]?.label || ''}</span>
                <span>${this.props.data[this.props.data.length - 1]?.label || ''}</span>
            </div>
        `;
        
        // Add a simple entrance animation for the path
        const path = container.querySelector('path');
        if (path) {
            const length = path.getTotalLength();
            path.style.strokeDasharray = `${length}`;
            path.style.strokeDashoffset = `${length}`;
            path.style.transition = 'stroke-dashoffset 1s ease-out';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    path.style.strokeDashoffset = '0';
                });
            });
        }
        
        return container;
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
