export const createStudentRolesQuery = `
INSERT INTO leadership_roles(school_id,name,category)
VALUES($1,$2,$3)
  RETURNING *
`;
export const getAllStudentsRolesQuery = `
SELECT *
FROM leadership_roles
WHERE school_id = $1
`;

export const deleteStudentRolesQuery = `
DELETE FROM leadership_roles
WHERE id = $1 AND school_id = $2
  RETURNING *

`;

export const updateStudentRolesQuery = `
UPDATE leadership_roles
SET name= $3, category = $4
where id = $1 AND school_id = $2
  RETURNING *
`;

export const getAllStudentsLeadershipRolesQuery = `
SELECT sl.id,
       sl.school_id,
       s.id AS student_id,
       s.first_name,
       s.last_name,
       s.middle_name,
       s.passport_url,
       ca.id AS class_arm_id,
       ca.name AS class_arm_name,
       lr.id AS role_id,
       lr.name AS role_name,
       lr.category AS role_category,
       ses.id AS session_id,
       ses.session_name AS session_name,
       t.id AS term_id,
       t.name AS term_name
FROM student_leaderships sl
JOIN students s ON s.id = sl.student_id
JOIN class_arms ca ON ca.id = sl.class_arm_id
JOIN leadership_roles lr ON lr.id = sl.role_id
JOIN school_sessions ses ON ses.id = sl.session_id
JOIN school_terms t ON t.id = sl.term_id
WHERE sl.school_id = $1
  AND sl.session_id = COALESCE($2, (SELECT id FROM school_sessions WHERE school_id = $1 AND is_active = true LIMIT 1))
  AND ($3::int IS NULL OR sl.class_arm_id = $3)
ORDER BY ca.name, s.first_name;
`;

export const createStudentLeadershipRole = `
INSERT INTO student_leaderships(school_id,student_id,role_id,class_arm_id,session_id,term_id)
VALUES($1,$2,$3,$4,$5,$6)
RETURNING *
`;

export const updateStudentLeadershipRole = `
UPDATE student_leaderships
SET student_id = $2,
    role_id = $3,
    class_arm_id = $4,
    session_id = $5,
    term_id = $6
WHERE id = $1 AND school_id = $7
RETURNING *
`;

export const deleteStudentLeadershipRole = `
DELETE FROM student_leaderships
WHERE id = $1 AND school_id = $2
RETURNING *
`;
