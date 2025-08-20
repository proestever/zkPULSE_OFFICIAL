# ZK Pulse Brand Resources

## 🎨 Brand Identity

### Primary Colors
- **Matrix Green**: `#00ff41` (Primary brand color)
- **Dark Background**: `#000000` to `#0a0a0a` (Gradient)
- **Text Light**: `#e0e0e0`
- **Error/Disconnect**: `#ff0033`

### Typography
- **Primary Font**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif
- **Monospace**: 'Courier New', monospace (for addresses and technical data)

## 📁 Logo Assets

### Main Logos
- **Full Logo with Text**: https://i.ibb.co/VpBjKyct/zkpulselogo2.png
  - Usage: Main website header, documentation
  - Dimensions: Scalable, max-width: 240px recommended

- **Icon/Favicon**: https://i.ibb.co/hv4t7hG/logo1.png
  - Usage: Browser favicon, small icons
  - Format: PNG, square aspect ratio

- **Alternative Full Logo**: https://i.ibb.co/wZqLV5gf/zkpulse-full-logo.png
  - Usage: Alternative version for different backgrounds

### Social Media Assets
- **OpenGraph Image**: https://i.ibb.co/XZqSBcS2/zkfork.png
  - Usage: Social media sharing (Twitter, Facebook, Telegram, Discord)
  - Dimensions: 1200x630px (optimized for social cards)

### Additional Resources
- **PLS Token Logo**: https://tokens.app.pulsex.com/images/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27.png
  - Usage: Displayed next to PLS amounts in UI

## 🎯 Usage Guidelines

### Logo Usage
1. **Maintain Clear Space**: Keep at least 20px of clear space around logos
2. **Background**: Logos work best on dark backgrounds (#000000 to #0a0a0a)
3. **Minimum Size**: Don't scale logos below 32px height for readability

### Color Application
- **Primary Actions**: Use Matrix Green (#00ff41) for:
  - Connected wallet states
  - Success messages
  - Active selections
  - Hover effects

- **Warnings/Errors**: Use Red (#ff0033) for:
  - Disconnection prompts
  - Error messages
  - Warning states

### Animation Guidelines
- **Glow Effects**: `box-shadow: 0 0 20px rgba(0, 255, 65, 0.3)`
- **Transitions**: Use 0.3s ease for smooth interactions
- **Pulse Animation**: 2s ease-in-out infinite for attention

## 💻 CSS Implementation

### Matrix Theme Glow
```css
.matrix-glow {
    box-shadow: 0 0 30px rgba(0, 255, 65, 0.5),
                0 0 60px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
}
```

### Button Styles
```css
.matrix-button {
    background: rgba(10, 10, 10, 0.7);
    border: 2px solid #00ff41;
    color: #00ff41;
    transition: all 0.3s;
}

.matrix-button:hover {
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
}
```

### Glass Effect
```css
.glass-card {
    background: rgba(10, 10, 10, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.05);
}
```

## 📋 Brand Messaging

### Taglines
- "Privacy for PulseChain"
- "Private Transactions on PulseChain"
- "Zero-Knowledge, Full Privacy"

### Description
ZK Pulse is the premier privacy protocol on PulseChain. Send and receive PLS with complete anonymity using zero-knowledge proofs. Non-custodial, decentralized, and fully on-chain.

### Keywords
- PulseChain
- Privacy
- Zero-knowledge proofs
- ZK-SNARKs
- Tornado Cash
- Mixer
- Anonymous transactions
- DeFi privacy

## 🔗 Quick Links

### Hosted Assets (Always Available)
All brand assets are hosted on imgbb for reliable access:
- Main Logo: https://i.ibb.co/VpBjKyct/zkpulselogo2.png
- Favicon: https://i.ibb.co/hv4t7hG/logo1.png
- Social Card: https://i.ibb.co/XZqSBcS2/zkfork.png

### Implementation Examples
- Live Website: https://zkpulse.app
- GitHub Repository: https://github.com/proestever/Pulsechain_Tornado_Cash_zkPULSE

## 📝 Notes

- All logos are optimized for dark backgrounds
- The Matrix green theme is central to the brand identity
- Maintain consistency across all platforms and materials
- When in doubt, reference the live website for current implementation

---

For questions about brand usage or to request additional assets, please open an issue on GitHub.