import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Register = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'driver'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'shipper',
    license_number: '',
    license_expiry: '',
    experience_years: 1,
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, driverRegister } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    setApiError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (activeTab === 'driver') {
      if (!formData.license_number.trim()) {
        newErrors.license_number = 'License number is required';
      }
      if (!formData.license_expiry) {
        newErrors.license_expiry = 'License expiry date is required';
      } else {
        const expiryDate = new Date(formData.license_expiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          newErrors.license_expiry = 'Expiry date must be in the future';
        }
      }
      if (formData.experience_years < 0) {
        newErrors.experience_years = 'Experience years cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError('');
    setSuccessMsg('');

    try {
      if (activeTab === 'user') {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          role: formData.role,
        });
        setSuccessMsg('Account registered successfully! Redirecting to login...');
      } else {
        await driverRegister({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          license_number: formData.license_number,
          license_expiry: formData.license_expiry,
          experience_years: parseInt(formData.experience_years, 10) || 0,
        });
        setSuccessMsg('Driver profile created successfully! Redirecting to login...');
      }

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const errorVal = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
          setApiError(`${firstKey}: ${errorVal}`);
        } else {
          setApiError('Registration failed. Please check your inputs.');
        }
      } else {
        setApiError('Registration failed. Server error.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glassmorphism large-card">
        <div className="auth-header">
          <h2>Create an Account 📋</h2>
          <p>Join Bookey Freight as a Shipper, Carrier, or Driver</p>
        </div>

        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('user');
              setApiError('');
            }}
          >
            Shipper / Carrier Signup
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'driver' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('driver');
              setApiError('');
            }}
          >
            Driver Signup
          </button>
        </div>

        {apiError && <div className="alert alert-danger">{apiError}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="text"
                id="phone_number"
                name="phone_number"
                className="form-control"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                className="form-control"
                value={formData.first_name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            {activeTab === 'user' && (
              <div className="form-group full-width">
                <label htmlFor="role">Account Type / Role *</label>
                <select
                  id="role"
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="shipper">Shipper (Post & Book Loads)</option>
                  <option value="carrier">Carrier (Manage Fleet)</option>
                </select>
              </div>
            )}

            {activeTab === 'driver' && (
              <>
                <div className="form-group">
                  <label htmlFor="license_number">License Number *</label>
                  <input
                    type="text"
                    id="license_number"
                    name="license_number"
                    className={`form-control ${errors.license_number ? 'is-invalid' : ''}`}
                    placeholder="e.g. TX-98765-AB"
                    value={formData.license_number}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  {errors.license_number && <span className="field-error">{errors.license_number}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="license_expiry">License Expiry Date *</label>
                  <input
                    type="date"
                    id="license_expiry"
                    name="license_expiry"
                    className={`form-control ${errors.license_expiry ? 'is-invalid' : ''}`}
                    value={formData.license_expiry}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  {errors.license_expiry && <span className="field-error">{errors.license_expiry}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="experience_years">Experience (Years)</label>
                  <input
                    type="number"
                    id="experience_years"
                    name="experience_years"
                    min="0"
                    className={`form-control ${errors.experience_years ? 'is-invalid' : ''}`}
                    value={formData.experience_years}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  {errors.experience_years && <span className="field-error">{errors.experience_years}</span>}
                </div>
              </>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg mt-3" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner text="Creating Account..." /> : 'Complete Registration'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already registered?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
