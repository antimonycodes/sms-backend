export const getStudentsInAclassQuery = `
SELECT s.*, se.is_promoted, se.promotion_status
FROM student_enrollments se
INNER JOIN students s ON se.student_id = s.id 
JOIN class_arms ca ON se.class_arm_id = ca.id
JOIN class_levels cl ON ca.class_level_id = cl.id
WHERE ca.id = $1
  AND se.session_id = COALESCE($2, se.session_id)

`;
