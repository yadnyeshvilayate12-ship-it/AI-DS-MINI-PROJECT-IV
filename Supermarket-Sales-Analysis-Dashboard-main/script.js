// Global State
let dashboardData = null;
let rawData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 10;
let charts = {};

// Chart instances
let citySalesChart, paymentChart, trendChart, productChart, ratingChart;

// Chart theme defaults for the dark UI
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#cfe0fb';
    Chart.defaults.borderColor = 'rgba(168, 85, 247, 0.15)';
    Chart.defaults.font.family = 'Inter, Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(9, 9, 11, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(168, 85, 247, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load data
        const response = await fetch('data.json');
        dashboardData = await response.json();
        
        // Load full dataset
        if (dashboardData.raw_data) {
            rawData = dashboardData.raw_data;
        }
        
        // Initialize dashboard
        initializeDashboard();
        
        // Populate filters
        populateFilterDropdowns();
        
        // Setup event listeners
        setupEventListeners();
        
        // Create initial charts
        updateAllCharts();
        updateStatistics();
        
        // Show content, hide spinner
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('loadingSpinner').innerHTML = '<p>Error loading data. Please refresh the page.</p>';
    }
});

// ================================================================
// INITIALIZATION FUNCTIONS
// ================================================================

function initializeDashboard() {
    filteredData = [...rawData];
    updateSummaryCards(filteredData);
    updateKeyInsights();
    updateDataTable();
}

function populateFilterDropdowns() {
    const cities = dashboardData.cities || [];
    const products = dashboardData.product_lines || [];
    
    const citySelect = document.getElementById('cityFilter');
    const productSelect = document.getElementById('productFilter');
    
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
    });
}

function setupEventListeners() {
    const cityFilter = document.getElementById('cityFilter');
    const productFilter = document.getElementById('productFilter');
    const searchBox = document.getElementById('searchBox');
    const resetBtn = document.getElementById('resetFilters');
    
    cityFilter.addEventListener('change', applyFilters);
    productFilter.addEventListener('change', applyFilters);
    searchBox.addEventListener('input', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateDataTable();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const maxPage = Math.ceil(filteredData.length / recordsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            updateDataTable();
        }
    });
}

// ================================================================
// FILTER AND SEARCH
// ================================================================

function applyFilters() {
    const city = document.getElementById('cityFilter').value;
    const product = document.getElementById('productFilter').value;
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    filteredData = rawData.filter(record => {
        const matchCity = !city || record.City === city;
        const matchProduct = !product || record['Product line'] === product;
        
        let matchSearch = true;
        if (searchTerm) {
            const searchableText = `${record['Invoice ID']} ${record.City} ${record['Product line']} ${record.Payment}`.toLowerCase();
            matchSearch = searchableText.includes(searchTerm);
        }
        
        return matchCity && matchProduct && matchSearch;
    });
    
    currentPage = 1;
    updateSummaryCards(filteredData);
    updateDataTable();
    updateAllCharts();
}

function resetFilters() {
    document.getElementById('cityFilter').value = '';
    document.getElementById('productFilter').value = '';
    document.getElementById('searchBox').value = '';
    applyFilters();
}

// ================================================================
// UPDATE SUMMARY CARDS
// ================================================================

function updateSummaryCards(data) {
    if (data.length === 0) {
        document.getElementById('totalSales').textContent = '₹0.00';
        document.getElementById('avgSales').textContent = '₹0.00';
        document.getElementById('totalTransactions').textContent = '0';
        document.getElementById('avgRating').textContent = '0/10';
        setTrendLabel('totalSalesTrend', 'No data to compare', 'neutral');
        setTrendLabel('avgSalesTrend', 'No data to compare', 'neutral');
        setTrendLabel('totalTransactionsTrend', 'No data to compare', 'neutral');
        setTrendLabel('avgRatingTrend', 'No data to compare', 'neutral');
        return;
    }
    
    const totalSales = data.reduce((sum, d) => sum + d.Sales, 0);
    const avgSales = totalSales / data.length;
    const avgRating = (data.reduce((sum, d) => sum + d.Rating, 0) / data.length).toFixed(2);
    const fullSales = rawData.reduce((sum, d) => sum + d.Sales, 0);
    const fullAvgSales = rawData.length ? fullSales / rawData.length : 0;
    const fullAvgRating = rawData.length ? rawData.reduce((sum, d) => sum + d.Rating, 0) / rawData.length : 0;
    const countChange = rawData.length ? ((data.length - rawData.length) / rawData.length) * 100 : 0;

    document.getElementById('totalSales').textContent = `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('avgSales').textContent = `₹${avgSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('totalTransactions').textContent = data.length.toLocaleString();
    document.getElementById('avgRating').textContent = `${avgRating}/10`;

    setTrendLabel(
        'totalSalesTrend',
        comparePercent(totalSales, fullSales, 'vs all data'),
        trendClass(totalSales, fullSales)
    );
    setTrendLabel(
        'avgSalesTrend',
        comparePercent(avgSales, fullAvgSales, 'vs all data'),
        trendClass(avgSales, fullAvgSales)
    );
    setTrendLabel(
        'totalTransactionsTrend',
        `${countChange >= 0 ? '+' : ''}${countChange.toFixed(1)}% vs all data`,
        trendClass(data.length, rawData.length)
    );
    setTrendLabel(
        'avgRatingTrend',
        compareDelta(avgRating, fullAvgRating, 'vs all data'),
        trendClass(Number(avgRating), fullAvgRating)
    );
}

function trendClass(current, baseline) {
    if (!baseline) return 'neutral';
    const delta = current - baseline;
    if (Math.abs(delta) < 0.0001) return 'neutral';
    return delta > 0 ? 'positive' : 'negative';
}

function comparePercent(current, baseline, suffix) {
    if (!baseline) return `${suffix}`;
    const delta = ((current - baseline) / baseline) * 100;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}% ${suffix}`;
}

function compareDelta(current, baseline, suffix) {
    if (!baseline) return `${suffix}`;
    const delta = current - baseline;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)} ${suffix}`;
}

