/* ============================================
   features.js — ExpenseIQ Features Page
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ------------------------------------------
       Navbar scroll effect
       Adds a subtle shadow when user scrolls down
    ------------------------------------------ */
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.style.background = 'rgba(0, 0, 0, 0.98)';
            navbar.style.borderBottomColor = 'rgba(0, 229, 255, 0.08)';
        } else {
            navbar.style.background = 'rgba(0, 0, 0, 0.95)';
            navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.05)';
        }
    });


    /* ------------------------------------------
       Scroll-in animation for cards
       Adds .visible class when element enters viewport
    ------------------------------------------ */
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animatable elements
    const animTargets = document.querySelectorAll(
        '.method-card, .tile, .sec-tile, .ai-banner'
    );

    animTargets.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
        observer.observe(el);
    });

    // Add the .visible state via JS instead of a CSS class
    // so the transition delay still works
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .method-card.visible,
        .tile.visible,
        .sec-tile.visible,
        .ai-banner.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleEl);


    /* ------------------------------------------
       Table row hover highlight
       Adds a cyan left-border accent on hover
    ------------------------------------------ */
    const tableRows = document.querySelectorAll('.cmp-table tbody tr');

    tableRows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(0, 229, 255, 0.03)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = '';
        });
    });


    /* ------------------------------------------
       CTA button pulse effect
       Adds a subtle pulse animation on the primary CTA
    ------------------------------------------ */
    const primaryBtn = document.querySelector('.cta-wrap .btn-primary');
    if (primaryBtn) {
        primaryBtn.addEventListener('mouseenter', () => {
            primaryBtn.style.boxShadow = '0 0 40px rgba(0, 229, 255, 0.5)';
        });
        primaryBtn.addEventListener('mouseleave', () => {
            primaryBtn.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.3)';
        });
    }

});