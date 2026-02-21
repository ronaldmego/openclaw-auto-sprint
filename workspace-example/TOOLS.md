# TOOLS.md — Example Local Notes

This file is for YOUR specific tool configurations, API keys, and local setup notes.
Skills define HOW tools work. This file is for WHAT you've configured.

## 🔑 API Keys & Secrets

Document where you store sensitive information:
- **Secrets Path**: `/path/to/your/.secrets/.env`
- **Permissions**: chmod 600
- **Backup**: Encrypted, offsite

## 🌐 Services

| Service | Type | Cost | Purpose | Notes |
|---------|------|------|---------|-------|
| Example API | REST API | $5/month | Data analysis | Rate limit: 1000/day |
| Cloud Storage | S3-compatible | Pay-per-use | File backup | Bucket: my-bucket |

## 🖥️ Local Infrastructure

| Tool | URL | Port | Status | Notes |
|------|-----|------|--------|-------|
| OCC Dashboard | http://localhost:3401 | 3401 | ✅ Active | Process: PM2 |
| Development DB | http://localhost:5432 | 5432 | ✅ Active | PostgreSQL |

## 🔧 Development Setup

```bash
# Example commands for your environment
npm install
docker-compose up -d
pm2 start ecosystem.config.js
```

## 📱 Notification Channels

| Channel | ID/Username | Purpose |
|---------|-------------|---------|
| Telegram | @your-username | Alerts, quick updates |
| Slack | #your-channel | Team coordination |
| Email | your@email.com | Important notifications |

## 🎯 Workflow Notes

Document your specific processes:
- How you handle alerts
- Preferred notification times
- Emergency contacts
- Backup procedures

## Example Integrations

```bash
# Send notification to Telegram
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID&text=Hello from OCC"

# Check service health
curl -f http://localhost:3401/api/tasks || echo "OCC is down!"
```

## Customization Tips

1. **Keep it current**: Update this file when you add/remove services
2. **Security first**: Never commit actual secrets, just document where they live
3. **Make it searchable**: Use consistent naming for quick ctrl+f
4. **Document the weird stuff**: The gotchas and workarounds you'll forget

---

*This is YOUR file. Make it useful for YOUR setup.*