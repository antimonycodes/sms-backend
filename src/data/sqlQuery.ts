export const createRoleQuery = `
CREATE TYPE role_type AS 
ENUM('super_admin','admin','teacher','student')
`;
export const createSchoolTable = `
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    logo_url VARCHAR(500),
    subscription_plan VARCHAR(50), -- basic, premium, enterprise
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

export const createSchoolQuery = `
  INSERT INTO schools (name, address, phone, email, logo_url, subscription_plan)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, name, email, subscription_plan, created_at
`;

export const createUserQuery = `
  INSERT INTO users (school_id, first_name, last_name, email, password, role,is_active)
  VALUES ($1, $2, $3, $4, $5, $6,$7)
  RETURNING id, school_id, first_name, last_name, email, role, created_at
`;

export const signinQuery = `
  SELECT 
    u.id,
    u.school_id,
    u.first_name,
    u.last_name,
    u.email,
    u.password,
    u.role,
    u.is_active,
    u.created_at,
    s.name as school_name,
    s.logo_url,
    s.is_active as school_active,
    s.subscription_plan
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE u.email = $1 AND u.is_active = true AND s.is_active = true
`;

export const findSchoolByEmailQuery = `
  SELECT id, name FROM schools WHERE email = $1
`;

export const checkEmailExistsQuery = `
  SELECT id FROM users WHERE email = $1
`;
