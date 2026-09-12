import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Profile({ onBack }) {
    const { user, logout, updateProfile, deleteAccount } = useAuth();
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const result = await updateProfile({ full_name: fullName });

        if (result.success) {
            setSuccess('Profile updated successfully');
            setEditing(false);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteAccount();

        if (!result.success) {
            setError(result.error);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <button onClick={onBack} className="back-btn">
                    ← Back to Dashboard
                </button>
                <button onClick={logout} className="logout-btn">
                    Sign Out
                </button>
            </div>

            <div className="profile-card">
                <h2 className="profile-title">My Profile</h2>

                {!editing ? (
                    <div className="profile-view">
                        <div className="profile-field">
                            <label className="profile-label">Full Name</label>
                            <p className="profile-value">{user?.full_name || 'Not set'}</p>
                        </div>

                        <div className="profile-field">
                            <label className="profile-label">Email</label>
                            <p className="profile-value">{user?.email}</p>
                        </div>

                        <div className="profile-field">
                            <label className="profile-label">Member Since</label>
                            <p className="profile-value">{formatDate(user?.created_at)}</p>
                        </div>

                        <button
                            onClick={() => setEditing(true)}
                            className="edit-profile-btn"
                        >
                            Edit Profile
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="profile-edit-form">
                        <div className="form-group">
                            <label htmlFor="fullName" className="form-label">Full Name</label>
                            <input
                                id="fullName"
                                type="text"
                                className="form-input"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}
                        {success && <div className="auth-success">{success}</div>}

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(false);
                                    setFullName(user?.full_name || '');
                                    setError('');
                                    setSuccess('');
                                }}
                                className="cancel-btn"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="save-btn"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="danger-zone">
                <h3 className="danger-title">Danger Zone</h3>
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="delete-account-btn"
                    >
                        Delete Account
                    </button>
                ) : (
                    <div className="delete-confirm">
                        <p className="delete-warning">
                            Are you sure? This action cannot be undone.
                        </p>
                        <div className="delete-actions">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="cancel-btn"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="confirm-delete-btn"
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Profile;
