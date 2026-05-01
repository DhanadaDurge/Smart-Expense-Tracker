document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Navbar
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if(navLinks.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    // 3. Scroll Animations
    const fadeElements = document.querySelectorAll('.fade-in');
    const appearOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };
    const appearOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, appearOptions);
    fadeElements.forEach(el => appearOnScroll.observe(el));

    // 4. Upload Functionality 
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const bankFileUpload = document.getElementById('bankFileUpload');
    
    if (uploadFileBtn && bankFileUpload) {
        uploadFileBtn.addEventListener('click', async () => {
             if (!bankFileUpload.files.length) {
                 alert("Please select a bank file.");
                 return;
             }
             const file = bankFileUpload.files[0];
             const originalText = uploadFileBtn.innerHTML;
             uploadFileBtn.innerHTML = 'Parsing with AI <i class="fa-solid fa-circle-notch fa-spin" style="margin-left: 8px;"></i>';
             uploadFileBtn.disabled = true;
             
             // Prepare FormData
             const formData = new FormData();
             formData.append('file', file);
             
             const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
             const now = new Date();
             const month = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
             formData.append('month', month);
             
             try {
                 const response = await fetch('/api/parse_csv', {
                     method: 'POST',
                     body: formData
                 });

                 const result = await response.json();

                 if (response.ok && result.success) {
                     alert(`Success! Added ${result.addedCount} new expenses.`);
                     uploadFileBtn.innerHTML = '<i class="fa-solid fa-check"></i> Processed';
                     bankFileUpload.value = '';
                     setTimeout(() => window.location.reload(), 1000);
                 } else {
                     throw new Error(result.error || result.message || "Server Error during parsing.");
                 }
             } catch(err) {
                 console.error("Upload Error:", err);
                 uploadFileBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Error';
                 alert(err.message);
                 setTimeout(() => {
                     uploadFileBtn.innerHTML = originalText;
                     uploadFileBtn.disabled = false;
                 }, 2000);
             }
        });
    }

    // 5. Automatic Tracking JS (Email Permission Flow)
    const simulateSmsBtn = document.getElementById('simulate-sms-btn');
    const mockApproveBtn = document.getElementById('mock-approve-btn');
    const trackingInitial = document.getElementById('tracking-initial');
    const trackingPending = document.getElementById('tracking-pending');
    const trackingProcessing = document.getElementById('tracking-processing');
    const trackingEnabled = document.getElementById('tracking-enabled');
    const extractionResult = document.getElementById('extraction-result');
    
    const hideAllStates = () => {
        [trackingInitial, trackingPending, trackingProcessing, trackingEnabled].forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.style.opacity = '0';
            }
        });
    };

    if (simulateSmsBtn) {
        simulateSmsBtn.addEventListener('click', async () => {
            const trackingCard = document.getElementById('tracking-card');
            const userEmail = trackingCard ? trackingCard.getAttribute('data-user-email') : null;
            
            if (!userEmail) {
                alert("Please log in to use SMS tracking.");
                return;
            }

            simulateSmsBtn.disabled = true;
            simulateSmsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

            try {
                const response = await fetch('/api/send_permission_email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    hideAllStates();
                    trackingPending.style.display = 'flex';
                    setTimeout(() => trackingPending.style.opacity = '1', 50);
                } else {
                    throw new Error(data.message);
                }
            } catch (err) {
                alert("Failed to send permission email: " + err.message);
                simulateSmsBtn.disabled = false;
                simulateSmsBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Request SMS Access';
            }
        });
    }

    if (mockApproveBtn) {
        mockApproveBtn.addEventListener('click', async () => {
            hideAllStates();
            trackingProcessing.style.display = 'flex';
            setTimeout(() => trackingProcessing.style.opacity = '1', 50);

            const mockMessages = [
                "SBI Alert: Rs. 450.00 spent on Zomato via UPI. Avl Bal: Rs 4,500.22",
                "HDFC Bank: You paid Rs. 1200 to Jio Prepaid Recharge.",
                "Axis Bank: Debit of Rs. 85.00 at Starbucks Coffee.",
                "Your A/c XXXX has been debited by Rs. 2500.00 on Amazon Shopping."
            ];
            const randomMsg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
            
            try {
                await new Promise(r => setTimeout(r, 2000));

                const res = await fetch('/api/parse_sms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: randomMsg })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    hideAllStates();
                    trackingEnabled.style.display = 'flex';
                    setTimeout(() => trackingEnabled.style.opacity = '1', 50);

                    if (data.duplicate) {
                        extractionResult.innerHTML = `<span style="color: #f59e0b;">Duplicate detected!</span><br>Source: ${data.expense.title || 'Previous Entry'}`;
                    } else {
                        extractionResult.innerHTML = `<span style="color: #00e5ff;">Extracted:</span><br>${data.expense.title} (${data.expense.category})`;
                    }
                } else {
                    throw new Error(data.message || "Parse failed");
                }
            } catch(e) {
                alert(e.message || "AI Engine error.");
                hideAllStates();
                trackingInitial.style.display = 'flex';
                setTimeout(() => trackingInitial.style.opacity = '1', 50);
                simulateSmsBtn.disabled = false;
                simulateSmsBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Request SMS Access';
            }
        });
    }

    // 6. Stop Linking Global Logic
    const stopBtnGlobal = document.getElementById('stop-linking-btn');
    if (stopBtnGlobal) {
        stopBtnGlobal.addEventListener('click', () => {
            window.location.reload(); 
        });
    }

    checkLoginState();
});

// Auth State Management (Simplified for now)
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('expenseIq_loggedIn') === 'true';
    // (Existing login state logic remains)
}

async function deleteFile(id) {
    if (!confirm("Delete this file?")) return;
    try {
        const response = await fetch(`/api/delete_file/${id}`, { method: 'DELETE' });
        if ((await response.json()).success) window.location.reload();
    } catch (err) {
        console.error("Delete Error:", err);
    }
}
