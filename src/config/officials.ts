/**
 * Who counts as a municipal official — the ID basis.
 *
 * A citizen identifies with a mobile number (self-service, anyone can sign up).
 * An official CANNOT self-declare: they must present an employee code that the
 * authority has pre-provisioned here, plus the department access PIN issued with it.
 * Each code maps to exactly one department, which is also the queue they may work on.
 *
 * When the database is live this table becomes `public.official_codes`
 * (see supabase/migrations) and the code is redeemed once via the
 * `redeem_official_code()` security-definer function, which writes the
 * `official` row into `public.user_roles`. Roles are NEVER stored on profiles.
 */
export interface OfficialRecord {
  /** Employee code printed on the BMC ID card. */
  code: string;
  /** Access PIN issued by the department head alongside the code. */
  pin: string;
  name: string;
  designation: string;
  /** Department slug from src/config/authority.ts */
  department: string;
}

export const officialRegistry: OfficialRecord[] = [
  { code: "BMC-EMP-8842", pin: "8842", name: "A. Deshpande", designation: "Junior Engineer", department: "roads" },
  { code: "BMC-EMP-1207", pin: "1207", name: "S. Kulkarni", designation: "Sanitary Inspector", department: "sanitation" },
  { code: "BMC-EMP-4419", pin: "4419", name: "R. Jadhav", designation: "Section Officer", department: "electrical" },
  { code: "BMC-EMP-6630", pin: "6630", name: "M. Pawar", designation: "Assistant Engineer", department: "water" },
  { code: "BMC-EMP-0001", pin: "0001", name: "Control Room", designation: "City Command Centre", department: "all" },
];

export const EMPLOYEE_CODE_PATTERN = /^BMC-EMP-\d{4}$/;

export function lookupOfficial(code: string, pin: string): OfficialRecord | null {
  const normalized = code.trim().toUpperCase();
  return (
    officialRegistry.find((o) => o.code === normalized && o.pin === pin.trim()) ?? null
  );
}
