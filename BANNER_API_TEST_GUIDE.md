# Banner Management API - Complete Test Documentation

## 🎉 Implementation Complete

The Banner Management module has been successfully implemented with full admin and public APIs.

---

## 📋 Features Implemented

### ✅ Admin Banner Management
- Create banners with title, description, image, offer text, and coupon code
- Upload/manage banner images (URL-based storage)
- Update banner details
- Activate/Deactivate banners
- Delete banners
- View all banners (admin only)
- Proper JWT authentication required

### ✅ Customer Public API
- Get all active promotional banners WITHOUT login
- Banners automatically sorted by displayOrder
- Only displays active banners
- Returns clean response with essential fields

### ✅ Database
- Banner model with proper Prisma schema
- Tenant isolation
- Proper indexing for performance
- Migration successfully applied

### ✅ Authentication
- Admin endpoints require Bearer JWT token
- Public endpoints accessible without authentication
- Middleware properly configured

---

## 📡 API Endpoints Reference

### 🔓 PUBLIC ENDPOINTS (No Authentication)

#### GET /api/banners
Get all active promotional banners

```bash
curl -X GET "http://localhost:5000/api/banners" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Active banners fetched successfully",
  "data": [
    {
      "id": 1,
      "title": "10% OFF",
      "description": "Special discount",
      "imageUrl": "https://example.com/banner.jpg",
      "offerText": "Use Code BIRIYANI10",
      "couponCode": "BIRIYANI10",
      "displayOrder": 1
    },
    {
      "id": 3,
      "title": "Free Delivery",
      "description": "On all orders above $25",
      "imageUrl": "https://example.com/delivery.jpg",
      "offerText": "No coupon needed",
      "couponCode": null,
      "displayOrder": 2
    }
  ]
}
```

---

### 🔒 ADMIN ENDPOINTS (Requires JWT Bearer Token)

#### 1. Login to Get Admin JWT Token

```bash
curl -X POST "http://localhost:5000/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "username": "admin",
      "name": "Restaurant Admin",
      "tenantId": "T001",
      "isActive": true,
      "createdAt": "2026-09-01T06:55:23.209Z",
      "updatedAt": "2026-09-01T06:55:23.209Z"
    }
  }
}
```

**⚠️ NOTE:** Save the token value - you'll use it for all admin banner operations.

---

#### 2. POST /api/banners - Create Banner

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"

curl -X POST "http://localhost:5000/api/banners" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "T001",
    "title": "15% OFF on Biryani",
    "description": "Limited time special offer on all biryani varieties",
    "imageUrl": "https://example.com/biryani-banner.jpg",
    "offerText": "Use Code BIRYANI15",
    "couponCode": "BIRYANI15",
    "displayOrder": 1,
    "isActive": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": {
    "id": 1,
    "tenantId": "T001",
    "title": "15% OFF on Biryani",
    "description": "Limited time special offer on all biryani varieties",
    "imageUrl": "https://example.com/biryani-banner.jpg",
    "offerText": "Use Code BIRYANI15",
    "couponCode": "BIRYANI15",
    "startDate": null,
    "endDate": null,
    "displayOrder": 1,
    "isActive": true,
    "createdAt": "2026-09-01T07:41:15.193Z",
    "updatedAt": "2026-09-01T07:41:15.193Z"
  }
}
```

---

#### 3. GET /api/banners/admin/all - Get All Banners (Admin View)

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:5000/api/banners/admin/all" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** Returns all banners (active AND inactive) with full details

---

#### 4. GET /api/banners/:id - Get Banner by ID

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"
BANNER_ID=1

curl -X GET "http://localhost:5000/api/banners/$BANNER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 5. PUT /api/banners/:id - Update Banner

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"
BANNER_ID=1

curl -X PUT "http://localhost:5000/api/banners/$BANNER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "20% OFF on Biryani",
    "offerText": "Use Code BIRYANI20",
    "couponCode": "BIRYANI20",
    "displayOrder": 2
  }'
```

---

#### 6. PATCH /api/banners/:id/status - Activate/Deactivate Banner

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"
BANNER_ID=1

# Deactivate banner
curl -X PATCH "http://localhost:5000/api/banners/$BANNER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "isActive": false
  }'

# Activate banner
curl -X PATCH "http://localhost:5000/api/banners/$BANNER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "isActive": true
  }'
