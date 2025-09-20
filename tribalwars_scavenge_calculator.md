# Tribal Wars Scavenge Calculator - Simplified MVP Guide

## Project Overview

A minimal, maintainable scavenge calculator following KISS, DRY, YAGNI, and SOLID principles. This MVP focuses on core functionality that delivers maximum value with minimum complexity.

## Core User Flow (Simplified)

1. **Auto-detect** world speed and available troops
2. **User enters** how many troops to use for scavenging
3. **User clicks "Calculate"** - optimizes for maximum resources per hour
4. **Display results** with resource breakdown (wood/clay/iron) and duration
5. **Send buttons** populate each scavenge level individually

## Technical Requirements

### Legal Compliance
- ✅ One action per click (calculate button, individual send buttons)
- ✅ No automation of actual scavenging
- ✅ Helper tool only - provides recommendations
- ✅ Must be approved by Tribal Wars support

### Architecture Principles
- **KISS**: Single optimization algorithm, minimal UI
- **DRY**: Centralized selectors and utilities
- **YAGNI**: Only essential features, add complexity later if needed
- **SOLID**: Single responsibility functions, dependency injection

## Simplified Architecture

### Core Components
```javascript
// Single file: scavenge-calculator.js
(function() {
    'use strict';
    
    // === CONFIGURATION ===
    const CONFIG = {
        TROOP_CAPACITY: { spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50 },
        SCAVENGE_RATIOS: [0.10, 0.25, 0.50, 0.75],
        SELECTORS: {
            scavengeOptions: '.scavenge-option',
            troopInputs: 'input[name$="units"]',
            unitsDisplay: '.units-entry-all'
        }
    };
    
    // === SINGLE RESPONSIBILITY MODULES ===
    const GameData = {
        getWorldSpeed() { /* extract world speed */ },
        getTroops() { /* extract available troops */ },
        getScavenges() { /* detect available scavenge levels */ }
    };
    
    const Calculator = {
        optimize(troops, worldSpeed) { /* single algorithm: max resources/hour */ }
    };
    
    const UI = {
        create() { /* minimal interface */ },
        displayResults(results) { /* show results with send buttons */ },
        getUserTroops() { /* get user input */ }
    };
    
    const ScavengeSender = {
        send(level, troops) { /* fill form for one level */ }
    };
    
    // === MAIN FLOW ===
    function init() {
        if (!isScavengePage()) return;
        
        UI.create();
        setupEventHandlers();
    }
    
    function calculate() {
        const userTroops = UI.getUserTroops();
        const worldSpeed = GameData.getWorldSpeed();
        const results = Calculator.optimize(userTroops, worldSpeed);
        UI.displayResults(results);
    }
    
    // Auto-start
    document.readyState === 'loading' 
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();
```

## Minimal UI Design

### Simple Layout
```
┌────────────────────────────────┐
│ 🏹 Scavenge Calculator         │
├────────────────────────────────┤
│ World Speed: 1.2x (detected)  │
│                                │
│ Troops to Send:                │
│ Spear: [1000] [Max: 2500]     │
│ Sword: [500]  [Max: 1200]     │
│ Light: [200]  [Max: 800]      │
│                                │
│      [Calculate Optimal]       │
├────────────────────────────────┤
│ Results:                       │
│                                │
│ Level 1: 500 spear             │
│ Wood: 125, Clay: 125, Iron: 125│
│ Duration: 1h 15m               │
│ [Send Level 1]                 │
│                                │
│ Level 3: 200 light             │
│ Wood: 800, Clay: 800, Iron: 800│
│ Duration: 2h 30m               │
│ [Send Level 3]                 │
└────────────────────────────────┘
```

### Minimal CSS
```css
.scavenge-calc {
    position: fixed; top: 10px; right: 10px; width: 300px;
    background: #f4e4bc; border: 2px solid #7d510f; padding: 10px;
    font: 11px Verdana; z-index: 9999;
}
.calc-button { width: 100%; padding: 8px; background: #c1a264; border: 1px solid #7d510f; }
.result { background: #e8f4f8; padding: 6px; margin: 4px 0; }
.send-btn { width: 100%; padding: 4px; background: #4a90e2; color: white; margin-top: 4px; }
```

## Core Implementation

