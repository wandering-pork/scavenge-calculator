# 🏹 Tribal Wars Scavenge Calculator

A minimal, maintainable scavenge calculator that optimizes troop distribution for maximum resources per hour while maintaining full legal compliance with Tribal Wars rules.

## ✨ Features

- **Smart Optimization**: Automatically calculates optimal troop distribution across scavenge levels
- **Auto-Detection**: Detects world speed and available troops automatically  
- **Resource Breakdown**: Shows detailed wood/clay/iron gains and duration for each level
- **One-Click Population**: Fills scavenge forms with calculated troops (you still confirm manually)
- **Clean Interface**: Non-intrusive UI that appears in top-right corner
- **Legal Compliance**: One action per click, no automation, helper tool only

## 🚀 Quick Start

### Method 1: Browser Bookmark (Recommended)
1. Copy this entire line:
```javascript
javascript:$.getScript("https://wandering-pork.github.io/scavenge-calculator/scavenge-calculator.js")
```
2. Create a new bookmark in your browser
3. Paste the code as the URL
4. Navigate to your scavenge page and click the bookmark

### Method 2: Console Command
1. Go to your village scavenge page (Place → Scavenge)
2. Open browser console (F12)
3. Paste and run:
```javascript
$.getScript("https://wandering-pork.github.io/scavenge-calculator/scavenge-calculator.js")
```

## 📖 How to Use

1. **Navigate** to your village's scavenge page
2. **Run** the script using your bookmark or console
3. **Enter** how many troops you want to use for scavenging
4. **Click** "Calculate Optimal" to see recommendations
5. **Click** "Send Level X" buttons to populate each scavenge form
6. **Manually confirm** each scavenge by clicking "Start scavenging"

## ✅ Legal Compliance

This tool is designed to comply with Tribal Wars rules:

- ✅ **One action per click** - Calculate button and individual send buttons
- ✅ **No automation** - Does not automatically start scavenges
- ✅ **Helper tool only** - Provides recommendations, you make decisions
- ✅ **Manual confirmation** - You must click "Start scavenging" for each level

**Important**: Always get approval from Tribal Wars support before using any third-party tools.

## 🔧 Technical Details

### Architecture
- **KISS Principle**: Single optimization algorithm, minimal UI
- **DRY Principle**: Centralized configuration and utilities
- **YAGNI Principle**: Only essential features included
- **SOLID Principles**: Single responsibility modules with clear interfaces

### Algorithm
- Uses greedy optimization to maximize resources per hour
- Prioritizes high-efficiency scavenge levels
- Accounts for world speed and troop capacity constraints
- Calculates actual resource gains and duration

### Browser Support
- Works in all modern browsers
- Requires jQuery (already loaded in Tribal Wars)
- Uses ES6+ features with fallbacks

## 📁 Project Structure

```
scavenge-calculator/
├── scavenge-calculator.js    # Main userscript
├── index.html               # GitHub Pages landing page
├── README.md               # This file
└── tribalwars_scavenge_calculator.md  # Original specifications
```

## 🐛 Troubleshooting

### Script Not Loading
- Ensure you're on the scavenge page (`screen=place&mode=scavenge`)
- Check that jQuery is available (built into Tribal Wars)
- Try running in browser console first

### World Speed Not Detected
- The script will prompt you to enter world speed manually
- Check if `window.game_data.speed` is available
- Enter speed as decimal (e.g., 1.0, 1.2, 2.0)

### Troops Not Detected
- Ensure you're on the scavenge page with troops visible
- Check that `.units-entry-all` elements are present
- Refresh the page and try again

### Send Function Not Working
- Verify scavenge forms are present and not locked
- Check that form selectors match your world's HTML structure
- Ensure scavenges aren't already running

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 TODO / Roadmap

### Phase 1: MVP ✅
- [x] Core optimization algorithm
- [x] Basic UI implementation
- [x] Send functionality
- [x] Resource calculations
- [x] GitHub Pages hosting

### Phase 2: Enhancements
- [ ] Time constraint optimization
- [ ] Multiple optimization modes
- [ ] Better error handling
- [ ] Unit tests

### Phase 3: Polish
- [ ] Visual improvements
- [ ] Performance optimization
- [ ] Extended browser support
- [ ] Tribal Wars support approval

## ⚠️ Disclaimer

This tool is provided as-is for educational and utility purposes. Users are responsible for:
- Getting approval from Tribal Wars support before use
- Ensuring compliance with current game rules
- Using the tool responsibly and fairly

The authors are not responsible for any account actions taken by Tribal Wars moderators.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Tribal Wars community for feedback and testing
- InnoGames for creating an amazing strategy game
- Open source community for tools and inspiration

---

**Happy scavenging!** 🏹⚔️