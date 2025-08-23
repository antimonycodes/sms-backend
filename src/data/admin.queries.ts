export const createSessionQuery = `
INSERT INTO school_sessions(school_id,session_name,start_date,end_date,is_active)
VALUES ($1, $2, $3, $4, $5)
RETURNING *
`;

export const deactivateSessionQuery = `
UPDATE school_sessions
SET is_active = false
WHERE school_id = $1
RETURNING *
`;

export const getActiveSessionQuery = `
SELECT * FROM school_sessions
WHERE school_id = $1 AND is_active = true
`;

export const getAllSessionsQuery = `
SELECT *  FROM school_sessions
WHERE school_id = $1
`;

export const deleteSessionQuery = `
DELETE FROM school_sessions 
WHERE id = $1 AND school_id = $2
RETURNING *
`;
