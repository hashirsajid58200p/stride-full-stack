import React, { useState, useEffect } from "react";
import { 
  updateProfile, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  sendPasswordResetEmail, 
  linkWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import ProfileLoader from "../../UI/ProfileLoader";
import styles from "./ProfileSettings.module.css";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dwagwbklz/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

export default function ProfileSettings({ user, dbUser, setDbUser, onDeleteAccount }) {
  const [passwordForm, setPasswordForm] = useState({ currentPass: "", newPass: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    if (user) {
      const hasPass = user.providerData.some((p) => p.providerId === "password");
      const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
      setHasPassword(hasPass);
      setIsGoogleConnected(isGoogle);
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(user, { displayName: dbUser.fullName });
      const extraData = {
        phone: dbUser.phone,
        address: dbUser.address,
        postalCode: dbUser.postalCode,
        avatarUrl: dbUser.avatarUrl,
      };
      localStorage.setItem(`stride_profile_${user.uid}`, JSON.stringify(extraData));
      if (window.showToast) window.showToast("Personal Information Saved Successfully!", "success");
    } catch (err) {
      if (window.showToast) window.showToast("Error saving profile data.", "error");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      if (hasPassword) {
        const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPass);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, passwordForm.newPass);
      if (window.showToast) window.showToast(hasPassword ? "Password Updated Successfully!" : "Password Set Successfully!", "success");
      setPasswordForm({ currentPass: "", newPass: "" });
    } catch (err) {
      if (window.showToast) window.showToast(err.message, "error");
    }
  };

  const handleForgotPass = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, user.email);
      if (window.showToast) window.showToast("Password reset link sent!", "success");
    } catch (err) {
      if (window.showToast) window.showToast("Failed to send reset email.", "error");
    }
  };

  const handleGoogleConnect = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(user, provider);
      setIsGoogleConnected(true);
      if (window.showToast) window.showToast("Successfully linked to Google!", "success");
    } catch (err) {
      if (window.showToast) window.showToast("Failed to link Google account.", "error");
    }
  };

  const deleteOldImageFromCloudinary = async (url) => {
    if (!url || !url.includes("cloudinary")) return;
    try {
      const uploadIndex = url.indexOf("upload/");
      if (uploadIndex === -1) return;
      let path = url.substring(uploadIndex + 7);
      if (path.match(/^v\d+\//)) path = path.replace(/^v\d+\//, "");
      const publicId = path.lastIndexOf(".") !== -1 ? path.substring(0, path.lastIndexOf(".")) : path;
      await fetch("http://localhost:5000/api/images/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });
    } catch (error) { console.error("Delete old image error:", error); }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadModal(false);
    if (file.size > 2 * 1024 * 1024) {
      if (window.showToast) window.showToast("Image size max 2mb", "error");
      return;
    }
    setIsUploading(true);
    const existingUrl = dbUser.avatarUrl;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "stride_profiles");

    try {
      const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        await updateProfile(user, { photoURL: data.secure_url });
        if (existingUrl) await deleteOldImageFromCloudinary(existingUrl);
        setDbUser((prev) => ({ ...prev, avatarUrl: data.secure_url }));
        const extraData = { ...dbUser, avatarUrl: data.secure_url };
        localStorage.setItem(`stride_profile_${user.uid}`, JSON.stringify(extraData));
        if (window.showToast) window.showToast("Profile image updated!", "success");
      }
    } catch (err) { if (window.showToast) window.showToast("Upload failed.", "error"); }
    finally { setIsUploading(false); }
  };

  const handleDeleteImage = async () => {
    const existingUrl = dbUser.avatarUrl;
    try {
      await updateProfile(user, { photoURL: "" });
      if (existingUrl) await deleteOldImageFromCloudinary(existingUrl);
      setDbUser((prev) => ({ ...prev, avatarUrl: null }));
      const extraData = { ...dbUser, avatarUrl: "" };
      localStorage.setItem(`stride_profile_${user.uid}`, JSON.stringify(extraData));
      if (window.showToast) window.showToast("Profile image removed.", "success");
    } catch (err) { if (window.showToast) window.showToast("Failed to remove image.", "error"); }
  };

  const handleAvatarSelect = async (avatarUrl) => {
    setIsUploading(true);
    const existingUrl = dbUser.avatarUrl;
    try {
      await updateProfile(user, { photoURL: avatarUrl });
      if (existingUrl) await deleteOldImageFromCloudinary(existingUrl);
      setDbUser((prev) => ({ ...prev, avatarUrl: avatarUrl }));
      const extraData = { ...dbUser, avatarUrl: avatarUrl };
      localStorage.setItem(
        `stride_profile_${user.uid}`,
        JSON.stringify(extraData),
      );
      if (window.showToast)
        window.showToast("Avatar updated successfully!", "success");
    } catch (err) {
      if (window.showToast) window.showToast("Failed to update avatar.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const avatars = [
    "/images/avatars/male_01.jpg",
    "/images/avatars/male_02.jpg",
    "/images/avatars/male_03.jpg",
    "/images/avatars/male_04.jpg",
    "/images/avatars/female_01.jpg",
  ];

  const initials = dbUser.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className={styles.profileCard}>
      <h3 className={styles.cardSectionTitle}>Profile Image</h3>
      <div className={styles.profileUploadSection}>
        <div className={styles.profilePreviewWrapper}>
          <div className={styles.profilePreview}>
            {dbUser.avatarUrl ? (
              <img src={dbUser.avatarUrl} alt="Avatar" />
            ) : (
              initials
            )}
          </div>
          <ProfileLoader isVisible={isUploading} />
        </div>
        <div className={styles.uploadActions}>
          <div className={styles.avatarGalleryWrapper}>
            <span className={styles.galleryTitle}>Choose from Avatars</span>
            <div className={styles.avatarGallery}>
              {avatars.map((avatar, idx) => (
                <div
                  key={idx}
                  className={`${styles.avatarItem} ${dbUser.avatarUrl === avatar ? styles.activeAvatar : ""}`}
                  onClick={() => handleAvatarSelect(avatar)}
                >
                  <img src={avatar} alt={`Avatar ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.uploadButtonsRow}>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => setUploadModal(true)}
            >
              <i className="bi bi-upload"></i> Upload Image
            </button>
            {dbUser.avatarUrl && (
              <button
                type="button"
                className={styles.btnDangerOutline}
                onClick={handleDeleteImage}
              >
                <i className="bi bi-trash"></i> Remove
              </button>
            )}
          </div>
          <p className={styles.textMuted}>
            Recommended size: 200x200px. Max size 2MB.
          </p>
        </div>
      </div>

      <hr className={styles.sectionDivider} />

      <h3 className={styles.cardSectionTitle}>Account Details</h3>
      <form className={styles.profileForm} onSubmit={handleProfileSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input type="text" required value={dbUser.fullName} onChange={(e) => setDbUser({ ...dbUser, fullName: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input type="email" disabled value={dbUser.email} style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Mobile Number</label>
            <input type="tel" value={dbUser.phone} onChange={(e) => setDbUser({ ...dbUser, phone: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label>Postal Code</label>
            <input type="text" value={dbUser.postalCode} onChange={(e) => setDbUser({ ...dbUser, postalCode: e.target.value })} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Address</label>
          <textarea rows="2" value={dbUser.address} onChange={(e) => setDbUser({ ...dbUser, address: e.target.value })}></textarea>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className={styles.btnPrimary}>Save Changes</button>
        </div>
      </form>

      <hr className={styles.sectionDivider} />

      <h3 className={styles.cardSectionTitle}>Linked Accounts</h3>
      <div className={styles.linkedAccountBox}>
        <div className={styles.linkedAccountInfo}>
          <i className="bi bi-google"></i>
          <div>
            <span className={styles.linkedLabel}>Google</span>
            <span className={styles.linkedSub}>Use Google to sign in</span>
          </div>
        </div>
        {isGoogleConnected ? (
          <span className={styles.connectedStatus}><i className="bi bi-check-circle-fill"></i> Connected</span>
        ) : (
          <button className={styles.btnOutline} onClick={handleGoogleConnect}>Connect to Google</button>
        )}
      </div>

      <hr className={styles.sectionDivider} />

      <h3 className={styles.cardSectionTitle}>{hasPassword ? "Update Password" : "Set Password"}</h3>
      <form className={styles.profileForm} onSubmit={handlePasswordSubmit}>
        <div className={styles.formRow}>
          {hasPassword && (
            <div className={styles.formGroup}>
              <label>Current Password</label>
              <input type="password" required placeholder="Enter current password" value={passwordForm.currentPass} onChange={(e) => setPasswordForm({ ...passwordForm, currentPass: e.target.value })} />
            </div>
          )}
          <div className={styles.formGroup}>
            <label>New Password</label>
            <input type="password" required placeholder="Enter new password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
          </div>
        </div>
        <div className={styles.passwordActions}>
          <button type="submit" className={styles.btnOutline}>{hasPassword ? "Change Password" : "Set Password"}</button>
          {hasPassword && <button type="button" className={styles.forgotLink} onClick={handleForgotPass}>Forgot Password?</button>}
        </div>
      </form>

      <hr className={styles.sectionDivider} />

      <h3 className={`${styles.cardSectionTitle} ${styles.textDanger}`}>Danger Zone</h3>
      <p className={styles.textMuted} style={{ marginBottom: "1rem" }}>
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <button className={styles.btnDanger} type="button" onClick={onDeleteAccount}>
        <i className="bi bi-trash"></i> Delete Account
      </button>

      {/* Upload Modal */}
      {uploadModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setUploadModal(false)}>
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setUploadModal(false)}><i className="bi bi-x-lg"></i></button>
            <div className={styles.uploadArea}>
              <i className={`bi bi-cloud-arrow-up-fill ${styles.uploadIcon}`}></i>
              <p className={styles.uploadTextMain}>Select an image</p>
              <p className={styles.uploadTextSecondary}>Max size 2MB</p>
              <label className={styles.btnPrimary} style={{ cursor: "pointer", display: "inline-block" }}>
                Browse
                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
