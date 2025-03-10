// ==UserScript==
// @name         POE2 Trade Utility
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  A utility to help with trading in Path of Exile. Currently helps calculate the weighted sum of a item.
// @author       EphemeralDust
// @match        https://www.pathofexile.com/trade2/*
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?domain=pathofexile.com
// @homepageURL  https://github.com/Ephemeral-Dust/POE2TradeUtility/tree/main
// @updateURL    https://raw.githubusercontent.com/Ephemeral-Dust/POE2TradeUtility/main/POE%20Trade%20Utility.js
// @downloadURL  https://raw.githubusercontent.com/Ephemeral-Dust/POE2TradeUtility/main/POE%20Trade%20Utility.js
// @noframes
// @license      Unlicense
// ==/UserScript==

var panelSide = GM_getValue('panelSide', 'right');
var showIronRuneValues = GM_getValue('showIronRuneValues', true);
var trackItemHistory = GM_getValue('trackItemHistory', true);

var tabs = [{
        id: 'weightedSumContent',
        label: 'Calculate Weighted Sum',
        index: 0,
        content: `
            <label for="itemTextArea">Paste Item Below:</label>
            <textarea id="itemTextArea" rows="20" style="width: 100%; background: #444; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 5px;"></textarea>
            <button id="calculateButton" style="margin-top: 10px; padding: 10px; background: #555; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Calculate</button>
            <p id="resultLabel" style="margin-top: 10px; color: #fff;"></p>
        `
    },
    {
        id: 'settingsContent',
        label: 'Settings',
        index: 1,
        content: `
            <label for="panelSideSelect">Panel Side:</label>
            <select id="panelSideSelect" style="background: #444; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 5px;">
                <option value="right" ${panelSide === 'right' ? 'selected' : ''}>Right</option>
                <option value="left" ${panelSide === 'left' ? 'selected' : ''}>Left</option>
            </select>
            <br><br>
            <label for="showIronRuneValues">Show Iron Rune Values:</label>
            <input type="checkbox" id="showIronRuneValues" ${showIronRuneValues ? 'checked' : ''}>
            <br><br>
            <label for="trackItemHistory">Track Item History:</label>
            <input type="checkbox" id="trackItemHistory" ${trackItemHistory ? 'checked' : ''}>
        `
    }
];

