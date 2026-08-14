import { pool } from "../config/db";
import { AppUser } from "../types/domain";

function mapUser(row: any): AppUser {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
  };
}

export async function upsertUserByGoogleId(input: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string | null;
}): Promise<AppUser> {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, name, avatar)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email, name = EXCLUDED.name, avatar = EXCLUDED.avatar
     RETURNING *`,
    [input.googleId, input.email, input.name, input.avatar ?? null]
  );
  return mapUser(rows[0]);
}
