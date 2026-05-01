/**
 * Page-Specific Logic for Dashboard
 */

document.addEventListener("DOMContentLoaded", () => {
    // Chart.js Configuration
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
});

/**
 * Initialize Dummy Chart.js Charts for the Dashboard
 */
function initCharts() {
    // Set global text color to match dark theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

    // Data Parsing
    const categoryTotals = { 'Food': 0, 'Transport': 0, 'Shopping': 0, 'Bills': 0, 'Other': 0 };
    const monthlyIncome = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
    const monthlyExpense = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
    
    // Summary Aggregation
    let totalIncomeAmt = 0;
    let totalOutflowAmt = 0;
    
    // Safely parse injected expenses from the application/json script block
    let appExpenses = [];
    try {
        const rawExpenses = document.getElementById('expenseData').textContent;
        appExpenses = JSON.parse(rawExpenses);
    } catch (e) {
        console.error("Failed to parse expenses data", e);
    }
    
    if (appExpenses && Array.isArray(appExpenses)) {
        appExpenses.forEach(exp => {
            const amount = parseFloat(exp.amount) || 0;
            const type = exp.type || 'expense'; // Default mapping preserves old schema entries
            
            if (type === 'income') {
                totalIncomeAmt += amount;
            } else {
                totalOutflowAmt += amount;
                
                // Category plotting (Expenses only)
                const cat = exp.category || 'Other';
                if (categoryTotals[cat] !== undefined) categoryTotals[cat] += amount;
                else categoryTotals['Other'] += amount;
            }

            // Monthly timeline mapping
            const d = new Date(exp.date);
            if (!isNaN(d.getTime())) {
                const month = d.getMonth();
                if (type === 'income') {
                    if (monthlyIncome[month] !== undefined) monthlyIncome[month] += amount;
                } else {
                    if (monthlyExpense[month] !== undefined) monthlyExpense[month] += amount;
                }
            }
        });
    }
    
    // --- Update Summary DOM metrics dynamically! ---
    const netSavings = totalIncomeAmt - totalOutflowAmt;
    const incomeDOM = document.getElementById('totalIncomeDisplay');
    const expenseDOM = document.getElementById('totalExpenseDisplay');
    const balanceDOM = document.getElementById('currentBalanceDisplay');
    
    if (incomeDOM) incomeDOM.textContent = '₹' + totalIncomeAmt.toFixed(2);
    if (expenseDOM) expenseDOM.textContent = '₹' + totalOutflowAmt.toFixed(2);
    if (balanceDOM) balanceDOM.textContent = '₹' + netSavings.toFixed(2);

    // 1. Doughnut Chart - Categories
    const ctxPie = document.getElementById('categoryPieChart');
    if (ctxPie) {
        new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Food', 'Transport', 'Shopping', 'Bills', 'Other'],
                datasets: [{
                    data: [
                        categoryTotals['Food'],
                        categoryTotals['Transport'],
                        categoryTotals['Shopping'],
                        categoryTotals['Bills'],
                        categoryTotals['Other']
                    ],
                    backgroundColor: [
                        '#4f46e5', // Indigo
                        '#10b981', // Green
                        '#f59e0b', // Amber
                        '#8b5cf6', // Violet
                        '#ef4444'  // Red
                    ],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } }
                },
                cutout: '70%'
            }
        });
    }

    // 2. Bar Chart - Monthly Spend (Revenue)
    const ctxBar = document.getElementById('monthlyBarChart');
    if (ctxBar) {
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Income (₹)',
                        data: [
                            monthlyIncome[0], monthlyIncome[1], monthlyIncome[2], monthlyIncome[3], 
                            monthlyIncome[4], monthlyIncome[5], monthlyIncome[6], monthlyIncome[7],
                            monthlyIncome[8], monthlyIncome[9], monthlyIncome[10], monthlyIncome[11]
                        ],
                        backgroundColor: 'rgba(0, 229, 255, 0.5)',
                        borderRadius: 4,
                        barPercentage: 0.5
                    },
                    {
                        label: 'Expenses (₹)',
                        data: [
                            monthlyExpense[0], monthlyExpense[1], monthlyExpense[2], monthlyExpense[3], 
                            monthlyExpense[4], monthlyExpense[5], monthlyExpense[6], monthlyExpense[7],
                            monthlyExpense[8], monthlyExpense[9], monthlyExpense[10], monthlyExpense[11]
                        ],
                        backgroundColor: '#4f46e5',
                        borderRadius: 4,
                        barPercentage: 0.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₹)', color: 'rgba(255,255,255,0.5)', font: {size: 10} },
                        ticks: { color: '#94a3b8', display: true }, // Display enabled
                        grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [5, 5] },
                        border: { display: false }
                    },
                    x: {
                        title: { display: true, text: 'Month', color: 'rgba(255,255,255,0.5)', font: {size: 10} },
                        ticks: { color: '#94a3b8', font: { size: 10 }, display: true },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#94a3b8', boxWidth: 12 } }
                }
            }
        });
    }

    // 3. Line Chart - Cashflow
    const ctxLine = document.getElementById('cashflowLineChart');
    if (ctxLine) {
        const gradientBlue = ctxLine.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradientBlue.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
        gradientBlue.addColorStop(1, 'rgba(0, 229, 255, 0)');
        
        const gradientPurple = ctxLine.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradientPurple.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        gradientPurple.addColorStop(1, 'rgba(139, 92, 246, 0)');

        window.cashflowChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Income',
                        data: [
                            monthlyIncome[0], monthlyIncome[1], monthlyIncome[2], monthlyIncome[3], 
                            monthlyIncome[4], monthlyIncome[5], monthlyIncome[6], monthlyIncome[7],
                            monthlyIncome[8], monthlyIncome[9], monthlyIncome[10], monthlyIncome[11]
                        ],
                        borderColor: '#00e5ff',
                        backgroundColor: gradientBlue,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Expenses',
                        data: [
                            monthlyExpense[0], monthlyExpense[1], monthlyExpense[2], monthlyExpense[3], 
                            monthlyExpense[4], monthlyExpense[5], monthlyExpense[6], monthlyExpense[7],
                            monthlyExpense[8], monthlyExpense[9], monthlyExpense[10], monthlyExpense[11]
                        ],
                        borderColor: '#8b5cf6',
                        backgroundColor: gradientPurple,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Fluctuation (₹)', color: 'rgba(255,255,255,0.5)', font: {size: 10} },
                        ticks: { color: '#94a3b8', display: true }, // Display enabled
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        border: { display: false }
                    },
                    x: {
                        title: { display: true, text: 'Timeline', color: 'rgba(255,255,255,0.5)', font: {size: 10} },
                        ticks: { color: '#94a3b8', font: { size: 10 }, display: true },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// Expose click handler for custom Cashflow HTML legend toggles
window.toggleCashflowDataset = function(datasetIndex, element) {
    if (!window.cashflowChart) return;
    
    // Check if currently visible
    const isVisible = window.cashflowChart.isDatasetVisible(datasetIndex);
    
    if (isVisible) {
        // Hide the dataset
        window.cashflowChart.hide(datasetIndex);
        // Desaturate the button for visual feedback
        element.style.opacity = '0.3';
        element.style.filter = 'grayscale(100%)';
    } else {
        // Show the dataset
        window.cashflowChart.show(datasetIndex);
        // Restore vibrant colors
        element.style.opacity = '1';
        element.style.filter = 'grayscale(0%)';
    }
    
    // Automatically re-scale the graph axes
    window.cashflowChart.update();
};
