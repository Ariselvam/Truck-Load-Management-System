# 🚛 Bookey - Truck Load Management System

A full-stack enterprise logistics and freight booking application built with **React (Vite)**, **Django REST Framework (DRF)**, **SimpleJWT Authentication**, and **MySQL / SQLite**.

---

## 🌟 Key Features

### 🔐 1. JWT Authentication & Role Management
- **Role-based Authentication**: Distinct access for **Shipper**, **Carrier**, **Driver**, and **Admin**.
- **Separate Registration & Login**: Custom signup flows for standard users vs. drivers (with driver license validation).
- **JWT Token Management**: Access & Refresh token rotation with automatic token refresh via Axios interceptors and blacklisting on logout.

### 📦 2. Complete Freight Load Lifecycle (6 Stages)
Automatic state transitions across Load, Driver, and Truck entities:
1. `Pending` - Posted by Shipper, awaiting driver acceptance.
2. `Accepted` - Accepted by driver; driver status changes to `on_trip` and truck status to `busy`.
3. `Loading` - Cargo is being loaded onto the truck.
4. `In Transit` - Truck is actively driving on the route.
5. `Unloading` - Truck has arrived at destination and is unloading cargo.
6. `Completed` - Delivery confirmed; driver earnings credited; driver status resets to `active` and truck to `available`.

### 📍 3. Smart Nearby Load Matching
- After a driver completes a delivery, the system automatically checks the unloading destination location and suggests new pending loads originating from or near that location.

### 💰 4. Driver Earnings & Active Trip Stepper
- Visual 6-stage interactive stepper for drivers to update trip progress.
- Real-time driver earnings counter calculating revenue accumulated from completed trips.

### 📊 5. Role-Specific Dashboards
- **Shipper Portal**: Post new loads, set weight/dimensions/dates/prices, track load status, and review booking history.
- **Driver Portal**: Active trip stepper, earnings card, available load board, location-matched nearby loads, and trip history.
- **Admin Management Console**: Overview metrics for total users, drivers, trucks, loads, and bookings with full administration tables.

---

## 🏗️ Technology Stack

- **Frontend**: React 19, React Router v7, Axios, Vite, Vanilla CSS Design System with dark mode & glassmorphism.
- **Backend**: Python 3.14 / 3.13, Django 6.0, Django REST Framework, djangorestframework-simplejwt, django-cors-headers.
- **Database**: SQLite3 (default for zero-config dev) or MySQL (production ready).

---

## ⚙️ Step-by-Step Guide to Run on a New System

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Git**
- *(Optional)* **MySQL Server 8.0+**

---

### 2. Backend Setup (Django REST Framework)

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows**:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Database (MySQL or SQLite)**:
   - *Option A (Default - SQLite)*: No extra database configuration needed.
   - *Option B (MySQL)*:
     - Create a MySQL database:
       ```sql
       CREATE DATABASE truck_load_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
       ```
     - Update `backend/truck_load_system/settings.py`:
       ```python
       DATABASES = {
           'default': {
               'ENGINE': 'django.db.backends.mysql',
               'NAME': 'truck_load_db',
               'USER': 'root',
               'PASSWORD': 'your_mysql_password',
               'HOST': '127.0.0.1',
               'PORT': '3306',
           }
       }
       ```

5. **Run Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create Superuser (Admin)**:
   ```bash
   python manage.py createsuperuser
   ```
   *(Note: Set role to `admin` in Django Admin panel if registering via createsuperuser)*

7. **Run Backend Development Server**:
   ```bash
   python manage.py runserver
   ```
   The API will be available at: `http://127.0.0.1:8000/api/`

---

### 3. Frontend Setup (React + Vite)

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Start Frontend Development Server**:
   ```bash
   npm run dev
   ```
   The React application will be accessible at `http://localhost:5173`

---

## 🧪 Running Automated Tests

To execute the backend test suite verifying authentication, permissions, models, and load state transitions:

```bash
cd backend
python manage.py test
```

---

## 🌐 API Endpoint Architecture Reference

| Method | Endpoint Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Register Shipper/Carrier account | Public |
| `POST` | `/api/auth/driver/register/` | Register Driver account | Public |
| `POST` | `/api/auth/login/` | Obtain JWT tokens for User | Public |
| `POST` | `/api/auth/driver/login/` | Obtain JWT tokens for Driver | Public |
| `POST` | `/api/auth/logout/` | Blacklist refresh token | Authenticated |
| `POST` | `/api/auth/token/refresh/` | Rotate access token | Public |
| `GET/POST`| `/api/loads/` | List or create freight loads | Authenticated |
| `POST` | `/api/bookings/accept_load/` | Driver accepts available load | Driver |
| `POST` | `/api/bookings/{id}/update_status/` | Step trip status (6 stages) | Authenticated |
| `GET` | `/api/bookings/nearby_loads/` | Recommend loads by location | Driver |
| `GET` | `/api/bookings/driver_stats/` | Fetch driver earnings & trip info | Driver |
