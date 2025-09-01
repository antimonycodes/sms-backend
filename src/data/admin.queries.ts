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

//SCHOOL TERMS

export const createTermQuery = `
INSERT INTO school_terms(school_id,name,is_current)
VALUES ($1, $2, $3)
RETURNING *
`;

export const seedTermsQuery = `
INSERT INTO school_terms (school_id, name, is_current)
VALUES 
  ($1, 'First Term', true),
  ($1, 'Second Term', false),
  ($1, 'Third Term', false)
RETURNING *;
`;

export const getAllTermsQuery = `
SELECT * FROM school_terms
WHERE school_id = $1
`;

export const getTermByIdQuery = `
SELECT * FROM school_terms
WHERE id = $1 AND school_id = $2
`;

export const getActiveTermQuery = `
SELECT * FROM school_terms
WHERE school_id = $1 AND is_current = true
`;

export const activateTermQuery = `
  UPDATE school_terms
  SET is_current = true
  WHERE id = $1 AND school_id = $2
  RETURNING id, name;
`;

export const deactivateTermQuery = `
UPDATE school_terms
SET is_current = false
 AND school_id = $1;
RETURNING *
`;

// CLASS LEVELS
export const createClassLevelQuery = `
INSERT INTO class_levels(school_id,name)
VALUES ($1, $2)
RETURNING *
`;

export const seedClassLevelsQuery = `
INSERT INTO class_levels (school_id, name)
VALUES 
  ($1, 'JSS1'),
  ($1, 'JSS2'),
  ($1, 'JSS3'),
  ($1, 'SS1'),
  ($1, 'SS2'),
  ($1, 'SS3')
RETURNING *;
`;

export const getAllClassLevelsQuery = `
SELECT * FROM class_levels
WHERE school_id = $1
ORDER BY name
`;

export const createClassArmQuery = `
INSERT INTO class_arms(school_id,class_level_id,name)
VALUES($1,$2,$3)
RETURNING *;
`;

export const getAllClassArmsQuery = `
SELECT * from class_arms
WHERE school_id = $1
`;

// SUBJECTS

export const createSubjectQuery = `
INSERT INTO school_subjects(school_id,name,subject_code,category)
VALUES($1,$2,$3,$4)
RETURNING *;
`;

export const getAllSubjectsQuery = `
SELECT 
  ss.id,
  ss.name,
  ss.subject_code,
  ss.category,

  -- Classes linked to this subject
  COALESCE(
    JSON_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', cl.id,
        'name', cl.name
      )
    ) FILTER (WHERE cl.id IS NOT NULL), '[]'
  ) AS classes,

  -- Teachers linked to this subject
  COALESCE(
    JSON_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', t.id,
        'first_name', t.first_name,
        'last_name', t.last_name,
        'email', t.email
      )
    ) FILTER (WHERE t.id IS NOT NULL), '[]'
  ) AS teachers

FROM school_subjects ss
LEFT JOIN class_subject cs 
  ON ss.id = cs.school_subject_id AND ss.school_id = cs.school_id
LEFT JOIN class_levels cl 
  ON cs.class_level_id = cl.id

LEFT JOIN teacher_primary_subjects tps 
  ON ss.id = tps.subject_id AND ss.school_id = tps.school_id
LEFT JOIN teachers t 
  ON tps.teacher_id = t.id AND t.school_id = ss.school_id

WHERE ss.school_id = $1
GROUP BY ss.id
ORDER BY ss.name ASC;

`;

export const editSubjectQuery = `
UPDATE school_subjects
SET name = $2, subject_code = $3, category = $4
WHERE id = $1 AND school_id = $5
RETURNING *;
`;

export const createClassSubjectQuery = `
INSERT INTO class_subject(school_id,class_level_id,school_subject_id,is_compulsory)
VALUES($1,$2,$3,$4)
RETURNING *
`;

//TEACHERS
export const createTeacherQuery = `
INSERT INTO teachers(school_id,employee_id,first_name,last_name,middle_name,email,phone,address,qualification,hire_date,salary,is_active)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
RETURNING *;
`;

