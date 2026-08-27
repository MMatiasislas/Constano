// Mensaje de error que tira `requireActiveSubscription()` (en
// lib/auth/require-active-subscription.ts) cuando el gym está suspendido.
// Vive en su propio archivo sin ninguna otra dependencia para poder
// importarlo tanto desde Server Actions como desde Client Components sin
// arrastrar código server-only (`next/headers`, etc.) al bundle del cliente.
export const SUBSCRIPTION_SUSPENDED_ERROR = "SUBSCRIPTION_SUSPENDED";
