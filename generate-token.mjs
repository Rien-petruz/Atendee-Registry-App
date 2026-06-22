import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'event-app-jwt-secret-change-in-prod';

// Create a token for admin user
const token = jwt.sign(
  { adminId: 1, email: 'admin@example.com' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('Generated JWT Token:');
console.log(token);