export const createTeacherPrimarySubjectQuery = `
INSERT INTO teacher_primary_subjects(school_id,teacher_id,subject_id)
VALUES($1,$2,$3)
RETURNING *;
`;

export const validateSubjectIdsQuery = `
SELECT id FROM school_subjects
WHERE id = ANY($1) AND school_id = $2
`;

export const getTeacherByIdQuery = `
SELECT * FROM teachers
WHERE employee_id = $1 AND school_id = $2
`;

export const getTeacherByEmailQuery = `
SELECT * FROM teachers
WHERE email = $1 AND school_id = $2
`;

export const getAllTeachersQuery = `
  SELECT 
    t.*,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', s.id,
          'name', s.name,
          'code', s.code
        )
      ) FILTER (WHERE s.id IS NOT NULL), '[]'
    ) as primary_subjects
  FROM teachers t
  LEFT JOIN teacher_primary_subjects tps ON t.id = tps.teacher_id
  LEFT JOIN subjects s ON tps.subject_id = s.id AND s.school_id = $1
  WHERE t.school_id = $1
  GROUP BY t.id
  ORDER BY t.created_at DESC
`;

export const getTeacherWithSubjectsQuery = `
  SELECT 
    t.*,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', s.id,
          'name', s.name,
          'code', s.code
        )
      ) FILTER (WHERE s.id IS NOT NULL), '[]'
    ) as primary_subjects
  FROM teachers t
  LEFT JOIN teacher_primary_subjects tps ON t.id = tps.teacher_id
  LEFT JOIN subjects s ON tps.subject_id = s.id AND s.school_id = $1
  WHERE t.id = $2 AND t.school_id = $1
  GROUP BY t.id
`;

export const updateTeacherQuery = `
  UPDATE teachers 
  SET first_name = $3, last_name = $4, middle_name = $5, email = $6, 
      phone = $7, address = $8, qualification = $9, hire_date = $10, 
      salary = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP
  WHERE school_id = $1 AND id = $2
  RETURNING *
`;

export const deleteTeacherQuery = `
  DELETE FROM teachers 
  WHERE id = $1 AND school_id = $2
  RETURNING *
`;

export const deleteTeacherSubjectsQuery = `
  DELETE FROM teacher_primary_subjects 
  WHERE teacher_id = $1 AND school_id = $2
`;

export const getTeacherSubjectsQuery = `
  SELECT 
    s.id,
    s.name,
    s.code
  FROM teacher_primary_subjects tps
  JOIN subjects s ON tps.subject_id = s.id
  WHERE tps.teacher_id = $1 AND tps.school_id = $2
`;

//  for checking active assignments
export const getTeacherActiveAssignmentsQuery = `
  SELECT COUNT(*) as count
  FROM class_teachers ct
  WHERE ct.teacher_id = $1 AND ct.is_active = true
`;

// STUDENTS

export const createStudentQuery = `
INSERT INTO students(school_id,admission_number,first_name,last_name,middle_name,email,phone,date_of_birth,gender,address,state_of_origin,lga,nationality,religion,guardian_name,guardian_phone,guardian_email,guardian_address,guardian_relationship,admission_date,passport_url,is_active)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
RETURNING *;
`;

export const getStudentByEmailQuery = `
SELECT * FROM students
WHERE email = $1 AND school_id = $2
`;

export const getStudentByIdQuery = `
SELECT * FROM students
WHERE id = $1 AND school_id = $2
`;

export const getStudentByAdmissionNumberQuery = `
SELECT * FROM students
WHERE admission_number = $1 AND school_id = $2
`;

export const updateStudentQuery = `
UPDATE students
SET admission_number = $2, first_name = $3, last_name = $4, middle_name = $5, email = $6, phone = $7, date_of_birth = $8, gender = $9, address = $10, state_of_origin = $11, lga = $12, nationality = $13, religion = $14, guardian_name = $15, guardian_phone = $16, guardian_email = $17, guardian_address = $18, guardian_relationship = $19, admission_date = $20, passport_url = $21, is_active = $22
WHERE id = $1 AND school_id = $23
RETURNING *;
`;

export const deleteStudentQuery = `
DELETE FROM students
WHERE id = $1 AND school_id = $2

RETURNING *;
`;
