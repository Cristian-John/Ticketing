import { StarIcon } from '../common/Icons';

export class RatingModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'rating-modal'; // Intentionally added ID for consistency

        const modal = document.createElement('div');
        modal.className = 'modal glass-card modal-rating';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>
                ${StarIcon({ size: 20 })}
                Rate Support Service
            </h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = `
            <p style="color:var(--text-secondary);font-size:14px;margin:0 0 16px">How would you rate the support you received?</p>
            <div style="display:flex;gap:4px;justify-content:center;margin-bottom:16px">
                <!-- Stars populated by JS -->
            </div>
            <div class="form-group">
                <label for="rating-comment">Comment (Optional)</label>
                <textarea id="rating-comment" rows="3" placeholder="Tell us about your experience..."></textarea>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost">Cancel</button>
                <button type="button" class="btn btn-primary">Submit Rating</button>
            </div>
        `;
        
        modal.appendChild(body);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
