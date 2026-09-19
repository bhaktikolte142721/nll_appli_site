/**
 * Multi-Step Application Logic (App 1 -> App 2 -> App 3)
 * Integrated with REST API & MySQL Backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Toast function
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s forwards cubic-bezier(0.2, 0, 0, 1)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Password visibility toggle
  const passwordToggleBtn = document.getElementById('appPasswordToggle');
  const passwordInput = document.getElementById('appPasswordInput');
  if (passwordToggleBtn && passwordInput) {
    passwordToggleBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      passwordToggleBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
    });
  }

  // Live email validation & green checkmark
  const emailInput = document.getElementById('appEmailInput');
  const emailStatusIcon = document.getElementById('emailStatusIcon');
  if (emailInput && emailStatusIcon) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      emailStatusIcon.style.opacity = isValid ? '1' : '0.2';
    });
  }

  // Country code selector synchronization
  const countrySelect = document.getElementById('countryCodeSelect');
  const countryCodeText = document.getElementById('countryCodeText');
  if (countrySelect && countryCodeText) {
    countrySelect.addEventListener('change', () => {
      countryCodeText.textContent = countrySelect.value;
    });
  }

  // Pre-fill fields from sessionStorage if navigating back/forth
  try {
    const savedApp1 = JSON.parse(sessionStorage.getItem('nll_candidate_temp_app1') || '{}');
    if (savedApp1.email && emailInput) emailInput.value = savedApp1.email;
    if (savedApp1.password && passwordInput) passwordInput.value = savedApp1.password;

    const savedApp2 = JSON.parse(sessionStorage.getItem('nll_candidate_temp_app2') || '{}');
    const nameInput = document.getElementById('fullNameInput');
    if (savedApp2.fullName && nameInput) nameInput.value = savedApp2.fullName;
    const phoneInput = document.getElementById('phoneInput');
    if (savedApp2.phone && phoneInput) phoneInput.value = savedApp2.phone;
  } catch (e) {}

  // --- APPLICATION 1 HANDLER ---
  const appForm1 = document.getElementById('appForm1');
  if (appForm1) {
    appForm1.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput?.value.trim();
      const pass = passwordInput?.value;
      const errorMsg = document.getElementById('app1Error');
      const submitBtn = appForm1.querySelector('.app-primary-btn');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errorMsg) {
          errorMsg.textContent = 'Please enter a valid email address.';
          errorMsg.classList.add('visible');
        }
        return;
      }

      if (!pass || pass.length < 6) {
        if (errorMsg) {
          errorMsg.textContent = 'Password must be at least 6 characters long.';
          errorMsg.classList.add('visible');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.remove('visible');

      // Persist step 1 data
      sessionStorage.setItem('nll_candidate_temp_app1', JSON.stringify({
        email,
        password: pass
      }));

      submitBtn?.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = 'application2.html';
      }, 500);
    });
  }

  // --- APPLICATION 2 HANDLER ---
  const appForm2 = document.getElementById('appForm2');
  if (appForm2) {
    appForm2.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('fullNameInput')?.value.trim();
      const phone = document.getElementById('phoneInput')?.value.trim();
      const countryCode = countrySelect ? countrySelect.value : '+ 91';
      const fullPhone = phone ? `${countryCode} ${phone}` : '';
      const genderElem = document.querySelector('input[name="gender"]:checked');
      const gender = genderElem ? genderElem.value : 'male';
      const errorMsg = document.getElementById('app2Error');
      const submitBtn = appForm2.querySelector('.app-primary-btn');

      if (!fullName) {
        if (errorMsg) {
          errorMsg.textContent = 'Please enter your full name.';
          errorMsg.classList.add('visible');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.remove('visible');

      // Persist step 2 data
      sessionStorage.setItem('nll_candidate_temp_app2', JSON.stringify({
        fullName,
        gender,
        phone: fullPhone
      }));

      submitBtn?.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = 'application3.html';
      }, 500);
    });
  }

  // --- APPLICATION 3 HANDLER ---
  const appForm3 = document.getElementById('appForm3');
  if (appForm3) {
    appForm3.addEventListener('submit', async (e) => {
      e.preventDefault();
      const branch = document.getElementById('branchInput')?.value.trim();
      const year = document.getElementById('yearInput')?.value.trim();
      const domain = document.getElementById('domainInput')?.value.trim();
      const about = document.getElementById('aboutTextarea')?.value.trim();
      const errorMsg = document.getElementById('app3Error');
      const submitBtn = appForm3.querySelector('.app-primary-btn');
      const cardForm = document.getElementById('formContent');
      const completeBanner = document.getElementById('completeBanner');

      if (!branch) {
        if (errorMsg) {
          errorMsg.textContent = 'Please enter your branch/major.';
          errorMsg.classList.add('visible');
        }
        return;
      }

      if (!year) {
        if (errorMsg) {
          errorMsg.textContent = 'Please enter your academic year.';
          errorMsg.classList.add('visible');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.remove('visible');

      submitBtn?.classList.add('loading');
      submitBtn.disabled = true;

      try {
        // Collect all previous step data
        const app1Data = JSON.parse(sessionStorage.getItem('nll_candidate_temp_app1') || '{}');
        const app2Data = JSON.parse(sessionStorage.getItem('nll_candidate_temp_app2') || '{}');

        let email = app1Data.email;
        let password = app1Data.password;
        let fullName = app2Data.fullName;
        let phone = app2Data.phone;
        let gender = app2Data.gender || 'male';

        // Check if user is authenticated or needs registration
        if (!window.NLL_API.isAuthenticated()) {
          if (!email || !password || !fullName) {
            throw new Error('Please return to Step 1 and complete your account details.');
          }

          try {
            // Attempt registration
            const regRes = await window.NLL_API.auth.register({
              full_name: fullName,
              email: email,
              password: password,
              phone: phone,
              role: 'candidate'
            });
            window.NLL_API.setAuth(regRes.data.token, regRes.data.user);
          } catch (regErr) {
            // If already registered, attempt login
            if (regErr.status === 409) {
              const loginRes = await window.NLL_API.auth.login(email, password);
              window.NLL_API.setAuth(loginRes.data.token, loginRes.data.user);
            } else {
              throw regErr;
            }
          }
        } else {
          // User is authenticated
          const currentUser = window.NLL_API.getCurrentUser();
          if (!email && currentUser) email = currentUser.email;
          if (!fullName && currentUser) fullName = currentUser.full_name;
        }

        // Now submit the unified relational application record
        const applicationPayload = {
          email: email,
          full_name: fullName,
          phone: phone || null,
          gender: gender,
          branch: branch,
          academic_year: year,
          domain: domain || 'General Aerospace',
          about: about || null
        };

        const res = await window.NLL_API.applications.submit(applicationPayload);

        submitBtn?.classList.remove('loading');
        if (cardForm) cardForm.style.display = 'none';
        if (completeBanner) completeBanner.classList.add('visible');

        // Clear temporary form step data
        sessionStorage.removeItem('nll_candidate_temp_app1');
        sessionStorage.removeItem('nll_candidate_temp_app2');
        sessionStorage.setItem('nll_app3_submitted', 'true');

        showToast('Application submitted successfully to New Leap Labs!', 'success');
      } catch (err) {
        submitBtn?.classList.remove('loading');
        submitBtn.disabled = false;
        const msg = err.message || 'Submission failed. Please try again.';
        if (errorMsg) {
          errorMsg.textContent = msg;
          errorMsg.classList.add('visible');
        }
        showToast(msg, 'error');
      }
    });
  }

  // Social login buttons in App 1
  document.querySelectorAll('.social-circle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Connecting social provider...', 'info');
    });
  });
});
