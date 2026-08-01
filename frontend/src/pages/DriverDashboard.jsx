import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_STAGES = ['accepted', 'loading', 'in_transit', 'unloading', 'completed'];

const DriverDashboard = () => {
  const { user, driver } = useAuth();
  const [stats, setStats] = useState({
    total_earnings: 0,
    completed_trips_count: 0,
    driver_status: 'active',
    active_booking: null,
  });

  const [availableLoads, setAvailableLoads] = useState([]);
  const [nearbyLoadsData, setNearbyLoadsData] = useState({
    last_unloading_location: null,
    loads: [],
  });

  const [historyBookings, setHistoryBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  const fetchDriverDashboard = async () => {
    setLoading(true);
    try {
      // 1. Fetch Driver Stats & Active Trip
      const statsRes = await api.get('bookings/driver_stats/');
      setStats(statsRes.data);

      // 2. Fetch Available Pending Loads
      const loadsRes = await api.get('loads/?status=pending');
      setAvailableLoads(loadsRes.data.results || loadsRes.data);

      // 3. Fetch Nearby Loads matching driver unloading location
      const nearbyRes = await api.get('bookings/nearby_loads/');
      setNearbyLoadsData(nearbyRes.data);

      // 4. Fetch Driver Booking History
      const historyRes = await api.get('bookings/');
      setHistoryBookings(historyRes.data.results || historyRes.data);
    } catch (err) {
      console.error('Error fetching driver dashboard data:', err);
      showNotification('error', 'Failed to fetch driver portal data.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const handleAcceptLoad = async (loadId) => {
    setActionLoading(true);
    try {
      await api.post('bookings/accept_load/', { load_id: loadId });
      showNotification('success', 'Load accepted! Trip started.');
      fetchDriverDashboard();
    } catch (err) {
      console.error('Accept load error:', err);
      const detail = err.response?.data?.detail || 'Failed to accept load.';
      showNotification('error', detail);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoading(true);
    try {
      await api.post(`bookings/${bookingId}/update_status/`, { status: newStatus });
      showNotification('success', `Status updated to ${newStatus.toUpperCase().replace('_', ' ')}!`);
      fetchDriverDashboard();
    } catch (err) {
      console.error('Update status error:', err);
      const detail = err.response?.data?.detail || 'Failed to update trip status.';
      showNotification('error', detail);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Driver Portal..." />;
  }

  const activeBooking = stats.active_booking;
  const currentStatusIndex = activeBooking ? STATUS_STAGES.indexOf(activeBooking.status) : -1;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Driver Dashboard 🚛</h1>
          <p className="dashboard-subtitle">
            Welcome, {user.first_name || user.username}! (License: {driver?.license_number || 'Registered'})
          </p>
        </div>
      </div>

      {notification.text && (
        <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'}`}>
          {notification.text}
        </div>
      )}

      {/* Driver Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-success-light">💰</div>
          <div className="stat-info">
            <span className="stat-value">${stats.total_earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span className="stat-label">Total Earnings</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-primary-light">🏁</div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed_trips_count}</span>
            <span className="stat-label">Completed Trips</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-info-light">📍</div>
          <div className="stat-info">
            <span className="stat-value">{stats.driver_status.toUpperCase()}</span>
            <span className="stat-label">Current Duty Status</span>
          </div>
        </div>
      </div>

      {/* Active Trip Tracker Stepper */}
      {activeBooking && (
        <div className="card shadow-sm active-trip-card mb-4">
          <div className="card-header bg-gradient-primary">
            <h3>Current Active Trip #{activeBooking.id} 🛣️</h3>
          </div>
          <div className="card-body">
            <div className="trip-route-info">
              <div className="route-badge">
                <span>ORIGIN</span>
                <strong>{activeBooking.load_details?.origin}</strong>
              </div>
              <div className="route-arrow">➔</div>
              <div className="route-badge">
                <span>DESTINATION</span>
                <strong>{activeBooking.load_details?.destination}</strong>
              </div>
              <div className="trip-payout">
                <span>EARNINGS</span>
                <strong className="text-success">${activeBooking.load_details?.price}</strong>
              </div>
            </div>

            {/* 6-Stage Progress Stepper */}
            <div className="status-stepper mt-4">
              {STATUS_STAGES.map((stg, idx) => (
                <div
                  key={stg}
                  className={`step-item ${idx <= currentStatusIndex ? 'completed' : ''} ${idx === currentStatusIndex ? 'active' : ''}`}
                >
                  <div className="step-circle">{idx + 1}</div>
                  <div className="step-label">{stg.toUpperCase().replace('_', ' ')}</div>
                </div>
              ))}
            </div>

            {/* Stepper Control Buttons */}
            <div className="stepper-controls mt-4">
              {activeBooking.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateStatus(activeBooking.id, 'loading')}
                  className="btn btn-warning"
                  disabled={actionLoading}
                >
                  Start Loading Freight 📦
                </button>
              )}
              {activeBooking.status === 'loading' && (
                <button
                  onClick={() => handleUpdateStatus(activeBooking.id, 'in_transit')}
                  className="btn btn-info"
                  disabled={actionLoading}
                >
                  Start Transit 🚚
                </button>
              )}
              {activeBooking.status === 'in_transit' && (
                <button
                  onClick={() => handleUpdateStatus(activeBooking.id, 'unloading')}
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  Arrived at Destination / Unloading 🏙️
                </button>
              )}
              {activeBooking.status === 'unloading' && (
                <button
                  onClick={() => handleUpdateStatus(activeBooking.id, 'completed')}
                  className="btn btn-success"
                  disabled={actionLoading}
                >
                  Complete Delivery & Collect Payment ✅
                </button>
              )}
              <button
                onClick={() => handleUpdateStatus(activeBooking.id, 'cancelled')}
                className="btn btn-outline-danger ml-2"
                disabled={actionLoading}
              >
                Cancel Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nearby Recommended Loads (After Unloading Location Matching) */}
      {nearbyLoadsData.last_unloading_location && nearbyLoadsData.last_unloading_location !== 'None' && (
        <div className="card shadow-sm mb-4 border-highlight">
          <div className="card-header bg-gradient-dark">
            <h3>Nearby Recommended Loads (After Unloading at "{nearbyLoadsData.last_unloading_location}") 🎯</h3>
          </div>
          <div className="card-body">
            {nearbyLoadsData.loads.length === 0 ? (
              <p className="empty-text">No matching loads originating from {nearbyLoadsData.last_unloading_location} right now.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Weight (Tons)</th>
                      <th>Payout</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearbyLoadsData.loads.map((load) => (
                      <tr key={load.id}>
                        <td>#{load.id}</td>
                        <td>
                          <span className="badge-highlight">{load.origin}</span>
                        </td>
                        <td>{load.destination}</td>
                        <td>{load.weight_tons}</td>
                        <td className="price-tag">${load.price}</td>
                        <td>
                          <button
                            onClick={() => handleAcceptLoad(load.id)}
                            className="btn btn-success btn-xs"
                            disabled={actionLoading || !!activeBooking}
                          >
                            Accept Nearby Load
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Load Board */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h3>Available Load Board 📦</h3>
        </div>
        <div className="card-body">
          {availableLoads.length === 0 ? (
            <p className="empty-text">No available loads posted right now. Please check back soon!</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Load ID</th>
                    <th>Route (Origin ➔ Destination)</th>
                    <th>Weight</th>
                    <th>Price</th>
                    <th>Pickup Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableLoads.map((load) => (
                    <tr key={load.id}>
                      <td>#{load.id}</td>
                      <td>
                        <strong>{load.origin}</strong> ➔ <strong>{load.destination}</strong>
                      </td>
                      <td>{load.weight_tons} Tons</td>
                      <td>
                        <span className="price-tag">${load.price}</span>
                      </td>
                      <td>{load.pickup_date}</td>
                      <td>
                        <button
                          onClick={() => handleAcceptLoad(load.id)}
                          className="btn btn-primary btn-xs"
                          disabled={actionLoading || !!activeBooking}
                        >
                          {activeBooking ? 'Trip in Progress' : 'Accept Load'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Driver Booking History */}
      <div className="card shadow-sm">
        <div className="card-header">
          <h3>Trip Booking History 📜</h3>
        </div>
        <div className="card-body">
          {historyBookings.length === 0 ? (
            <p className="empty-text">No past trip history recorded.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Route</th>
                    <th>Price</th>
                    <th>Booking Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBookings.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>
                        {b.load_details?.origin} ➔ {b.load_details?.destination}
                      </td>
                      <td className="price-tag">${b.load_details?.price}</td>
                      <td>{new Date(b.booking_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${b.status}`}>
                          {b.status.toUpperCase().replace('_', ' ')}
                        </span>
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

export default DriverDashboard;
