"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'cybercrews_jwt_secret_minimum_32_characters_long';
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing token' });
        return;
    }
    const token = auth.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: payload.sub, username: payload.username, isAdmin: payload.isAdmin };
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
function adminMiddleware(req, res, next) {
    if (!req.user?.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}
