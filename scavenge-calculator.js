// Tribal Wars Scavenge Calculator - MVP
// A minimal, maintainable scavenge calculator following KISS, DRY, YAGNI, and SOLID principles
// Optimizes for maximum resources per hour while maintaining legal compliance

(function() {
    'use strict';
    
    // === CONFIGURATION ===
    const CONFIG = {
        TROOP_CAPACITY: { 
            spear: 25, 
            sword: 15, 
            axe: 10, 
            archer: 10, 
            light: 80, 
            marcher: 50, 
            heavy: 50 
        },
        SCAVENGE_RATIOS: [0.10, 0.25, 0.50, 0.75],
        SELECTORS: {
            scavengeOptions: '.scavenge-option',
            troopInputs: 'input[name$="units"]',
            unitsDisplay: '.units-entry-all',
            scavengeForm: (level) => `#scavenge_option_${level - 1}`,
            troopInput: (form, unit) => form.querySelector(`input[name="${unit}"]`)
        }
    };

    // === UTILITY FUNCTIONS ===
    const utils = {
        formatTime: (hours) => {
            const h = Math.floor(hours);
            const m = Math.floor((hours - h) * 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        },
        
        formatNumber: (num) => Math.floor(num).toLocaleString(),
        
        findElement: (selector) => document.querySelector(selector)
    };

    // === GAME DATA EXTRACTION MODULE ===
    const GameData = {
        getWorldSpeed() {
            return window.game_data?.speed || 
                   window.game_data?.config?.speed ||
                   this._parseFromURL() || 
                   this._parseFromWorldData() ||
                   this._parseFromPageContent() ||
                   parseFloat(prompt("Enter world speed (e.g. 1.0, 1.2):")) || 1.0;
        },
        
        _parseFromURL() {
            const url = window.location.href;
            // Try multiple URL patterns
            const patterns = [
                /speed[\D]*([0-9.]+)/,
                /world[\D]*([0-9.]+)/,
                /s([0-9.]+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return parseFloat(match[1]);
            }
            return null;
        },
        
        _parseFromWorldData() {
            // Try other common Tribal Wars global variables
            if (window.TribalWars?.world?.speed) return window.TribalWars.world.speed;
            if (window.world_data?.speed) return window.world_data.speed;
            return null;
        },
        
        _parseFromPageContent() {
            // Look for speed in page content/elements
            const speedElements = document.querySelectorAll('[data-speed], .speed, #speed');
            for (const el of speedElements) {
                const speed = parseFloat(el.textContent || el.getAttribute('data-speed'));
                if (speed && speed > 0) return speed;
            }
            return null;
        },
        
        getTroops() {
            const troops = {};
            document.querySelectorAll(CONFIG.SELECTORS.unitsDisplay).forEach(el => {
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

    // === OPTIMIZATION CALCULATOR ===
    const Calculator = {
        optimize(userTroops, worldSpeed, mode = 'per-hour') {
            const totalCapacity = this._calculateCapacity(userTroops);
            const durationFactor = Math.pow(worldSpeed, -0.55);
            const availableScavenges = GameData.getScavenges();
            
            let distribution;
            switch (mode) {
                case 'per-run':
                    distribution = this._optimizeForMaxResources(totalCapacity, availableScavenges, durationFactor);
                    break;
                case 'equal-duration':
                    distribution = this._optimizeForEqualDuration(totalCapacity, availableScavenges, durationFactor);
                    break;
                case 'per-hour':
                default:
                    distribution = this._optimizeForEfficiency(totalCapacity, availableScavenges, durationFactor);
                    break;
            }
            
            return this._convertToResults(distribution, availableScavenges, userTroops, durationFactor);
        },
        
        _calculateCapacity(troops) {
            return Object.entries(troops).reduce((total, [unit, count]) => {
                return total + (count * (CONFIG.TROOP_CAPACITY[unit] || 0));
            }, 0);
        },
        
        _optimizeForEfficiency(totalCapacity, scavenges, durationFactor) {
            // Prioritize highest efficiency (resources per hour)
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
        
        _optimizeForMaxResources(totalCapacity, scavenges, durationFactor) {
            // Prioritize maximum total resources per run
            const distribution = new Array(scavenges.length).fill(0);
            let remaining = totalCapacity;
            
            // Prioritize highest ratio levels for maximum total resources
            const sortedIndexes = scavenges
                .map((s, i) => ({ index: i, ratio: s.ratio }))
                .sort((a, b) => b.ratio - a.ratio);
            
            for (const { index } of sortedIndexes) {
                if (remaining <= 0) break;
                const allocated = Math.min(remaining, totalCapacity / scavenges.length);
                distribution[index] = allocated;
                remaining -= allocated;
            }
            
            return distribution;
        },
        
        _optimizeForEqualDuration(totalCapacity, scavenges, durationFactor) {
            // Make all scavenges finish at approximately the same time
            const distribution = new Array(scavenges.length).fill(0);
            
            // Calculate capacity needed for each level to achieve equal duration
            // Duration formula: (capacity^2 * 100 * ratio^2)^0.45 + 1800) * durationFactor
            const targetDuration = 2; // Target 2 hours as baseline
            
            scavenges.forEach((scavenge, i) => {
                // Solve for capacity given target duration
                const baseDuration = (targetDuration * 3600) / durationFactor - 1800;
                if (baseDuration > 0) {
                    const capacity = Math.pow(baseDuration / (100 * Math.pow(scavenge.ratio, 2)), 1/0.9);
                    distribution[i] = Math.min(capacity, totalCapacity / scavenges.length);
                }
            });
            
            // Normalize to total capacity
            const totalAllocated = distribution.reduce((sum, cap) => sum + cap, 0);
            if (totalAllocated > totalCapacity) {
                const scale = totalCapacity / totalAllocated;
                for (let i = 0; i < distribution.length; i++) {
                    distribution[i] *= scale;
                }
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

    // === USER INTERFACE MODULE ===
    const UI = {
        create() {
            if (document.getElementById('scavenge-calc')) return;
            
            // Find the main content area to embed the calculator
            const mainContent = document.querySelector('#content_value') || 
                               document.querySelector('.content-container') || 
                               document.querySelector('body');
            
            const container = document.createElement('div');
            container.id = 'scavenge-calc';
            container.className = 'scavenge-calc';
            container.innerHTML = this._getHTML();
            
            mainContent.appendChild(container);
            this._addStyles();
            this._populateAvailableTroops();
        },
        
        _getHTML() {
            return `
                <div class="calc-header">
                    <h2>🏹 Scavenge Calculator</h2>
                    <div class="calc-info">
                        World Speed: <span id="speed-display">Detecting...</span>
                    </div>
                </div>
                
                <div class="calc-content">
                    <div class="calc-section">
                        <h3>Optimization Mode</h3>
                        <div class="optimization-modes">
                            <label class="mode-option">
                                <input type="radio" name="optimization-mode" value="per-hour" checked>
                                <span>Optimized per hour (maximum resources/hour)</span>
                            </label>
                            <label class="mode-option">
                                <input type="radio" name="optimization-mode" value="per-run">
                                <span>Optimized per run (maximum resources/run)</span>
                            </label>
                            <label class="mode-option">
                                <input type="radio" name="optimization-mode" value="equal-duration">
                                <span>Equal duration (all runs finish at same time)</span>
                            </label>
                        </div>
                    </div>

                    <div class="calc-section">
                        <h3>Troops to Send</h3>
                        <div class="troop-grid" id="troop-inputs"></div>
                    </div>

                    <div class="calc-actions">
                        <button onclick="handleCalculate()" class="calc-button primary">Calculate Optimal Distribution</button>
                        <button onclick="handleClearInputs()" class="calc-button secondary">Clear All</button>
                    </div>

                    <div id="results"></div>
                </div>
            `;
        },
        
        _addStyles() {
            if (document.getElementById('calc-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'calc-styles';
            style.textContent = `
                .scavenge-calc { 
                    background: #f4e4bc; 
                    border: 2px solid #7d510f; 
                    border-radius: 8px;
                    margin: 20px 0; 
                    font: 11px Verdana; 
                    max-width: 800px;
                }
                
                .calc-header {
                    background: #c1a264; 
                    padding: 12px 16px; 
                    border-bottom: 1px solid #7d510f;
                    border-radius: 6px 6px 0 0;
                }
                
                .calc-header h2 {
                    margin: 0 0 8px 0;
                    font-size: 16px;
                    color: #2c1810;
                }
                
                .calc-info {
                    font-size: 12px;
                    color: #5d4037;
                }
                
                .calc-content {
                    padding: 16px;
                }
                
                .calc-section {
                    margin-bottom: 20px;
                    padding: 12px;
                    background: #faf7f0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .calc-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    color: #2c1810;
                    border-bottom: 1px solid #c1a264;
                    padding-bottom: 4px;
                }
                
                .optimization-modes {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .mode-option {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                
                .mode-option:hover {
                    background-color: #e8f4f8;
                }
                
                .mode-option input[type="radio"] {
                    margin-right: 8px;
                }
                
                .troop-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 12px;
                    margin-top: 8px;
                }
                
                .troop-input { 
                    display: flex;
                    flex-direction: column;
                    background: white;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .troop-label {
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #2c1810;
                    text-transform: capitalize;
                }
                
                .troop-input-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .troop-input input {
                    flex: 1;
                    padding: 4px 6px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    font-size: 11px;
                }
                
                .troop-max {
                    font-size: 9px;
                    color: #666;
                    white-space: nowrap;
                }
                
                .calc-actions {
                    display: flex;
                    gap: 12px;
                    margin: 16px 0;
                }
                
                .calc-button { 
                    padding: 10px 16px; 
                    border: 1px solid #7d510f; 
                    cursor: pointer; 
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .calc-button.primary {
                    background: #4a90e2; 
                    color: white;
                    flex: 1;
                }
                
                .calc-button.primary:hover {
                    background: #357abd;
                }
                
                .calc-button.secondary {
                    background: #c1a264; 
                    color: #2c1810;
                }
                
                .calc-button.secondary:hover {
                    background: #a08c50;
                }
                
                .result { 
                    background: #e8f4f8; 
                    padding: 12px; 
                    margin: 8px 0; 
                    border-left: 4px solid #4a90e2;
                    border-radius: 4px;
                }
                
                .result-header {
                    font-weight: bold;
                    margin-bottom: 6px;
                    color: #2c1810;
                }
                
                .result-details {
                    font-size: 10px;
                    color: #555;
                    margin: 4px 0;
                }
                
                .send-btn { 
                    width: 100%; 
                    padding: 6px; 
                    background: #4a90e2; 
                    color: white; 
                    margin-top: 8px; 
                    border: none; 
                    cursor: pointer; 
                    border-radius: 3px;
                    font-size: 11px;
                }
                
                .send-btn:hover {
                    background: #357abd;
                }
                
                .results-summary {
                    background: #f0f8ff; 
                    padding: 12px; 
                    margin: 12px 0; 
                    border: 1px solid #4a90e2;
                    border-radius: 4px;
                    font-weight: bold;
                }
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
                        <div class="troop-label">${unit}</div>
                        <div class="troop-input-row">
                            <input type="number" id="troop-${unit}" min="0" max="${available}" value="0" placeholder="0">
                            <div class="troop-max">max: ${available.toLocaleString()}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('troop-inputs').innerHTML = troopInputsHTML;
        },
        
        getOptimizationMode() {
            const selected = document.querySelector('input[name="optimization-mode"]:checked');
            return selected ? selected.value : 'per-hour';
        },
        
        getUserTroops() {
            const troops = {};
            Object.keys(CONFIG.TROOP_CAPACITY).forEach(unit => {
                const input = document.getElementById(`troop-${unit}`);
                troops[unit] = parseInt(input?.value) || 0;
            });
            return troops;
        },
        
        displayResults(results, optimizationMode) {
            const container = document.getElementById('results');
            
            if (!results.length) {
                container.innerHTML = '<div style="margin: 10px 0; color: #666;">No valid scavenge options found.</div>';
                return;
            }
            
            let html = `<div class="calc-section"><h3>Results (${this._getOptimizationLabel(optimizationMode)})</h3>`;
            let totalWood = 0, totalClay = 0, totalIron = 0, totalDuration = 0;
            
            results.forEach(result => {
                const troopText = Object.entries(result.troops)
                    .filter(([unit, count]) => count > 0)
                    .map(([unit, count]) => `${count.toLocaleString()} ${unit}`)
                    .join(' + ');
                
                totalWood += result.wood;
                totalClay += result.clay;
                totalIron += result.iron;
                totalDuration = Math.max(totalDuration, result.duration);
                
                const efficiency = result.total / result.duration;
                
                html += `
                    <div class="result">
                        <div class="result-header">Level ${result.level}: ${troopText}</div>
                        <div class="result-details">
                            Resources: ${utils.formatNumber(result.wood)} wood, ${utils.formatNumber(result.clay)} clay, ${utils.formatNumber(result.iron)} iron
                        </div>
                        <div class="result-details">
                            Duration: ${utils.formatTime(result.duration)} | Efficiency: ${utils.formatNumber(efficiency)} res/hour
                        </div>
                        <button class="send-btn" onclick="sendScavenge(${result.level}, ${JSON.stringify(result.troops).replace(/"/g, "'")})">
                            Send Level ${result.level}
                        </button>
                    </div>
                `;
            });
            
            html += `
                <div class="results-summary">
                    <div>Total Resources: ${utils.formatNumber(totalWood)} wood, ${utils.formatNumber(totalClay)} clay, ${utils.formatNumber(totalIron)} iron</div>
                    <div>Overall Duration: ${utils.formatTime(totalDuration)} | Total per Hour: ${utils.formatNumber((totalWood + totalClay + totalIron) / totalDuration)}</div>
                </div>
            `;
            
            html += '</div>';
            container.innerHTML = html;
        },
        
        _getOptimizationLabel(mode) {
            const labels = {
                'per-hour': 'Optimized per Hour',
                'per-run': 'Optimized per Run', 
                'equal-duration': 'Equal Duration'
            };
            return labels[mode] || 'Unknown Mode';
        }
    };

    // === SCAVENGE SENDING MODULE ===
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

    // === GLOBAL EVENT HANDLERS ===
    window.handleCalculate = () => {
        const userTroops = UI.getUserTroops();
        const totalTroops = Object.values(userTroops).reduce((sum, count) => sum + count, 0);
        
        if (totalTroops === 0) {
            alert('Please enter some troops to calculate with.');
            return;
        }
        
        const worldSpeed = GameData.getWorldSpeed();
        const optimizationMode = UI.getOptimizationMode();
        const results = Calculator.optimize(userTroops, worldSpeed, optimizationMode);
        UI.displayResults(results, optimizationMode);
    };

    window.handleClearInputs = () => {
        Object.keys(CONFIG.TROOP_CAPACITY).forEach(unit => {
            const input = document.getElementById(`troop-${unit}`);
            if (input) input.value = '0';
        });
        
        // Clear results
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) resultsContainer.innerHTML = '';
    };

    window.sendScavenge = (level, troops) => ScavengeSender.send(level, troops);

    // === PAGE DETECTION ===
    function isScavengePage() {
        return window.location.href.includes('screen=place') && 
               window.location.href.includes('mode=scavenge');
    }

    // === INITIALIZATION ===
    function init() {
        if (!isScavengePage()) {
            // Auto-redirect to scavenge page
            const currentUrl = window.location.href;
            const baseUrl = currentUrl.split('?')[0].split('#')[0];
            const newUrl = baseUrl + '?screen=place&mode=scavenge';
            window.location.href = newUrl;
            return;
        }
        UI.create();
    }

    // Auto-start
    document.readyState === 'loading' 
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();