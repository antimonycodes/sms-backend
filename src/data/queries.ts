export const createAnnouncementQuery = `
INSERT INTO announcements(school_id,user_id,title,subject)
VALUES($1,$2,$3,$4)
RETURNING *
`;

// export const getAnnouncementsQuery = `
// SELECT * FROM announcements
// WHERE school_id = $1
// LEFT JOIN users ON announcements.user_id = users.id
// `;

export const getAnnouncementsQuery = `
SELECT
a.*,u.first_name, u.last_name
FROM announcements a
 JOIN users  u
    ON a.user_id = u.id
WHERE a.school_id = $1
`;

// export const getAnnouncementsQuery = `
// SELECT
// a.*,
// COALESCE(
//       JSON_AGG(
//         JSON_BUILD_OBJECT(
//           'id', u.id,
// 		  'first_name', u.first_name,
// 		  'last_name', u.last_name
//         )
//       ) FILTER (WHERE u.id IS NOT NULL), '[]'
//     ) as createdby
// FROM announcements a
//  INNER JOIN users  u
//     ON a.user_id = u.id
// WHERE a.school_id = $1
//   GROUP BY a.id
// `;

export const deleteAnnouncementQuery = `
DELETE FROM announcements
WHERE announcements.id = $1
`;
