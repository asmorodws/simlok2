# Next.js Role-Based Authentication Boilerplate

A complete authentication system built with Next.js 15, NextAuth.js, Prisma, and TypeScript featuring role-based access control (RBAC) with three user roles: Admin, Verifier, and Vendor.

## 🚀 Features

- **Authentication**: Secure login/register with NextAuth.js
- **Role-Based Access Control**: Three distinct user roles with hierarchical permissions
- **Database Integration**: Prisma ORM with MySQL database
- **Modern Stack**: Next.js 15, TypeScript, Tailwind CSS
- **Security**: Password hashing with bcryptjs, JWT tokens
- **Protected Routes**: Middleware-based route protection
- **Responsive Design**: Clean UI with Tailwind CSS
- **Session Management**: Server and client-side session handling

## 🏗️ Architecture

### User Roles & Hierarchy
- **ADMIN** (Level 3): Full access to all features
- **VERIFIER** (Level 2): Access to verification features and vendor capabilities
- **VENDOR** (Level 1): Basic access to vendor-specific features

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: NextAuth.js v4
- **Database**: MySQL with Prisma ORM
- **Styling**: Tailwind CSS v4
- **Security**: bcryptjs for password hashing

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── register/page.tsx    # Registration page
│   │   ├── (dashboard)/
│   │   │   ├── admin/page.tsx       # Admin dashboard
│   │   │   ├── vendor/page.tsx      # Vendor dashboard
│   │   │   └── verifier/page.tsx    # Verifier dashboard
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/route.ts  # NextAuth API routes
│   │   ├── components/
│   │   │   ├── LogoutButton.tsx     # Logout functionality
│   │   │   ├── Navbar.tsx           # Navigation component
│   │   │   └── RoleGate.tsx         # Role-based component wrapper
│   │   ├── lib/
│   │   │   ├── auth.ts              # NextAuth configuration
│   │   │   └── prisma.ts            # Prisma client
│   │   └── types/
│   │       └── next.auth.d.ts       # NextAuth type extensions
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── seed.ts                      # Database seeding
│   └── migrations/                  # Database migrations
├── middleware.ts                    # Route protection middleware
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- MySQL database
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd new-simple-crud-auth
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/your_database_name"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with sample users
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔐 Default Users

After running the seed command, you can login with these test accounts:

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@example.com      | admin123     |
| Verifier | verifier@example.com   | verifier123  |
| Vendor   | vendor@example.com     | vendor123    |

## 🎯 Usage

### Authentication Flow
1. **Register**: Create new account with role selection
2. **Login**: Authenticate with email/password
3. **Dashboard**: Access role-specific dashboard content
4. **Protected Routes**: Automatic redirection based on permissions

### Role-Based Access
- **Middleware Protection**: Routes are protected at the middleware level
- **Component-Level Guards**: Use `RoleGate` component for conditional rendering
- **Hierarchical Permissions**: Higher roles inherit lower role permissions

### API Routes
- `POST /api/auth/register` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

## 🔧 Configuration

### Adding New Roles
1. Update the `Role` enum in `prisma/schema.prisma`
2. Modify `roleHierarchy` in `middleware.ts`
3. Update type definitions in `src/types/next.auth.d.ts`
4. Add new dashboard pages in `src/app/(dashboard)/`

### Protected Routes
Add new protected routes in `middleware.ts`:

```typescript
const protectedRoutes: { prefix: string; minRole: Role }[] = [
  { prefix: "/admin", minRole: "ADMIN" },
  { prefix: "/verifier", minRole: "VERIFIER" },
  { prefix: "/vendor", minRole: "VENDOR" },
  { prefix: "/your-new-route", minRole: "VENDOR" }, // Add here
];
```

## 📦 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio
npx prisma db seed   # Seed database
```

## 🗄️ Database Schema

### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?
  role          Role      @default(VENDOR)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  sessions Session[]
  accounts Account[]
}

enum Role {
  VENDOR
  VERIFIER
  ADMIN
}
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure session management
- **CSRF Protection**: Built-in NextAuth.js protection
- **Route Protection**: Middleware-based authentication
- **Role Validation**: Server-side role checking

## 🚀 Deployment

### Environment Variables
Ensure these environment variables are set in production:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Database Migration
```bash
npx prisma migrate deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify `DATABASE_URL` in `.env.local`
- Ensure MySQL server is running
- Check database permissions

**Authentication Problems**
- Verify `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again
- Check console for detailed error messages

**Role Access Issues**
- Verify user role in database
- Check middleware configuration
- Ensure proper role hierarchy setup

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---