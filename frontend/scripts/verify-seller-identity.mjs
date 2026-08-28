// One-off support-case helper: checks Didit's REAL status for a seller's
// most recent identity_verifications session and syncs our DB from it —
// same logic as /api/kyc/status, just triggered from the backend instead
// of requiring the seller to revisit /verificar-identidad themselves.
//
// Usage: node --env-file=.env.local scripts/verify-seller-identity.mjs <sellerEmail>
//        node --env-file=.env.local scripts/verify-seller-identity.mjs <sellerEmail> --force
//
// --force marks identity_verified=true even if Didit hasn't approved it
// yet (use only if you've verified the person some other way — this
// bypasses the actual KYC check).

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const force = process.argv.includes("--force");

if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/verify-seller-identity.mjs <email> [--force]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const diditApiKey = process.env.DIDIT_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const { data: authList, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) throw authError;
  const user = authList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No se encontró ningún usuario con email ${email}.`);
    process.exit(1);
  }

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .select("id, name, identity_verified")
    .eq("user_id", user.id)
    .single();
  if (sellerError || !seller) {
    console.error("No se encontró el vendedor asociado.", sellerError?.message);
    process.exit(1);
  }

  console.log(`Vendedor: ${seller.name} (${seller.id}) — identity_verified actual: ${seller.identity_verified}`);

  const { data: latest, error: latestError } = await admin
    .from("identity_verifications")
    .select("id, session_id, status")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  if (!latest) {
    if (!force) {
      console.log("No tiene ninguna sesión de verificación iniciada. Corré con --force si igual querés marcarlo verificado manualmente.");
      return;
    }
  } else {
    console.log(`Última sesión Didit: ${latest.session_id} — status guardado: ${latest.status}`);

    if (!diditApiKey) {
      console.error("Falta DIDIT_API_KEY en el entorno — no puedo consultar el estado real.");
      process.exit(1);
    }

    const res = await fetch(`https://verification.didit.me/v3/session/${latest.session_id}/decision/`, {
      headers: { "x-api-key": diditApiKey },
    });
    if (!res.ok) {
      console.error(`Didit respondió HTTP ${res.status}`, await res.text().catch(() => ""));
      if (!force) process.exit(1);
    } else {
      const decision = await res.json();
      console.log(`Estado real en Didit: ${decision.status}`);

      if (decision.status === "Approved") {
        await admin.from("identity_verifications").update({ status: "Approved", updated_at: new Date().toISOString() }).eq("id", latest.id);
        await admin.from("sellers").update({ identity_verified: true }).eq("id", seller.id);
        console.log("✅ Didit ya lo había aprobado — sincronizado. identity_verified = true.");
        return;
      }

      if (!force) {
        console.log(`⚠️ Didit todavía NO lo aprobó (status: ${decision.status}). No se modificó nada. Corré de nuevo con --force si querés marcarlo verificado manualmente igual.`);
        return;
      }
    }
  }

  await admin.from("sellers").update({ identity_verified: true }).eq("id", seller.id);
  console.log("⚠️ Marcado como verificado MANUALMENTE (--force), sin confirmación real de Didit.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
