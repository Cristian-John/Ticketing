export interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
    severity: string;
    status: string;
    assignee: string;
    requester: string;
    rating: number | null;
    ratingComment: string | null;
    createdAt: string;
    updatedAt: string;
    dueAt?: string;
    notes?: Note[];
    attachments?: Attachment[];
    ratingRequested?: number;
    userId?: string;
}

export interface Note {
    id: number;
    ticketId: string;
    text: string;
    author: string;
    time: string;
}

export interface Article {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    sortOrder?: number;
}

export interface Attachment {
    id: string;
    ticketId: string;
    filename: string;
    originalname: string;
    size: number;
    uploadedAt: string;
}

export interface UserSession {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    token: string;
}

export interface Stats {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    severe: number;
    critical: number;
    avgRating: string | null;
    rated: number;
}

export interface User {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateUserRequest {
    username: string;
    fullName: string;
    email: string;
    role: string;
    password?: string;
}

export interface UpdateUserRequest {
    username?: string;
    fullName?: string;
    email?: string;
    role?: string;
    active?: boolean;
    password?: string;
}
