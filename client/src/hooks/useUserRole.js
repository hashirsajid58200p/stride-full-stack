// client/src/hooks/useUserRole.js
import { useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";

/**
 * Authoritative user role hook backed by Firebase Custom Claims.
 * Never trusts client localStorage for authorization.
 */
export function useUserRole() {
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const hasAdminClaim = idTokenResult.claims?.role === "admin";
        const currentRole = hasAdminClaim ? "admin" : "client";

        setRole(currentRole);
        setIsAdmin(hasAdminClaim);
      } catch (err) {
        console.error("[useUserRole] Failed to verify ID token claims:", err);
        setRole("client");
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { role, isAdmin, loading, user };
}

export default useUserRole;
