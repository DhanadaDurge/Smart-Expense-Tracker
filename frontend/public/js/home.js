/**
 * SPA Script for ExpenseIQ
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. SPA Navigation ---
    const menuItems = document.querySelectorAll('.menu-item[data-target]');
    const viewSections = document.querySelectorAll('.view-section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            // Update active link
            menuItems.forEach(link => link.classList.remove('active'));
            item.classList.add('active');

            // Update active section
            viewSections.forEach(section => {
                section.classList.remove('active');
                if(section.id === targetId) {
                    section.classList.add('active');
                }
            });
        });
    });

    // --- 2. Chart.js Initialization ---
    if (typeof Chart !== 'undefined') {
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        // Bar Chart
        const mainCtx = document.getElementById('mainChart');
        if(mainCtx) {
            new Chart(mainCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Cash Flow',
                        data: [12000, 19000, 15000, 22000, 18000, 25000],
                        backgroundColor: '#4f46e5',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            border: { display: false }
                        },
                        x: {
                            grid: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // Doughnut Chart
        const pieCtx = document.getElementById('pieChart');
        if(pieCtx) {
            new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Software', 'Travel', 'Equipment', 'Office'],
                    datasets: [{
                        data: [45, 25, 20, 10],
                        backgroundColor: ['#4f46e5', '#8b5cf6', '#3b82f6', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    // --- 3. Duplicate Modal Logic ---
    const manualForm = document.getElementById('manualForm');
    const modal = document.getElementById('duplicateModal');
    const closeModal = document.getElementById('closeModal');

    if(manualForm && modal) {
        manualForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simulate duplicate detection for demo
            modal.classList.add('active');
        });

        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
            manualForm.reset();
        });
    }

    // --- 4. FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        trigger.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(faq => {
                faq.classList.remove('active');
                faq.querySelector('.faq-content').style.maxHeight = null;
            });

            // Toggle current if it wasn't active
            if(!isActive) {
                item.classList.add('active');
                const content = item.querySelector('.faq-content');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
});
