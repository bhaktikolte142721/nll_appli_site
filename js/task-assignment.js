/**
 * Task Assignment Script - New Leap Labs (Admin)
 * Integrated with REST API & MySQL Backend
 * Features Two-Column Task Authoring Workspace with Live Candidate Preview
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Enforce Admin Role Guard
  if (window.NLL_API && !window.NLL_API.enforceAuthGuard('admin')) {
    return;
  }

  // 1. Mobile Sidebar Toggle & Drawer
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

  // 2. Toast Notifications
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

  const formatNum = (n) => (n < 10 ? `0${n}` : `${n}`);

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Deadline human-friendly formatter: "October 20, 2026 at 06:00 PM"
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

  // 3. Form & Preview DOM Elements
  const taskAssignForm = document.getElementById('taskAssignForm');
  const candidateSelect = document.getElementById('candidateSelect');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const titleCharCounter = document.getElementById('titleCharCounter');
  const taskDescriptionInput = document.getElementById('taskDescriptionInput');
  const descCharCounter = document.getElementById('descCharCounter');
  const taskDeadlineInput = document.getElementById('taskDeadlineInput');
  const selectedDeadlinePreview = document.getElementById('selectedDeadlinePreview');
  const selectedDeadlineText = document.getElementById('selectedDeadlineText');
  const taskFormError = document.getElementById('taskFormError');
  const btnResetTaskForm = document.getElementById('btnResetTaskForm');
  const btnAssignTaskSubmit = document.getElementById('btnAssignTaskSubmit');

  // Preview elements
  const previewTaskTitle = document.getElementById('previewTaskTitle');
  const previewDeadlineContainer = document.getElementById('previewDeadlineContainer');
  const previewDeadlineVal = document.getElementById('previewDeadlineVal');
  const previewTaskDesc = document.getElementById('previewTaskDesc');

  // Task detail modal elements
  const taskDetailModal = document.getElementById('taskDetailModal');
  const btnCloseTaskDetailModal = document.getElementById('btnCloseTaskDetailModal');
  const btnDismissTaskDetailModal = document.getElementById('btnDismissTaskDetailModal');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskModalCandidate = document.getElementById('taskModalCandidate');
  const taskModalDeadline = document.getElementById('taskModalDeadline');
  const taskModalDeadlineContainer = document.getElementById('taskModalDeadlineContainer');
  const taskModalStatus = document.getElementById('taskModalStatus');
  const taskModalDescription = document.getElementById('taskModalDescription');

  // Candidate submission details modal elements
  const submissionDetailModal = document.getElementById('submissionDetailModal');
  const btnCloseSubModal = document.getElementById('btnCloseSubModal');
  const btnDismissSubModal = document.getElementById('btnDismissSubModal');
  const subModalCandidate = document.getElementById('subModalCandidate');
  const subModalEmail = document.getElementById('subModalEmail');
  const subModalTaskTitle = document.getElementById('subModalTaskTitle');
  const subModalDeadline = document.getElementById('subModalDeadline');
  const subModalStatus = document.getElementById('subModalStatus');
  const subModalSubmittedAt = document.getElementById('subModalSubmittedAt');
  const subModalFileName = document.getElementById('subModalFileName');
  const subModalFileType = document.getElementById('subModalFileType');
  const subModalFileSize = document.getElementById('subModalFileSize');
  const subModalFileIcon = document.getElementById('subModalFileIcon');
  const subModalPreviewNotice = document.getElementById('subModalPreviewNotice');
  const btnSubViewFile = document.getElementById('btnSubViewFile');
  const btnSubDownloadFile = document.getElementById('btnSubDownloadFile');

  let currentApplications = [];
  let currentAppTaskMap = {};

  // Initialize minimum selectable datetime-local to current local time
  function updateMinDateTime() {
    if (taskDeadlineInput) {
      const now = new Date();
      // Format as YYYY-MM-DDTHH:mm in local time
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      taskDeadlineInput.min = localIso;
    }
  }
  updateMinDateTime();

  function showFormError(msg) {
    if (!taskFormError) return;
    taskFormError.textContent = msg;
    taskFormError.style.display = 'block';
  }

  function clearFormError() {
    if (!taskFormError) return;
    taskFormError.textContent = '';
    taskFormError.style.display = 'none';
  }

  // Update live preview card reflecting admin's typed content
  function updateLivePreview() {
    const rawTitle = taskTitleInput ? taskTitleInput.value.trim() : '';
    const rawDesc = taskDescriptionInput ? taskDescriptionInput.value.trim() : '';
    const rawDeadline = taskDeadlineInput ? taskDeadlineInput.value : '';

    if (previewTaskTitle) {
      previewTaskTitle.textContent = rawTitle || 'Task title will appear here...';
    }

    if (previewTaskDesc) {
      previewTaskDesc.textContent = rawDesc || 'Task instructions will appear here once you start typing.';
    }

    if (rawDeadline) {
      const formatted = formatDeadline(rawDeadline);
      const isPast = new Date(rawDeadline).getTime() < Date.now() - 60000;
      if (selectedDeadlinePreview) {
        if (isPast) {
          selectedDeadlinePreview.className = 'selected-deadline-preview deadline-error';
          selectedDeadlinePreview.innerHTML = `⚠️ <span class="deadline-error-msg">Deadline is in the past: <strong>${formatted}</strong> (Today is ${formatDeadline(new Date())}). Please select a future date.</span>`;
          selectedDeadlinePreview.style.display = 'inline-flex';
        } else {
          selectedDeadlinePreview.className = 'selected-deadline-preview';
          selectedDeadlinePreview.innerHTML = `<span class="deadline-preview-icon">📅</span> <span class="deadline-preview-label">Selected:</span> <strong class="deadline-preview-val">${formatted}</strong>`;
          selectedDeadlinePreview.style.display = 'inline-flex';
        }
      }
      if (previewDeadlineVal && previewDeadlineContainer) {
        if (isPast) {
          previewDeadlineVal.innerHTML = `<span>${formatted} <strong style="color: #ef4444;">[PAST DATE]</strong></span>`;
        } else {
          previewDeadlineVal.textContent = formatted;
        }
        previewDeadlineContainer.style.display = 'inline-flex';
      }
    } else {
      if (selectedDeadlinePreview) {
        selectedDeadlinePreview.style.display = 'none';
      }
      if (previewDeadlineVal && previewDeadlineContainer) {
        previewDeadlineVal.textContent = 'No deadline set';
        previewDeadlineContainer.style.display = 'inline-flex';
      }
    }
  }

  // Real-time Form Validation
  function validateForm() {
    const candidateVal = candidateSelect ? candidateSelect.value.trim() : '';
    const titleVal = taskTitleInput ? taskTitleInput.value.trim() : '';
    const descVal = taskDescriptionInput ? taskDescriptionInput.value.trim() : '';
    const deadlineVal = taskDeadlineInput ? taskDeadlineInput.value.trim() : '';

    // Check character counters
    if (titleCharCounter && taskTitleInput) {
      titleCharCounter.textContent = `${taskTitleInput.value.length}/200`;
    }
    if (descCharCounter && taskDescriptionInput) {
      descCharCounter.textContent = `${taskDescriptionInput.value.length}/2000`;
    }

    // Update preview
    updateLivePreview();

    // Check future deadline validity
    let deadlineValid = false;
    if (deadlineVal) {
      const d = new Date(deadlineVal);
      // Valid date and not in the past (allow 60s tolerance)
      if (!isNaN(d.getTime())) {
        if (d.getTime() >= Date.now() - 60000) {
          deadlineValid = true;
          clearFormError();
        } else {
          const formatted = formatDeadline(deadlineVal);
          showFormError(`⚠️ Deadline cannot be in the past! You selected ${formatted}. Today is ${formatDeadline(new Date())}. (Note: If you meant October 3, please select October 3 in the calendar).`);
        }
      }
    }

    const isValid =
      candidateVal !== '' &&
      titleVal.length >= 1 &&
      titleVal.length <= 200 &&
      descVal.length >= 1 &&
      descVal.length <= 2000 &&
      deadlineValid;

    // Enable button whenever candidate and title are filled so clicking it gives direct actionable validation feedback
    if (btnAssignTaskSubmit) {
      btnAssignTaskSubmit.disabled = false;
      if (isValid) {
        btnAssignTaskSubmit.style.opacity = '1';
        btnAssignTaskSubmit.style.cursor = 'pointer';
      } else {
        btnAssignTaskSubmit.style.opacity = '0.75';
        btnAssignTaskSubmit.style.cursor = 'pointer';
      }
    }

    return isValid;
  }

  // Bind live validation & preview listeners
  ['input', 'change', 'keyup'].forEach((evt) => {
    candidateSelect?.addEventListener(evt, () => {
      clearFormError();
      validateForm();
    });
    taskTitleInput?.addEventListener(evt, () => {
      clearFormError();
      validateForm();
    });
    taskDescriptionInput?.addEventListener(evt, () => {
      clearFormError();
      validateForm();
    });
    taskDeadlineInput?.addEventListener(evt, () => {
      clearFormError();
      validateForm();
    });
  });

  // 4. Modal Controls
  function openTaskModal(app, task) {
    if (!taskDetailModal) return;
    if (taskModalTitle) taskModalTitle.textContent = task.title || 'Task Specification';
    if (taskModalCandidate) taskModalCandidate.textContent = app.full_name || 'Candidate';
    if (taskModalStatus) taskModalStatus.textContent = app.status;
    if (taskModalDescription) {
      taskModalDescription.textContent = task.description || 'No description provided.';
      taskModalDescription.style.whiteSpace = 'pre-wrap';
    }
    if (task.deadline && taskModalDeadline && taskModalDeadlineContainer) {
      taskModalDeadline.textContent = formatDeadline(task.deadline);
      taskModalDeadlineContainer.style.display = 'flex';
    } else if (taskModalDeadlineContainer) {
      taskModalDeadlineContainer.style.display = 'none';
    }
    document.body.style.overflow = 'hidden';
    taskDetailModal.style.display = 'flex';
  }

  function closeTaskModal() {
    if (taskDetailModal) {
      taskDetailModal.style.display = 'none';
    }
    syncBodyScrollLock();
  }

  btnCloseTaskDetailModal?.addEventListener('click', closeTaskModal);
  btnDismissTaskDetailModal?.addEventListener('click', closeTaskModal);
  taskDetailModal?.addEventListener('click', (e) => {
    if (e.target === taskDetailModal) closeTaskModal();
  });

  // 4.1 Submission Modal Helpers & Controls
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileIcon(filename, mimetype) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['txt', 'js', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return '📝';
    if (['doc', 'docx'].includes(ext)) return '📑';
    return '📁';
  }

  function isPreviewable(filename, mimetype) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const viewableExts = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'txt'];
    return viewableExts.includes(ext) || (mimetype && (mimetype.startsWith('image/') || mimetype === 'application/pdf' || mimetype === 'text/plain'));
  }

  // Domain/Branch, Description, and Preview elements in submission modal
  const subModalDomainBranch = document.getElementById('subModalDomainBranch');
  const subModalTaskDesc = document.getElementById('subModalTaskDesc');
  const subModalImagePreview = document.getElementById('subModalImagePreview');
  const subDecisionSection = document.getElementById('subDecisionSection');
  const decisionButtonsRow = document.getElementById('decisionButtonsRow');
  const decisionAlreadyResolved = document.getElementById('decisionAlreadyResolved');
  const resolvedStatusBadge = document.getElementById('resolvedStatusBadge');
  const btnSelectSecondInterview = document.getElementById('btnSelectSecondInterview');
  const btnRejectCandidate = document.getElementById('btnRejectCandidate');

  // Confirmation Modals
  const selectInterviewConfirmModal = document.getElementById('selectInterviewConfirmModal');
  const btnCloseSelectConfirmModal = document.getElementById('btnCloseSelectConfirmModal');
  const btnCancelSelectInterview = document.getElementById('btnCancelSelectInterview');
  const btnConfirmSelectInterview = document.getElementById('btnConfirmSelectInterview');
  const confirmSelectCandidateName = document.getElementById('confirmSelectCandidateName');
  const confirmSelectTaskTitle = document.getElementById('confirmSelectTaskTitle');

  const rejectCandidateModal = document.getElementById('rejectCandidateModal');
  const btnCloseRejectModal = document.getElementById('btnCloseRejectModal');
  const btnCancelRejectCandidate = document.getElementById('btnCancelRejectCandidate');
  const btnConfirmRejectCandidate = document.getElementById('btnConfirmRejectCandidate');
  const confirmRejectCandidateName = document.getElementById('confirmRejectCandidateName');
  const confirmRejectTaskTitle = document.getElementById('confirmRejectTaskTitle');
  const rejectReasonInput = document.getElementById('rejectReasonInput');

  let activeReviewTaskId = null;
  let activeReviewSub = null;

  function syncBodyScrollLock() {
    const isAnyModalOpen = [
      submissionDetailModal,
      selectInterviewConfirmModal,
      rejectCandidateModal,
      taskDetailModal
    ].some(m => m && m.style.display !== 'none');

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  async function openSubmissionModal(taskId) {
    if (!submissionDetailModal) return;
    activeReviewTaskId = taskId;

    try {
      showToast('Loading submission details...');
      const res = await window.NLL_API.tasks.getSubmission(taskId);
      const sub = res.data ? res.data.submission : res.submission;
      if (!sub) {
        showToast('No submission found for this task', 3000);
        return;
      }
      activeReviewSub = sub;

      if (subModalCandidate) subModalCandidate.textContent = sub.candidate_name || 'Candidate';
      if (subModalEmail) subModalEmail.textContent = sub.candidate_email || '—';
      if (subModalDomainBranch) {
        const domainStr = sub.candidate_domain || '';
        const branchStr = sub.candidate_branch || '';
        subModalDomainBranch.textContent = [domainStr, branchStr].filter(Boolean).join(' • ') || '—';
      }
      if (subModalTaskTitle) subModalTaskTitle.textContent = sub.task_title || '—';
      if (subModalTaskDesc) subModalTaskDesc.textContent = sub.task_description || 'No description provided.';
      if (subModalDeadline) subModalDeadline.textContent = sub.task_deadline ? formatDeadline(sub.task_deadline) : '—';
      if (subModalStatus) {
        subModalStatus.innerHTML = `<span class="badge-sub-status badge-submitted">${sub.status || 'Submitted'}</span>`;
      }
      if (subModalSubmittedAt) {
        subModalSubmittedAt.textContent = sub.submitted_at ? formatDeadline(sub.submitted_at) : '—';
      }

      if (subModalFileName) subModalFileName.textContent = sub.file_name || 'submission_file';
      if (subModalFileType) subModalFileType.textContent = sub.file_type || 'Unknown Type';
      if (subModalFileSize) subModalFileSize.textContent = formatBytes(sub.file_size);
      if (subModalFileIcon) subModalFileIcon.textContent = getFileIcon(sub.file_name, sub.file_type);

      const canPreview = isPreviewable(sub.file_name, sub.file_type);
      const ext = (sub.file_name || '').split('.').pop().toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || (sub.file_type && sub.file_type.startsWith('image/'));
      const isPdf = ext === 'pdf' || sub.file_type === 'application/pdf';

      // Inline Image preview
      if (isImage && subModalImagePreview) {
        const fileUrl = window.NLL_API.tasks.getSubmissionFileUrl(taskId, false);
        subModalImagePreview.innerHTML = `<img src="${fileUrl}" alt="Submission Preview" class="sub-preview-thumbnail">`;
        subModalImagePreview.style.display = 'flex';
      } else if (subModalImagePreview) {
        subModalImagePreview.innerHTML = '';
        subModalImagePreview.style.display = 'none';
      }

      if (btnSubViewFile) {
        if (canPreview) {
          btnSubViewFile.style.display = 'inline-flex';
          btnSubViewFile.onclick = () => {
            const url = window.NLL_API.tasks.getSubmissionFileUrl(taskId, false);
            window.open(url, '_blank');
          };
          if (subModalPreviewNotice) subModalPreviewNotice.style.display = 'none';
        } else {
          btnSubViewFile.style.display = 'none';
          if (subModalPreviewNotice) {
            subModalPreviewNotice.textContent = `Preview not supported for this file format (.${ext.toUpperCase() || 'ZIP'}). Click "Download File" to view.`;
            subModalPreviewNotice.style.display = 'block';
          }
        }
      }

      if (btnSubDownloadFile) {
        btnSubDownloadFile.onclick = () => {
          const downloadUrl = window.NLL_API.tasks.getSubmissionFileUrl(taskId, true);
          window.location.href = downloadUrl;
        };
      }

      // Check current candidate pipeline status to configure decision controls
      const app = currentApplications.find(a => String(a.id) === String(sub.application_id));
      const appStatus = (app ? app.status : sub.application_status) || 'TASK_SUBMITTED';

      if (['TASK_SUBMITTED', 'TASK_UNDER_REVIEW'].includes(appStatus)) {
        if (decisionButtonsRow) decisionButtonsRow.style.display = 'flex';
        if (decisionAlreadyResolved) decisionAlreadyResolved.style.display = 'none';
      } else {
        // Candidate has moved beyond task review (e.g. SECOND_INTERVIEW, SELECTED, REJECTED)
        if (decisionButtonsRow) decisionButtonsRow.style.display = 'none';
        if (decisionAlreadyResolved) {
          decisionAlreadyResolved.style.display = 'flex';
          if (resolvedStatusBadge) {
            resolvedStatusBadge.textContent = appStatus.replace(/_/g, ' ');
            if (appStatus === 'SELECTED') {
              resolvedStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
              resolvedStatusBadge.style.color = '#10b981';
              resolvedStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            } else if (appStatus === 'REJECTED') {
              resolvedStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
              resolvedStatusBadge.style.color = '#f87171';
              resolvedStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            } else {
              resolvedStatusBadge.style.background = 'rgba(56, 221, 248, 0.2)';
              resolvedStatusBadge.style.color = '#38ddf8';
              resolvedStatusBadge.style.borderColor = 'rgba(56, 221, 248, 0.4)';
            }
          }
        }
      }

      document.body.style.overflow = 'hidden';
      submissionDetailModal.style.display = 'flex';
    } catch (err) {
      console.error('Failed to retrieve task submission:', err);
      showToast(err.message || 'Could not load submission details', 3500);
    }
  }

  function closeSubmissionModal() {
    if (submissionDetailModal) {
      submissionDetailModal.style.display = 'none';
    }
    syncBodyScrollLock();
  }

  function closeSelectConfirmModal() {
    if (selectInterviewConfirmModal) {
      selectInterviewConfirmModal.style.display = 'none';
    }
    syncBodyScrollLock();
  }

  function closeRejectModal() {
    if (rejectCandidateModal) {
      rejectCandidateModal.style.display = 'none';
    }
    syncBodyScrollLock();
  }

  // Bind decision trigger buttons
  btnSelectSecondInterview?.addEventListener('click', () => {
    if (!activeReviewSub) return;
    if (confirmSelectCandidateName) confirmSelectCandidateName.textContent = activeReviewSub.candidate_name || 'Candidate';
    if (confirmSelectTaskTitle) confirmSelectTaskTitle.textContent = activeReviewSub.task_title || 'Assigned Task';
    document.body.style.overflow = 'hidden';
    if (selectInterviewConfirmModal) selectInterviewConfirmModal.style.display = 'flex';
  });

  btnRejectCandidate?.addEventListener('click', () => {
    if (!activeReviewSub) return;
    if (confirmRejectCandidateName) confirmRejectCandidateName.textContent = activeReviewSub.candidate_name || 'Candidate';
    if (confirmRejectTaskTitle) confirmRejectTaskTitle.textContent = activeReviewSub.task_title || 'Assigned Task';
    if (rejectReasonInput) rejectReasonInput.value = '';
    document.body.style.overflow = 'hidden';
    if (rejectCandidateModal) rejectCandidateModal.style.display = 'flex';
  });

  // Confirm Select for Second Interview Action
  btnConfirmSelectInterview?.addEventListener('click', async () => {
    if (!activeReviewTaskId || !activeReviewSub) return;
    try {
      btnConfirmSelectInterview.disabled = true;
      btnConfirmSelectInterview.textContent = 'Selecting...';

      await window.NLL_API.tasks.review(activeReviewTaskId, {
        decision: 'SECOND_INTERVIEW',
        reason: `Selected for Second Interview Round by Admin (${activeReviewSub.candidate_name})`
      });

      showToast(`Candidate ${activeReviewSub.candidate_name} selected for Second Interview!`, 4000);
      closeSelectConfirmModal();
      closeSubmissionModal();
      await loadData();
    } catch (err) {
      console.error('Failed to select candidate for second interview:', err);
      showToast(err.message || 'Failed to select candidate', 4000);
    } finally {
      if (btnConfirmSelectInterview) {
        btnConfirmSelectInterview.disabled = false;
        btnConfirmSelectInterview.textContent = 'Confirm Selection';
      }
    }
  });

  // Confirm Reject Candidate Action
  btnConfirmRejectCandidate?.addEventListener('click', async () => {
    if (!activeReviewTaskId || !activeReviewSub) return;
    try {
      btnConfirmRejectCandidate.disabled = true;
      btnConfirmRejectCandidate.textContent = 'Rejecting...';

      const reason = rejectReasonInput ? rejectReasonInput.value.trim() : '';

      await window.NLL_API.tasks.review(activeReviewTaskId, {
        decision: 'REJECTED',
        reason: reason || `Application rejected after task review (${activeReviewSub.task_title})`
      });

      showToast(`Candidate ${activeReviewSub.candidate_name} rejected.`, 4000);
      closeRejectModal();
      closeSubmissionModal();
      await loadData();
    } catch (err) {
      console.error('Failed to reject candidate:', err);
      showToast(err.message || 'Failed to reject candidate', 4000);
    } finally {
      if (btnConfirmRejectCandidate) {
        btnConfirmRejectCandidate.disabled = false;
        btnConfirmRejectCandidate.textContent = 'Confirm Rejection';
      }
    }
  });

  // Close confirmation modal buttons
  btnCloseSelectConfirmModal?.addEventListener('click', closeSelectConfirmModal);
  btnCancelSelectInterview?.addEventListener('click', closeSelectConfirmModal);
  selectInterviewConfirmModal?.addEventListener('click', (e) => {
    if (e.target === selectInterviewConfirmModal) closeSelectConfirmModal();
  });

  btnCloseRejectModal?.addEventListener('click', closeRejectModal);
  btnCancelRejectCandidate?.addEventListener('click', closeRejectModal);
  rejectCandidateModal?.addEventListener('click', (e) => {
    if (e.target === rejectCandidateModal) closeRejectModal();
  });

  btnCloseSubModal?.addEventListener('click', closeSubmissionModal);
  btnDismissSubModal?.addEventListener('click', closeSubmissionModal);
  submissionDetailModal?.addEventListener('click', (e) => {
    if (e.target === submissionDetailModal) closeSubmissionModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeSubmissionModal();
      closeSelectConfirmModal();
      closeRejectModal();
    }
  });

  // 5. Load Candidates and Tasks from MySQL API
  async function loadData() {
    try {
      const [appsRes, tasksRes] = await Promise.all([
        window.NLL_API.applications.list({ limit: 100 }),
        window.NLL_API.tasks.list({ limit: 100 })
      ]);

      const applications = appsRes.data || [];
      const tasks = tasksRes.data || [];

      currentApplications = applications;

      // Map application ID to assigned task
      const appTaskMap = {};
      tasks.forEach((t) => {
        appTaskMap[t.application_id] = t;
      });
      currentAppTaskMap = appTaskMap;

      // Populate candidate selector
      if (candidateSelect) {
        const prevSelected = candidateSelect.value;
        if (applications.length === 0) {
          candidateSelect.innerHTML = '<option value="">No candidates found in database</option>';
        } else {
          candidateSelect.innerHTML =
            '<option value="">Search and select a candidate...</option>' +
            applications
              .map((app) => {
                const isAssigned = [
                  'TASK_ASSIGNED',
                  'TASK_SUBMITTED',
                  'TASK_UNDER_REVIEW',
                  'SECOND_INTERVIEW',
                  'INTERVIEW',
                  'INTERVIEW_COMPLETED',
                  'SELECTED',
                  'REJECTED'
                ].includes(app.status);
                const statusLabel = isAssigned ? ' [Task Already Assigned]' : ' [Ready for Assignment]';
                const safeName = escapeHtml(app.full_name);
                const safeDomain = escapeHtml(app.domain || app.branch || 'Candidate');
                return `<option value="${app.id}">${safeName} (${safeDomain})${statusLabel}</option>`;
              })
              .join('');
        }

        if (prevSelected) {
          candidateSelect.value = prevSelected;
        }
        validateForm();
      }

      // Update counters
      const total = applications.length;
      let assignedCount = 0;
      let toBeAssignedCount = 0;

      applications.forEach((a) => {
        if (
          [
            'TASK_ASSIGNED',
            'TASK_SUBMITTED',
            'TASK_UNDER_REVIEW',
            'SECOND_INTERVIEW',
            'INTERVIEW',
            'INTERVIEW_COMPLETED',
            'SELECTED',
            'REJECTED'
          ].includes(a.status)
        ) {
          assignedCount++;
        } else {
          toBeAssignedCount++;
        }
      });

      const countTotal = document.getElementById('countTotal');
      const countToBeAssigned = document.getElementById('countToBeAssigned');
      const countAssigned = document.getElementById('countAssigned');

      if (countTotal) countTotal.textContent = formatNum(total);
      if (countToBeAssigned) countToBeAssigned.textContent = formatNum(toBeAssignedCount);
      if (countAssigned) countAssigned.textContent = formatNum(assignedCount);

      // Render candidates table
      const tbody = document.getElementById('tableBody');
      if (tbody) {
        if (applications.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" style="padding: 48px 16px; text-align: center; color: #94a3b8; font-size: 14px;">
                No candidates found in the database.<br>
                <span style="font-size: 12px; opacity: 0.75;">Candidate records will appear here as applications are submitted.</span>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = applications
            .map((app, idx) => {
            const sr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
            const isAssigned = [
              'TASK_ASSIGNED',
              'TASK_SUBMITTED',
              'TASK_UNDER_REVIEW',
              'SECOND_INTERVIEW',
              'INTERVIEW',
              'INTERVIEW_COMPLETED',
              'SELECTED',
              'REJECTED'
            ].includes(app.status);
            const taskObj = appTaskMap[app.id];

            let assignmentCell = '';
            let statusCell = '';

            if (isAssigned) {
              const rawTitle = taskObj?.title || 'Assigned';
              const taskTitle = escapeHtml(rawTitle);
              assignmentCell = `
              <td class="cell-assignment status-assigned">
                <div class="table-task-cell">
                  <span class="task-cell-title" title="${taskTitle}">${taskTitle}</span>
                  ${taskObj ? `<button type="button" class="btn-view-task-details" data-app-id="${app.id}" title="View full task instructions">View</button>` : ''}
                </div>
              </td>
            `;
              let statusPill = '';
              if (app.status === 'TASK_SUBMITTED') {
                statusPill = `<span class="badge-status-pill pill-submitted">Task Submitted</span>`;
              } else if (app.status === 'TASK_UNDER_REVIEW') {
                statusPill = `<span class="badge-status-pill" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">Under Review</span>`;
              } else if (app.status === 'SECOND_INTERVIEW' || app.status === 'INTERVIEW') {
                statusPill = `<span class="badge-status-pill" style="background: rgba(56, 221, 248, 0.15); color: #38ddf8; border: 1px solid rgba(56, 221, 248, 0.3);">Second Interview</span>`;
              } else if (app.status === 'INTERVIEW_COMPLETED') {
                statusPill = `<span class="badge-status-pill" style="background: rgba(124, 77, 255, 0.15); color: #b388ff; border: 1px solid rgba(124, 77, 255, 0.3);">Interview Done</span>`;
              } else if (app.status === 'SELECTED') {
                statusPill = `<span class="badge-status-pill pill-completed">Selected</span>`;
              } else if (app.status === 'REJECTED') {
                statusPill = `<span class="badge-status-pill" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">Rejected</span>`;
              } else {
                statusPill = `<span class="badge-status-pill pill-assigned">Assigned</span>`;
              }
              statusCell = `<td class="cell-status">${statusPill}</td>`;
            } else {
              const safeNameForBtn = escapeHtml(app.full_name);
              assignmentCell = `
              <td class="cell-assignment">
                <button type="button" class="btn-assign-action" data-app-id="${app.id}" data-name="${safeNameForBtn}">
                  <span class="btn-assign-icon">+</span> Assign
                </button>
              </td>
            `;
              statusCell = `<td class="cell-status"><span class="badge-status-pill pill-muted">Not Applicable</span></td>`;
            }

            const safeName = escapeHtml(app.full_name);
            const safeDomainBranch = escapeHtml(app.domain || app.branch || '');

            return `
            <tr data-id="${app.id}">
              <td class="cell-sr">${sr}</td>
              <td class="cell-name font-bold">${safeName}</td>
              <td class="cell-domain font-regular">${safeDomainBranch}</td>
              ${assignmentCell}
              ${statusCell}
              ${(() => {
                if (isAssigned && taskObj) {
                  const isSubmitted = taskObj.submission_status === 'SUBMITTED' ||
                    !!taskObj.latestSubmission ||
                    ['TASK_SUBMITTED', 'TASK_UNDER_REVIEW', 'SECOND_INTERVIEW', 'INTERVIEW', 'INTERVIEW_COMPLETED', 'SELECTED'].includes(app.status);

                  if (isSubmitted) {
                    return `
                      <td class="cell-submission">
                        <div class="submission-cell-actions">
                          <span class="badge-sub-status badge-submitted">Submitted</span>
                          <button type="button" class="btn-view-submission" data-task-id="${taskObj.id}" title="Review Candidate Submission">
                            Review
                          </button>
                        </div>
                      </td>
                    `;
                  } else {
                    return `
                      <td class="cell-submission">
                        <span class="badge-sub-status badge-not-submitted">Not Submitted</span>
                      </td>
                    `;
                  }
                }
                return `<td class="cell-submission cell-dash">—</td>`;
              })()}
            </tr>
          `;
          })
          .join('');

            bindTableActions();
        }
      }
    } catch (err) {
      console.error('Error loading task assignment data:', err);
      showToast('Could not load candidates from database', 3000);
      const tbody = document.getElementById('tableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="padding: 48px 16px; text-align: center; color: #f87171; font-size: 14px;">
              Unable to load candidate task records.<br>
              <span style="font-size: 12px; opacity: 0.85;">Please verify backend connection and try again.</span>
            </td>
          </tr>
        `;
      }
    }
  }

  // 6. Bind Table Row Action Buttons
  function bindTableActions() {
    // "assign" button on unassigned row
    const assignButtons = document.querySelectorAll('.btn-assign-action');
    assignButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-app-id');
        if (candidateSelect) {
          candidateSelect.value = appId;
          validateForm();
        }
        const formCard = document.getElementById('taskAssignmentSection');
        if (formCard) {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (taskTitleInput) {
          taskTitleInput.focus();
        }
      });
    });

    // "view" button on assigned row
    const viewButtons = document.querySelectorAll('.btn-view-task-details');
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-app-id');
        const app = currentApplications.find((a) => String(a.id) === String(appId));
        const task = currentAppTaskMap[appId];
        if (app && task) {
          openTaskModal(app, task);
        }
      });
    });

    // "View Submission" button
    const viewSubmissionButtons = document.querySelectorAll('.btn-view-submission');
    viewSubmissionButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        if (taskId) {
          openSubmissionModal(taskId);
        }
      });
    });
  }

  // 7. Form Reset Helper (for Cancel button and post-submission cleanup)
  function resetTaskForm() {
    if (taskAssignForm) taskAssignForm.reset();
    clearFormError();
    updateMinDateTime();

    if (titleCharCounter) titleCharCounter.textContent = '0/200';
    if (descCharCounter) descCharCounter.textContent = '0/2000';
    if (selectedDeadlinePreview) selectedDeadlinePreview.style.display = 'none';

    // Reset preview to clean placeholder prompts
    if (previewTaskTitle) previewTaskTitle.textContent = 'Task Title (Live Preview)';
    if (previewTaskDesc)
      previewTaskDesc.textContent = 'Enter task instructions and deliverables in the assignment form to preview live here.';
    if (previewDeadlineVal) previewDeadlineVal.textContent = '—';
    if (previewDeadlineContainer) previewDeadlineContainer.style.display = 'none';

    validateForm();
  }

  // 8. Form Submission Handler
  if (taskAssignForm) {
    taskAssignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError();

      const candidateId = candidateSelect?.value.trim();
      const title = taskTitleInput?.value.trim();
      const description = taskDescriptionInput?.value.trim();
      const deadline = taskDeadlineInput?.value ? taskDeadlineInput.value.trim() : '';

      // Detailed validation feedback
      if (!candidateId) {
        showFormError('Please select a candidate to assign the task to.');
        return;
      }
      if (!title) {
        showFormError('Task Title is required.');
        return;
      }
      if (title.length > 200) {
        showFormError('Task Title cannot exceed 200 characters.');
        return;
      }
      if (!description) {
        showFormError('Task Description and Instructions are required.');
        return;
      }
      if (description.length > 2000) {
        showFormError('Task Description cannot exceed 2000 characters.');
        return;
      }
      if (!deadline) {
        showFormError('Deadline date and time is required.');
        return;
      }
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        showFormError('Please select a valid deadline date and time.');
        return;
      }
      if (deadlineDate.getTime() < Date.now() - 60000) {
        const selectedFormatted = formatDeadline(deadline);
        const todayFormatted = formatDeadline(new Date());
        showFormError(`⚠️ Deadline cannot be in the past! You selected ${selectedFormatted}, but today is ${todayFormatted}. Please pick a date after today. (Tip: If you intended October 3, please select October 3 in the calendar).`);
        taskDeadlineInput?.focus();
        return;
      }

      if (btnAssignTaskSubmit) {
        btnAssignTaskSubmit.disabled = true;
        const btnText = btnAssignTaskSubmit.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Assigning...';
      }

      try {
        await window.NLL_API.tasks.assign({
          applicationId: parseInt(candidateId, 10),
          title,
          description,
          deadline
        });

        showToast(`Task "${title}" successfully assigned!`, 3500);
        resetTaskForm();
        await loadData();
      } catch (err) {
        console.error('Task assignment failed:', err);
        showFormError(err.message || 'Failed to assign task. Please try again.');
      } finally {
        if (btnAssignTaskSubmit) {
          const btnText = btnAssignTaskSubmit.querySelector('.btn-text');
          if (btnText) btnText.textContent = 'Assign Task';
          validateForm();
        }
      }
    });
  }

  // Cancel Button
  if (btnResetTaskForm) {
    btnResetTaskForm.addEventListener('click', () => {
      resetTaskForm();
      showToast('Form cleared');
    });
  }

  await loadData();

  // 9. Interactive Stat Card Filtering
  document.getElementById('statCardTotal')?.addEventListener('click', () => {
    filterTable('all');
    showToast('Showing all applicants');
  });

  document.getElementById('statCardToBeAssigned')?.addEventListener('click', () => {
    filterTable('assign');
    showToast('Filtered: Candidates to be assigned');
  });

  document.getElementById('statCardAssigned')?.addEventListener('click', () => {
    filterTable('assigned');
    showToast('Filtered: Assigned tasks');
  });

  function filterTable(filter) {
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach((row) => {
      if (filter === 'all') {
        row.style.display = '';
      } else if (filter === 'assign') {
        const btn = row.querySelector('.btn-assign-action');
        row.style.display = btn ? '' : 'none';
      } else if (filter === 'assigned') {
        const assignedSpan = row.querySelector('.status-assigned');
        row.style.display = assignedSpan ? '' : 'none';
      }
    });
  }

  // 10. Action Controls (Export to CSV)
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportTableToCSV('NewLeapLabs_Task_Assignments.csv');
      showToast('Exporting task assignments to CSV...');
    });
  }

  function exportTableToCSV(filename) {
    const table = document.getElementById('taskTable') || document.getElementById('assignmentTable');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const csvContent = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells
          .map((cell) => {
            let text = cell.innerText.replace(/"/g, '""').trim();
            return `"${text}"`;
          })
          .join(',');
      })
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 11. Column Sorting
  const sortHeaders = document.querySelectorAll('th.sortable');
  let currentSort = { col: null, asc: true };

  sortHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const sortType = th.getAttribute('data-sort');
      let colIndex = 1;
      if (sortType === 'name') colIndex = 1;
      else if (sortType === 'domain') colIndex = 2;
      else if (sortType === 'assignment') colIndex = 3;
      else if (sortType === 'status') colIndex = 4;
      else if (sortType === 'submission') colIndex = 5;

      const isAsc = currentSort.col === sortType ? !currentSort.asc : true;
      currentSort = { col: sortType, asc: isAsc };

      sortHeaders.forEach((h) => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(isAsc ? 'sort-asc' : 'sort-desc');

      sortTableByColumn(colIndex, isAsc);
    });
  });

  function sortTableByColumn(colIndex, ascending) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const aText = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
      const bText = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';
      return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });

    rows.forEach((row) => tbody.appendChild(row));
  }

  // 12. Logout Handling
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
