# Notification System Implementation Guide

## Overview
This document describes the complete notification system implementation that integrates CRM, Backend, and Python Bot for the LoyaltyPrime App.

## Architecture

```
CRM Panel (Frontend)
    ↓ HTTP API
Backend (Node.js/Express + PostgreSQL)
    ↓ HTTP API
Python Bot (VK Long Poll)
    ↓ VK Messages API
Users (VK Mini App)
```

## Key Features Implemented

### 1. CRM Notification Management

#### Manual Broadcasts (Рассылки)
- **Audience Segmentation**: Send notifications to specific user segments based on classification:
  - 👥 All users
  - 🌱 New users (1 purchase, ≤14 days)
  - 🔥 Active users (2+ purchases, ≤7 days between)
  - ⭐ Regular users (2+ purchases, ≤3 days between)
  - 😴 Dormant users (≥20 days since last purchase)

- **No Type Selection**: All notifications are push notifications via VK bot
- **History Tracking**: All sent broadcasts are saved to database and displayed in CRM

#### Automatic Campaigns
- **Pre-configured Campaigns**:
  1. 😴 Dormant User Return - Targets dormant users
  2. 🎂 Birthday Congratulations - All users on their birthday
  3. 🔥 Streak Milestone - Active users achieving login streaks
  4. 🌱 New User Welcome - New users joining the platform

- **Custom Campaigns**: Add, edit, or delete custom campaigns
- **Editable Content**: Each campaign's name, title, message, and audience can be modified
- **Active/Inactive Toggle**: Enable or disable campaigns without deleting them
- **Database Persistence**: All campaigns are saved in PostgreSQL

### 2. Backend API Endpoints

#### Notification Broadcasts
- `POST /api/companies/:companyId/notifications/send` - Send broadcast to segment
- `GET /api/companies/:companyId/notifications/history` - Get broadcast history

#### Campaign Management
- `GET /api/companies/:companyId/campaigns` - Get all campaigns
- `POST /api/companies/:companyId/campaigns` - Create new campaign
- `PUT /api/campaigns/:campaignId` - Update campaign
- `DELETE /api/campaigns/:campaignId` - Delete campaign
- `PUT /api/campaigns/:campaignId/toggle` - Toggle campaign active status
- `POST /api/campaigns/:campaignId/execute` - Manually execute campaign

#### User Segmentation
- `GET /api/companies/:companyId/users/segment/:segment` - Get users by segment

### 3. Python Bot Integration

The bot (`bot/main.py`) now:
- Connects to backend API to fetch active campaigns
- Checks for users in target segments every 60 seconds
- Sends notifications only to users who are active in the bot
- Logs all sent notifications
- Uses VK Messages API for delivery

## Database Schema

### Tables Used

#### `notifications` - Broadcast History
```sql
- id: SERIAL PRIMARY KEY
- company_id: INTEGER
- type: VARCHAR (always 'push')
- title: VARCHAR
- message: TEXT
- audience: VARCHAR (segment)
- status: VARCHAR (pending, sent, failed)
- sent_count: INTEGER
- created_at: TIMESTAMP
- sent_at: TIMESTAMP
```

#### `notification_campaigns` - Automatic Campaigns
```sql
- id: SERIAL PRIMARY KEY
- company_id: INTEGER
- name: VARCHAR
- trigger_type: VARCHAR (dormant_return, birthday, streak_milestone, custom)
- title: VARCHAR
- message: TEXT
- audience: VARCHAR (segment)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `user_classification` - User Segments
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER
- company_id: INTEGER
- user_type: VARCHAR (new, active, regular, dormant)
- first_visit_date: TIMESTAMP
- last_purchase_date: TIMESTAMP
- last_app_visit_date: TIMESTAMP
- ... (additional tracking fields)
```

## How It Works

### Sending a Manual Broadcast
1. User opens CRM → Notifications module
2. Selects audience segment (e.g., "Dormant users")
3. Enters title and message
4. Clicks "Send Broadcast"
5. CRM sends POST request to backend
6. Backend:
   - Fetches users in selected segment from `user_classification`
   - Saves broadcast to `notifications` table with status 'sent'
   - Returns success with user count
7. Broadcast appears in history immediately

