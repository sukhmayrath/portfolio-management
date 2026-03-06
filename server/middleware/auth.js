import { createHmac } from 'crypto';

const SECRET = 'portfolio-mgmt-secret-key-2026';

export function generateToken(user) {
  const payload = JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const payloadB64 = Buffer.from(payload).toString('base64');
  const signature = createHmac('sha256', SECRET).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token) {
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;
  const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('hex');
  if (signature !== expectedSig) return null;
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = { id: decoded.userId, role: decoded.role };
      return next();
    }
  }
  // Allow guest access for development - set default user
  req.user = { id: null, role: 'Viewer' };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }
    next();
  };
}
