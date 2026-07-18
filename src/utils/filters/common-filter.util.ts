import { SelectQueryBuilder } from "typeorm";

export interface FilterPayload {
  search?: string;
  status?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: any; // Allow any additional fields
}

export interface RangeFilter {
  column: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  value: string | number;
}

export interface RangeFilterPayload {
  range_filters?: RangeFilter[];
}

export interface HybridFilter {
  value?: any; // Generic value - can be number, string, date, etc.
  operator?:
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "eq"
    | "="
    | "neq"
    | "!="
    | ">"
    | ">="
    | "<"
    | "<="
    | "like"
    | "ilike"
    | "in"
    | "not_in";
  column: string;
  [key: string]: any; // Allow additional properties
}

// Relations filter config: relation alias -> list of filterable columns
export interface RelationsFilterConfig {
  [relationAlias: string]: string[];
}

/**
 * Applies common filtering logic to a TypeORM QueryBuilder
 * @param queryBuilder - The existing QueryBuilder to modify
 * @param filters - Filter payload object
 * @param searchFields - Array of entity fields to search in
 * @param entityAlias - The alias of the main entity (default: 'entity')
 */
export function applyCommonFilters(
  queryBuilder: SelectQueryBuilder<any>,
  filters: FilterPayload,
  searchFields: string[],
  entityAlias: string = "entity",
): void {
  if (!filters || Object.keys(filters).length === 0) {
    return;
  }

  // Apply search filter
  if (filters.search && filters.search.trim() !== "") {
    applySearchFilter(queryBuilder, filters.search, searchFields, entityAlias);
  }

  // Apply equality filters for all other fields except search, date, start_date, end_date
  const excludeFields = ["search", "date", "start_date", "end_date"];
  Object.keys(filters).forEach((field) => {
    if (
      !excludeFields.includes(field) &&
      filters[field] !== undefined &&
      filters[field] !== ""
    ) {
      applyEqualityFilter(queryBuilder, field, filters[field], entityAlias);
    }
  });

  // Apply date filtering
  applyDateFilter(queryBuilder, filters, entityAlias);

  // Apply range filters if provided
  if (filters.range_filters && Array.isArray(filters.range_filters)) {
    applyRangeFilters(queryBuilder, filters.range_filters, entityAlias);
  }
}

/**
 * Applies search filter across multiple fields
 */
function applySearchFilter(
  queryBuilder: SelectQueryBuilder<any>,
  searchTerm: string,
  searchFields: string[],
  entityAlias: string,
): void {
  if (!searchFields || searchFields.length === 0) {
    return;
  }

  const searchConditions = searchFields.map((field) => {
    const fieldPath = field.includes(".") ? field : `${entityAlias}.${field}`;
    return `LOWER(${fieldPath}) LIKE LOWER(:searchTerm)`;
  });

  queryBuilder.andWhere(`(${searchConditions.join(" OR ")})`, {
    searchTerm: `%${searchTerm}%`,
  });
}

/**
 * Applies equality filter for a single field
 */
function applyEqualityFilter(
  queryBuilder: SelectQueryBuilder<any>,
  field: string,
  value: any,
  entityAlias: string,
): void {
  const fieldPath = field.includes(".") ? field : `${entityAlias}.${field}`;
  const paramName = `filter_${field}`;

  queryBuilder.andWhere(`${fieldPath} = :${paramName}`, {
    [paramName]: value,
  });
}

/**
 * Applies equality filters for related entities (relations) based on provided config.
 * - relationsFilter: map of relation alias to array of column names to check in filters payload
 * - filters: plain payload; keys can be either column (e.g., 'email') or namespaced 'relation.column' (e.g., 'donor.email')
 *
 * NOTE: Ensure the calling query has already joined these relations with the same aliases.
 */
export function applyRelationsFilter(
  queryBuilder: SelectQueryBuilder<any>,
  filters: FilterPayload,
  relationsFilter: RelationsFilterConfig,
  entityAlias: string = "entity",
): void {
  if (!filters || !relationsFilter) return;

  // Exclude standard keys handled elsewhere
  const excluded = new Set([
    "search",
    "date",
    "start_date",
    "end_date",
    "range_filters",
  ]);

  Object.entries(relationsFilter).forEach(([relationAlias, columns]) => {
    if (!Array.isArray(columns) || columns.length === 0) return;

    columns.forEach((column) => {
      // Support both plain key ('email') and namespaced key ('donor.email')
      const namespacedKey = `${relationAlias}.${column}`;

      const hasNamespaced =
        Object.prototype.hasOwnProperty.call(filters, namespacedKey) &&
        filters[namespacedKey] !== undefined &&
        filters[namespacedKey] !== "";

      const hasPlain =
        !excluded.has(column) &&
        Object.prototype.hasOwnProperty.call(filters, column) &&
        filters[column] !== undefined &&
        filters[column] !== "";

      if (hasNamespaced) {
        applyEqualityFilter(
          queryBuilder,
          namespacedKey,
          (filters as any)[namespacedKey],
          entityAlias,
        );
      } else if (hasPlain) {
        applyEqualityFilter(
          queryBuilder,
          namespacedKey,
          (filters as any)[column],
          entityAlias,
        );
      }
    });
  });
}

