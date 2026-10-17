import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Never accept a user ID from the browser for this operation. The ID comes
// from the bearer token verified by requireSupabaseAuth.
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const authenticatedAt = context.claims["auth_time"];
    if (typeof authenticatedAt !== "number" || Date.now() / 1000 - authenticatedAt > 15 * 60) {
      throw new Error("For security, sign out and back in before deleting your account.");
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Account deletion failed");
      throw new Error("Account deletion is unavailable right now. Please contact the site owner.", {
        cause: error,
      });
    }
  });
