import { createElement } from '../../utils/dom';

export interface BarChartProps {
    data: { label: string; value: number; colorVar?: string }[];
    height?: string;
    showValues?: boolean;
    formatValue?: (v: number) => string;
    onClick?: (item: { label: string; value: number; colorVar?: string }) => void;
}

export class BarChart {
    private element: HTMLElement;

    constructor(private props: BarChartProps) {
        this.element = this.render();
    }

    private render(): HTMLElement {
        const container = createElement('div', { className: 'bar-chart-container fade-in' });
        if (this.props.height) {
            container.style.height = this.props.height;
        }

        const maxVal = Math.max(...this.props.data.map(d => d.value), 1); // Avoid div by 0

        this.props.data.forEach(item => {
            const row = createElement('div', { className: 'bar-chart-row' });
            
            if (this.props.onClick) {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    this.props.onClick!(item);
                });
                row.addEventListener('mouseenter', () => {
                    row.style.opacity = '0.8';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.opacity = '1';
                });
            }

            const label = createElement('div', { className: 'bar-chart-label', textContent: item.label });
            
            const track = createElement('div', { className: 'bar-chart-track' });
            const bar = createElement('div', { className: 'bar-chart-bar' });
            
            // Stagger animation with CSS variable
            const percentage = (item.value / maxVal) * 100;
            bar.style.width = '0%';
            
            // Request animation frame for smooth entry
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    bar.style.width = `${percentage}%`;
                });
            });

            if (item.colorVar) {
                bar.style.backgroundColor = `var(${item.colorVar})`;
            }

            track.appendChild(bar);
            row.appendChild(label);
            row.appendChild(track);

            if (this.props.showValues !== false) {
                const valText = this.props.formatValue ? this.props.formatValue(item.value) : String(item.value);
                const valueEl = createElement('div', { className: 'bar-chart-value', textContent: valText });
                row.appendChild(valueEl);
            }

            container.appendChild(row);
        });

        return container;
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
