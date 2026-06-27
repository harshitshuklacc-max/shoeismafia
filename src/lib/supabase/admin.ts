import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { dbQuery } from "./postgres";

let serviceClient: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    if (!serviceClient) {
      serviceClient = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return serviceClient;
  }

  // Fallback: postgres-backed client shim for read operations
  return createPostgresShim();
}

export function createServiceClientSafe(): SupabaseClient | null {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

function createPostgresShim(): SupabaseClient {
  const shim = {
    from: (table: string) => new PostgresQueryBuilder(table),
    storage: {
      from: () => ({
        upload: async () => ({ error: { message: "Storage requires service role key" } }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
  };
  return shim as unknown as SupabaseClient;
}

class PostgresQueryBuilder {
  private table: string;
  private filters: { col: string; op: string; val: unknown }[] = [];
  private orderCol = "created_at";
  private orderAsc = false;
  private limitCount: number | null = null;
  private offsetCount = 0;
  private selectCols = "*";
  private countExact = false;
  private insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private updateData: Record<string, unknown> | null = null;
  private isDelete = false;
  private singleResult = false;
  private maybeSingleResult = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.selectCols = cols;
    if (opts?.count === "exact") this.countExact = true;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "=", val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "!=", val });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ col, op: ">", val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ col, op: ">=", val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ col, op: "<=", val });
    return this;
  }

  or(filter: string) {
    this.filters.push({ col: "__or__", op: "or", val: filter });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? false;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleResult = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.maybeSingleResult = true;
    this.limitCount = 1;
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this.insertData = data;
    return this;
  }

  update(data: Record<string, unknown>) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  private buildWhere(startIndex = 1): { clause: string; params: unknown[] } {
    const params: unknown[] = [];
    const parts: string[] = [];
    let i = startIndex;

    for (const f of this.filters) {
      if (f.op === "or" && typeof f.val === "string") {
        const orParts = f.val.split(",").map((part) => {
          const match = part.trim().match(/^(\w+)\.ilike\.(.+)$/);
          if (match) {
            params.push(`%${match[2].replace(/%/g, "")}%`);
            return `${match[1]} ILIKE $${i++}`;
          }
          return null;
        }).filter(Boolean);
        if (orParts.length) parts.push(`(${orParts.join(" OR ")})`);
      } else {
        params.push(f.val);
        parts.push(`${f.col} ${f.op} $${i++}`);
      }
    }

    return { clause: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
  }

  async then(resolve: (v: unknown) => void) {
    resolve(await this.execute());
  }

  async execute() {
    try {
      if (this.insertData) {
        const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
        const inserted = [];
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = vals.map((_, idx) => `$${idx + 1}`).join(", ");
          const result = await dbQuery(
            `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
            vals
          );
          inserted.push(...result);
        }
        const data = this.singleResult ? inserted[0] : inserted;
        return { data, error: null };
      }

      if (this.updateData) {
        const cols = Object.keys(this.updateData);
        const setParts = cols.map((c, idx) => `${c} = $${idx + 1}`);
        const { clause, params } = this.buildWhere(cols.length + 1);
        const result = await dbQuery(
          `UPDATE ${this.table} SET ${setParts.join(", ")} ${clause} RETURNING *`,
          [...Object.values(this.updateData), ...params]
        );
        return { data: this.singleResult ? result[0] : result, error: null };
      }

      if (this.isDelete) {
        const { clause, params } = this.buildWhere();
        await dbQuery(`DELETE FROM ${this.table} ${clause}`, params);
        return { data: null, error: null };
      }

      const { clause, params } = this.buildWhere();
      let count = 0;
      if (this.countExact) {
        const countRows = await dbQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${this.table} ${clause}`,
          params
        );
        count = parseInt(countRows[0]?.count || "0");
      }

      let sql = `SELECT ${this.selectCols === "*" ? "*" : this.selectCols} FROM ${this.table} ${clause}`;
      sql += ` ORDER BY ${this.orderCol} ${this.orderAsc ? "ASC" : "DESC"}`;
      if (this.limitCount !== null) sql += ` LIMIT ${this.limitCount}`;
      if (this.offsetCount) sql += ` OFFSET ${this.offsetCount}`;

      const data = await dbQuery(sql, params);

      if (this.singleResult || this.maybeSingleResult) {
        if (!data.length && !this.maybeSingleResult) {
          return { data: null, error: { message: "Not found" }, count };
        }
        return { data: data[0] || null, error: null, count };
      }

      return { data, error: null, count };
    } catch (error) {
      return { data: null, error: { message: String(error) }, count: 0 };
    }
  }
}
