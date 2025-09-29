# AutoService Pro - Auto Service Management System

A comprehensive auto service management system built with React, TypeScript, and Supabase. This MVP provides all essential features for managing customers, vehicles, work orders, inventory, appointments, and billing in an auto service shop.

## Quick Setup

### 1. Supabase Configuration

Before running the application, you need to set up Supabase:

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the project to be fully initialized

2. **Get Your Credentials**
   - Go to Settings → API in your Supabase dashboard
   - Copy your Project URL and anon/public key

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the values with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Run Database Migration**
   - In your Supabase dashboard, go to SQL Editor
   - Copy and run the SQL from `supabase/migrations/20250929202229_warm_wildflower.sql`
   - This will create all necessary tables, policies, and sample data

### 2. Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Docker Deployment (On-Premise)

For production deployment with Docker:

```bash
# Build and run with Docker Compose
docker-compose up -d

# The application will be available at http://localhost:3000
```

### 4. First Login

After setup, you can create your first admin account:
- Click "Create Account" on the login page
- Fill in your details and select "Admin/Manager" role
- Sign up to create your account

## Features

### Core Features
- **Customer Management**: Complete customer profiles with contact information and service history
- **Vehicle Management**: Detailed vehicle records with maintenance history
- **Work Order System**: Create, track, and manage service jobs with status updates
- **Inventory Management**: Track parts and supplies with automatic stock alerts
- **Appointment Scheduling**: Schedule and manage service appointments
- **Billing & Invoicing**: Generate invoices and track payments
- **User Management**: Role-based access control for staff
- **Real-time Updates**: Live status updates and notifications
- **Dashboard**: Comprehensive overview with key metrics and alerts

## User Roles

### Admin/Manager
- Full access to all features
- Manage customers, vehicles, and inventory
- Create and assign work orders
- Schedule appointments
- Generate invoices and manage billing
- View comprehensive dashboard and reports

### Mechanic/Staff
- View assigned work orders
- Update work order status and add parts
- View customer and vehicle information
- Access basic dashboard with personal metrics

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with Row Level Security
- **Deployment**: Docker with Nginx

## Database Schema

The system includes the following main entities:
- **Customers**: Customer information and contact details
- **Vehicles**: Vehicle details linked to customers
- **Work Orders**: Service jobs with status tracking
- **Inventory Items**: Parts and supplies with stock management
- **Appointments**: Scheduled service appointments
- **User Profiles**: Staff roles and permissions
- **Work Order Parts**: Parts used in specific jobs

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" error**
   - Make sure you've created a `.env` file with valid Supabase credentials
   - Verify your Supabase project is active and the URLs are correct

2. **Database connection issues**
   - Ensure you've run the database migration in Supabase
   - Check that Row Level Security policies are properly configured

3. **Authentication problems**
   - Verify email confirmation is disabled in Supabase Auth settings
   - Check that user profiles are created properly after signup

### Support

For issues or questions, please check the database migration file and ensure all tables and policies are properly created in your Supabase project.

## License

MIT License - see LICENSE file for details.