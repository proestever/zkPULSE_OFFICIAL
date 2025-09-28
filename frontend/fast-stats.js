// Fast network stats using server-side API with caching
async function updateFastStats() {
    // Show loading state immediately
    const denominations = ['1M', '10M', '100M', '1B', 'total'];
    denominations.forEach(denom => {
        const element = document.getElementById(`deposits-${denom}`);
        if (element) {
            element.innerHTML = '<span class="loading-dots">Loading</span>';
        }
    });

    try {
        // Fetch stats from API (cached on server)
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const stats = await response.json();

        // Get last known deposits from localStorage for "new deposits" feature
        const lastKnownDeposits = JSON.parse(localStorage.getItem('tornadoLastDeposits') || '{}');
        const newDeposits = {};

        // Update UI for each denomination
        for (const [denom, data] of Object.entries(stats.denominations)) {
            // Check for new deposits since last visit
            const lastCount = lastKnownDeposits[denom] || 0;
            const newCount = data.deposits - lastCount;
            newDeposits[denom] = data.deposits;

            // Update deposits element
            const depositsElement = document.getElementById(`deposits-${denom}`);
            if (depositsElement) {
                let statusText = `${data.deposits} deposits`;
                if (newCount > 0 && lastCount > 0) {
                    statusText += ` <span style="color: #00ff88;">+${newCount} new</span>`;
                }
                depositsElement.innerHTML = statusText;
            }

            // Update balance element
            const balanceElement = document.getElementById(`balance-${denom}`);
            if (balanceElement) {
                balanceElement.textContent = data.balanceFormatted;
            }
        }

        // Update totals
        const totalDepositsElement = document.getElementById('deposits-total');
        if (totalDepositsElement) {
            totalDepositsElement.innerHTML = `${stats.total.deposits} total deposits`;
        }

        const totalBalanceElement = document.getElementById('balance-total');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = stats.total.balanceFormatted;
        }

        // Save current deposit counts to localStorage
        localStorage.setItem('tornadoLastDeposits', JSON.stringify(newDeposits));

        // Show update timestamp
        const timestampElement = document.getElementById('stats-timestamp');
        if (timestampElement) {
            const updateTime = new Date(stats.lastUpdate);
            timestampElement.textContent = `Updated: ${updateTime.toLocaleTimeString()}`;
        }

    } catch (error) {
        console.error('Error fetching stats:', error);

        // Show error state
        denominations.forEach(denom => {
            const element = document.getElementById(`deposits-${denom}`);
            if (element) {
                element.innerHTML = '<span style="color: #ff4444;">Error loading</span>';
            }
        });
    }
}

// Force refresh stats (bypasses cache)
async function forceRefreshStats() {
    try {
        const response = await fetch('/api/stats?refresh=true');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const stats = await response.json();

        // Update UI using the same logic
        updateFastStats();

    } catch (error) {
        console.error('Error refreshing stats:', error);
    }
}

// Add refresh button functionality
function addRefreshButton() {
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer && !document.getElementById('stats-refresh-btn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'stats-refresh-btn';
        refreshBtn.innerHTML = '🔄 Refresh Stats';
        refreshBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            border-radius: 5px;
            color: #00ff88;
            cursor: pointer;
            font-size: 12px;
        `;
        refreshBtn.onclick = forceRefreshStats;
        statsContainer.appendChild(refreshBtn);
    }
}

// Replace the old updateAllStats with fast version
if (typeof window.updateAllStats !== 'undefined') {
    window.updateAllStats = updateFastStats;
}

// Initialize on page load
window.addEventListener('load', () => {
    // Add refresh button
    setTimeout(addRefreshButton, 1000);

    // Initial stats update (instant from cache)
    updateFastStats();

    // Refresh every 30 seconds (more frequent since it's cached)
    setInterval(updateFastStats, 30000);
});

// Fast stats enabled - using server-side caching