function setTrendLabel(id, text, tone) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('positive', 'negative', 'neutral');
    el.classList.add(tone);
}

function updateKeyInsights() {
    const summary = dashboardData.summary || {};
    document.getElementById('topCity').textContent = summary.top_city || 'N/A';
    document.getElementById('topProduct').textContent = summary.top_product || 'N/A';
    
    // Find most common payment method
    const paymentMethods = dashboardData.payment_methods || {};
    const paymentKeys = Object.keys(paymentMethods);
    const topPayment = paymentKeys.length
        ? paymentKeys.reduce((a, b) => paymentMethods[a] > paymentMethods[b] ? a : b)
        : 'N/A';
    document.getElementById('paymentPreference').textContent = topPayment || 'N/A';
    
    // Find dominant customer type
    const customerTypes = dashboardData.customer_types || {};
    const customerKeys = Object.keys(customerTypes);
    const topCustomer = customerKeys.length
        ? customerKeys.reduce((a, b) => customerTypes[a] > customerTypes[b] ? a : b)
        : 'N/A';
    document.getElementById('customerType').textContent = topCustomer || 'N/A';
    
    // Timestamp
    if (dashboardData.timestamp) {
        const date = new Date(dashboardData.timestamp);
        const timestampEl = document.getElementById('dataTimestamp');
        if (timestampEl) {
            timestampEl.textContent = `Data processed on ${date.toLocaleString()}`;
        }
    }
}

// ================================================================
// UPDATE DATA TABLE
// ================================================================

function updateDataTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = startIdx + recordsPerPage;
    const pageData = filteredData.slice(startIdx, endIdx);
    
    pageData.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record['Invoice ID']}</td>
            <td>${record.City}</td>
            <td>${record['Product line']}</td>
            <td>${record.Quantity}</td>
            <td>₹${record.Sales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${record.Payment}</td>
            <td>${record.Rating}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update pagination info
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    document.getElementById('recordsCount').textContent = totalRecords;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Disable pagination buttons if needed
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
}

// ================================================================
// UPDATE CHARTS
// ================================================================

function updateAllCharts() {
    updateCitySalesChart();
    updatePaymentChart();
    updateTrendChart();
    updateProductChart();
    updateRatingChart();
    updateCorrelationInfo();
}

