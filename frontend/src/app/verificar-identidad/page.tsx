"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Same "not a bare relative path" guard as login/page.tsx's getSafeRedirect.
function getSafeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function VerifyIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNext(searchParams.get("next"));

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const returningFromDidit = searchParams.get("kyc") === "return";

  const checkStatus = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      router.push("/login?redirect=" + encodeURIComponent("/verificar-identidad"));
      return;
    }
    const { data: seller } = await supabase
      .from("sellers")
      .select("identity_verified")
      .eq("user_id", uid)
      .single();

    if (seller?.identity_verified) {
      setVerified(true);
      router.push(nextPath);
      return;
    }

    // Not verified in our DB yet — double-check with Didit directly in case
    // the "status.updated" webhook for the final decision never arrived
    // (this is what left sellers stuck re-doing KYC in a loop even after
    // Didit had already approved them).
    try {
      const res = await fetch("/api/kyc/status", { method: "POST" });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        router.push(nextPath);
        return;
      }
    } catch {
      // Best-effort reconciliation — fall through to the normal screen.
    }

    setChecking(false);
  };

  useEffect(() => {
    checkStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Didit's review can take a few seconds after they bounce the user back
  // — poll a handful of times instead of asking them to refresh manually.
  // Each tick asks Didit directly (via /api/kyc/status) instead of just
  // re-reading our own DB, since that's exactly the value the webhook is
  // supposed to keep in sync and sometimes doesn't.
  useEffect(() => {
    if (!returningFromDidit) return;
    let attempts = 0;
    const maxAttempts = 8;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/kyc/status", { method: "POST" });
        const data = await res.json();
        if (data.verified) {
          clearInterval(timer);
          setVerified(true);
          router.push(nextPath);
          return;
        }
      } catch {
        // ignore, try again next tick
      }
      if (attempts >= maxAttempts) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [returningFromDidit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/verificar-identidad?next=" + encodeURIComponent(nextPath) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la verificación.");
      window.location.href = data.url;
    } catch (err: any) {
      console.error("Error al iniciar la verificación de identidad:", err);
      setError(err.message || "No se pudo iniciar la verificación de identidad.");
      setStarting(false);
    }
  };

  if (checking || verified) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-gold border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-16 w-full flex flex-col items-center text-center gap-6">
      <span className="text-4xl">🪪</span>
      <h1 className="font-heading text-2xl font-extrabold text-foreground">Verificá tu identidad</h1>
      <p className="text-text-muted text-sm leading-relaxed">
        Antes de comprar o vender, necesitamos confirmar que sos vos. Te vamos a pedir una foto
        de tu DNI y una selfie con prueba de vida — lo procesa un proveedor externo especializado (Didit), nosotros
        no guardamos tus fotos.
      </p>

      {returningFromDidit && !verified && (
        <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 text-xs font-medium">
          Estamos confirmando el resultado de tu verificación. Puede demorar unos segundos...
        </div>
      )}

      {error && (
        <div className="w-full rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-4 text-sm font-extrabold text-white shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
      >
        {starting ? "Iniciando..." : "Verificar mi identidad ahora"}
      </button>
    </div>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={null}>
      <VerifyIdentityContent />
    </Suspense>
  );
}
