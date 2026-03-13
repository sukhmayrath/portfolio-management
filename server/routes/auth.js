import { Router } from 'express';
import { createHash } from 'crypto';
import db from '../db/database.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: { message: 'Username and password required' } });
  
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: { message: 'Invalid credentials' } });
  }
  
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: { message: 'Not authenticated' } });
  const user = db.prepare('SELECT id, username, display_name, email, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  res.json(user);
});

// POST /api/auth/register (admin only)
router.post('/register', (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  const { username, password, display_name, email, role } = req.body;
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: { message: 'Username, password, and display name required' } });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: { message: 'Username already exists' } });
  
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, email, role) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hashPassword(password), display_name, email || '', role || 'Viewer');
  
  const user = db.prepare('SELECT id, username, display_name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// GET /api/auth/users (admin only - list all users)
router.get('/users', (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  const users = db.prepare('SELECT id, username, display_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// PUT /api/auth/users/:id (admin only - update user)
router.put('/users/:id', (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'User not found' } });

  const { display_name, email, role, is_active, password } = req.body;
  const updated = {
    display_name: display_name ?? existing.display_name,
    email: email ?? existing.email,
    role: role ?? existing.role,
    is_active: is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
  };

  if (password) {
    db.prepare('UPDATE users SET display_name=?, email=?, role=?, is_active=?, password_hash=? WHERE id=?')
      .run(updated.display_name, updated.email, updated.role, updated.is_active, hashPassword(password), req.params.id);
  } else {
    db.prepare('UPDATE users SET display_name=?, email=?, role=?, is_active=? WHERE id=?')
      .run(updated.display_name, updated.email, updated.role, updated.is_active, req.params.id);
  }

  const user = db.prepare('SELECT id, username, display_name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

// DELETE /api/auth/users/:id (admin only - soft delete)
router.delete('/users/:id', (req, res) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  // Prevent self-deletion
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: { message: 'Cannot delete your own account' } });
  }
  const result = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'User not found' } });
  res.json({ message: 'User deactivated' });
});

export default router;