function updateCitySalesChart() {
    const citySalesData = {};
    filteredData.forEach(record => {
        citySalesData[record.City] = (citySalesData[record.City] || 0) + record.Sales;
    });
    
    const ctx = document.getElementById('citySalesChart').getContext('2d');
    
    if (citySalesChart) citySalesChart.destroy();
    
    citySalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(citySalesData),
            datasets: [{
                label: 'Sales (₹)',
                data: Object.values(citySalesData),
                backgroundColor: [
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(34, 211, 238, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: [
                    'rgba(168, 85, 247, 1)',
                    'rgba(34, 211, 238, 1)',
                    'rgba(236, 72, 153, 1)'
                ],
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(147, 51, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

function updatePaymentChart() {
    const paymentData = {};
    filteredData.forEach(record => {
        paymentData[record.Payment] = (paymentData[record.Payment] || 0) + 1;
    });
    
    const ctx = document.getElementById('paymentChart').getContext('2d');
    
    if (paymentChart) paymentChart.destroy();
    
    const colors = ['rgba(168, 85, 247, 0.8)', 'rgba(34, 211, 238, 0.8)', 'rgba(236, 72, 153, 0.8)'];
    
    paymentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(paymentData),
            datasets: [{
                data: Object.values(paymentData),
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateTrendChart() {
    const monthlyData = dashboardData.monthly_trend || [];
    
    if (monthlyData.length === 0) return;
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(d => d.Date),
            datasets: [{
                label: 'Total Sales (₹)',
                data: monthlyData.map(d => d.Total_Sales),
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(168, 85, 247, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            },
            {
                label: 'Avg Rating',
                data: monthlyData.map(d => d.Avg_Rating * 50),
                borderColor: 'rgba(34, 211, 238, 1)',
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                yAxisID: 'y1',
                pointBackgroundColor: 'rgba(34, 211, 238, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                },
                y1: {
                    position: 'right',
                    ticks: {
                        callback: function(value) {
                            return (value / 50).toFixed(1) + '/10';
                        }
                    }
                }
            }
        }
    });
}

function updateProductChart() {
    const productData = {};
    filteredData.forEach(record => {
        productData[record['Product line']] = (productData[record['Product line']] || 0) + record.Sales;
    });
    
    const ctx = document.getElementById('productChart').getContext('2d');
    
    if (productChart) productChart.destroy();
    
    productChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(productData),
            datasets: [{
                label: 'Sales (₹)',
                data: Object.values(productData),
                backgroundColor: 'rgba(34, 211, 238, 0.8)',
                borderColor: 'rgba(34, 211, 238, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

function updateRatingChart() {
    const ratingHistogram = dashboardData.rating_histogram || [];
    
    if (ratingHistogram.length === 0) return;
    
    const ctx = document.getElementById('ratingChart').getContext('2d');
    
    if (ratingChart) ratingChart.destroy();
    
    ratingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ratingHistogram.map(r => r.label),
            datasets: [{
                label: 'Number of Customers',
                data: ratingHistogram.map(r => r.count),
                backgroundColor: [
                    'rgba(244, 63, 94, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(34, 211, 238, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(244, 63, 94, 1)',
                    'rgba(249, 115, 22, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(34, 211, 238, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateCorrelationInfo() {
    const correlationMatrix = dashboardData.correlation_matrix || {};
    const correlationDiv = document.getElementById('correlationInfo');
    
    correlationDiv.innerHTML = '';
    
    // Find strong correlations with Sales
    const salesCorr = correlationMatrix.Sales || {};
    const strongCorr = Object.entries(salesCorr)
        .filter(([key, value]) => key !== 'Sales' && Math.abs(value) > 0.3)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3);
    
    if (strongCorr.length === 0) {
        correlationDiv.innerHTML = '<p style="color: var(--text-secondary);">No strong correlations found</p>';
        return;
    }
    
    strongCorr.forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'correlation-item';
        const strength = Math.abs(value) > 0.7 ? 'Strong' : Math.abs(value) > 0.5 ? 'Moderate' : 'Weak';
        item.innerHTML = `<strong>${key}</strong> → Sales: <span class="correlation-value">${(value * 100).toFixed(1)}%</span> (${strength})`;
        correlationDiv.appendChild(item);
    });
}

// ================================================================
// UPDATE STATISTICS
// ================================================================

function updateStatistics() {
    updateSalesStats();
    updateCustomerStats();
    updateTopMetrics();
}

function updateSalesStats() {
    const stats = (dashboardData.descriptive_stats && dashboardData.descriptive_stats.Sales) || {};
    const container = document.getElementById('salesStats');
    const mean = typeof stats.mean === 'number' ? stats.mean.toFixed(2) : 'N/A';
    const median = typeof stats.median === 'number' ? stats.median.toFixed(2) : 'N/A';
    const std = typeof stats.std === 'number' ? stats.std.toFixed(2) : 'N/A';
    const min = typeof stats.min === 'number' ? stats.min.toFixed(2) : 'N/A';
    const max = typeof stats.max === 'number' ? stats.max.toFixed(2) : 'N/A';
    
    container.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Mean:</span>
            <span class="stat-value">₹${mean}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Median:</span>
            <span class="stat-value">₹${median}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Std Dev:</span>
            <span class="stat-value">₹${std}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Min:</span>
            <span class="stat-value">₹${min}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Max:</span>
            <span class="stat-value">₹${max}</span>
        </div>
    `;
}

function updateCustomerStats() {
    const customerTypes = dashboardData.customer_types || {};
    const container = document.getElementById('customerStats');
    const total = Object.values(customerTypes).reduce((a, b) => a + b, 0);
    
    container.innerHTML = Object.entries(customerTypes)
        .map(([type, count]) => `
            <div class="stat-item">
                <span class="stat-label">${type}:</span>
                <span class="stat-value">${count} (${total ? ((count / total) * 100).toFixed(1) : '0.0'}%)</span>
            </div>
        `)
        .join('');
}

function updateTopMetrics() {
    const summary = dashboardData.summary || {};
    const container = document.getElementById('topMetrics');
    const bestProduct = summary.top_product || 'N/A';
    const safeRating = typeof summary.average_rating === 'number' ? summary.average_rating.toFixed(2) : 'N/A';
    
    container.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Top City:</span>
            <span class="stat-value">${summary.top_city || 'N/A'}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Best Product:</span>
            <span class="stat-value">${bestProduct.length > 24 ? `${bestProduct.substring(0, 24)}...` : bestProduct}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Records:</span>
            <span class="stat-value">${summary.total_transactions || 0}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Rating:</span>
            <span class="stat-value">${safeRating}</span>
        </div>
    `;
}
