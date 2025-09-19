# Cache Directory

This directory stores cached blockchain events to speed up withdrawals.

In production, cache files need to be pre-built and included in the deployment
since Render uses ephemeral filesystems.

To pre-build cache files locally and commit them:
1. Run: npm run precache
2. Wait for completion
3. Commit the generated cache files
4. Deploy to production

The cache will be included in the deployment and instantly available.