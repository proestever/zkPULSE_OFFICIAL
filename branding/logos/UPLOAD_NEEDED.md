# Images Need External Hosting

GitHub raw URLs don't work reliably for embedding images in websites. The following images from this folder need to be uploaded to imgbb or another image hosting service:

## Images to Upload:

1. **zkpulse_favicon.png**
   - Current location: `/branding/logos/zkpulse_favicon.png`
   - Usage: Site favicon
   - Upload to imgbb and update in:
     - `frontend/index.html`
     - `frontend/docs.html`

2. **zkbanner_main.png**
   - Current location: `/branding/logos/zkbanner_main.png`
   - Usage: Main site logo/banner
   - Upload to imgbb and update in:
     - `frontend/index.html`
     - `frontend/docs.html`

3. **githublogo_zkpulse.png**
   - Current location: `/branding/logos/githublogo_zkpulse.png`
   - Usage: GitHub link button icon
   - Upload to imgbb and update in:
     - `frontend/index.html` (currently using SVG as fallback)

## How to Upload to imgbb:
1. Go to https://imgbb.com
2. Click "Start Uploading"
3. Upload the image
4. Copy the direct link URL
5. Update the relevant HTML files with the new URL

## Current Working Images (imgbb):
- Logo: https://i.ibb.co/VpBjKyct/zkpulselogo2.png
- Favicon: https://i.ibb.co/hv4t7hG/logo1.png
- Social Card: https://i.ibb.co/XZqSBcS2/zkfork.png

Once uploaded, update the `assets.json` file with the new imgbb URLs.