/**
 * Applies search filtering across related entity columns using existing search logic.
 * Provide relation alias -> columns map; this will generate dotted paths (e.g., donor.name)
 * and reuse applySearchFilter for the provided search term.
 */
export function applyRelationsSearch(
  queryBuilder: SelectQueryBuilder<any>,
  searchTerm: string,
  relationsSearch: RelationsFilterConfig,
  entityAlias: string = "entity",
): void {
  if (!searchTerm || !relationsSearch) return;

  const relationSearchFields: string[] = [];
  Object.entries(relationsSearch).forEach(([relationAlias, columns]) => {
    if (!Array.isArray(columns) || columns.length === 0) return;
    columns.forEach((column) => {
      relationSearchFields.push(`${relationAlias}.${column}`);
    });
  });

  if (relationSearchFields.length > 0) {
    applySearchFilter(
      queryBuilder,
      searchTerm,
      relationSearchFields,
      entityAlias,
    );
  }
}

/**
 * Normalizes nested relations filters into namespaced flat map, e.g.:
 * { donor: { name: 'Ali', email: 'a@b.com' } } -> { 'donor.name': 'Ali', 'donor.email': 'a@b.com' }
 * If relationsConfig is provided, only whitelisted columns per relation are included.
 */
export function normalizeRelationsFilters(
  relationsFilters?: Record<string, Record<string, any>>,
  relationsConfig?: RelationsFilterConfig,
): Record<string, any> {
  const normalized: Record<string, any> = {};
  if (!relationsFilters) return normalized;

  Object.entries(relationsFilters).forEach(([alias, cols]) => {
    const allowed = relationsConfig
      ? new Set(relationsConfig[alias] || [])
      : undefined;
    Object.entries(cols || {}).forEach(([col, val]) => {
      if (val === undefined || val === "") return;
      if (allowed && !allowed.has(col)) return;
      normalized[`${alias}.${col}`] = val;
    });
  });

  return normalized;
}

/**
 * Applies date filtering logic
 */
function applyDateFilter(
  queryBuilder: SelectQueryBuilder<any>,
  filters: FilterPayload,
  entityAlias: string,
): void {
  const dateField = `${entityAlias}.date`;

  // If both start_date and end_date are provided
  if (filters.start_date && filters.end_date) {
    queryBuilder.andWhere(`${dateField} BETWEEN :startDate AND :endDate`, {
      startDate: filters.start_date,
      endDate: filters.end_date,
    });
  }
  // If only start_date is provided
  else if (filters.start_date && !filters.end_date) {
    queryBuilder.andWhere(`${dateField} >= :startDate`, {
      startDate: filters.start_date,
    });
  }
  // If only end_date is provided
  else if (filters.end_date && !filters.start_date) {
    queryBuilder.andWhere(`${dateField} <= :endDate`, {
      endDate: filters.end_date,
    });
  }
  // If only date is provided (exact match)
  else if (filters.date) {
    queryBuilder.andWhere(`${dateField} = :exactDate`, {
      exactDate: filters.date,
    });
  }
}

/**
 * Applies range filters with various operators
 */
function applyRangeFilters(
  queryBuilder: SelectQueryBuilder<any>,
  rangeFilters: RangeFilter[],
  entityAlias: string,
): void {
  if (!rangeFilters || rangeFilters.length === 0) {
    return;
  }

  rangeFilters.forEach((filter, index) => {
    const { column, operator, value } = filter;

    // Validate filter
    if (!column || !operator || value === undefined || value === null) {
      console.warn(`Invalid range filter at index ${index}:`, filter);
      return;
    }

    const fieldPath = column.includes(".")
      ? column
      : `${entityAlias}.${column}`;
    const paramName = `range_${column}_${index}`;

    // Map operator to SQL operator
    const sqlOperator = getSqlOperator(operator);
    if (!sqlOperator) {
      console.warn(`Invalid operator: ${operator}`);
      return;
    }

    queryBuilder.andWhere(`${fieldPath} ${sqlOperator} :${paramName}`, {
      [paramName]: value,
    });
  });
}