// Script entry point, ran after the page has loaded
(function () {
    'use strict';

    // Create the panel and tab elements
    const panel = createPanel();
    const toggleButton = createToggleButton();
    const tabContainer = createTabContainer();

    // Append elements
    panel.appendChild(toggleButton);
    panel.appendChild(tabContainer);
    document.body.appendChild(panel);

    // Create tabs and contents
    tabs.forEach(tabInfo => {
        const tabButton = createTabButton(tabInfo);
        const tabContent = createTabContent(tabInfo);

        tabContainer.appendChild(tabButton);
        panel.appendChild(tabContent);
    });

    // Add CSS styles
    addStyles();

    // Add event listeners
    toggleButton.addEventListener('click', () => {
        panel.classList.toggle('show');
        updateToggleButton();
    });

    document.addEventListener('click', (event) => {
        if (panel.classList.contains('show') && !panel.contains(event.target) && !toggleButton.contains(event.target)) {
            panel.classList.remove('show');
            updateToggleButton();
        }
    });

    tabs.forEach(tabInfo => {
        const tabButton = document.getElementById(`${tabInfo.id}Button`);
        const tabContent = document.getElementById(tabInfo.id);

        tabButton.addEventListener('click', () => {
            setActiveTab(tabInfo.index);
        });
    });

    // Add setting to change panel side
    const settingsContent = document.getElementById('settingsContent');
    settingsContent.innerHTML = tabs.find(tab => tab.id === 'settingsContent').content;

    document.getElementById('panelSideSelect').addEventListener('change', (event) => {
        panelSide = event.target.value;
        GM_setValue('panelSide', panelSide);
        setPanelSide(panelSide);
    });

    document.getElementById('showIronRuneValues').addEventListener('change', (event) => {
        showIronRuneValues = event.target.checked;
        GM_setValue('showIronRuneValues', showIronRuneValues);
    });

    document.getElementById('trackItemHistory').addEventListener('change', (event) => {
        trackItemHistory = event.target.checked;
        GM_setValue('trackItemHistory', trackItemHistory);
    });

    // Set initial panel side
    setPanelSide(panelSide);

    // Set initial active tab
    setActiveTab(0);

    // Enable/disable calculate button based on textarea content
    const itemTextArea = document.getElementById('itemTextArea');
    const calculateButton = document.getElementById('calculateButton');
    const resultLabel = document.getElementById('resultLabel');

    itemTextArea.addEventListener('input', () => {
        calculateButton.disabled = !itemTextArea.value.trim();
    });

    calculateButton.addEventListener('click', () => {
        const itemText = itemTextArea.value.trim();
        const result = calculateWeightedSum(itemText);

        if (result === null) {
            resultLabel.innerText = 'Please copy the item directly from Path of Exile.';
        } else {
            resultLabel.innerText = ''; // Clear previous results
            for (const [key, value] of Object.entries(result)) {
                const formattedKey = key.replace(/weighted_sum(\d+)/, 'Weighted Sum $1:');
                resultLabel.innerText += `${formattedKey} ${value}\n`;
            }
        }
    });

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'tradePanel';
        return panel;
    }

    function createToggleButton() {
        const toggleButton = document.createElement('div');
        toggleButton.id = 'trade_toggleButton';
        toggleButton.textContent = '⇨';
        return toggleButton;
    }

    function createTabContainer() {
        const tabContainer = document.createElement('div');
        tabContainer.id = 'trade_tabContainer';
        return tabContainer;
    }

    function createTabButton(tabInfo) {
        const tabButton = document.createElement('div');
        tabButton.id = `${tabInfo.id}Button`;
        tabButton.className = 'trade_tabButton';
        tabButton.textContent = tabInfo.label;
        return tabButton;
    }

    function createTabContent(tabInfo) {
        const tabContent = document.createElement('div');
        tabContent.id = tabInfo.id;
        tabContent.className = 'trade_tabContent';
        tabContent.innerHTML = tabInfo.content;
        return tabContent;
    }

    function setPanelSide(side) {
        const panel = document.getElementById('tradePanel');
        const toggleButton = document.getElementById('trade_toggleButton');
        if (side === 'left') {
            panel.style.right = 'auto';
            panel.style.left = '0';
            toggleButton.style.left = 'auto';
            toggleButton.style.right = '-50px';
            toggleButton.style.borderRadius = '0 25px 25px 0';
            toggleButton.style.boxShadow = '0 -1px 0 #999 inset, -1px 1px 0 #999 inset';
        } else {
            panel.style.left = 'auto';
            panel.style.right = '0';
            toggleButton.style.right = 'auto';
            toggleButton.style.left = '-50px';
            toggleButton.style.borderRadius = '25px 0 0 25px';
            toggleButton.style.boxShadow = '1px 1px 0px #999 inset, 0 -1px 0 #999 inset';
        }
        updateToggleButton();
    }

    function updateToggleButton() {
        const panel = document.getElementById('tradePanel');
        const toggleButton = document.getElementById('trade_toggleButton');
        if (panel.classList.contains('show')) {
            toggleButton.textContent = panelSide === 'right' ? '⇨' : '⇦';
        } else {
            toggleButton.textContent = panelSide === 'right' ? '⇦' : '⇨';
        }
    }

    function setActiveTab(index) {
        document.querySelectorAll('.trade_tabButton').forEach(button => button.classList.remove('active'));
        document.querySelectorAll('.trade_tabContent').forEach(content => content.classList.remove('show'));

        const activeTab = tabs.find(tab => tab.index === index);
        if (activeTab) {
            document.getElementById(`${activeTab.id}Button`).classList.add('active');
            document.getElementById(activeTab.id).classList.add('show');
        }
    }

    handleItemProcessing();
})();

