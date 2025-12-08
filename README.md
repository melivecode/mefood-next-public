# MeFood - Restaurant Management System

MeFood is a modern, comprehensive restaurant management system built with Next.js 15. It provides complete table management, menu administration, order processing, and billing solutions for small to medium restaurants.

## 🌟 Features

### Restaurant Management
- **Table Management**: Interactive floor plan with drag-and-drop table positioning
- **Menu Administration**: Complete menu and category management with image uploads
- **Order Processing**: Real-time order tracking with kitchen and staff views
- **Billing System**: Comprehensive payment processing with receipt generation
- **Customer Sessions**: Guest check-in and seating management
- **Multi-language Support**: Thai and English language support

### Technical Features
- **Modern Stack**: Next.js 15 with App Router
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js v4 with JWT sessions
- **UI Framework**: Material-UI (MUI) with custom theming
- **Real-time Updates**: Dynamic order and table status updates
- **Mobile Responsive**: Optimized for mobile and desktop use

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17.0 or higher
- MySQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone [your-repo-url]
cd mefood-next-public
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file with:
```env
DATABASE_URL="mysql://username:password@localhost:3306/mefood_db"
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Set up the database**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma Client
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

## 🏗️ Project Structure

```
mefood-next-public/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── restaurant/        # Restaurant dashboard
│   ├── restaurant-admin/  # Admin pages
│   └── menu/             # Public menu display
├── lib/                   # Utilities and components
│   ├── components/        # Reusable React components
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma database schema
└── public/               # Static assets
```

## 🗄️ Database Schema

### Core Models
- **User**: Restaurant owner with merged restaurant information
- **Table**: Table management with grid positioning
- **Category/MenuItem**: Menu structure with customizable options
- **Selection/SelectionOption**: Menu item customizations (size, toppings, etc.)
- **CustomerSession**: Guest session tracking and seating
- **Order/OrderItem**: Order management with sub-order support
- **Payment/PaymentItem**: Billing with snapshot data for reporting

### Key Features
- **Single-tenant Architecture**: One user = one restaurant
- **Comprehensive Order Flow**: From ordering to payment
- **Flexible Menu System**: Categories, items, and customizable selections
- **Table Management**: Interactive floor plan with positioning
- **Payment Tracking**: Complete billing history with receipt generation

## 🔧 Configuration

### Authentication
The application uses NextAuth.js for authentication with credentials (email/password). All users are automatically redirected to the restaurant dashboard after login.

### Database
MySQL database with Prisma ORM. The schema supports comprehensive restaurant operations including table management, menu administration, order processing, and billing.

### Styling
Material-UI (MUI) with custom theming and CSS-in-JS. Supports both light and dark themes with responsive design.

## 🌐 Deployment

### Production Deployment
```bash
npm run deploy
```

This will:
- Check Node.js version compatibility
- Build the application
- Set up necessary directories
- Start the application with PM2 (if available)

### Manual Deployment
```bash
npm run build
npm run start
```

The application runs on port 5544 in production.

## 🤝 Contributing

This project was developed by Karn Yongsiriwit (กานต์ ยงศิริวิทย์).

### Links
- **Website**: [melivecode.com](https://melivecode.com)
- **YouTube**: [@melivecode](https://youtube.com/@melivecode)
- **Facebook**: [melivecode](https://facebook.com/melivecode)
- **MeFood Demo**: [mefood.melivecode.com](https://mefood.melivecode.com/)

## 📄 License

© 2025 MeFood. Built by Karn Yongsiriwit.

## 🚨 Support

For support and documentation, please refer to the CLAUDE.md file in the project root for detailed technical information and common commands.