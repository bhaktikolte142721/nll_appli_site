/**
 * User Task Assignment Script - New Leap Labs
 * Integrated with REST API & MySQL Backend
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Enforce Candidate Authentication Guard
  if (window.NLL_API && !window.NLL_API.enforceAuthGuard('candidate')) {
    return;
  }

  // 1. Mobile Navigation Drawer & Backdrop
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  // 2. DOM Elements
  const taskPageSubtitle = document.getElementById('taskPageSubtitle');
  const taskTitleDisplay = document.getElementById('taskTitleDisplay');
  const taskDeadlineContainer = document.getElementById('taskDeadlineContainer');
  const taskDeadlineDisplay = document.getElementById('taskDeadlineDisplay');
  const taskInstructionsText = document.getElementById('taskInstructionsText');
  const submissionStatus = document.getElementById('submissionStatus');
  const uploadedFileName = document.getElementById('uploadedFileName');
  const submissionBadge = document.getElementById('submissionBadge');
  const uploadBtnText = document.getElementById('uploadBtnText');
  const btnUploadTask = document.getElementById('btnUploadTask');
  const taskFileInput = document.getElementById('taskFileInput');
  const submitModal = document.getElementById('submitModal');
  const modalFileName = document.getElementById('modalFileName');
  const modalFileSize = document.getElementById('modalFileSize');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');

  let activeTask = null;
  let selectedFile = null;

  // 3. Toast Notification Helper
  const toast = document.getElementById('dashToast');
  let toastTimer = null;

  function showToast(message, duration = 3200) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Formatter matching "October 20, 2026 at 06:00 PM"
  function formatDeadline(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 is 12
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

    return `${month} ${day}, ${year} at ${strHours}:${strMinutes} ${ampm}`;
  }

  // 4. Load Active Task from MySQL via REST API
  async function loadCandidateTask() {
    try {
      const res = await window.NLL_API.tasks.getMyTasks();
      const tasks = res.data;

      if (!tasks || tasks.length === 0) {
        if (taskTitleDisplay) {
          taskTitleDisplay.textContent = 'No task has been assigned to you yet.';
        }
        if (taskDeadlineContainer) {
          taskDeadlineContainer.style.display = 'none';
        }
        if (taskInstructionsText) {
          taskInstructionsText.textContent = 'Please wait for the New Leap Labs evaluation committee to review your application.';
        }
        if (taskPageSubtitle) {
          taskPageSubtitle.textContent = 'Awaiting task assignment from evaluation team.';
        }
        if (btnUploadTask) {
          btnUploadTask.style.opacity = '0.5';
          btnUploadTask.disabled = true;
          btnUploadTask.style.cursor = 'not-allowed';
        }
        return;
      }

      activeTask = tasks[0];

      if (taskTitleDisplay) {
        taskTitleDisplay.textContent = activeTask.title;
      }

      if (taskInstructionsText) {
        taskInstructionsText.textContent = activeTask.description;
      }

      if (activeTask.deadline && taskDeadlineDisplay && taskDeadlineContainer) {
        taskDeadlineDisplay.textContent = formatDeadline(activeTask.deadline);
        taskDeadlineContainer.style.display = 'inline-flex';
      } else if (taskDeadlineContainer) {
        taskDeadlineContainer.style.display = 'none';
      }

      if (taskPageSubtitle) {
        taskPageSubtitle.textContent = `Assigned Task: ${activeTask.title}`;
      }

      if (btnUploadTask) {
        btnUploadTask.style.opacity = '1';
        btnUploadTask.disabled = false;
        btnUploadTask.style.cursor = 'pointer';
      }

      // Check if task already has a submission
      if (activeTask.latestSubmission) {
        const sub = activeTask.latestSubmission;
        if (submissionStatus && uploadedFileName && submissionBadge) {
          uploadedFileName.textContent = sub.file_name;
          submissionBadge.textContent = sub.status === 'REVIEWED' ? `Reviewed (${sub.marks || 0} pts)` : 'Submitted';
          submissionBadge.style.background = '#ecfdf3';
          submissionBadge.style.color = '#027a48';
          submissionStatus.style.display = 'inline-flex';
        }
        if (taskPageSubtitle) {
          taskPageSubtitle.textContent = 'You have submitted your task solution!';
        }
        if (uploadBtnText) {
          uploadBtnText.textContent = 'Re-upload';
        }
      }
    } catch (err) {
      console.error('Error fetching candidate task:', err);
      showToast('Could not load task details from database', 3000);
      if (taskTitleDisplay) taskTitleDisplay.textContent = 'Unable to load task specifications.';
      if (taskInstructionsText) taskInstructionsText.textContent = 'Please verify your internet connection or refresh the page to retry.';
      if (taskDeadlineContainer) taskDeadlineContainer.style.display = 'none';
      if (taskPageSubtitle) taskPageSubtitle.textContent = 'Error loading task data';
    }
  }

  await loadCandidateTask();

  // 5. File Selection and Confirmation Modal
  if (btnUploadTask && taskFileInput) {
    btnUploadTask.addEventListener('click', () => {
      if (!activeTask) {
        showToast('No active task to submit solutions for.', 3000);
        return;
      }
      taskFileInput.click();
    });

    taskFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const allowedExts = ['.pdf', '.zip', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        showToast(`Unsupported format (${fileExt}). Allowed: ${allowedExts.join(', ')}`, 4000);
        taskFileInput.value = '';
        return;
      }

      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 25 * 1024 * 1024) {
        showToast('File exceeds 25 MB limit.', 3500);
        taskFileInput.value = '';
        return;
      }

      selectedFile = file;

      if (modalFileName) modalFileName.textContent = file.name;
      if (modalFileSize) modalFileSize.textContent = `${sizeMB} MB`;

      if (submitModal) submitModal.style.display = 'flex';
    });
  }

  // 6. Modal Controls (Cancel & Confirm)
  if (btnCancelModal && submitModal) {
    btnCancelModal.addEventListener('click', () => {
      submitModal.style.display = 'none';
      if (taskFileInput) taskFileInput.value = '';
      selectedFile = null;
    });
  }

  if (btnConfirmSubmit) {
    btnConfirmSubmit.addEventListener('click', async () => {
      if (!selectedFile || !activeTask) return;

      btnConfirmSubmit.disabled = true;
      btnConfirmSubmit.textContent = 'Uploading...';

      const formData = new FormData();
      formData.append('solution', selectedFile);

      try {
        const res = await window.NLL_API.tasks.submit(activeTask.id, formData);
        const submission = res.data.submission;

        // Close modal
        if (submitModal) submitModal.style.display = 'none';

        // Update UI
        if (submissionStatus && uploadedFileName && submissionBadge) {
          uploadedFileName.textContent = submission.file_name;
          submissionBadge.textContent = 'Submitted';
          submissionBadge.style.background = '#ecfdf3';
          submissionBadge.style.color = '#027a48';
          submissionStatus.style.display = 'inline-flex';
        }

        if (uploadBtnText) uploadBtnText.textContent = 'Re-upload';
        if (taskPageSubtitle) taskPageSubtitle.textContent = 'Solution successfully submitted!';

        showToast('Task solution uploaded successfully to New Leap Labs!', 3500);
      } catch (err) {
        showToast(`Upload failed: ${err.message}`, 4000);
      } finally {
        btnConfirmSubmit.disabled = false;
        btnConfirmSubmit.textContent = 'Confirm & Submit';
        if (taskFileInput) taskFileInput.value = '';
        selectedFile = null;
      }
    });
  }

  // 7. Logout Handling
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.NLL_API) {
        window.NLL_API.clearAuth();
      }
      window.location.href = '../login.html';
    });
  }
});
