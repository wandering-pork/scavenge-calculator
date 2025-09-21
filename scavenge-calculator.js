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
            scavengeForm: (level) => [
                `#scavenge_option_${level - 1}`,
                `#scavenge_option_${level}`,
                `.scavenge-option:nth-child(${level})`,
                `[data-option="${level - 1}"]`,
                `[data-option="${level}"]`,
                `.scavenge_${level - 1}`,
                `.scavenge_${level}`
            ],
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
                   1.0; // Default to standard speed
        },
        
        _parseFromURL() {
            const url = window.location.href;
            const patterns = [
                /[?&]speed=([0-9.]+)/,           // ?speed=1.2
                /[?&]world_speed=([0-9.]+)/,     // ?world_speed=1.2
                /speed[\D]*([0-9.]+)/,           // speed:1.2 or similar
                /world[\D]*([0-9.]+)/            // world_speed:1.2 or similar
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return parseFloat(match[1]);
            }
            return null;
        },
        
        _parseFromWorldData() {
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
        optimize(userTroops, worldSpeed, mode = 'per-hour', selectedLevels = [1,2,3,4], maxDuration = null) {
            const totalCapacity = this._calculateCapacity(userTroops);
            const durationFactor = Math.pow(worldSpeed, -0.55);
            const allScavenges = GameData.getScavenges();
            
            // Filter scavenges to only include selected levels
            const availableScavenges = allScavenges.filter(s => selectedLevels.includes(s.level));
            
            if (availableScavenges.length === 0) {
                return [];
            }
            
            let distribution;
            switch (mode) {
                case 'per-run':
                    distribution = this._optimizeForMaxResources(totalCapacity, availableScavenges, durationFactor, maxDuration);
                    break;
                case 'equal-duration':
                    distribution = this._optimizeForEqualDuration(totalCapacity, availableScavenges, durationFactor, maxDuration);
                    break;
                case 'per-hour':
                default:
                    distribution = this._optimizeForEfficiency(totalCapacity, availableScavenges, durationFactor, maxDuration);
                    break;
            }
            
            return this._convertToResults(distribution, availableScavenges, userTroops, durationFactor, maxDuration);
        },
        
        _calculateCapacity(troops) {
            return Object.entries(troops).reduce((total, [unit, count]) => {
                return total + (count * (CONFIG.TROOP_CAPACITY[unit] || 0));
            }, 0);
        },
        
        _optimizeForEfficiency(totalCapacity, scavenges, durationFactor, maxDuration = null) {
            // Prioritize highest efficiency (resources per hour)
            const distribution = new Array(scavenges.length).fill(0);
            let remaining = totalCapacity;
            
            // Start from highest efficiency (level 4) and work down
            for (let i = scavenges.length - 1; i >= 0 && remaining > 0; i--) {
                let allocation = Math.min(remaining, remaining / (scavenges.length - i));
                
                // Apply time constraint if specified
                if (maxDuration) {
                    allocation = this._limitByDuration(allocation, scavenges[i].ratio, durationFactor, maxDuration);
                }
                
                distribution[i] = allocation;
                remaining -= allocation;
            }
            
            return distribution;
        },
        
        _optimizeForMaxResources(totalCapacity, scavenges, durationFactor, maxDuration = null) {
            // Prioritize maximum total resources per run
            const distribution = new Array(scavenges.length).fill(0);
            let remaining = totalCapacity;
            
            // Prioritize highest ratio levels for maximum total resources
            const sortedIndexes = scavenges
                .map((s, i) => ({ index: i, ratio: s.ratio }))
                .sort((a, b) => b.ratio - a.ratio);
            
            for (const { index } of sortedIndexes) {
                if (remaining <= 0) break;
                let allocation = Math.min(remaining, totalCapacity / scavenges.length);
                
                // Apply time constraint if specified
                if (maxDuration) {
                    allocation = this._limitByDuration(allocation, scavenges[index].ratio, durationFactor, maxDuration);
                }
                
                distribution[index] = allocation;
                remaining -= allocation;
            }
            
            return distribution;
        },
        
        _optimizeForEqualDuration(totalCapacity, scavenges, durationFactor, maxDuration = null) {
            // Make all scavenges finish at approximately the same time
            const distribution = new Array(scavenges.length).fill(0);
            
            // Use provided max duration or default to 2 hours
            const targetDuration = maxDuration || 2;
            
            scavenges.forEach((scavenge, i) => {
                // Solve for capacity given target duration
                const baseDuration = (targetDuration * 3600) / durationFactor - 1800;
                if (baseDuration > 0) {
                    // baseDuration = (capacity^2 * 100 * ratio^2)^0.45
                    // capacity = sqrt((baseDuration)^(1/0.45) / (100 * ratio^2))
                    const capacity = Math.sqrt(Math.pow(baseDuration, 1/0.45) / (100 * Math.pow(scavenge.ratio, 2)));
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
        
        _limitByDuration(capacity, ratio, durationFactor, maxDurationHours) {
            // Calculate what capacity would give us the max duration
            const maxDurationSeconds = maxDurationHours * 3600;
            const baseDuration = maxDurationSeconds / durationFactor - 1800;
            
            if (baseDuration <= 0) return 0;
            
            // Solve: baseDuration = (capacity^2 * 100 * ratio^2)^0.45
            // Therefore: capacity = sqrt((baseDuration)^(1/0.45) / (100 * ratio^2))
            const maxCapacity = Math.sqrt(Math.pow(baseDuration, 1/0.45) / (100 * Math.pow(ratio, 2)));
            
            return Math.min(capacity, maxCapacity);
        },
        
        _calculateEfficiency(capacity, ratio, durationFactor) {
            if (capacity === 0) return null;

            // Correct Tribal Wars formulas from website reference
            // Duration: ((Math.pow(Math.pow(iCap * r, 2) * 100 * Math.pow(iRatio, 2), 0.45) + 1800) * df)
            // For simplicity, assuming r = 1 (sending full capacity to this level)
            const r = 1; // proportion of troops sent to this level
            const baseDuration = Math.pow(Math.pow(capacity * r, 2) * 100 * Math.pow(ratio, 2), 0.45) + 1800;
            const duration = baseDuration * durationFactor;
            const durationHours = duration / 3600;

            // Resources: capacity * ratio (total), then split into 3 types
            const totalResources = capacity * ratio;
            const resourcesPerType = Math.floor(totalResources / 3);
            const remainder = totalResources - (resourcesPerType * 3);

            // Distribute remainder: wood gets first extra, clay gets second extra
            const wood = resourcesPerType + (remainder >= 1 ? 1 : 0);
            const clay = resourcesPerType + (remainder >= 2 ? 1 : 0);
            const iron = resourcesPerType;


            return {
                wood: wood,
                clay: clay,
                iron: iron,
                total: wood + clay + iron,
                duration: durationHours,
                efficiency: (wood + clay + iron) / durationHours
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
                        <h3>Time Constraint</h3>
                        <div class="time-constraint">
                            <label>
                                <input type="checkbox" id="enable-time-limit">
                                <span>Maximum duration:</span>
                            </label>
                            <div class="time-inputs">
                                <input type="number" id="max-hours" min="0" max="23" value="2" disabled> hours
                                <input type="number" id="max-minutes" min="0" max="59" value="0" disabled> minutes
                            </div>
                        </div>
                    </div>

                    <div class="calc-section">
                        <h3>Scavenge Levels to Include</h3>
                        <div class="scavenge-levels">
                            <label class="level-option">
                                <input type="checkbox" name="scavenge-levels" value="1" checked>
                                <span>Level 1 (10% efficiency)</span>
                            </label>
                            <label class="level-option">
                                <input type="checkbox" name="scavenge-levels" value="2" checked>
                                <span>Level 2 (25% efficiency)</span>
                            </label>
                            <label class="level-option">
                                <input type="checkbox" name="scavenge-levels" value="3" checked>
                                <span>Level 3 (50% efficiency)</span>
                            </label>
                            <label class="level-option">
                                <input type="checkbox" name="scavenge-levels" value="4" checked>
                                <span>Level 4 (75% efficiency)</span>
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
                    margin: 20px 0; 
                    font: 11px Verdana; 
                    max-width: 800px;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                }
                
                .calc-header {
                    background: linear-gradient(to bottom, #c1a264, #b8956a); 
                    padding: 12px 16px; 
                    border-bottom: 2px solid #7d510f;
                    position: relative;
                }
                
                .calc-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(to right, transparent, #fff, transparent);
                    opacity: 0.3;
                }
                
                .calc-header h2 {
                    margin: 0 0 8px 0;
                    font-size: 16px;
                    color: #2c1810;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
                }
                
                .calc-info {
                    font-size: 12px;
                    color: #5d4037;
                }
                
                .calc-content {
                    padding: 16px;
                    background: #f4e4bc;
                }
                
                .calc-section {
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #ebe3c7;
                    border: 1px solid #a08c50;
                    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .calc-section h3 {
                    margin: 0 0 10px 0;
                    font-size: 13px;
                    color: #2c1810;
                    font-weight: bold;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
                }
                
                .optimization-modes, .scavenge-levels {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .mode-option, .level-option {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 4px 6px;
                    background: #f4e4bc;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                
                .mode-option:hover, .level-option:hover {
                    background: #e8dcc0;
                    border-color: #c1a264;
                }
                
                .mode-option input, .level-option input {
                    margin-right: 8px;
                }
                
                .time-constraint {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .time-inputs {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 20px;
                }
                
                .time-inputs input {
                    width: 50px;
                    padding: 2px 4px;
                    border: 1px solid #a08c50;
                    background: #f4e4bc;
                    font: 11px Verdana;
                }
                
                .time-inputs input:disabled {
                    background: #ddd;
                    color: #999;
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
                    background: #ebe3c7;
                    padding: 8px;
                    border: 1px solid #a08c50;
                    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .troop-label {
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #2c1810;
                    text-transform: capitalize;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
                }
                
                .troop-input-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .troop-input input {
                    flex: 1;
                    padding: 3px 5px;
                    border: 1px solid #7d510f;
                    background: #f4e4bc;
                    font: 11px Verdana;
                    box-shadow: inset 1px 1px 1px rgba(0,0,0,0.2);
                }
                
                .troop-input input:focus {
                    outline: none;
                    border-color: #5d4037;
                    background: #fff;
                }
                
                .troop-max {
                    font-size: 9px;
                    color: #5d4037;
                    white-space: nowrap;
                }
                
                .calc-actions {
                    display: flex;
                    gap: 12px;
                    margin: 16px 0;
                }
                
                .calc-button { 
                    padding: 8px 12px; 
                    border: 2px outset #c1a264; 
                    cursor: pointer; 
                    font: bold 11px Verdana;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
                    transition: all 0.1s;
                }
                
                .calc-button.primary {
                    background: linear-gradient(to bottom, #c1a264, #b8956a);
                    color: #2c1810;
                    flex: 1;
                }
                
                .calc-button.primary:hover {
                    background: linear-gradient(to bottom, #b8956a, #a08c50);
                }
                
                .calc-button.primary:active {
                    border-style: inset;
                }
                
                .calc-button.secondary {
                    background: linear-gradient(to bottom, #ddd, #bbb);
                    color: #333;
                    border-color: #999;
                }
                
                .calc-button.secondary:hover {
                    background: linear-gradient(to bottom, #ccc, #aaa);
                }
                
                .calc-button.secondary:active {
                    border-style: inset;
                }
                
                .result { 
                    background: #ebe3c7; 
                    padding: 10px; 
                    margin: 6px 0; 
                    border: 1px solid #a08c50;
                    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .result-header {
                    font-weight: bold;
                    margin-bottom: 6px;
                    color: #2c1810;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
                }
                
                .result-details {
                    font-size: 10px;
                    color: #5d4037;
                    margin: 3px 0;
                }
                
                .send-btn { 
                    width: 100%; 
                    padding: 4px 8px; 
                    background: linear-gradient(to bottom, #c1a264, #b8956a);
                    color: #2c1810; 
                    margin-top: 6px; 
                    border: 1px outset #c1a264; 
                    cursor: pointer; 
                    font: bold 10px Verdana;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
                }
                
                .send-btn:hover {
                    background: linear-gradient(to bottom, #b8956a, #a08c50);
                }
                
                .send-btn:active {
                    border-style: inset;
                }
                
                .results-summary {
                    background: #f4e4bc; 
                    padding: 10px; 
                    margin: 10px 0; 
                    border: 2px solid #7d510f;
                    font-weight: bold;
                    color: #2c1810;
                    text-shadow: 1px 1px 0px rgba(255,255,255,0.5);
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
            this._setupEventHandlers();
        },
        
        _setupEventHandlers() {
            // Time limit checkbox handler
            const timeLimitCheckbox = document.getElementById('enable-time-limit');
            const timeInputs = document.querySelectorAll('#max-hours, #max-minutes');
            
            if (timeLimitCheckbox) {
                timeLimitCheckbox.addEventListener('change', () => {
                    timeInputs.forEach(input => {
                        input.disabled = !timeLimitCheckbox.checked;
                    });
                });
            }
        },
        
        getOptimizationMode() {
            const selected = document.querySelector('input[name="optimization-mode"]:checked');
            return selected ? selected.value : 'per-hour';
        },
        
        getTimeConstraint() {
            const enabled = document.getElementById('enable-time-limit')?.checked;
            if (!enabled) return null;
            
            const hours = parseInt(document.getElementById('max-hours')?.value) || 0;
            const minutes = parseInt(document.getElementById('max-minutes')?.value) || 0;
            return hours + (minutes / 60); // Return total hours
        },
        
        getSelectedLevels() {
            const checkboxes = document.querySelectorAll('input[name="scavenge-levels"]:checked');
            return Array.from(checkboxes).map(cb => parseInt(cb.value));
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
                const form = this._findScavengeForm(level);
                if (!form) {
                    console.error(`Cannot find scavenge form for level ${level}. Please check the page structure.`);
                    return;
                }

                // Fill troop inputs
                let populatedCount = 0;
                Object.entries(troops).forEach(([unit, count]) => {
                    if (count > 0) {
                        const input = this._findTroopInput(form, unit);
                        if (input) {
                            input.value = count;
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            populatedCount++;
                        }
                    }
                });

                if (populatedCount === 0) {
                    console.error(`Could not find troop input fields in level ${level} form.`);
                    return;
                }

                // Visual feedback
                form.style.backgroundColor = '#ffffcc';
                form.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Try to automatically click the start button
                setTimeout(() => {
                    const startButton = this._findStartButton(form);
                    if (startButton) {
                        startButton.click();
                    }
                    form.style.backgroundColor = '';
                }, 500);

            } catch (error) {
                console.error('ScavengeSender error:', error);
            }
        },
        
        _findScavengeForm(level) {
            const selectors = CONFIG.SELECTORS.scavengeForm(level);

            for (const selector of selectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element) return element;
                } catch (e) {
                    // Continue to next selector
                }
            }

            // Additional fallback: try to find by level number
            const allScavengeElements = document.querySelectorAll('.scavenge-option, [id*="scavenge"], [class*="scavenge"]');
            if (allScavengeElements[level - 1]) {
                return allScavengeElements[level - 1];
            }

            return null;
        },

        _findStartButton(form) {
            // Based on HTML structure, look for the start button within the scavenge option
            const startButton = form.querySelector('.free_send_button');
            if (startButton) return startButton;

            // Fallback to other button selectors
            const buttonSelectors = [
                '.btn-default',
                'button[type="submit"]',
                'input[type="submit"]',
                '[onclick*="scaveng"]',
                '.btn-confirm'
            ];

            for (const selector of buttonSelectors) {
                const button = form.querySelector(selector);
                if (button) return button;
            }

            // Look for any button with "start" text within the form
            const allButtons = form.querySelectorAll('button, a.btn, input[type="submit"]');
            for (const button of allButtons) {
                const text = (button.textContent || button.value || '').toLowerCase();
                if (text.includes('start')) {
                    return button;
                }
            }

            return null;
        },
        
        _findTroopInput(form, unit) {
            // Based on the HTML structure, look for the troop input with exact name match
            const input = document.querySelector(`input[name="${unit}"]`);
            if (input && input.classList.contains('unitsInput')) {
                return input;
            }

            // Fallback selectors if the main one doesn't work
            const fallbackSelectors = [
                `input.unitsInput[name="${unit}"]`,
                `input[name="${unit}"][class*="unitsInput"]`,
                `input[name="${unit}"][type="text"]`,
                `.candidate-squad-container input[name="${unit}"]`
            ];

            for (const selector of fallbackSelectors) {
                try {
                    const input = document.querySelector(selector);
                    if (input) return input;
                } catch (e) {
                    // Continue to next selector
                }
            }

            return null;
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

        const selectedLevels = UI.getSelectedLevels();
        if (selectedLevels.length === 0) {
            alert('Please select at least one scavenge level to include.');
            return;
        }

        const worldSpeed = GameData.getWorldSpeed();
        const optimizationMode = UI.getOptimizationMode();
        const timeConstraint = UI.getTimeConstraint();

        const results = Calculator.optimize(userTroops, worldSpeed, optimizationMode, selectedLevels, timeConstraint);
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