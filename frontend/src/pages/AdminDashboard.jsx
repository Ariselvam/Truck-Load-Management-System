import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, tRes, lRes, bRes] = await Promise.all([
        api.get('users/'),
        api.get('drivers/'),
        api.get('trucks/'),
        api.get('loads/'),
        api.get('bookings/'),
      ]);

      setUsers(uRes.data.results || uRes.data);
      setDrivers(dRes.data.results || dRes.data);
      setTrucks(tRes.data.results || tRes.data);
      setLoads(lRes.data.results || lRes.data);
      setBookings(bRes.data.results || bRes.data);
    } catch (err) {
      console.error('Error fetching admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Admin Console..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Management Console 🛡️</h1>
          <p className="dashboard-subtitle">Monitor and oversee users, driver fleets, trucks, loads, and system bookings.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-primary-light">👥</div>
          <div className="stat-info">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-info-light">🆔</div>
          <div className="stat-info">
            <span className="stat-value">{drivers.length}</span>
            <span className="stat-label">Registered Drivers</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-warning-light">🚛</div>
          <div className="stat-info">
            <span className="stat-value">{trucks.length}</span>
            <span className="stat-label">Fleet Trucks</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-success-light">📦</div>
          <div className="stat-info">
            <span className="stat-value">{loads.length}</span>
            <span className="stat-label">Total Loads</span>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="tab-switcher mb-3">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers ({drivers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'trucks' ? 'active' : ''}`}
          onClick={() => setActiveTab('trucks')}
        >
          Trucks ({trucks.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'loads' ? 'active' : ''}`}
          onClick={() => setActiveTab('loads')}
        >
          Loads ({loads.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings ({bookings.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="card shadow-sm">
        <div className="card-body">
          {activeTab === 'users' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-tag role-${u.role}`}>{u.role?.toUpperCase()}</span>
                      </td>
                      <td>{u.phone_number || 'N/A'}</td>
                      <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>License Number</th>
                    <th>License Expiry</th>
                    <th>Experience</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id}>
                      <td>#{d.id}</td>
                      <td>{d.user_details?.username}</td>
                      <td><code>{d.license_number}</code></td>
                      <td>{d.license_expiry}</td>
                      <td>{d.experience_years} Years</td>
                      <td>
                        <span className={`status-badge status-${d.status}`}>{d.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'trucks' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Plate Number</th>
                    <th>Model / Type</th>
                    <th>Capacity (Tons)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trucks.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td><code>{t.license_plate}</code></td>
                      <td>{t.model} ({t.truck_type})</td>
                      <td>{t.capacity_tons} Tons</td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>{t.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'loads' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Shipper</th>
                    <th>Route</th>
                    <th>Weight</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map((l) => (
                    <tr key={l.id}>
                      <td>#{l.id}</td>
                      <td>{l.shipper_details?.username}</td>
                      <td>{l.origin} ➔ {l.destination}</td>
                      <td>{l.weight_tons} Tons</td>
                      <td className="price-tag">${l.price}</td>
                      <td>
                        <span className={`status-badge status-${l.status}`}>{l.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Load Route</th>
                    <th>Driver License</th>
                    <th>Truck Plate</th>
                    <th>Booking Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>{b.load_details?.origin} ➔ {b.load_details?.destination}</td>
                      <td><code>{b.driver_details?.license_number}</code></td>
                      <td><code>{b.truck_details?.license_plate}</code></td>
                      <td>{new Date(b.booking_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${b.status}`}>{b.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
