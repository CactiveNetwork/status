# Status - Internal Deployment Tool

- Script to send logs and other important status information from PM2 to CactiveNetwork. 

- Internally used across a multitude of servers, administrative API key required.

---

### Setup:

1. Create a `.env` file or environment variable with the `TOKEN` variable set to your [CactiveConnections](https://dashboard.cactive.network) API key. Please note that your account must be of `ADMINISTRATOR` status for your data to be accepted.
2. Navigate to the correct directory and start `pm2 start dist/index.js --name Status`