// Function to handle item processing on the page
function handleItemProcessing() {
    const processedRows = new Set();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains('row')) {
                    if (!node.querySelector('div.itemHeader')) continue;
                    processItem(node, processedRows);
                }
            }
        }
    });

    document.querySelectorAll('div.row').forEach(row => {
        if (row.querySelector('div.itemHeader')) {
            processItem(row, processedRows);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Function to add CSS styles to the page
function addStyles() {
    GM_addStyle(`
        #tradePanel {
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100%;
            background: #333;
            color: #fff;
            border-left: 1px solid #444;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: -2px 0 5px rgba(0,0,0,0.5);
            z-index: 9999;
        }
        #tradePanel.show {
            transform: translateX(0);
        }
        #trade_toggleButton {
            position: absolute;
            top: 50%;
            left: -50px;
            width: 50px;
            height: 50px;
            background: rgba(51, 51, 51, 0.2);
            color: #fff;
            text-align: center;
            line-height: 50px;
            cursor: pointer;
            transition: background 0.3s ease;
            border-radius: 25px;
            box-shadow: -2px 0 5px rgba(0, 0, 0, 0.5);
        }
        #trade_toggleButton:hover {
            background: rgba(51, 51, 51, 0.8);
        }
        #trade_tabContainer {
            display: flex;
            justify-content: space-around;
            background: #444;
            padding: 10px 0;
        }
        .trade_tabButton {
            flex: 1;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: background 0.3s ease, color 0.3s ease;
            background: rgba(51, 51, 51, 0.2);
            color: #fff;
            border: 1px solid #444;
            border-radius: 5px;
            margin: 0 5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .trade_tabButton:hover {
            background: rgba(51, 51, 51, 0.5);
        }
        .trade_tabButton.active {
            background: #555;
            color: #fff;
            border-color: #555;
        }
        .trade_tabContent {
            display: none;
            padding: 20px;
            background: #333;
            border-top: 1px solid #444;
        }
        .trade_tabContent.show {
            display: block;
        }
        .trade_textarea, .trade_select, .trade_checkbox, .trade_button {
            background: #444;
            color: #fff;
            border: 1px solid #555;
            padding: 5px;
            border-radius: 5px;
        }
        .trade_button {
            cursor: pointer;
            transition: background 0.3s ease;
        }
        .trade_button:hover {
            background: #555;
        }
        .trade_popup {
            position: absolute;
            background-color: #333;
            color: #fff;
            border: 1px solid #444;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
    `);
}

// Function to calculate the weighted sum of an item using in-game text format and advanced search filters
function calculateWeightedSum(itemText) {
    const item = parseItem(itemText);
    if (!item) {
        return null;
    }
    const weightedSums = getWeightedSum();
    if (!weightedSums) {
        return 'No weighted sum filters found.';
    }
    const results = {};

    for (const [weightedSumKey, weightedSum] of Object.entries(weightedSums)) {
        let sum = 0;
        for (const [filterKey, filter] of Object.entries(weightedSum)) {
            let value = 0;
            // Check explicitMods
            for (const mod of item.explicitMods) {
                if (mod.mod.includes(filterKey)) {
                    value = mod.value;
                    break;
                }
            }

            // Check implicitMods
            if (value === 0) {
                for (const mod of item.implicitMods) {
                    if (mod.mod.includes(filterKey)) {
                        value = mod.value;
                        break;
                    }
                }
            }

            // Check modifiers
            if (value === 0) {
                for (const mod of item.modifiers) {
                    if (mod.mod.includes(filterKey)) {
                        value = mod.value;
                        break;
                    }
                }
            }

            if (filter.min && value < filter.min) {
                value = 0;
            }
            if (filter.max && value > filter.max) {
                value = 0;
            }
            sum += filter.weight * value;
        }
        results[weightedSumKey] = parseFloat(sum.toFixed(1));
    }
    return results;
}

// Function to get the weighted sum filters from the advanced search pane
function getWeightedSum() {
    const advancedPane = document.querySelector('.search-advanced-pane.brown');
    if (!advancedPane) {
        return null;
    }

    const weightedSums = {};
    const filterGroups = advancedPane.querySelectorAll('.filter-group.expanded');
    let weightedSumIndex = 1;

    for (const group of filterGroups) {
        const titleElement = group.querySelector('.filter-title.filter-title-clickable');
        const titleText = titleElement ? titleElement.childNodes[0].textContent.trim() : '';
        if (titleText === 'Weighted Sum' || titleText === 'Weighted Sum v2') {
            const filters = {};
            const filterGroupBody = group.querySelector('.filter-group-body');
            const filterElements = filterGroupBody.querySelectorAll('.filter.full-span:not(.disabled)');

            filterElements.forEach((filterElement, index) => {
                const filterBody = filterElement.querySelector('.filter-body');
                const filterTitleElement = filterBody.querySelector('.filter-title.filter-title-clickable span');
                const filterTitle = filterTitleElement ? filterTitleElement.textContent.trim() : `filter${index + 1}`;

                const weightInput = filterBody.querySelector('.form-control.weight.modified');
                const minInput = filterBody.querySelectorAll('.form-control.minmax.modified')[0];
                const maxInput = filterBody.querySelectorAll('.form-control.minmax.modified')[1];

                filters[filterTitle] = {
                    weight: weightInput ? parseFloat(weightInput.value) : null,
                    min: minInput ? parseFloat(minInput.value) : null,
                    max: maxInput ? parseFloat(maxInput.value) : null
                };
            });

            weightedSums[`weighted_sum${weightedSumIndex}`] = filters;
            weightedSumIndex++;
        }
    }
    return weightedSums;
}

function processMod(modLine) {

    // Match any numbers in the mod line
    const numberMatches = modLine.match(/([+-]?\d+(\.\d+)?)/g);
    if (numberMatches) {
        let value;
        if (numberMatches.length === 1) {
            // Single numeric value
            value = parseFloat(numberMatches[0]).toFixed(1);
        } else if (numberMatches.length === 2) {
            // Range value, average the two numbers
            const avg = ((parseFloat(numberMatches[0]) + parseFloat(numberMatches[1])) / 2).toFixed(1);
            value = parseFloat(avg);
        }

        // Replace all numbers with #
        let modText = modLine;
        numberMatches.forEach(num => {
            modText = modText.replace(num, '#');
        });

        const parsedMod = {
            value: parseFloat(value),
            mod: modText
        };
        return parsedMod;
    }

    // Fallback for modifiers without clear numeric values
    const defaultMod = {
        value: null,
        mod: modLine
    };
    return defaultMod;
}

// Item parsing functions for in-game text format
function parseItem(itemText) {
    const lines = itemText.split('\n');
    let item = {
        class: "",
        rarity: "",
        name: "",
        base: "",
        quality: "",
        energyShield: "",
        requirements: {},
        sockets: "",
        itemLevel: "",
        modifiers: [],
        implicitMods: [],
        explicitMods: [],
        note: "",
        corrupted: false
    };

    let section = "";
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith("Item Class:")) {
            item.class = line.split(": ")[1];
        } else if (line.startsWith("Rarity:")) {
            item.rarity = line.split(": ")[1];
        } else if (!item.name) {
            item.name = line;
        } else if (!item.base) {
            item.base = line;
        } else if (line === "--------") {
            section = "";
        } else if (line.startsWith("Quality:")) {
            item.quality = line.split(": ")[1];
        } else if (line.startsWith("Energy Shield:")) {
            item.energyShield = line.split(": ")[1];
        } else if (line.startsWith("Requirements:")) {
            section = "requirements";
        } else if (section === "requirements" && line.includes(":")) {
            let [key, value] = line.split(": ");
            item.requirements[key] = parseInt(value, 10);
        } else if (line.startsWith("Sockets:")) {
            item.sockets = line.split(": ")[1];
        } else if (line.startsWith("Item Level:")) {
            item.itemLevel = parseInt(line.split(": ")[1], 10);
        } else if (line.startsWith("Note:")) {
            item.note = line.split(": ")[1];
        } else if (line === "Corrupted") {
            item.corrupted = true;
        } else if (line.includes("(implicit)")) {
            item.implicitMods.push(processMod(line));
        } else if (line.includes("(enchant)")) {
            item.implicitMods.push(processMod(line));
        } else {
            item.explicitMods.push(processMod(line));
        }
    }

    return item;
}

// Function for processing each item on page
function processItem(row, processedRows) {
    if (processedRows.has(row)) return;

    try {
        const leftDiv = row.querySelector('div.left');
        const middleDiv = row.querySelector('div.middle');
        const rightDiv = row.querySelector('div.right');

        if (!leftDiv || !middleDiv || !rightDiv) {
            return;
        }

        const itemId = row.dataset.id ? row.dataset.id : 0;
        const sellerName = rightDiv.querySelector('.profile-link').textContent.trim();

        // Direct Whisper button is clicked.
        const button = rightDiv.querySelector('button.btn.btn-xs.btn-default.direct-btn');

        if (button && itemId && sellerName && trackItemHistory) {
            whisperHandler(itemId, sellerName, button, rightDiv);
        }

        // Check for specific runeMod elements
        const runeMods = middleDiv.querySelectorAll('.runeMod');
        let hasTargetRune = false;
        runeMods.forEach(runeMod => {
            const runeSpan = runeMod.querySelector('span[data-field]');
            if (runeSpan && (runeSpan.dataset.field.includes('stat.rune.stat_3523867985') || runeSpan.dataset.field.includes('stat.rune.stat_1509134228'))) {
                hasTargetRune = true;
            }
        });

        if (!hasTargetRune && showIronRuneValues) {
            handleIronRune(middleDiv, leftDiv);
        }

        processedRows.add(row);
    } catch (e) {
        console.error('Error processing row:', e);
    }
}

// Function for handling Iron Rune calculations and displaying the results

function handleIronRune(middleDiv, leftDiv) {
    const es = middleDiv.querySelector('span[data-field="es"] .colourAugmented, span[data-field="es"] .colourDefault');
    const ar = middleDiv.querySelector('span[data-field="ar"] .colourAugmented, span[data-field="ar"] .colourDefault');
    const ev = middleDiv.querySelector('span[data-field="ev"] .colourAugmented, span[data-field="ev"] .colourDefault');
    const physicalDamage = middleDiv.querySelector('span[data-field="pdamage"] .colourAugmented, span[data-field="pdamage"] .colourDefault');

    // Gather additional information
    const additionalInfoDiv = middleDiv.querySelector('.itemPopupAdditional');

    const itemTypeDiv = middleDiv.querySelector('.content .property span.lc span');
    const itemType = itemTypeDiv ? itemTypeDiv.textContent.trim() : 'Unknown';

    const corruptedDiv = middleDiv.querySelector('.content .unmet span.lc');
    const corrupted = corruptedDiv ? corruptedDiv.textContent.trim() : '';
    let isCorrupted = corrupted === 'Corrupted';

    let modPercent = 0;
    const explicitMods = middleDiv.querySelectorAll('.content .explicitMod');

    for (const percentMod of percentExplicitMods) {
        for (const explicitMod of explicitMods) {
            const spanElement = explicitMod.querySelector('span[data-field]');
            if (spanElement && spanElement.dataset.field === percentMod) {
                modPercent = processMod(spanElement.innerText).value;
                break;
            }
        }
    }

    const socketsDiv = leftDiv.querySelector('.sockets');
    let sockets = 0;

    if (socketsDiv) {
        sockets = socketsDiv.childElementCount;
    }

    if (isCorrupted && sockets === 0) {
        return;
    }

    function calculateIronRuneValue(value) {
        let itemBaseSockets = itemTypes[itemType] || 1;

        if (itemBaseSockets > sockets && !isCorrupted) {
            let runes = itemBaseSockets * .2;
            value = value * (1 + (runes / (1 + (modPercent / 100))));
        } else {
            let runes = sockets * .2;
            value = value * (1 + (runes / (1 + (modPercent / 100))));
        }
        return Math.round(value);
    }

    if (ar && !isNaN(parseFloat(ar.innerText))) {
        const maxQualityAR = additionalInfoDiv.querySelector('span[data-field="ar"] span');
        let value = parseFloat(maxQualityAR.innerText);

        if (isNaN(value)) {
            value = parseFloat(ar.innerText);
        }

        var ironRuneValue = calculateIronRuneValue(value);

        const newElement = document.createElement('span');
        newElement.className = 'lc s aug';
        newElement.innerHTML = `Armour <span title="with Iron Runes" class="colourAugmented">${ironRuneValue}</span>`;
        additionalInfoDiv.insertAdjacentElement('beforeend', newElement);
    }

    if (es && !isNaN(parseFloat(es.innerText))) {
        const maxQualityES = additionalInfoDiv.querySelector('span[data-field="es"] span');
        let value = parseFloat(maxQualityES.innerText);

        if (isNaN(value)) {
            value = parseFloat(es.innerText);
        }

        var ironRuneValue = calculateIronRuneValue(value);

        const newElement = document.createElement('span');
        newElement.className = 'lc s aug';
        newElement.innerHTML = `Energy Shield <span title="with Iron Runes" class="colourAugmented">${ironRuneValue}</span>`;
        additionalInfoDiv.insertAdjacentElement('beforeend', newElement);
    }

    if (ev && !isNaN(parseFloat(ev.innerText))) {
        const maxQualityEV = additionalInfoDiv.querySelector('span[data-field="ev"] span');
        let value = parseFloat(maxQualityEV.innerText);

        if (isNaN(value)) {
            value = parseFloat(ev.innerText);
        }

        var ironRuneValue = calculateIronRuneValue(value);

        const newElement = document.createElement('span');
        newElement.className = 'lc s aug';
        newElement.innerHTML = `Evasion <span title="with Iron Runes" class="colourAugmented">${ironRuneValue}</span>`;
        additionalInfoDiv.insertAdjacentElement('beforeend', newElement);
    }

    if (physicalDamage && !isNaN(parseFloat(physicalDamage.innerText))) {
        const maxQualityDPS = additionalInfoDiv.querySelector('span[data-field="dps"] span');
        const maxQualityPhysicalDPS = additionalInfoDiv.querySelector('span[data-field="pdps"] span');

        let dpsValue = parseFloat(maxQualityDPS.innerText);
        let pdpsValue = parseFloat(maxQualityPhysicalDPS.innerText);

        if (isNaN(dpsValue)) {
            dpsValue = parseFloat(physicalDamage.innerText);
        }
        if (isNaN(pdpsValue)) {
            pdpsValue = parseFloat(physicalDamage.innerText);
        }

        var pdpsIronRuneValue = calculateIronRuneValue(pdpsValue);

        var calculatedDPS = (pdpsIronRuneValue - pdpsValue + dpsValue).toFixed(1);

        const newElement = document.createElement('span');
        newElement.className = 'lc s aug';
        newElement.innerHTML = `DPS <span title="with Iron Runes" class="colourAugmented">${calculatedDPS}</span>`;
        additionalInfoDiv.insertAdjacentElement('beforeend', newElement);

        const newElement2 = document.createElement('span');
        newElement2.className = 'lc s aug';
        newElement2.innerHTML = `Physical DPS <span title="with Iron Runes" class="colourAugmented">${pdpsIronRuneValue}</span>`;
        additionalInfoDiv.insertAdjacentElement('beforeend', newElement2);
    }
}

// Function for handling whisper button clicks and adding history indicator

function whisperHandler(itemId, sellerName, button, rightDiv) {
    // Create a new button for adding the item to local storage
    const addButton = document.createElement('button');
    addButton.className = 'btn btn-xs btn-default add-btn';
    addButton.textContent = '👁';

    function updateBorderColor() {
        // Set button border color based on last messaged time
        const itemInfo = getItemInfo(itemId);
        if (itemInfo) {
            const lastMessaged = new Date(itemInfo.lastMessaged);
            const now = new Date();
            const timeDiff = (now - lastMessaged) / (1000 * 60 * 60); // Time difference in hours

            if (timeDiff < 1) {
                button.style.borderColor = 'red';
            } else if (timeDiff < 24) {
                button.style.borderColor = 'green';
            } else {
                button.style.borderColor = '';
            }
        }
    }

    // Insert the new button next to the existing button
    button.parentNode.insertBefore(addButton, button);

    // Add event listener to the new button
    addButton.addEventListener('click', () => {
        const priceSpan = rightDiv.querySelector('.price-label + br + span');
        const currencySpan = rightDiv.querySelector('.currency-text');

        const price = priceSpan ? priceSpan.textContent.trim() : '';
        const currency = currencySpan ? currencySpan.textContent.trim() : '';

        const priceObject = {
            price: price,
            currency: currency
        };

        // Update the item information in local storage
        updateItemInfo(itemId, sellerName, priceObject, false);
        updateBorderColor();
    });

    // Add event listener to the existing button
    button.addEventListener('click', () => {
        const priceSpan = rightDiv.querySelector('.price-label + br + span');
        const currencySpan = rightDiv.querySelector('.currency-text');

        const price = priceSpan ? priceSpan.textContent.trim() : '';
        const currency = currencySpan ? currencySpan.textContent.trim() : '';

        const priceObject = {
            price: price,
            currency: currency
        };

        // Update the item information in local storage
        updateItemInfo(itemId, sellerName, priceObject, true);
    });

    // Add hover event listener to show price history popup
    let hoverTimeout;

    addButton.addEventListener('mouseenter', () => {
        hoverTimeout = setTimeout(() => {
            const itemInfo = getItemInfo(itemId);
            if (itemInfo) {
                const popup = document.createElement('div');
                popup.className = 'trade_popup';

                let content = `<strong>Price History:</strong><br>`;
                itemInfo.priceHistory.forEach(entry => {
                    const formattedDate = new Date(entry.timestamp).toLocaleString();
                    content += `Price: ${entry.price.price} ${entry.price.currency} at ${formattedDate}<br>`;
                });
                const lastMessaged = itemInfo.lastMessaged ? new Date(itemInfo.lastMessaged).toLocaleString() : 'Never';
                content += `<br><strong>Last Messaged:</strong> ${lastMessaged}`;

                popup.innerHTML = content;
                document.body.appendChild(popup);

                const rect = addButton.getBoundingClientRect();
                popup.style.top = `${rect.top + window.scrollY + addButton.offsetHeight}px`;
                popup.style.left = `${rect.left + window.scrollX}px`;

                addButton.addEventListener('mouseleave', () => {
                    document.body.removeChild(popup);
                }, {
                    once: true
                });
            }
        }, 1000); // Show popup after 1 second
    });

    addButton.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
    });

    updateBorderColor();
}

