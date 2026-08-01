import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const UserDashboard = () => {
  const { user } = useAuth();
  const [loads, setLoads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Shipper Specific State
  const [newLoad, setNewLoad] = useState({
    origin: '',
    destination: '',
    weight_tons: '',
    dimensions: 'Standard Cargo',
    price: '',
    pickup_date: '',
    delivery_date: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Carrier Specific State
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [assigningLoadId, setAssigningLoadId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === 'carrier') {
        const [loadsRes, bookingsRes, driversRes, trucksRes] = await Promise.all([
          api.get('loads/?status=pending'),
          api.get('bookings/'),
          api.get('drivers/?status=active'),
          api.get('trucks/?status=available'),
        ]);
        setLoads(loadsRes.data.results || loadsRes.data);
        setBookings(bookingsRes.data.results || bookingsRes.data);
        setDrivers(driversRes.data.results || driversRes.data);
        setTrucks(trucksRes.data.results || trucksRes.data);
      } else {
        // Shipper defaults
        const [loadsRes, bookingsRes] = await Promise.all([
          api.get(`loads/?shipper_id=${user.id}`),
          api.get('bookings/'),
        ]);
        setLoads(loadsRes.data.results || loadsRes.data);
        setBookings(bookingsRes.data.results || bookingsRes.data);
      }
    } catch (err) {
      console.error('Error fetching user dashboard data:', err);
      showNotification('error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const handleInputChange = (e) => {
    setNewLoad({ ...newLoad, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: '' });
    }
  };

  const validateLoadForm = () => {
    const errors = {};
    if (!newLoad.origin.trim()) errors.origin = 'Origin location is required';
    if (!newLoad.destination.trim()) errors.destination = 'Destination location is required';
    if (newLoad.origin.trim().toLowerCase() === newLoad.destination.trim().toLowerCase()) {
      errors.destination = 'Origin and Destination cannot be identical';
    }
    if (!newLoad.weight_tons || parseFloat(newLoad.weight_tons) <= 0) {
      errors.weight_tons = 'Weight must be greater than 0 tons';
    }
    if (!newLoad.price || parseFloat(newLoad.price) <= 0) {
      errors.price = 'Price must be greater than $0';
    }
    if (!newLoad.pickup_date) errors.pickup_date = 'Pickup date is required';
    if (!newLoad.delivery_date) errors.delivery_date = 'Delivery date is required';
    if (newLoad.pickup_date && newLoad.delivery_date && newLoad.delivery_date < newLoad.pickup_date) {
      errors.delivery_date = 'Delivery date cannot be before pickup date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateLoad = async (e) => {
    e.preventDefault();
    if (!validateLoadForm()) return;

    setSubmitting(true);
    try {
      await api.post('loads/', {
        ...newLoad,
        shipper_id: user.id,
        weight_tons: parseFloat(newLoad.weight_tons),
        price: parseFloat(newLoad.price),
      });

      showNotification('success', 'New load booking created successfully!');
      setNewLoad({
        origin: '',
        destination: '',
        weight_tons: '',
        dimensions: 'Standard Cargo',
        price: '',
        pickup_date: '',
        delivery_date: '',
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Create load error:', err);
      const detail = err.response?.data?.detail || 'Failed to create load. Check fields.';
      showNotification('error', detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLoad = async (loadId) => {
    if (!window.confirm('Are you sure you want to cancel this load?')) return;
    try {
      await api.patch(`loads/${loadId}/`, { status: 'cancelled' });
      showNotification('success', 'Load cancelled successfully.');
      fetchDashboardData();
    } catch (err) {
      showNotification('error', 'Failed to cancel load.');
    }
  };

  const handleAssignFleet = async (e) => {
    e.preventDefault();
    if (!selectedDriverId || !selectedTruckId || !assigningLoadId) {
      showNotification('error', 'Please select both a driver and a truck.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('bookings/', {
        load_id: parseInt(assigningLoadId, 10),
        driver_id: parseInt(selectedDriverId, 10),
        truck_id: parseInt(selectedTruckId, 10),
      });

      showNotification('success', 'Driver and truck assigned to load successfully!');
      setAssigningLoadId(null);
      setSelectedDriverId('');
      setSelectedTruckId('');
      fetchDashboardData();
    } catch (err) {
      console.error('Driver assignment error:', err);
      const data = err.response?.data;
      let errorMsg = 'Failed to assign driver & truck. Check availability.';
      if (data && typeof data === 'object') {
        if (data.detail) {
          errorMsg = data.detail;
        } else {
          const firstKey = Object.keys(data)[0];
          errorMsg = `${firstKey}: ${Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]}`;
        }
      }
      showNotification('error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Loading ${user.role === 'carrier' ? 'Carrier' : 'Shipper'} Dashboard...`} />;
  }

  // --- CARRIER RENDER PATH ---
  if (user.role === 'carrier') {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Carrier Portal 🚚</h1>
            <p className="dashboard-subtitle">
              Welcome back, {user.username}! Manage your fleet, view pending shipments, and assign drivers.
            </p>
          </div>
        </div>

        {notification.text && (
          <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'}`}>
            {notification.text}
          </div>
        )}

        {/* Carrier Metrics Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon bg-primary-light">📦</div>
            <div className="stat-info">
              <span className="stat-value">{loads.length}</span>
              <span className="stat-label">Available Loads</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-info-light">🏁</div>
            <div className="stat-info">
              <span className="stat-value">
                {bookings.filter((b) => ['accepted', 'loading', 'in_transit', 'unloading'].includes(b.status)).length}
              </span>
              <span className="stat-label">Active Shipments</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-success-light">👥</div>
            <div className="stat-info">
              <span className="stat-value">{drivers.length}</span>
              <span className="stat-label">Available Drivers</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-warning-light">🚛</div>
            <div className="stat-info">
              <span className="stat-value">{trucks.length}</span>
              <span className="stat-label">Available Trucks</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content-grid">
          {/* Driver Assignment Form / Fleet Overview */}
          <div className="card shadow-sm">
            {assigningLoadId ? (
              <>
                <div className="card-header">
                  <h3>Assign Fleet to Load #{assigningLoadId} 🔗</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={handleAssignFleet} noValidate>
                    <div className="form-group mb-3">
                      <label>Select Driver *</label>
                      <select
                        className="form-control"
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        disabled={submitting}
                        required
                      >
                        <option value="">-- Select Available Driver --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.user_details?.first_name || d.user_details?.username} ({d.license_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group mb-3">
                      <label>Select Truck *</label>
                      <select
                        className="form-control"
                        value={selectedTruckId}
                        onChange={(e) => setSelectedTruckId(e.target.value)}
                        disabled={submitting}
                        required
                      >
                        <option value="">-- Select Available Truck --</option>
                        {trucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.make} {t.model} ({t.license_plate}) - Cap: {t.capacity_tons}T
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Assigning...' : 'Assign Driver & Truck'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setAssigningLoadId(null);
                          setSelectedDriverId('');
                          setSelectedTruckId('');
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <h3>Fleet Status Summary</h3>
                </div>
                <div className="card-body">
                  <p className="mb-2"><strong>Available Drivers:</strong> {drivers.length} active</p>
                  <p className="mb-3"><strong>Available Trucks:</strong> {trucks.length} available</p>
                  <div className="alert alert-info py-2 px-3 m-0">
                    <small>Select an available load from the board to assign a driver and a truck from your fleet.</small>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Available Load Board */}
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Available Loads Board</h3>
            </div>
            <div className="card-body">
              {loads.length === 0 ? (
                <p className="empty-text">No available pending loads right now. Check back later!</p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Route</th>
                        <th>Weight / Price</th>
                        <th>Pickup</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loads.map((load) => (
                        <tr key={load.id}>
                          <td>#{load.id}</td>
                          <td>
                            <strong>{load.origin}</strong> ➔ <strong>{load.destination}</strong>
                          </td>
                          <td>
                            {load.weight_tons} Tons | <span className="price-tag">${load.price}</span>
                          </td>
                          <td>{load.pickup_date}</td>
                          <td>
                            <button
                              onClick={() => setAssigningLoadId(load.id)}
                              className="btn btn-primary btn-xs"
                            >
                              Assign Fleet
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
        </div>

        {/* Fleet Bookings Table */}
        <div className="card shadow-sm mt-4">
          <div className="card-header">
            <h3>Fleet Booking History & Trip Statuses 🚛</h3>
          </div>
          <div className="card-body">
            {bookings.length === 0 ? (
              <p className="empty-text">No fleet bookings found.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Load Details</th>
                      <th>Assigned Driver</th>
                      <th>Truck Plate</th>
                      <th>Booking Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>#{booking.id}</td>
                        <td>
                          <strong>{booking.load_details?.origin} ➔ {booking.load_details?.destination}</strong>
                          <br />
                          <small className="text-muted">{booking.load_details?.weight_tons} Tons | ${booking.load_details?.price}</small>
                        </td>
                        <td>
                          {booking.driver_details?.user_details?.first_name || booking.driver_details?.user_details?.username || 'N/A'}
                          {' '}({booking.driver_details?.license_number || 'N/A'})
                        </td>
                        <td><code>{booking.truck_details?.license_plate || 'N/A'}</code></td>
                        <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${booking.status}`}>
                            {booking.status.toUpperCase().replace('_', ' ')}
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
  }

  // --- ORIGINAL SHIPPER RENDER PATH ---
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Shipper Portal 📦</h1>
          <p className="dashboard-subtitle">Welcome back, {user.username}! Create & manage your freight bookings.</p>
        </div>
      </div>

      {notification.text && (
        <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'}`}>
          {notification.text}
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-primary-light">📦</div>
          <div className="stat-info">
            <span className="stat-value">{loads.length}</span>
            <span className="stat-label">Total Posted Loads</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-warning-light">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{loads.filter((l) => l.status === 'pending').length}</span>
            <span className="stat-label">Pending Acceptance</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-info-light">🚚</div>
          <div className="stat-info">
            <span className="stat-value">
              {loads.filter((l) => ['accepted', 'loading', 'in_transit', 'unloading'].includes(l.status)).length}
            </span>
            <span className="stat-label">In Progress Trips</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-success-light">✅</div>
          <div className="stat-info">
            <span className="stat-value">{loads.filter((l) => l.status === 'completed').length}</span>
            <span className="stat-label">Completed Deliveries</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content-grid">
        {/* Form Column */}
        <div className="card shadow-sm">
          <div className="card-header">
            <h3>Post New Freight Load ➕</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateLoad} noValidate>
              <div className="form-group mb-2">
                <label>Origin Location *</label>
                <input
                  type="text"
                  name="origin"
                  className={`form-control ${formErrors.origin ? 'is-invalid' : ''}`}
                  placeholder="e.g. Houston, TX"
                  value={newLoad.origin}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
                {formErrors.origin && <span className="field-error">{formErrors.origin}</span>}
              </div>

              <div className="form-group mb-2">
                <label>Destination Location *</label>
                <input
                  type="text"
                  name="destination"
                  className={`form-control ${formErrors.destination ? 'is-invalid' : ''}`}
                  placeholder="e.g. Chicago, IL"
                  value={newLoad.destination}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
                {formErrors.destination && <span className="field-error">{formErrors.destination}</span>}
              </div>

              <div className="form-row">
                <div className="form-group mb-2">
                  <label>Weight (Tons) *</label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight_tons"
                    className={`form-control ${formErrors.weight_tons ? 'is-invalid' : ''}`}
                    placeholder="e.g. 18.5"
                    value={newLoad.weight_tons}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {formErrors.weight_tons && <span className="field-error">{formErrors.weight_tons}</span>}
                </div>

                <div className="form-group mb-2">
                  <label>Price ($ USD) *</label>
                  <input
                    type="number"
                    step="50"
                    name="price"
                    className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                    placeholder="e.g. 2500"
                    value={newLoad.price}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group mb-2">
                  <label>Pickup Date *</label>
                  <input
                    type="date"
                    name="pickup_date"
                    className={`form-control ${formErrors.pickup_date ? 'is-invalid' : ''}`}
                    value={newLoad.pickup_date}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {formErrors.pickup_date && <span className="field-error">{formErrors.pickup_date}</span>}
                </div>

                <div className="form-group mb-2">
                  <label>Delivery Date *</label>
                  <input
                    type="date"
                    name="delivery_date"
                    className={`form-control ${formErrors.delivery_date ? 'is-invalid' : ''}`}
                    value={newLoad.delivery_date}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {formErrors.delivery_date && <span className="field-error">{formErrors.delivery_date}</span>}
                </div>
              </div>

              <div className="form-group mb-3">
                <label>Cargo Dimensions / Notes</label>
                <input
                  type="text"
                  name="dimensions"
                  className="form-control"
                  placeholder="e.g. 53ft Dry Van / Refrigerated"
                  value={newLoad.dimensions}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? <LoadingSpinner text="Submitting..." /> : 'Post Freight Load'}
              </button>
            </form>
          </div>
        </div>

        {/* Load List Column */}
        <div className="card shadow-sm">
          <div className="card-header">
            <h3>Your Posted Freight Loads</h3>
          </div>
          <div className="card-body">
            {loads.length === 0 ? (
              <p className="empty-text">No loads posted yet. Create your first load booking using the form!</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Route</th>
                      <th>Weight / Price</th>
                      <th>Pickup Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loads.map((load) => (
                      <tr key={load.id}>
                        <td>#{load.id}</td>
                        <td>
                          <strong>{load.origin}</strong> ➔ <strong>{load.destination}</strong>
                        </td>
                        <td>
                          {load.weight_tons} Tons | <span className="price-tag">${load.price}</span>
                        </td>
                        <td>{load.pickup_date}</td>
                        <td>
                          <span className={`status-badge status-${load.status}`}>
                            {load.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {load.status === 'pending' && (
                            <button
                              onClick={() => handleCancelLoad(load.id)}
                              className="btn btn-outline-danger btn-xs"
                            >
                              Cancel
                            </button>
                          )}
                          {load.status !== 'pending' && <span className="text-muted">Locked</span>}
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

      {/* Bookings Section */}
      <div className="card shadow-sm mt-4">
        <div className="card-header">
          <h3>Booking History & Assigned Drivers 🚛</h3>
        </div>
        <div className="card-body">
          {bookings.length === 0 ? (
            <p className="empty-text">No active or historical bookings found.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Load Route</th>
                    <th>Driver License</th>
                    <th>Truck Plate</th>
                    <th>Booking Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>#{booking.id}</td>
                      <td>
                        {booking.load_details?.origin} ➔ {booking.load_details?.destination}
                      </td>
                      <td>{booking.driver_details?.license_number || 'N/A'}</td>
                      <td>{booking.truck_details?.license_plate || 'N/A'}</td>
                      <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${booking.status}`}>
                          {booking.status.toUpperCase().replace('_', ' ')}
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

export default UserDashboard;
