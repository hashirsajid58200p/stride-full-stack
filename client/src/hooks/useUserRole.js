import { useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { auth } from "../firebaseConfig";

/**
 * Authoritative user role hook backed by Firebase Custom Claims + fallback check.
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
        let hasAdminClaim = idTokenResult.claims?.role === "admin";

        // Fallback: If custom claim not yet minted in token, check RTDB or localStorage
        if (!hasAdminClaim) {
          try {
            const db = getDatabase();
            const roleSnapshot = await get(ref(db, `users/${firebaseUser.uid}/role`));
            if (roleSnapshot.exists() && roleSnapshot.val() === "admin") {
              hasAdminClaim = true;
            }
          } catch (e) {
            // ignore RTDB error
          }
        }

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
