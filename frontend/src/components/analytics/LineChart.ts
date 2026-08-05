import { createElement } from '../../utils/dom';

export interface LineChartProps {
    data: { label: string; value: number }[];
    secondaryData?: { label: string; value: number }[];
    height?: string;
    colorVar?: string;
    secondaryColorVar?: string;
    legendLabels?: [string, string];
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
        container.style.height = this.props.height || '260px';

        if (this.props.data.length === 0) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); padding: var(--space-xl); text-align: center;">
                    <i data-lucide="trending-up" style="width: 40px; height: 40px; margin-bottom: var(--space-xs); opacity: 0.4;"></i>
                    <p style="margin: 0; font-size: 0.875rem; font-weight: 500;">No trend data available for this period.</p>
                </div>
            `;
            return container;
        }

        const allValues = [...this.props.data.map(d => d.value)];
        if (this.props.secondaryData) {
            allValues.push(...this.props.secondaryData.map(d => d.value));
        }
        const maxVal = Math.max(...allValues, 1);

        const svgW = 600;
        const svgH = 220;
        const padL = 40;
        const padR = 20;
        const padT = 24;
        const padB = 36;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;

        const color = `var(${this.props.colorVar || '--color-primary'})`;
        const color2 = this.props.secondaryColorVar ? `var(${this.props.secondaryColorVar})` : 'var(--color-success)';

        // Build grid lines
        const gridLines: string[] = [];
        const yLabels: string[] = [];
        const gridCount = 4;
        for (let i = 0; i <= gridCount; i++) {
            const y = padT + chartH - (i / gridCount) * chartH;
            const val = Math.round((i / gridCount) * maxVal);
            gridLines.push(`<line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="var(--color-border)" stroke-width="0.75" stroke-dasharray="3 3" opacity="0.6" />`);
            yLabels.push(`<text x="${padL - 8}" y="${y + 4}" fill="var(--color-text-secondary)" font-size="10" font-weight="500" text-anchor="end">${val}</text>`);
        }

        // Helper to build smooth curve path
        const buildPath = (data: { label: string; value: number }[]) => {
            if (data.length === 1) {
                const y = padT + chartH - (data[0].value / maxVal) * chartH;
                const pathD = `M ${padL},${y} L ${padL + chartW},${y}`;
                const areaD = `M ${padL},${y} L ${padL + chartW},${y} L ${padL + chartW},${padT + chartH} L ${padL},${padT + chartH} Z`;
                return { points: [{ x: padL + chartW / 2, y, val: data[0].value, label: data[0].label }], pathD, areaD };
            }

            const points = data.map((d, i) => {
                const x = padL + (i / (data.length - 1)) * chartW;
                const y = padT + chartH - (d.value / maxVal) * chartH;
                return { x, y, val: d.value, label: d.label };
            });

            // Smooth curve using cubic bezier
            let pathD = `M ${points[0].x},${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(points.length - 1, i + 2)];

                const tension = 0.25;
                const cp1x = p1.x + (p2.x - p0.x) * tension;
                const cp1y = p1.y + (p2.y - p0.y) * tension;
                const cp2x = p2.x - (p3.x - p1.x) * tension;
                const cp2y = p2.y - (p3.y - p1.y) * tension;

                pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
            }

            const areaD = `${pathD} L ${points[points.length - 1].x},${padT + chartH} L ${points[0].x},${padT + chartH} Z`;
            return { points, pathD, areaD };
        };

        const primary = buildPath(this.props.data);
        const secondary = this.props.secondaryData ? buildPath(this.props.secondaryData) : null;

        // X axis labels
        const xLabels: string[] = [];
        const totalLabels = Math.min(this.props.data.length, 6);
        for (let i = 0; i < totalLabels; i++) {
            const dataIdx = Math.round((i / Math.max(totalLabels - 1, 1)) * (this.props.data.length - 1));
            const d = this.props.data[dataIdx];
            const x = this.props.data.length === 1
                ? padL + chartW / 2
                : padL + (dataIdx / (this.props.data.length - 1)) * chartW;
            const dateStr = this.formatDate(d.label);
            xLabels.push(`<text x="${x}" y="${padT + chartH + 20}" fill="var(--color-text-secondary)" font-size="10" font-weight="500" text-anchor="middle">${dateStr}</text>`);
        }

        const uniqueId = `chart-${Math.random().toString(36).substring(2, 9)}`;
        const gradId = `lg-p-${uniqueId}`;
        const grad2Id = `lg-s-${uniqueId}`;

        container.innerHTML = `
            <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" preserveAspectRatio="none" style="overflow: visible; display: block;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
                        <stop offset="80%" stop-color="${color}" stop-opacity="0.04"/>
                        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                    </linearGradient>
                    <linearGradient id="${grad2Id}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color2}" stop-opacity="0.25"/>
                        <stop offset="80%" stop-color="${color2}" stop-opacity="0.02"/>
                        <stop offset="100%" stop-color="${color2}" stop-opacity="0"/>
                    </linearGradient>
                    <filter id="glow-${uniqueId}" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                ${gridLines.join('')}
                ${yLabels.join('')}
                ${xLabels.join('')}

                <!-- Secondary area & line -->
                ${secondary?.areaD ? `<path d="${secondary.areaD}" fill="url(#${grad2Id})" class="line-chart-area" />` : ''}
                ${secondary?.pathD ? `<path d="${secondary.pathD}" fill="none" stroke="${color2}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="line-chart-path" />` : ''}

                <!-- Primary area & line -->
                ${primary.areaD ? `<path d="${primary.areaD}" fill="url(#${gradId})" class="line-chart-area" />` : ''}
                ${primary.pathD ? `<path d="${primary.pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="line-chart-path" />` : ''}

                <!-- Secondary data points -->
                ${secondary?.points.map((p, i) => `
                    <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--color-bg-surface)" stroke="${color2}" stroke-width="2" class="line-chart-dot" data-type="sec" data-idx="${i}" />
                `).join('') || ''}

                <!-- Primary data points -->
                ${primary.points.map((p, i) => `
                    <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--color-bg-surface)" stroke="${color}" stroke-width="2.5" class="line-chart-dot" data-type="pri" data-idx="${i}" />
                `).join('')}
            </svg>

            <!-- Floating Tooltip -->
            <div class="chart-tooltip" id="tooltip-${uniqueId}"></div>

            ${this.props.legendLabels ? `
                <div style="display: flex; gap: var(--space-lg); justify-content: center; margin-top: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">
                        <span style="width: 12px; height: 3px; background: ${color}; border-radius: 2px; display: inline-block;"></span>
                        ${this.props.legendLabels[0]}
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary);">
                        <span style="width: 12px; height: 3px; background: ${color2}; border-radius: 2px; display: inline-block;"></span>
                        ${this.props.legendLabels[1]}
                    </div>
                </div>
            ` : ''}
        `;

        // Interactive Tooltip and Hover Handling
        const tooltip = container.querySelector(`#tooltip-${uniqueId}`) as HTMLElement;
        const dots = container.querySelectorAll('.line-chart-dot');

        dots.forEach(dot => {
            dot.addEventListener('mouseenter', (e) => {
                const target = e.currentTarget as SVGCircleElement;
                const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
                const priItem = this.props.data[idx];
                const secItem = this.props.secondaryData ? this.props.secondaryData[idx] : null;

                if (!priItem) return;

                const dateStr = this.formatFullDate(priItem.label);
                let content = `<div class="chart-tooltip-date">${dateStr}</div>`;
                content += `
                    <div class="chart-tooltip-row">
                        <span class="chart-tooltip-key"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span> ${this.props.legendLabels ? this.props.legendLabels[0] : 'Tickets'}</span>
                        <span class="chart-tooltip-val">${priItem.value}</span>
                    </div>
                `;

                if (secItem) {
                    content += `
                        <div class="chart-tooltip-row">
                            <span class="chart-tooltip-key"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${color2}; display: inline-block;"></span> ${this.props.legendLabels ? this.props.legendLabels[1] : 'Resolved'}</span>
                            <span class="chart-tooltip-val">${secItem.value}</span>
                        </div>
                    `;
                }

                tooltip.innerHTML = content;

                const rect = target.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const left = rect.left - containerRect.left + rect.width / 2;
                const top = rect.top - containerRect.top;

                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
                tooltip.classList.add('visible');
            });

            dot.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });

        // Animate path draw-in
        requestAnimationFrame(() => {
            container.querySelectorAll('.line-chart-path').forEach(pathEl => {
                const p = pathEl as SVGPathElement;
                const length = p.getTotalLength();
                p.style.strokeDasharray = `${length}`;
                p.style.strokeDashoffset = `${length}`;
                p.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)';
                requestAnimationFrame(() => {
                    p.style.strokeDashoffset = '0';
                });
            });

            // Fade in area fills
            container.querySelectorAll('.line-chart-area').forEach(areaEl => {
                const a = areaEl as SVGPathElement;
                a.style.opacity = '0';
                a.style.transition = 'opacity 0.7s ease-out 0.3s';
                requestAnimationFrame(() => {
                    a.style.opacity = '1';
                });
            });
        });

        return container;
    }

    private formatDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr.substring(0, 10);
        }
    }

    private formatFullDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