### Automatic Campaign Execution
1. Python bot runs `check_and_send_notifications()` every 60 seconds
2. Bot fetches all active campaigns from backend
3. For each active campaign:
   - Fetches target users based on audience segment
   - Checks which users are active in bot (`active_users` set)
   - Sends VK message to matching users
   - Calls backend to log execution in `notifications` table

### Creating/Editing Campaigns
1. User clicks "Add Campaign" in CRM
2. Fills in: name, trigger type, audience, title, message
3. Saves campaign to `notification_campaigns` table
4. Bot automatically picks up active campaigns on next cycle

## User Segmentation Logic

Users are classified based on their purchase behavior:

- **🌱 New**: 1 purchase, ≤14 days since first visit
- **🔥 Active**: 2+ purchases, ≤7 days between purchases
- **⭐ Regular**: 2+ purchases, ≤3 days between purchases
- **😴 Dormant**: 1+ purchases, ≥20 days since last purchase

Classification is updated automatically via:
- `initializeUserClassification()` - On first app visit
- `updateUserClassification()` - On each purchase/app visit
- `recalculateUserType()` - Periodic recalculation

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
node server.js
# Backend runs on http://localhost:3001
```

### 2. Python Bot Setup
```bash
cd bot
pip install vk_api requests
# Edit main.py to add your VK TOKEN
python main.py
```

### 3. CRM Access
```bash
# Open in browser
crm-panel/index.html
# Login with test credentials:
# Email: pizza@test.com
# Password: 123456
```

## Testing the System

### Test Manual Broadcast
1. Login to CRM
2. Navigate to "Уведомления" module
3. Select audience segment
4. Enter title: "Test Broadcast"
5. Enter message: "This is a test"
6. Click "Отправить рассылку"
7. Check history section - should appear immediately
8. Check database `notifications` table

### Test Automatic Campaigns
1. CRM should auto-create 4 default campaigns on first load
2. Verify campaigns in "Автоматические кампании" section
3. Edit a campaign to customize message
4. Toggle campaign on/off
5. Bot will automatically send notifications to active users

### Test Campaign Management
1. Click "➕ Добавить кампанию"
2. Create custom campaign
3. Verify it appears in campaigns list
4. Edit the campaign
5. Delete the campaign
6. All changes persist in database

## Integration Points

### CRM ↔ Backend
- All communication via REST API
- JSON request/response format
- Company ID from logged-in session

### Backend ↔ Database
- PostgreSQL with pg driver
- Parameterized queries for security
- Transactions for data consistency

### Backend ↔ Bot
- Bot polls backend API every 60 seconds
- Fetches campaigns and user segments
- No direct database access from bot

### Bot ↔ Users
- VK Messages API for delivery
- Only sends to users active in bot
- Long Poll for receiving messages

## Error Handling

- All API endpoints return `{ success: boolean, message/error: string }`
- CRM shows user-friendly alerts on errors
- Bot logs errors and continues running
- Database transactions rollback on failure

## Security Considerations

- Parameterized SQL queries prevent injection
- Company ID validation on all endpoints
- User segmentation respects company boundaries
- Bot only sends to verified VK users

## Future Enhancements

- Scheduled broadcasts (send at specific time)
- A/B testing for messages
- Delivery rate analytics
- User engagement tracking
- Rich media notifications (images, buttons)
- Multi-language support
- Rate limiting to prevent spam

## Troubleshooting

### Broadcasts not sending
- Check backend is running on port 3001
- Verify company ID is correct
- Check database connection
- Review browser console for errors

### Bot not sending notifications
- Verify VK TOKEN is set in main.py
- Check backend API is accessible
- Ensure users are in `active_users` set
- Review bot console logs

### Campaigns not appearing
- Check database `notification_campaigns` table
- Verify company ID matches
- Reload CRM panel
- Check browser console for API errors

## Files Modified

1. `backend/server.js` - Added notification API endpoints
2. `backend/database-pg.js` - Already had notification functions
3. `crm-panel/script.js` - Complete notification management UI
4. `crm-panel/index.html` - Already had correct structure
5. `bot/main.py` - Integrated with backend API

## Support

For issues or questions:
- Check console logs in browser (CRM)
- Check terminal output (Backend)
- Check bot console output
- Review database tables directly
- Contact: support@loyaltyprime.ru
