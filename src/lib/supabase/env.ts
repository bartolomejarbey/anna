function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Chybí ${name} v env. Zkopíruj .env.example do .env.local a doplň hodnoty.`,
    );
  }
  return value;
}

export const supabaseUrl = (): string =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabaseAnonKey = (): string =>
  required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

export const supabaseServiceRoleKey = (): string =>
  required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
