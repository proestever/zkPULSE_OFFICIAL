# zkPulse Deployment Guide

## Pre-Deployment Security Checklist

### ✅ Security Updates Applied
- [x] Rate limiting implemented
- [x] CORS protection configured  
- [x] Input validation added
- [x] Security headers enabled
- [x] Request size limits enforced
- [x] Sensitive data removed from logs
- [x] BigInt conversion issues fixed
- [x] Fee calculation corrected (PLS to wei conversion)

### ✅ UI Improvements Applied
- [x] Denomination selection highlighting
- [x] Explorer links updated to otter.pulsechain.com
- [x] Fee display corrected
- [x] "You will receive" calculation fixed

## Deployment Steps

### 1. Environment Setup

#### For Relayer Server:
1. Copy the environment template:
   ```bash
   cd relayer
   cp .env.template .env
   ```

2. Edit `.env` with your PRODUCTION values:
   ```env
   RELAYER_PRIVATE_KEY=your_production_private_key_here
   RELAYER_ADDRESS=your_production_relayer_address_here
   RPC_URL=https://rpc.pulsechain.com
   RELAYER_PORT=4000
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   NODE_ENV=production
   ```

3. **IMPORTANT**: Add `.env` to `.gitignore`:
   ```bash
   echo ".env" >> .gitignore
   git rm --cached relayer/.env
   git commit -m "Remove env file from tracking"
   ```

### 2. Update Configuration for Production

#### In `relayer-server-secure.js`:
- Update allowed origins to your production domains
- Adjust rate limits if needed
- Consider stricter limits for production

#### In `relayer-config.js`:
- Update relayer URLs from localhost to production URLs
- Ensure fee structure is correct
- Update relayer addresses

### 3. Deploy to Render

#### Frontend (unified-server.js):
1. Create `render.yaml` if not exists
2. Configure as web service
3. Set environment variables:
   - `PORT=8888`
   - Any other required vars

#### Relayer (relayer-server-secure.js):
1. Use the SECURE version for production
2. Set environment variables in Render dashboard:
   - `RELAYER_PRIVATE_KEY`
   - `RELAYER_ADDRESS`
   - `RPC_URL`
   - `ALLOWED_ORIGINS`
   - `NODE_ENV=production`

### 4. Production Security Measures

#### Immediate Actions:
1. **Change all private keys** - Never use test keys in production
2. **Update CORS origins** - Only allow your production domains
3. **Enable HTTPS** - Render provides this automatically
4. **Monitor logs** - Set up alerts for errors

#### Recommended Additional Security:
```javascript
// Add to relayer-server-secure.js

// API Key Authentication (optional but recommended)
const API_KEYS = process.env.API_KEYS?.split(',') || [];

const authenticateApiKey = (req, res, next) => {
    const apiKey = req.header('x-api-key');
    if (API_KEYS.length > 0 && !API_KEYS.includes(apiKey)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Apply to withdrawal endpoint
app.post('/v1/tornadoWithdraw', authenticateApiKey, withdrawLimiter, ...
```

### 5. Testing Before Going Live

1. **Test with small amounts first** (1 PLS denomination)
2. **Verify all endpoints work** with production URLs
3. **Check rate limiting** is working
4. **Test CORS** - ensure only your domains can access
5. **Monitor first few transactions** carefully

### 6. Monitoring Setup

#### Add health check endpoint (already included):
```bash
curl https://your-relayer.com/status
```

#### Set up monitoring:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Balance monitoring for relayer wallet
- Alert if balance < 100,000 PLS

### 7. Backup and Recovery

1. **Backup private keys** securely (use hardware wallet or secure vault)
2. **Document all configurations**
3. **Keep deployment scripts** updated
4. **Test recovery procedures**

## Post-Deployment Checklist

- [ ] All test private keys removed
- [ ] Production private keys secured
- [ ] CORS configured for production domains only
- [ ] Rate limiting tested and working
- [ ] SSL/HTTPS enabled
- [ ] Monitoring active
- [ ] Error logging configured
- [ ] Relayer wallet funded
- [ ] Small test transaction successful
- [ ] Documentation updated

## Emergency Procedures

### If Compromised:
1. Immediately transfer funds from relayer wallet
2. Disable relayer server
3. Rotate all private keys
4. Review logs for attack vectors
5. Update security measures

### If Service Down:
1. Check Render status page
2. Verify RPC endpoint is working
3. Check relayer wallet balance
4. Review error logs
5. Restart services if needed

## Support Contacts

- Render Support: https://render.com/support
- PulseChain RPC Issues: Use backup RPC endpoints
- Your Team Contact: [Add your contact info]

## Final Notes

**NEVER**:
- Commit private keys to git
- Use test keys in production
- Disable security features
- Ignore error logs
- Skip testing

**ALWAYS**:
- Keep relayer wallet funded
- Monitor for unusual activity
- Update dependencies regularly
- Test changes in staging first
- Document all changes

Good luck with your deployment! 🚀