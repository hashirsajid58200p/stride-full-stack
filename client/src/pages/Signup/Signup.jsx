import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import styles from "./Signup.module.css";
import CustomCheckbox from "../../components/UI/CustomCheckbox";
import CustomSelect from "../../components/UI/CustomSelect/CustomSelect";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    address: "",
    postalCode: "",
    password: "",
    gender: "male", // Default to male
    newsletter: false,
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!formData.terms) {
      if (window.showToast)
        window.showToast("Please agree to the terms and conditions", "error");
      return;
    }

    if (formData.password.length < 6) {
      if (window.showToast)
        window.showToast("Password must be at least 6 characters", "error");
      return;
    }

    setIsSubmitting(true);
    const db = getDatabase();

    try {
      if (!window.auth) throw new Error("Authentication system not ready.");

      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(
        window.auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      // 2. Assign Avatar based on Gender
      const maleAvatars = [
        "/images/avatars/male_01.jpg",
        "/images/avatars/male_02.jpg",
        "/images/avatars/male_03.jpg",
        "/images/avatars/male_04.jpg",
      ];
      const femaleAvatars = ["/images/avatars/female_01.jpg"];

      let selectedAvatar = "/images/avatars/male_01.jpg";
      if (formData.gender === "male") {
        selectedAvatar =
          maleAvatars[Math.floor(Math.random() * maleAvatars.length)];
      } else if (formData.gender === "female") {
        selectedAvatar =
          femaleAvatars[Math.floor(Math.random() * femaleAvatars.length)];
      }

      // 3. Attach Full Name & Avatar
      await updateProfile(user, {
        displayName: formData.fullName,
        photoURL: selectedAvatar,
      });

      // 3. Write default role to RTDB
      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, { role: "client" });

      // 4. Save Extra Details Locally
      const extraUserData = {
        phone: formData.mobile,
        address: formData.address,
        postalCode: formData.postalCode,
      };
      localStorage.setItem(
        `stride_profile_${user.uid}`,
        JSON.stringify(extraUserData),
      );

      if (window.showToast)
        window.showToast("Account created successfully!", "success");

      // 5. Redirect
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Signup Error:", error);
      let errorMessage = "Failed to create account.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
      }
      if (window.showToast) window.showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    const db = getDatabase();

    try {
      if (!window.auth || !window.googleProvider)
        throw new Error("Google Auth not ready.");

      const userCredential = await signInWithPopup(
        window.auth,
        window.googleProvider,
      );
      const user = userCredential.user;

      // Ensure we don't overwrite an existing admin
      const roleRef = ref(db, `users/${user.uid}/role`);
      const snapshot = await get(roleRef);

      if (!snapshot.exists()) {
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, { role: "client" });

        // For Google users, we use their Google profile picture by default
        // No extra action needed here as Firebase handles photoURL automatically
        // but we ensure it's kept in sync if needed.
      }

      if (window.showToast)
        window.showToast("Google account linked successfully!", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Google Signup Error:", error);
      if (window.showToast) window.showToast("Google Sign-Up failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles["signup-page-wrapper"]}>
      <div className={styles["split-card"]}>
        <div className={styles["split-card-left"]}>
          <div className={styles["signup-header"]}>
            <h1 className={styles.title}>Sign Up</h1>
            <p className={styles.subtitle}>
              Enter details to create an account
              <img
                src="/images/logos/signup.png"
                alt="Signup Icon"
                className={styles["welcome-icon"]}
              />
            </p>
          </div>

          <form className={styles["signup-form"]} onSubmit={handleSignup}>
            <div className={styles["form-row"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  required
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="mobile">Mobile</label>
                <input
                  type="tel"
                  id="mobile"
                  required
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles["form-row"]}>
              <div className={styles["form-group"]}>
                <CustomSelect
                  id="gender"
                  label="Gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ]}
                  placeholder="Choose Gender"
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles["form-row"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  required
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  required
                  placeholder="Postal Code"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles["form-group"]}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                required
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <div className={styles["form-options"]}>
              <div className={styles["checkbox-group"]}>
                <CustomCheckbox
                  id="newsletter"
                  label="Subscribe to newsletter"
                  checked={formData.newsletter}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles["checkbox-group"]}>
                <CustomCheckbox
                  id="terms"
                  label="I have read, understood and agree to be bound by Stride's Privacy Policy and Terms of Use"
                  checked={formData.terms}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <button
              type="submit"
              className={styles["submit-btn"]}
              disabled={isSubmitting}
            >
              {isSubmitting ? "PROCESSING..." : "SIGN UP"}
            </button>

            <p className={styles["login-link"]}>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            <div className={styles.divider}>
              <span>OR Continue with</span>
            </div>

            <div className={styles["social-login-row"]}>
              <button
                type="button"
                className={styles["social-btn-icon"]}
                onClick={handleGoogleSignup}
                disabled={isSubmitting}
                aria-label="Sign up with Google"
              >
                <i className="bi bi-google"></i>
              </button>
            </div>
          </form>
        </div>

        <div className={styles["split-card-right"]}></div>
      </div>
    </main>
  );
}