/**
 * Maps filter operators to SQL operators
 */
function getSqlOperator(operator: string): string | null {
  const operatorMap: Record<string, string> = {
    // Comparison operators
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    eq: "=",
    "=": "=", // Support both 'eq' and '=' for equality
    neq: "!=",
    "!=": "!=", // Support both 'neq' and '!=' for inequality
    // Direct SQL operators
    ">": ">",
    ">=": ">=",
    "<": "<",
    "<=": "<=",
    // String operators
    like: "LIKE",
    ilike: "ILIKE",
    // Array operators
    in: "IN",
    not_in: "NOT IN",
  };

  return operatorMap[operator] || null;
}

/**
 * Applies hybrid filters to a TypeORM QueryBuilder
 * @param queryBuilder - The existing QueryBuilder to modify
 * @param hybridFilters - Array of hybrid filter objects
 * @param entityAlias - The alias of the main entity (default: 'entity')
 */
export function applyHybridFilters(
  queryBuilder: SelectQueryBuilder<any>,
  hybridFilters: HybridFilter[],
  entityAlias: string = "entity",
): void {
  if (!hybridFilters || hybridFilters.length === 0) {
    return;
  }

  hybridFilters.forEach((filter, index) => {
    const { value, operator, column } = filter;

    // Validate required fields
    if (value === undefined || value === null || !operator || !column) {
      console.warn(`Invalid hybrid filter at index ${index}:`, filter);
      return;
    }

    const fieldPath = column.includes(".")
      ? column
      : `${entityAlias}.${column}`;
    const paramName = `hybrid_${column}_${index}`;

    // Map operator to SQL operator
    const sqlOperator = getSqlOperator(operator);
    if (!sqlOperator) {
      console.warn(`Invalid operator: ${operator}`);
      return;
    }

    // Handle different operator types
    if (operator === "like" || operator === "ilike") {
      // For LIKE/ILIKE operators, wrap value with wildcards
      queryBuilder.andWhere(`${fieldPath} ${sqlOperator} :${paramName}`, {
        [paramName]: `%${value}%`,
      });
    } else if (operator === "in" || operator === "not_in") {
      // For IN/NOT IN operators, value should be an array
      if (!Array.isArray(value)) {
        console.warn(`Value for IN/NOT IN operator must be an array:`, value);
        return;
      }
      queryBuilder.andWhere(`${fieldPath} ${sqlOperator} (:...${paramName})`, {
        [paramName]: value,
      });
    } else {
      // For comparison operators (=, >, <, etc.)
      queryBuilder.andWhere(`${fieldPath} ${sqlOperator} :${paramName}`, {
        [paramName]: value,
      });
    }
  });
}

/**
 * Helper function to create a QueryBuilder with common filters applied
 * @param repository - TypeORM Repository
 * @param entityAlias - Alias for the main entity
 * @param filters - Filter payload
 * @param searchFields - Fields to search in
 * @param relations - Optional relations to join
 */
export function createFilteredQuery<T>(
  repository: any,
  entityAlias: string,
  filters: FilterPayload,
  searchFields: string[],
  relations: string[] = [],
): SelectQueryBuilder<T> {
  const queryBuilder = repository.createQueryBuilder(entityAlias);

  // Add relations
  relations.forEach((relation) => {
    queryBuilder.leftJoinAndSelect(`${entityAlias}.${relation}`, relation);
  });

  // Apply common filters
  applyCommonFilters(queryBuilder, filters, searchFields, entityAlias);

  return queryBuilder;
}

//multiselect filters
export function applyMultiselectFilters(
  queryBuilder: SelectQueryBuilder<any>,
  multiselectFilters: any,
  entityAlias: string = "entity",
): void {
  try {
    if (!multiselectFilters || Object.keys(multiselectFilters).length === 0) {
      return;
    }

    // multiselectFilters is an object where key is column name and value is an array of values
    // Example: { columnName: ['1', '2', '3'] }
    Object.keys(multiselectFilters).forEach((column, index) => {
      const value = multiselectFilters[column];

      // Ensure value is an array
      if (!Array.isArray(value) || value.length === 0) {
        return;
      }

      const fieldPath = column.includes(".")
        ? column
        : `${entityAlias}.${column}`;
      const paramName = `multiselect_${column}_${index}`;
      queryBuilder.andWhere(`${fieldPath} IN (:...${paramName})`, {
        [paramName]: value,
      });
    });
  } catch (error) {
    console.error("Error applying multiselect filters:", error);
    throw error;
  }
}