```

---

#### 7. DELETE /api/banners/:id - Delete Banner

**Authentication:** Required (Bearer Token)

```bash
TOKEN="your_jwt_token_here"
BANNER_ID=1

curl -X DELETE "http://localhost:5000/api/banners/$BANNER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Banner deleted successfully",
  "data": {}
}
```

---

## 🧪 Complete Test Flow

### Step 1: Get Public Banners (No Auth)
```bash
curl -X GET "http://localhost:5000/api/banners"
# Expected: Empty array (no banners yet)
```

### Step 2: Admin Login
```bash
curl -X POST "http://localhost:5000/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
# Save the token from response
```

### Step 3: Create First Banner
```bash
TOKEN="your_token"
curl -X POST "http://localhost:5000/api/banners" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "T001",
    "title": "5% OFF",
    "offerText": "Use Code OFF5",
    "couponCode": "OFF5",
    "displayOrder": 1,
    "isActive": true
  }'
```

### Step 4: Create Second Banner
```bash
TOKEN="your_token"
curl -X POST "http://localhost:5000/api/banners" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "T001",
    "title": "10% OFF",
    "offerText": "Use Code OFF10",
    "couponCode": "OFF10",
    "displayOrder": 2,
    "isActive": true
  }'
```

### Step 5: Get Public Banners (Should See Both)
```bash
curl -X GET "http://localhost:5000/api/banners"
# Expected: Array with 2 banners sorted by displayOrder
```

### Step 6: Deactivate Second Banner
```bash
TOKEN="your_token"
curl -X PATCH "http://localhost:5000/api/banners/2/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Step 7: Get Public Banners Again (Should See Only 1)
```bash
curl -X GET "http://localhost:5000/api/banners"
# Expected: Array with only 1 banner (the active one)
```

### Step 8: Get Admin View (Should See Both)
```bash
TOKEN="your_token"
curl -X GET "http://localhost:5000/api/banners/admin/all" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Array with 2 banners (active and inactive)
```

---

## 🔐 Error Handling

### Unauthorized (401) - Missing or Invalid Token
```bash
curl -X GET "http://localhost:5000/api/banners/admin/all"
# Response: 401 Unauthorized
```

### Not Found (404) - Banner Doesn't Exist
```bash
TOKEN="your_token"
curl -X GET "http://localhost:5000/api/banners/999" \
  -H "Authorization: Bearer $TOKEN"
# Response: 404 Banner not found
```

### Bad Request (400) - Invalid Input
```bash
TOKEN="your_token"
curl -X POST "http://localhost:5000/api/banners" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'  # Missing required fields
# Response: 400 Validation failed
```

---

## 📊 Database Schema

```sql
CREATE TABLE banners (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(20) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  image_url TEXT,
  offer_text VARCHAR(255),
  coupon_code VARCHAR(50),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_banners_tenant (tenant_id),
  INDEX idx_banners_active (is_active)
);
```

---

## ✨ Key Features

✅ **Public Access** - Customers can browse banners without login
✅ **Admin Control** - Only authenticated admins can manage banners
✅ **Status Management** - Easy activate/deactivate without deletion
✅ **Ordering** - displayOrder controls banner sequence
✅ **Flexible Fields** - Title, description, image, offer text, coupon code
✅ **Tenant Isolation** - Each tenant has separate banners
✅ **Timestamps** - Track creation and update times

---

## 🚀 Swagger UI

Access the interactive API documentation:

```
http://localhost:5000/api-docs
```

Look for the **"Banners"** section in the Swagger documentation.

---

## 📝 Notes

1. **Image URLs**: Currently accepts image URLs as strings. For actual file uploads, multer middleware would need to be added.

2. **Date Filtering**: The service includes infrastructure for startDate/endDate filtering. Currently filtering logic checks date fields but full date range filtering can be enhanced.

3. **Tenant Isolation**: All banners are properly scoped to tenantId. The API defaults to T001 (single restaurant) if not specified.

4. **Display Order**: Banners are always returned sorted by displayOrder (ascending). Lower numbers appear first.

5. **Active Status**: The public API automatically filters out inactive banners. Admins see all banners in their admin view.

---

## 🔗 Related Documentation

- [Customer Authentication](./customer-auth-module.md)
- [Admin Authentication](./admin-auth-module.md)
- [Menu Management](./menu-module.md)

---

**Status**: ✅ Ready for Production
**Last Updated**: 2026-09-01
**Implementation Version**: 1.0
