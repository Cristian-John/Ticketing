import { ModalsComponent } from '../components/Modals';
import { showToast } from '../components/Toast';
import { articlesAPI } from '../services/api';
import { store } from '../state/store';
import { Article } from '../types';
import { debounce,escapeHTML, formatDate } from '../utils/formatters';
import { clearPortalContent, getPortalContentContainer } from '../utils/portalContent';

export class ArticlesPage {
    private static clientSearchQuery = '';
    private static articleFormInitialized = false;

    public static init(): void {
        this.initArticleModal();
    }

    public static async load(): Promise<void> {
        try {
            const user = store.getState().currentUser;
            const isAdmin = user?.role === 'admin';
            const articles = await articlesAPI.getAll(isAdmin ? undefined : this.clientSearchQuery);
            store.setArticles(articles);
            this.renderArticles(articles);
        } catch (err) {
            console.error('Failed to load KB articles:', err);
        }
    }

    private static getContentContainer(): HTMLElement | null {
        return getPortalContentContainer();
    }

    private static renderArticles(articles: Article[]): void {
        const container = clearPortalContent();
        if (!container) return;

        const user = store.getState().currentUser;
        const isAdmin = user?.role === 'admin';

        if (isAdmin) {
            this.renderAdminArticles(container, articles);
        } else {
            this.renderClientArticles(container, articles);
        }
    }

    private static renderClientArticles(container: HTMLElement, articles: Article[]): void {
        container.innerHTML = `
            <div style="margin-bottom:20px;display:flex;gap:15px;align-items:center;">
                <input type="text" id="kb-search-client" class="search-box" style="flex:1;max-width:400px;"
                    placeholder="Search articles, FAQs..." value="${escapeHTML(this.clientSearchQuery)}">
                <button class="btn btn-primary" id="kb-search-btn" type="button">Search</button>
            </div>
            <div id="kb-client-list" style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;"></div>
        `;

        const list = document.getElementById('kb-client-list');
        if (!list) return;

        if (articles.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <p>No knowledge base articles available.</p>
                </div>
            `;
        } else {
            list.innerHTML = articles
                .map(
                    a => `
                <div class="kb-article-card">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content)}</div>
                </div>
            `,
                )
                .join('');
        }

        this.bindClientSearch();
    }

    private static renderAdminArticles(container: HTMLElement, articles: Article[]): void {
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <div>
                    <p style="color:var(--text-muted);font-size:14px;margin:0">Manage support articles and FAQs</p>
                </div>
                <button class="btn btn-primary" id="btn-new-article" type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Article
                </button>
            </div>
            <div id="kb-admin-list" style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;"></div>
        `;

        const list = document.getElementById('kb-admin-list');
        if (!list) return;

        if (articles.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <p>No knowledge base articles available.</p>
                </div>
            `;
        } else {
            list.innerHTML = articles
                .map(
                    a => `
                <div class="kb-article-card">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content.substring(0, 300))}${a.content.length > 300 ? '...' : ''}</div>
                    <div style="margin-top:12px;color:var(--text-muted);font-size:12px">Author: ${escapeHTML(a.author)}</div>
                </div>
            `,
                )
                .join('');
        }

        document.getElementById('btn-new-article')?.addEventListener('click', () => {
            ModalsComponent.openModal('article-modal');
        });
    }

    private static bindClientSearch(): void {
        const searchInput = document.getElementById('kb-search-client') as HTMLInputElement;
        const searchBtn = document.getElementById('kb-search-btn');

        const performSearch = debounce(async () => {
            this.clientSearchQuery = searchInput?.value.trim() || '';
            const filtered = await articlesAPI.getAll(this.clientSearchQuery);
            store.setArticles(filtered);
            const list = document.getElementById('kb-client-list');
            if (!list) return;

            if (filtered.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📚</div>
                        <p>No matching articles found.</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = filtered
                .map(
                    a => `
                <div class="kb-article-card">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content)}</div>
                </div>
            `,
                )
                .join('');
        }, 300);

        searchInput?.addEventListener('input', performSearch);
        searchBtn?.addEventListener('click', performSearch);
    }

    private static initArticleModal(): void {
        if (this.articleFormInitialized) return;
        this.articleFormInitialized = true;

        const form = document.getElementById('article-form') as HTMLFormElement;
        form?.addEventListener('submit', async e => {
            e.preventDefault();
            const user = store.getState().currentUser;
            const titleInput = document.getElementById('article-title') as HTMLInputElement;
            const categoryInput = document.getElementById('article-category') as HTMLInputElement;
            const contentInput = document.getElementById('article-content') as HTMLTextAreaElement;

            if (!titleInput.value.trim() || !contentInput.value.trim()) {
                showToast('Title and content are required', 'error');
                return;
            }

            try {
                await articlesAPI.create({
                    title: titleInput.value.trim(),
                    category: categoryInput.value.trim() || 'General',
                    content: contentInput.value.trim(),
                    author: user ? user.username : 'Admin',
                });

                showToast('Article created successfully!', 'success');
                form.reset();
                ModalsComponent.closeModal('article-modal');
                await this.load();
            } catch (err: any) {
                showToast(err.message || 'Failed to create article', 'error');
            }
        });
    }
}
