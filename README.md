# Trinity Metro Bike - Crypto Referral Platform

A comprehensive crypto-powered referral and wallet growth platform built with React.js and Node.js.

## 🚀 Features

### VIP System & Daily Earnings
The platform features a comprehensive VIP system with 10 different levels, each offering unique daily earning rates:

**VIP Levels & Daily Earnings:**
- **Starter** - $30 investment, $2/day earnings
- **Bronze** - $180 investment, $10/day earnings  
- **Silver** - $400 investment, $24/day earnings
- **Gold** - $1,000 investment, $50/day earnings
- **Platinum** - $1,500 investment, $65/day earnings
- **Diamond** - $2,000 investment, $75/day earnings
- **Elite** - $5,000 investment, $200/day earnings
- **Master** - $6,000 investment, $250/day earnings
- **Legend** - $12,000 investment, $500/day earnings
- **Supreme** - $25,000 investment, $800/day earnings

**Daily Task Earnings:**
- Users can start daily 1-hour earning sessions
- **Full daily amount is deposited immediately when task starts**
- Earnings are based on VIP level daily rate (e.g., $2/day for Starter)
- Each VIP level has a 24-hour cooldown between sessions

### Task & Reward System
The platform includes a comprehensive task system that rewards users for various activities:

**Available Task Types:**
- **Daily Earning Session** - Earn based on your VIP level's daily earning rate for 1-hour daily sessions (earnings deposited immediately when started)
- **Daily Login** - Earn $1.00 for logging in daily (repeatable every 24 hours)
- **Refer a Friend** - Earn $5.00 for each successful referral
- **Make Your First Deposit** - Earn $10.00 for completing your first deposit
- **Upgrade to VIP** - Earn $15.00 for joining any VIP level
- **Share on Social Media** - Earn $2.00 for social media sharing (repeatable every 12 hours)
- **Complete Survey** - Earn $3.00 for completing surveys (repeatable every 6 hours)
- **Watch Tutorial Video** - Earn $1.50 for watching tutorial videos (repeatable every 2 hours)
- **Verify Your Email** - Earn $2.00 for email verification (one-time)
- **Verify Your Phone** - Earn $2.00 for phone verification (one-time)
- **Complete Profile** - Earn $1.00 for completing profile information (one-time)

**Key Features:**
- **Immediate Earnings** - Daily task earnings are deposited to wallet immediately when task starts
- **Automatic Task Completion** - Tasks are automatically completed based on user actions
- **Wallet Integration** - All task rewards are automatically added to user wallets
- **Transaction Tracking** - Task rewards are recorded as transactions with type 'TASK_REWARD'
- **Repeatable Tasks** - Some tasks can be completed multiple times with cooldown periods
- **Real-time Updates** - Task status updates in real-time on the frontend

### User Features
- **User Registration & Authentication** with email/phone verification
- **VIP System** with 10 different levels, each with unique daily earning rates
- **Daily Task Earnings** based on VIP level (Starter: $2/day, Bronze: $10/day, Silver: $24/day, Gold: $50/day, etc.)
- **Referral System** with unique referral codes and bonus tracking
- **Coinbase Integration** for crypto deposits (BTC, ETH, USDT)
- **Internal Wallet** with automatic daily growth calculations
- **Withdrawal System** with admin approval workflow
- **Real-time Dashboard** with balance, earnings, and transaction history
- **Referral Management** with downline tracking and earnings
- **Task & Reward System** with automatic wallet rewards for completed tasks

### Admin Features
- **Admin Dashboard** with system statistics and analytics
- **User Management** with account status controls
- **Withdrawal Approval** system with manual processing
- **System Settings** for growth rates, bonuses, and limits
- **Referral Tree Visualization** for user hierarchies

### Security Features
- **JWT Authentication** with secure token management
- **Email/SMS OTP Verification** for account security
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **Admin Route Protection** with role-based access

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with Prisma ORM
- **JWT** for authentication
- **Nodemailer** for email services
- **Twilio** for SMS services
- **Coinbase Commerce API** for crypto payments
- **Node-cron** for scheduled tasks

### Frontend
- **React.js** with modern hooks
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **React Query** for API state management
- **React Hook Form** for form handling
- **Recharts** for data visualization

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Coinbase Commerce account
- Email service (Gmail/SMTP)
- Twilio account (optional, for SMS)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trinity-metro-bike/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   
4. **Setup Task System** (Optional but recommended)
   ```bash
   node scripts/setup-tasks.js
   ```
   This will create the task tables and seed default tasks for user engagement.
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/trinity_metro_bike"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   
   # Server
   PORT=5000
   NODE_ENV="development"
   FRONTEND_URL="https://www.tmb8080.online"
   
   # Coinbase Commerce
   COINBASE_COMMERCE_API_KEY="your-coinbase-api-key"
   COINBASE_COMMERCE_WEBHOOK_SECRET="your-webhook-secret"
   
   # Email (Gmail)
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-app-password"
   EMAIL_FROM="Trinity Metro Bike <noreply@trinitymetrobike.com>"
   
   # Admin
   ADMIN_EMAIL="admin@trinitymetrobike.com"
   ADMIN_PASSWORD="admin123"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Optional: Seed database
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: https://www.tmb8080.online
- Backend API: https://bambe.shop

## 🔧 Configuration

### Admin Settings
Access the admin panel at `/admin` to configure:
- Daily growth rate (default: 1%)
- Referral bonus rate (default: 5%)
- Minimum deposit/withdrawal amounts
- System maintenance mode

### Coinbase Commerce Setup
1. Create a Coinbase Commerce account
2. Generate API keys
3. Set up webhook endpoints for payment confirmations
4. Configure supported cryptocurrencies

### Email Configuration
For Gmail:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in EMAIL_PASS

## 🚀 Deployment

### Backend Deployment (DigitalOcean/VPS)

1. **Server Setup**
   ```bash
   # Install Node.js and PM2
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone and setup
   git clone <repository-url>
   cd trinity-metro-bike/backend
   npm install --production
   
   # Setup environment
   cp .env.example .env
   # Edit .env with production values
   
   # Database migration
   npm run db:push
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Frontend Deployment (Vercel/Netlify)

1. **Build the application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `GET /api/auth/profile` - Get user profile

### Wallet Endpoints
- `GET /api/wallet/stats` - Get wallet statistics
- `GET /api/wallet/transactions` - Get transaction history
- `GET /api/wallet/projected-earnings` - Calculate projected earnings

### Deposit Endpoints
- `POST /api/deposit/create` - Create deposit request
- `GET /api/deposit/history` - Get deposit history

### Withdrawal Endpoints
- `POST /api/withdrawal/request` - Request withdrawal
- `GET /api/withdrawal/history` - Get withdrawal history

### Admin Endpoints
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User management
- `PUT /api/admin/settings` - Update system settings

## 🔒 Security Considerations

- Always use HTTPS in production
- Regularly update dependencies
- Monitor for security vulnerabilities
- Implement proper backup strategies
- Use strong JWT secrets
- Enable database connection encryption
- Implement proper logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@trinitymetrobike.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 🔄 Scheduled Tasks

The system runs automated tasks:
- **Daily Wallet Growth**: Calculated at midnight UTC
- **Email Notifications**: Sent for deposits, withdrawals, referrals
- **Database Cleanup**: Removes expired OTP codes

## 📈 Monitoring

Recommended monitoring tools:
- **PM2 Monitoring** for process management
- **Database Monitoring** for PostgreSQL
- **Error Tracking** with services like Sentry
- **Uptime Monitoring** for API availability
# cashapp
