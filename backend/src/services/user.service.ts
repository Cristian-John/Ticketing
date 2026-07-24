import { db } from '../config/db';
import { User } from '../types';
import bcrypt from 'bcryptjs';

// Prepared statements for user service
const stmts = {
    getUserById: db.prepare(`SELECT id, username, fullName, email, role, active, createdAt, updatedAt FROM users WHERE id = ?`),
    getUserByUsername: db.prepare(`SELECT id, username, fullName, email, password, role, active, createdAt, updatedAt FROM users WHERE username = ?`),
    getUserByEmail: db.prepare(`SELECT id, username, fullName, email, password, role, active, createdAt, updatedAt FROM users WHERE email = ?`),
    getAllUsers: db.prepare(`SELECT id, username, fullName, email, role, active, createdAt, updatedAt FROM users ORDER BY createdAt DESC`),
    insertUser: db.prepare(`
        INSERT INTO users (id, username, fullName, email, password, role, active, createdAt, updatedAt)
        VALUES (@id, @username, @fullName, @email, @password, @role, @active, @createdAt, @updatedAt)
    `),
    deactivateUser: db.prepare(`UPDATE users SET active = 0, updatedAt = ? WHERE id = ?`),
    activateUser: db.prepare(`UPDATE users SET active = 1, updatedAt = ? WHERE id = ?`),
    updatePassword: db.prepare(`UPDATE users SET password = ?, updatedAt = ? WHERE id = ?`),
    getUsersByRole: db.prepare(`SELECT id, username, fullName, email, role, active, createdAt, updatedAt FROM users WHERE role = ?`),
};

export class UserService {
    public static validatePasswordStrength(password: string): boolean {
        if (!password || password.length < 8) return false;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        return hasLetter && hasNumber;
    }

    public static getAll(filters: { search?: string } = {}): User[] {
        let users = stmts.getAllUsers.all() as User[];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            users = users.filter(u =>
                u.username.toLowerCase().includes(q) ||
                u.fullName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
            );
        }
        return users;
    }

    public static getActiveByRole(role: string): User[] {
        const users = stmts.getUsersByRole.all(role) as User[];
        // Filter active status (SQLite stores as 0 or 1)
        return users.filter(u => Number(u.active) === 1);
    }

    public static getById(id: string): User | null {
        return stmts.getUserById.get(id) as User | null;
    }

    public static getByUsername(username: string): (User & { password?: string }) | null {
        return stmts.getUserByUsername.get(username) as (User & { password?: string }) | null;
    }

    public static getByEmail(email: string): (User & { password?: string }) | null {
        return stmts.getUserByEmail.get(email) as (User & { password?: string }) | null;
    }

    public static create(userData: Omit<User, 'id' | 'active'> & { id?: string; passwordPlain: string }): User {
        if (!this.validatePasswordStrength(userData.passwordPlain)) {
            throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
        }

        // Check duplicates
        const dupUser = this.getByUsername(userData.username);
        if (dupUser) throw new Error('Username is already taken.');
        const dupEmail = this.getByEmail(userData.email);
        if (dupEmail) throw new Error('Email is already registered.');

        const id = userData.id || `USR-${Date.now()}`;
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(userData.passwordPlain, salt);
        const now = new Date().toISOString();

        const userRecord = {
            id,
            username: userData.username.trim(),
            fullName: userData.fullName.trim(),
            email: userData.email.trim().toLowerCase(),
            password: passwordHash,
            role: userData.role,
            active: 1,
            createdAt: now,
            updatedAt: now
        };

        stmts.insertUser.run(userRecord);

        return {
            id,
            username: userRecord.username,
            fullName: userRecord.fullName,
            email: userRecord.email,
            role: userRecord.role,
            active: true,
            createdAt: now,
            updatedAt: now
        };
    }

    public static update(id: string, updateData: Partial<User>): User | null {
        const existing = this.getById(id);
        if (!existing) return null;

        const allowed: (keyof User)[] = ['fullName', 'email', 'role', 'active'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

        for (const key of allowed) {
            if (updateData[key] !== undefined) {
                // Handle boolean conversion to number for SQLite
                const val = key === 'active' ? (updateData[key] ? 1 : 0) : updateData[key];
                setClauses.push(`${key} = @${key}`);
                values[key] = val;
            }
        }

        if (setClauses.length > 0) {
            setClauses.push('updatedAt = @updatedAt');
            values.updatedAt = new Date().toISOString();
            values.id = id;

            const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = @id`;
            db.prepare(sql).run(values);
        }

        return this.getById(id);
    }

    public static deactivate(id: string): boolean {
        const existing = this.getById(id);
        if (!existing) return false;
        stmts.deactivateUser.run(new Date().toISOString(), id);
        return true;
    }

    public static resetPassword(id: string, passwordPlain: string): boolean {
        const existing = this.getById(id);
        if (!existing) return false;

        if (!this.validatePasswordStrength(passwordPlain)) {
            throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(passwordPlain, salt);
        stmts.updatePassword.run(hashedPassword, new Date().toISOString(), id);
        return true;
    }
}
