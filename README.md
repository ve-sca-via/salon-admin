# Salon Admin Panel

A standalone, production-ready admin panel for managing salon operations. Built with React, Redux Toolkit, and Supabase.

## Features

- 🔐 **Secure Authentication** - Admin-only access with role-based permissions
- 📊 **Dashboard Analytics** - Real-time metrics, charts, and KPIs
- 👥 **User Management** - Full CRUD operations for user accounts
- 📅 **Appointment Management** - Track and update appointment statuses
- 💼 **Services Management** - Create and manage salon services
- 👨‍💼 **Staff Management** - Manage staff members and their schedules
- 🔑 **Service-Role Access** - Uses Supabase service role for privileged operations
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🔄 **Real-time Updates** - Redux state management with async operations

## Tech Stack

- **Frontend:** React 19, Redux Toolkit, React Router
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Notifications:** React Toastify
- **Build Tool:** Vite

## Architecture Benefits

### Why a Separate Admin Panel?

1. **Independent Deployment** - Deploy and update without affecting customer app
2. **Security Isolation** - Admin uses privileged service-role keys
3. **Performance** - Admin features don't bloat the customer-facing app
4. **Standalone Operation** - Works even if main app is down
5. **Different Access Levels** - Can be hosted on internal network/VPN
6. **Specialized Features** - Bulk operations, exports, advanced analytics

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_ADMIN_EMAIL_DOMAIN=@yourdomain.com
VITE_APP_NAME=Salon Admin Panel
```

**IMPORTANT:** Never commit the `.env` file to version control. The service role key has elevated privileges.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Database Schema Required

Ensure your Supabase project has these tables:

**users** - email, full_name, phone, role, created_at
**appointments** - user_id, service_id, staff_id, appointment_date, appointment_time, status, notes
**services** - name, description, duration, price
**staff** - full_name, email, phone, specialization, is_active

## Security Considerations

1. **Service Role Key** - Only use in admin panel, never in customer-facing app
2. **Admin Authentication** - Verify admin role on every protected route
3. **Environment Variables** - Keep service role key secure
4. **HTTPS Only** - Always use HTTPS in production

## File Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   └── layout/          # Layout components
├── config/              # Configuration files
├── pages/               # Page components
├── store/               # Redux store & slices
├── App.jsx             # Main app component
└── main.jsx            # Entry point
```

## License

MIT License

