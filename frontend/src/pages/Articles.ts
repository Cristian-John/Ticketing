import { SearchIcon } from '../components/common/Icons';
import { ModalsManager } from '../components/modals/ModalsManager';
import { showToast } from '../components/Toast';
import { articlesAPI } from '../services/api';
import { store } from '../state/store';
import { Article } from '../types';
import { handleUIError } from '../utils/errorHandler';
import { debounce,escapeHTML, formatDate } from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class ArticlesPage {
    private static clientSearchQuery = '';
    private static articleFormInitialized = false;

    public static init(): void {
        this.initArticleModal();
    }

    public static async load(): Promise<void> {
        const user = store.getState().currentUser;
        if (!user) return;
        const container = getPortalContentContainer(user.role);
        if (!container) return;

        LoadingManager.registerSkeleton('articles', () => `
            <div style="margin-bottom:20px;display:flex;gap:15px;align-items:center;justify-content:space-between;">
                <div class="skeleton skeleton-btn" style="flex:1;max-width:400px;height:40px;border-radius:8px;"></div>
                <div class="skeleton skeleton-btn" style="width:100px;height:40px;border-radius:8px;"></div>
            </div>
            <div style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;">
                ${Array.from({ length: 3 }).map(() => `
                    <div style="background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); padding: 24px;">
                        <div class="skeleton skeleton-text" style="width: 80px; height: 24px; margin-bottom: 12px; border-radius: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; height: 28px; margin-bottom: 16px;"></div>
                        <div class="skeleton skeleton-text" style="width: 100%; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'articles');
            const isAdmin = user.role === 'admin';
            const articles = await articlesAPI.getAll(isAdmin ? undefined : this.clientSearchQuery);
            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                this.renderArticles(articles);
            });
        } catch (err) {
            handleUIError(err, 'Failed to load knowledge base articles');
        }
    }



    private static renderArticles(articles: Article[]): void {
        const container = getPortalContentContainer(store.getState().currentUser!.role);
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
                <div class="search-box" style="flex:1;max-width:400px;">
                    ${SearchIcon({ size: 14 })}
                    <input type="text" id="kb-search-client" style="width: 100%;"
                        placeholder="Search articles, FAQs..." value="${escapeHTML(this.clientSearchQuery)}">
                </div>
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

        // Prepare container for future administrative actions via event delegation
        list.addEventListener('click', () => {
            // e.g. const editBtn = (e.target as HTMLElement).closest('.btn-edit-article');
        });

        document.getElementById('btn-new-article')?.addEventListener('click', () => {
            ModalsManager.openModal('article-modal');
        });
    }

    private static bindClientSearch(): void {
        const searchInput = document.getElementById('kb-search-client') as HTMLInputElement;
        const searchBtn = document.getElementById('kb-search-btn');

        const performSearch = debounce(async () => {
            this.clientSearchQuery = searchInput?.value.trim() || '';
            const filtered = await articlesAPI.getAll(this.clientSearchQuery);
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
                ModalsManager.closeModal('article-modal');
                await this.load();
            } catch (err: unknown) {
                handleUIError(err, 'Failed to create article');
            }
        });
    }
}
