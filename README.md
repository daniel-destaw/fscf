```markdown
# SCF Platform - Supply Chain Financing

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed

### One Command to Start Everything

```bash
# Clone the repository
git clone <your-repo-url>
cd scf-platform

# Start all services
docker compose up -d

# Start hot reload (for development)
docker compose watch
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Database Admin | http://localhost:8080 |

### Default Admin Login
- Email: `admin@example.com`
- Password: `changethis`

### Stop the Application

```bash
# Stop all services
docker compose down

# Stop and remove all data (database reset)
docker compose down -v
```

## 📝 How to Register

1. Go to http://localhost:5173/signup
2. Choose **Supplier** or **Buyer** tab
3. Fill in your information
4. Upload required documents
5. Submit for approval

## 🔧 Useful Commands

```bash
# View logs
docker compose logs -f

# Restart a service
docker compose restart backend

# Access database
docker compose exec db psql -U postgres -d app

# Run database migrations
docker compose exec backend alembic upgrade head
```

## ⚙️ Configuration

Edit `.env` file to change configuration:

```bash
# Required changes for production
SECRET_KEY=your-secret-key-here
POSTGRES_PASSWORD=strong-password-here
FIRST_SUPERUSER_PASSWORD=strong-password-here
```

Generate secure keys:
```bash
openssl rand -hex 32
```

---

**That's it! The application is now running at http://localhost:5173**
```

This README is minimal and focused only on getting the project running!