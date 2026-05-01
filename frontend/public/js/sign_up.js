/**
 * Page-Specific Logic for Signup
 */

document.addEventListener("DOMContentLoaded", () => {
    // Password match validation
    const signupForm = document.querySelector('.auth-card form');
    const pwd = document.getElementById('password');
    const cpwd = document.getElementById('cpassword');
    
    if(signupForm && pwd && cpwd) {
        signupForm.addEventListener('submit', (e) => {
            // EJS integration: remove preventDefault when hooking up actual POST routes
            e.preventDefault();
            
            if(pwd.value !== cpwd.value) {
                alert("Passwords do not match");
                return;
            }
            console.log("Signup form submitted successfully");
        });
    }
});