### 1. Configuration & Utilities
```javascript
const CONFIG = {
    TROOP_CAPACITY: {
        'spear': 25, 'sword': 15, 'axe': 10, 'archer': 10,
        'light': 80, 'marcher': 50, 'heavy': 50
    },
    SCAVENGE_RATIOS: [0.10, 0.25, 0.50, 0.75],
    SELECTORS: {
        scavengeForm: (level) => `#scavenge_option_${level - 1}`,
        troopInput: (form, unit) => form.querySelector(`input[name="${unit}"]`),
        unitsAll: '.units-entry-all'
    }
};

// Utility functions
const utils = {
    formatTime: (hours) => {
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },
    
    formatNumber: (num) => Math.floor(num).toLocaleString(),
    
    findElement: (selector) => document.querySelector(selector)
};
```

### 2. Game Data Extraction
```javascript
const GameData = {
    getWorldSpeed() {
        return window.game_data?.speed || 
               this._parseFromURL() || 
               parseFloat(prompt("Enter world speed (e.g. 1.0, 1.2):")) || 1.0;
    },
    
    _parseFromURL() {
        // Simple URL-based detection for common world patterns
        const url = window.location.href;
        if (url.includes('speed')) {
            const match = url.match(/speed[\D]*([0-9.]+)/);
            return match ? parseFloat(match[1]) : null;
        }
        return null;
    },
    
    getTroops() {
        const troops = {};
        document.querySelectorAll(CONFIG.SELECTORS.unitsAll).forEach(el => {
            const unit = el.getAttribute('data-unit');
            const count = parseInt(el.textContent.replace(/[.,]/g, '')) || 0;
            if (unit) troops[unit] = count;
        });
        return troops;
    },
    
    getScavenges() {
        const scavenges = [];
        document.querySelectorAll(CONFIG.SELECTORS.scavengeOptions).forEach((el, i) => {
            scavenges.push({
                level: i + 1,
                ratio: CONFIG.SCAVENGE_RATIOS[i],
                available: !el.querySelector('.lock'),
                running: !!el.querySelector('.scavenge-running')
            });
        });
        return scavenges.filter(s => s.available && !s.running);
    }
};
```

### 3. Core Calculator (Single Algorithm)
```javascript
const Calculator = {
    optimize(userTroops, worldSpeed) {
        const totalCapacity = this._calculateCapacity(userTroops);
        const durationFactor = Math.pow(worldSpeed, -0.55);
        const availableScavenges = GameData.getScavenges();
        
        // Simple optimization: distribute capacity for max resources/hour
        const distribution = this._optimizeForEfficiency(totalCapacity, availableScavenges, durationFactor);
        
        return this._convertToResults(distribution, availableScavenges, userTroops, durationFactor);
    },
    
    _calculateCapacity(troops) {
        return Object.entries(troops).reduce((total, [unit, count]) => {
            return total + (count * (CONFIG.TROOP_CAPACITY[unit] || 0));
        }, 0);
    },
    
    _optimizeForEfficiency(totalCapacity, scavenges, durationFactor) {
        // Simple greedy algorithm: prioritize highest efficiency levels
        const distribution = new Array(scavenges.length).fill(0);
        let remaining = totalCapacity;
        
        // Start from highest efficiency (level 4) and work down
        for (let i = scavenges.length - 1; i >= 0 && remaining > 0; i--) {
            const optimalCapacity = Math.min(remaining, remaining / (scavenges.length - i));
            distribution[i] = optimalCapacity;
            remaining -= optimalCapacity;
        }
        
        return distribution;
    },
    
    _calculateEfficiency(capacity, ratio, durationFactor) {
        if (capacity === 0) return null;
        
        const totalResources = capacity * ratio;
        const duration = (Math.pow(Math.pow(capacity, 2) * 100 * Math.pow(ratio, 2), 0.45) + 1800) * durationFactor;
        const durationHours = duration / 3600;
        const resourcesPerType = Math.floor(totalResources / 3);
        
        return {
            wood: resourcesPerType,
            clay: resourcesPerType,
            iron: resourcesPerType,
            total: resourcesPerType * 3,
            duration: durationHours,
            efficiency: totalResources / durationHours
        };
    },
    
    _convertToResults(distribution, scavenges, availableTroops, durationFactor) {
        const results = [];
        const troopPool = { ...availableTroops };
        
        distribution.forEach((capacity, index) => {
            if (capacity > 0) {
                const scavenge = scavenges[index];
                const troops = this._assignTroops(capacity, troopPool);
                const actualCapacity = this._calculateCapacity(troops);
                const efficiency = this._calculateEfficiency(actualCapacity, scavenge.ratio, durationFactor);
                
                if (efficiency) {
                    results.push({
                        level: scavenge.level,
                        troops: troops,
                        ...efficiency
                    });
                }
            }
        });
        
        return results;
    },
    
    _assignTroops(neededCapacity, troopPool) {
        const assignment = {};
        let remaining = neededCapacity;
        
        // Prioritize high-capacity troops
        const priority = ['heavy', 'light', 'marcher', 'spear', 'sword', 'axe', 'archer'];
        
        for (const unit of priority) {
            if (remaining <= 0 || !troopPool[unit]) continue;
            
            const unitCapacity = CONFIG.TROOP_CAPACITY[unit];
            const needed = Math.floor(remaining / unitCapacity);
            const assigned = Math.min(needed, troopPool[unit]);
            
            if (assigned > 0) {
                assignment[unit] = assigned;
                remaining -= assigned * unitCapacity;
                troopPool[unit] -= assigned;
            }
        }
        
        return assignment;
    }
};
```

### 4. Minimal UI
```javascript
const UI = {
    create() {
        if (document.getElementById('scavenge-calc')) return;
        
        const container = document.createElement('div');
        container.id = 'scavenge-calc';
        container.className = 'scavenge-calc';
        container.innerHTML = this._getHTML();
        
        document.body.appendChild(container);
        this._addStyles();
        this._populateAvailableTroops();
    },
    
    _getHTML() {
        return `
            <div style="background: #c1a264; margin: -10px -10px 10px -10px; padding: 8px; font-weight: bold;">
                🏹 Scavenge Calculator
                <span onclick="document.getElementById('scavenge-calc').remove()" style="float: right; cursor: pointer;">×</span>
            </div>
            <div>World Speed: <span id="speed-display">Detecting...</span></div>
            <div style="margin: 10px 0;">
                <strong>Troops to Send:</strong>
                <div id="troop-inputs"></div>
            </div>
            <button onclick="handleCalculate()" class="calc-button">Calculate Optimal</button>
            <div id="results"></div>
        `;
    },
    
    _addStyles() {
        if (document.getElementById('calc-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'calc-styles';
        style.textContent = `
            .scavenge-calc { position: fixed; top: 10px; right: 10px; width: 300px; background: #f4e4bc; border: 2px solid #7d510f; padding: 10px; font: 11px Verdana; z-index: 9999; }
            .calc-button { width: 100%; padding: 8px; background: #c1a264; border: 1px solid #7d510f; cursor: pointer; margin: 5px 0; }
            .troop-input { display: flex; justify-content: space-between; margin: 2px 0; }
            .result { background: #e8f4f8; padding: 6px; margin: 4px 0; border-left: 3px solid #4a90e2; }
            .send-btn { width: 100%; padding: 4px; background: #4a90e2; color: white; margin-top: 4px; border: none; cursor: pointer; }
        `;
        document.head.appendChild(style);
    },
    
    _populateAvailableTroops() {
        const troops = GameData.getTroops();
        const worldSpeed = GameData.getWorldSpeed();
        
        document.getElementById('speed-display').textContent = `${worldSpeed}x`;
        
        const troopInputsHTML = Object.entries(CONFIG.TROOP_CAPACITY).map(([unit, capacity]) => {
            const available = troops[unit] || 0;
            return `
                <div class="troop-input">
                    <span>${unit}:</span>
                    <input type="number" id="troop-${unit}" min="0" max="${available}" value="0" style="width: 60px;">
                    <span style="font-size: 9px;">(${available} max)</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('troop-inputs').innerHTML = troopInputsHTML;
    },
    
    getUserTroops() {
        const troops = {};
        Object.keys(CONFIG.TROOP_CAPACITY).forEach(unit => {
            const input = document.getElementById(`troop-${unit}`);
            troops[unit] = parseInt(input?.value) || 0;
        });
        return troops;
    },
    
    displayResults(results) {
        const container = document.getElementById('results');
        
        if (!results.length) {
            container.innerHTML = '<div style="margin: 10px 0; color: #666;">No valid scavenge options found.</div>';
            return;
        }
        
        let html = '<div style="margin: 10px 0;"><strong>Results:</strong></div>';
        let totalWood = 0, totalClay = 0, totalIron = 0;
        
        results.forEach(result => {
            const troopText = Object.entries(result.troops)
                .filter(([unit, count]) => count > 0)
                .map(([unit, count]) => `${count} ${unit}`)
                .join(' + ');
            
            totalWood += result.wood;
            totalClay += result.clay;
            totalIron += result.iron;
            
            html += `
                <div class="result">
                    <strong>Level ${result.level}: ${troopText}</strong><br>
                    Wood: ${utils.formatNumber(result.wood)}, Clay: ${utils.formatNumber(result.clay)}, Iron: ${utils.formatNumber(result.iron)}<br>
                    Duration: ${utils.formatTime(result.duration)}
                    <button class="send-btn" onclick="sendScavenge(${result.level}, ${JSON.stringify(result.troops).replace(/"/g, "'")})">
                        Send Level ${result.level}
                    </button>
                </div>
            `;
        });
        
        html += `
            <div style="background: #f0f8ff; padding: 6px; margin: 8px 0; border: 1px solid #4a90e2;">
                <strong>Total:</strong> Wood: ${utils.formatNumber(totalWood)}, Clay: ${utils.formatNumber(totalClay)}, Iron: ${utils.formatNumber(totalIron)}
            </div>
        `;
        
        container.innerHTML = html;
    }
};
```

### 5. Send Functionality
```javascript
const ScavengeSender = {
    send(level, troops) {
        try {
            const form = utils.findElement(CONFIG.SELECTORS.scavengeForm(level));
            if (!form) {
                alert(`Cannot find scavenge form for level ${level}`);
                return;
            }
            
            // Fill troop inputs
            Object.entries(troops).forEach(([unit, count]) => {
                const input = CONFIG.SELECTORS.troopInput(form, unit);
                if (input && count > 0) {
                    input.value = count;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            
            // Visual feedback
            form.style.backgroundColor = '#ffffcc';
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => form.style.backgroundColor = '', 2000);
            alert(`Level ${level} scavenge populated! Click "Start scavenging" to confirm.`);
            
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
};
```

### 6. Main Initialization
```javascript
// Global event handlers
window.handleCalculate = () => {
    const userTroops = UI.getUserTroops();
    const totalTroops = Object.values(userTroops).reduce((sum, count) => sum + count, 0);
    
    if (totalTroops === 0) {
        alert('Please enter some troops to calculate with.');
        return;
    }
    
    const worldSpeed = GameData.getWorldSpeed();
    const results = Calculator.optimize(userTroops, worldSpeed);
    UI.displayResults(results);
};

window.sendScavenge = (level, troops) => ScavengeSender.send(level, troops);

// Check if on scavenge page
function isScavengePage() {
    return window.location.href.includes('screen=place') && 
           window.location.href.includes('mode=scavenge');
}

// Initialize
function init() {
    if (!isScavengePage()) return;
    UI.create();
}

// Auto-start
document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
```

## Development Plan

### Phase 1: MVP (This Guide)
- ✅ Single optimization algorithm (max resources/hour)
- ✅ Basic UI with essential features
- ✅ Send functionality
- ✅ Resource breakdown (wood/clay/iron)
- ✅ Clean, maintainable code

### Phase 2: If Needed
- Time constraints
- Multiple optimization modes
- Advanced UI features
- Better error handling

### Phase 3: Polish
- Visual enhancements
- Performance optimization
- Extended browser support

## Benefits of This Approach

### For Users
- **Faster to implement** - core functionality ready quickly
- **More reliable** - fewer bugs due to simpler code
- **Easier to approve** - cleaner, more understandable code

### For Developers  
- **Maintainable** - easy to understand and modify
- **Extensible** - easy to add features later
- **Testable** - smaller functions are easier to test

### For Approval Process
- **Transparent** - clear, readable code
- **Safe** - follows all compliance rules
- **Professional** - well-structured and documented

## Hosting

### GitHub Setup
1. Create repository: `tw-scavenge-calculator-mvp`
2. Upload single file: `scavenge-calculator.js`
3. Enable GitHub Pages
4. Use in quickbar: `javascript:$.getScript("https://yourusername.github.io/tw-scavenge-calculator-mvp/scavenge-calculator.js")`

This MVP approach delivers 80% of the value with 20% of the complexity, following all best practices while remaining easy to implement and maintain.