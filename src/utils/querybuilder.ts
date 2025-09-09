import { query as dbQuery } from "../lib/db";

interface QueryConfig {
  searchFields?: string[];
  sortFields?: string[];
  defaultSort?: string;
  countField?: string;
}

interface QueryFilters {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sort_by?: string;
  sort_order?: "ASC" | "DESC";
  is_active?: string | boolean;
  [key: string]: any;
}

interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface QueryResult {
  data: any[];
  pagination: PaginationResult;
}

// Helper function to convert various truthy/falsy values to boolean
function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return Boolean(value);
}

export async function getList(
  baseQuery: string,
  baseParams: (string | number)[],
  filters: QueryFilters,
  config: QueryConfig
): Promise<QueryResult> {
  const {
    page = 1,
    limit = 10,
    search,
    sort_by,
    sort_order = "DESC",
    ...otherFilters
  } = filters;

  // Split the base query to insert WHERE conditions before GROUP BY
  const groupByIndex = baseQuery.toUpperCase().indexOf("GROUP BY");
  let sqlBeforeGroupBy: string;
  let sqlAfterGroupBy: string;

  if (groupByIndex !== -1) {
    sqlBeforeGroupBy = baseQuery.substring(0, groupByIndex).trim();
    sqlAfterGroupBy = baseQuery.substring(groupByIndex).trim();
  } else {
    sqlBeforeGroupBy = baseQuery.trim();
    sqlAfterGroupBy = "";
  }

  const queryParams: (string | number | boolean)[] = [...baseParams];
  let paramIndex: number = baseParams.length + 1;

  // Add filters
  for (const [key, value] of Object.entries(otherFilters)) {
    if (value === undefined || value === null || value === "") continue;

    if (key.includes("_from")) {
      const field = key.replace("_from", "");
      sqlBeforeGroupBy += ` AND ${field} >= $${paramIndex}`;
      queryParams.push(value);
      paramIndex++;
    } else if (key.includes("_to")) {
      const field = key.replace("_to", "");
      sqlBeforeGroupBy += ` AND ${field} <= $${paramIndex}`;
      queryParams.push(value);
      paramIndex++;
    } else if (key.includes("_min")) {
      const field = key.replace("_min", "");
      sqlBeforeGroupBy += ` AND ${field} >= $${paramIndex}`;
      queryParams.push(Number(value));
      paramIndex++;
    } else if (key.includes("_max")) {
      const field = key.replace("_max", "");
      sqlBeforeGroupBy += ` AND ${field} <= $${paramIndex}`;
      queryParams.push(Number(value));
      paramIndex++;
    } else if (key === "is_active") {
      sqlBeforeGroupBy += ` AND is_active = $${paramIndex}`;
      queryParams.push(parseBoolean(value));
      paramIndex++;
    } else {
      sqlBeforeGroupBy += ` AND ${key} = $${paramIndex}`;
      queryParams.push(value);
      paramIndex++;
    }
  }

  // Add search
  if (search && config.searchFields) {
    const searchConditions = config.searchFields.map(
      (field) => `${field} ILIKE $${paramIndex}`
    );
    sqlBeforeGroupBy += ` AND (${searchConditions.join(" OR ")})`;
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  // Reconstruct the full query
  let finalSql = sqlBeforeGroupBy;
  if (sqlAfterGroupBy) {
    finalSql += ` ${sqlAfterGroupBy}`;
  }

  // Add sorting
  // const sortField: string = config.sortFields?.includes(sort_by as string)
  //   ? (sort_by as string)
  //   : config.defaultSort || "created_at";
  // const sortDirection: string =
  //   sort_order?.toUpperCase() === "ASC" ? "ASC" : "DESC";
  // finalSql += ` ORDER BY ${sortField} ${sortDirection}`;

  // Add pagination
  const pageNum: number = Number(page);
  const limitNum: number = Number(limit);
  const offset: number = (pageNum - 1) * limitNum;
  finalSql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  queryParams.push(limitNum, offset);

  // Build count query - reconstruct from base query parts
  let countField = config.countField || ""; // default fallback

  let countSql = sqlBeforeGroupBy.replace(
    /SELECT[\s\S]*?FROM/i,
    `SELECT COUNT(DISTINCT ${countField}) as total FROM`
  );

  try {
    // Execute both queries
    const [dataResult, countResult] = await Promise.all([
      dbQuery(finalSql, queryParams),
      dbQuery(countSql, queryParams.slice(0, -2)), // Remove LIMIT and OFFSET params
    ]);

    const total: number = parseInt(countResult.rows[0].total);
    const totalPages: number = Math.ceil(total / limitNum);

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  } catch (error) {
    console.error("Database query error:", error);
    console.error("SQL:", finalSql);
    console.error("Count SQL:", countSql);
    console.error("Params:", queryParams);
    throw error;
  }
}