// Local storage functions

function updateItemInfo(itemId, sellerName, priceObject, messaged = false) {
    // Retrieve the existing data from local storage
    let itemData = JSON.parse(localStorage.getItem('itemData')) || {};
    var lastMessaged = messaged ? new Date().toISOString() : null;

    // Initialize the item entry if it doesn't exist
    if (!itemData[itemId]) {
        itemData[itemId] = {
            lastMessaged: lastMessaged,
            priceHistory: [],
            sellerName: sellerName
        };
    }

    // Update the lastMessaged and sellerName
    itemData[itemId].lastMessaged = lastMessaged;
    itemData[itemId].sellerName = sellerName;

    // Append the new price entry to the priceHistory list
    itemData[itemId].priceHistory.push({
        timestamp: new Date().toISOString(),
        price: priceObject
    });

    // Save the updated data back to local storage
    localStorage.setItem('itemData', JSON.stringify(itemData));
}


function getItemInfo(itemId) {
    // Retrieve the existing data from local storage
    let itemData = JSON.parse(localStorage.getItem('itemData')) || {};

    // Return the item information if it exists, otherwise return null
    return itemData[itemId] || null;
}


// POE Trade Data constants

var percentExplicitMods = [
    "stat.explicit.stat_4015621042", // ES
    "stat.explicit.stat_1509134228", // Phys Damage
    "stat.explicit.stat_1062208444", // Armour
    "stat.explicit.stat_1999113824", // Evasion and ES
    "stat.explicit.stat_2451402625", // Armour and Evasion
    "stat.explicit.stat_3321629045", // Armour and ES
    "stat.explicit.stat_124859000" // Evasion
]

var itemTypes = {
    "Bow": 2,
    "Boots": 1,
    "Quarterstaff": 2,
    "Crossbow": 2,
    "Gloves": 1,
    "Helmet": 1,
    "Shield": 1,
    "Focus": 1,
    "Body Armour": 1,
}