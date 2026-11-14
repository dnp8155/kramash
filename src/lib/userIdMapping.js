// ============================================================
// Base44 → Supabase User ID Mapping
// ============================================================
// This mapping connects old Base44 user IDs to new Supabase auth UUIDs.
// Use this when importing data that references user IDs (created_by_id,
// owner_user_id, user_id, etc.) to replace old IDs with new UUIDs.
//
// All users created with temporary password: Kramasha@2026
// Users should change their password after first login.
// ============================================================

export const userIdMapping = {
  "6aa1d57a62a9366a5caa731d": "b38822b1-aacd-432c-8278-512abe5c5d2e", // cegabal186@daugr.com (user)
  "6aa4de1ea4e8b32a50b42f93": "cb9ff012-e106-462d-8681-30aa016c2090", // dipak@gmail.com (user)
  "6aa4de7f2dfa7b0052647098": "aa5ad49d-c98a-48d5-be1c-c0a3629f469f", // krishna14031992@gmail.com (client)
  "6aa8d07f35b5b908b0e013a5": "5218c9ec-dc2e-49ad-ad76-eff71e2dc625", // krishnashahphotography@gmail.com (admin)
  "6aaf575c52962db8edfac7a7": "5f380f76-1b08-4457-87fa-009c69a1131b", // kushagrapurohit11@gmail.com (user)
  "6aa198180e2903037c880388": "22094610-e09a-4fa2-832f-07150161bb94", // ns51@dipakpatel.site (admin)
  "6aa20f283c8081b6ff8205cf": "c4482054-52d4-46c8-a2e6-2c5e6c35edb7", // workatksp@gmail.com (user)
};

// Reverse mapping: Supabase UUID → Base44 ID
export const reverseUserIdMapping = Object.fromEntries(
  Object.entries(userIdMapping).map(([oldId, newId]) => [newId, oldId])
);

// Helper: map old Base44 ID to new Supabase UUID
export function mapUserId(oldId) {
  if (!oldId) return null;
  return userIdMapping[oldId] || oldId;
}

// Helper: map an array of records, replacing user ID fields
export function mapUserIdsInRecord(record, fields = ['created_by_id', 'owner_user_id', 'user_id', 'updated_by_id']) {
  const mapped = { ...record };
  for (const field of fields) {
    if (mapped[field] && userIdMapping[mapped[field]]) {
      mapped[field] = userIdMapping[mapped[field]];
    }
  }
  return mapped;
}

// User details for reference
export const supabaseUsers = [
  { email: "cegabal186@daugr.com", full_name: "cegabal186", role: "user", oldId: "6aa1d57a62a9366a5caa731d", newId: "b38822b1-aacd-432c-8278-512abe5c5d2e" },
  { email: "dipak@gmail.com", full_name: "dipak", role: "user", oldId: "6aa4de1ea4e8b32a50b42f93", newId: "cb9ff012-e106-462d-8681-30aa016c2090" },
  { email: "krishna14031992@gmail.com", full_name: "krishna14031992", role: "client", oldId: "6aa4de7f2dfa7b0052647098", newId: "aa5ad49d-c98a-48d5-be1c-c0a3629f469f" },
  { email: "krishnashahphotography@gmail.com", full_name: "krishnashahphotography", role: "admin", oldId: "6aa8d07f35b5b908b0e013a5", newId: "5218c9ec-dc2e-49ad-ad76-eff71e2dc625" },
  { email: "kushagrapurohit11@gmail.com", full_name: "kushagrapurohit11", role: "user", oldId: "6aaf575c52962db8edfac7a7", newId: "5f380f76-1b08-4457-87fa-009c69a1131b" },
  { email: "ns51@dipakpatel.site", full_name: "ns51", role: "admin", oldId: "6aa198180e2903037c880388", newId: "22094610-e09a-4fa2-832f-07150161bb94" },
  { email: "workatksp@gmail.com", full_name: "workatksp", role: "user", oldId: "6aa20f283c8081b6ff8205cf", newId: "c4482054-52d4-46c8-a2e6-2c5e6c35edb7" },
];

export default userIdMapping;