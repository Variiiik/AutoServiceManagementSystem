# AutoService Pro - Auto Service Management System

A comprehensive auto service management system built with React, TypeScript, Node.js, Express, and PostgreSQL. This MVP provides all essential features for managing customers, vehicles, work orders, inventory, appointments, and billing in an auto service shop.

## Features

### Core Features
- **Customer Management**: Complete customer profiles with contact information and service history
- **Vehicle Management**: Detailed vehicle records with maintenance history
- **Work Order System**: Create, track, and manage service jobs with status updates
- **Inventory Management**: Track parts and supplies with automatic stock alerts
- **Appointment Scheduling**: Schedule and manage service appointments
- **Billing & Invoices**: Generate professional invoices for completed work
- **Role-Based Access**: Separate permissions for Admin/Manager and Mechanic roles

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Axios for API communication
- Lucide React for icons
- Vite for build tooling

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing
- Express validation and security middleware

### Design Features
- **Mobile-Responsive**: Optimized for use on phones and tablets in the workshop
- **Modern UI**: Clean, professional design with intuitive navigation
- **Real-time Updates**: Live status updates and notifications
- **Dashboard Analytics**: Comprehensive overview of shop operations

## Quick Start with Docker

1. **Clone and start the application**:
   ```bash
   git clone <repository-url>
   cd auto-service-management
   docker-compose up -d
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

3. **Default login credentials**:
   - Email: admin@autoservice.com
   - Password: admin123

## Manual Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb auto_service_db
   
   # Run migrations
   npm run migrate
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env if needed (default API URL is http://localhost:5000/api)
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer (admin only)
- `PUT /api/customers/:id` - Update customer (admin only)
- `DELETE /api/customers/:id` - Delete customer (admin only)

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Create vehicle (admin only)
- `PUT /api/vehicles/:id` - Update vehicle (admin only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin only)

### Work Orders
- `GET /api/work-orders` - Get work orders (filtered by role)
- `POST /api/work-orders` - Create work order (admin only)
- `PUT /api/work-orders/:id` - Update work order
- `GET /api/work-orders/:id/parts` - Get work order parts
- `POST /api/work-orders/:id/parts` - Add part to work order

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create inventory item (admin only)
- `PUT /api/inventory/:id` - Update inventory item (admin only)
- `PATCH /api/inventory/:id/stock` - Update stock quantity

### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create appointment (admin only)
- `PUT /api/appointments/:id` - Update appointment (admin only)
- `PATCH /api/appointments/:id/status` - Update appointment status

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-orders` - Get recent work orders
- `GET /api/dashboard/today-appointments` - Get today's appointments
- `GET /api/dashboard/low-stock` - Get low stock items

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - System users (admin/mechanic)
- `customers` - Customer information
- `vehicles` - Vehicle records linked to customers
- `work_orders` - Service work orders
- `inventory_items` - Parts and supplies inventory
- `work_order_parts` - Parts used in work orders
- `appointments` - Service appointments

## Role-Based Access Control

### Admin/Manager Role
- Full access to all features
- Can manage customers, vehicles, inventory
- Can create and assign work orders
- Can schedule appointments
- Can generate billing and invoices

### Mechanic Role
- Can view assigned work orders
- Can update work order status and add parts
- Can view customer and vehicle information
- Can view inventory (read-only)
- Can view appointments

## Production Deployment

### Docker Deployment (Recommended)

1. **Build and deploy**:
   ```bash
   docker-compose up -d
   ```

2. **Environment variables for production**:
   - Set strong `JWT_SECRET`
   - Configure proper database credentials
   - Set `NODE_ENV=production`
   - Configure CORS for your domain

### Manual Deployment

1. **Build frontend**:
   ```bash
   npm run build
   ```

2. **Set up reverse proxy** (nginx/Apache) to serve frontend and proxy API requests

3. **Use process manager** (PM2) for the Node.js backend:
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name auto-service-api
   ```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.