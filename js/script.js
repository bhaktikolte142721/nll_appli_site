/**
 * New Leap Labs - Login Page Functionality
 * Vanilla JavaScript Implementation
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const passwordToggle = document.getElementById('passwordToggle');
  const submitBtn = document.getElementById('submitBtn');
  const googleBtn = document.getElementById('googleSignInBtn');
  const appleBtn = document.getElementById('appleSignInBtn');
  const switchAccountLink = document.getElementById('switchAccountLink');
  const toastContainer = document.getElementById('toastContainer');

  // Helper to show modern toast notification
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s forwards cubic-bezier(0.2, 0, 0, 1)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }

  // Password Visibility Toggle
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      // Update icon state
      passwordToggle.innerHTML = isPassword
        ? `<svg class="eye-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
             <line x1="1" y1="1" x2="23" y2="23"></line>
           </svg>`
        : `<svg class="eye-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
             <circle cx="12" cy="12" r="3"></circle>
           </svg>`;
      passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // Email format validation
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Clear errors on input change
  emailInput?.addEventListener('input', () => {
    emailInput.classList.remove('has-error');
    if (emailError) {
      emailError.textContent = '';
      emailError.classList.remove('visible');
    }
  });

  passwordInput?.addEventListener('input', () => {
    passwordInput.classList.remove('has-error');
    if (passwordError) {
      passwordError.textContent = '';
      passwordError.classList.remove('visible');
    }
  });


  // Form submission handler
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let hasError = false;

    // Email validation
    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      emailInput.classList.add('has-error');
      if (emailError) {
        emailError.textContent = 'Please enter your email address.';
        emailError.classList.add('visible');
      }
      hasError = true;
    } else if (!isValidEmail(emailVal)) {
      emailInput.classList.add('has-error');
      if (emailError) {
        emailError.textContent = 'Please enter a valid email address.';
        emailError.classList.add('visible');
      }
      hasError = true;
    }

    // Password validation
    const passwordVal = passwordInput.value;
    if (!passwordVal) {
      passwordInput.classList.add('has-error');
      if (passwordError) {
        passwordError.textContent = 'Please enter your password.';
        passwordError.classList.add('visible');
      }
      hasError = true;
    } else if (passwordVal.length < 6) {
      passwordInput.classList.add('has-error');
      if (passwordError) {
        passwordError.textContent = 'Password must be at least 6 characters.';
        passwordError.classList.add('visible');
      }
      hasError = true;
    }


    if (hasError) return;

    // Real API authentication
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const res = await window.NLL_API.auth.login(emailVal, passwordVal);
      const user = res.data.user;
      const token = res.data.token;
      window.NLL_API.setAuth(token, user);

      showToast(`Welcome back, ${user.full_name}!`, 'success');

      setTimeout(() => {
        if (user.role === 'admin') {
          window.location.href = 'pages/dashboard-admin.html';
        } else {
          window.location.href = 'pages/dashboard-user.html';
        }
      }, 800);
    } catch (err) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      const msg = err.message || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      if (emailError) {
        emailError.textContent = msg;
        emailError.classList.add('visible');
      }
    }
  });

  // Social login buttons
  googleBtn?.addEventListener('click', () => {
    showToast('Redirecting to Google Sign-In...', 'info');
  });

  appleBtn?.addEventListener('click', () => {
    showToast('Redirecting to Apple Sign-In...', 'info');
  });


  // Switch account link (navigates to Application 1 Registration)
  switchAccountLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'pages/application1.html';
  });
});
