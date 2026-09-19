/**
 * Admin Dashboard Script - New Leap Labs
 * Integrated with REST API & MySQL Backend
 * Full Candidate Selection Pipeline Support
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

  function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  const formatNum = (n) => (n < 10 ? `0${n}` : `${n}`);

  // 3. Modals and Elements
  const scheduleInterviewModal = document.getElementById('scheduleInterviewModal');
  const btnCloseScheduleModal = document.getElementById('btnCloseScheduleModal');
  const btnCancelScheduleModal = document.getElementById('btnCancelScheduleModal');
  const scheduleInterviewForm = document.getElementById('scheduleInterviewForm');
  const scheduleCandidateName = document.getElementById('scheduleCandidateName');
  const scheduleDateTimeInput = document.getElementById('scheduleDateTimeInput');
  const scheduleModeSelect = document.getElementById('scheduleModeSelect');
  const scheduleLocationInput = document.getElementById('scheduleLocationInput');
  const scheduleNotesInput = document.getElementById('scheduleNotesInput');
  const btnGenGoogleMeet = document.getElementById('btnGenGoogleMeet');

  const interviewFeedbackModal = document.getElementById('interviewFeedbackModal');
  const btnCloseFeedbackModal = document.getElementById('btnCloseFeedbackModal');
  const btnCancelFeedbackModal = document.getElementById('btnCancelFeedbackModal');
  const feedbackCandidateName = document.getElementById('feedbackCandidateName');
  const feedbackInterviewRoundBadge = document.getElementById('feedbackInterviewRoundBadge');
  const feedbackScoreInput = document.getElementById('feedbackScoreInput');
  const feedbackNotesInput = document.getElementById('feedbackNotesInput');
  const btnInterviewSelect = document.getElementById('btnInterviewSelect');
  const btnInterviewReject = document.getElementById('btnInterviewReject');

  const feedbackMeetBar = document.getElementById('feedbackMeetBar');
  const feedbackMeetUrl = document.getElementById('feedbackMeetUrl');
  const btnLaunchMeet = document.getElementById('btnLaunchMeet');

  const qaCountBadge = document.getElementById('qaCountBadge');
  const qaListContainer = document.getElementById('qaListContainer');
  const qaQuestionInput = document.getElementById('qaQuestionInput');
  const qaAnswerInput = document.getElementById('qaAnswerInput');
  const btnAddQuestionBtn = document.getElementById('btnAddQuestionBtn');

  const navSecondInterviews = document.getElementById('navSecondInterviews');

  const confirmFinalDecisionModal = document.getElementById('confirmFinalDecisionModal');
  const btnCloseFinalConfirmModal = document.getElementById('btnCloseFinalConfirmModal');
  const btnCancelFinalConfirm = document.getElementById('btnCancelFinalConfirm');
  const btnExecuteFinalDecision = document.getElementById('btnExecuteFinalDecision');
  const finalConfirmPrompt = document.getElementById('finalConfirmPrompt');
  const finalConfirmCandidateName = document.getElementById('finalConfirmCandidateName');
  const finalConfirmEyebrow = document.getElementById('finalConfirmEyebrow');
  const finalConfirmTitle = document.getElementById('finalConfirmTitle');
  const finalRejectionReasonContainer = document.getElementById('finalRejectionReasonContainer');
  const finalRejectionReasonInput = document.getElementById('finalRejectionReasonInput');

  let activeApplication = null;
  let activeInterview = null;
  let pendingDecision = null; // 'SELECTED' or 'REJECTED'

  // Min date-time for scheduling
  if (scheduleDateTimeInput) {
    const now = new Date();
    scheduleDateTimeInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  // Quick Google Meet link generator
  if (btnGenGoogleMeet) {
    btnGenGoogleMeet.addEventListener('click', () => {
      const p1 = Math.random().toString(36).substring(2, 5);
      const p2 = Math.random().toString(36).substring(2, 6);
      const p3 = Math.random().toString(36).substring(2, 5);
      const generatedMeetUrl = `https://meet.google.com/${p1}-${p2}-${p3}`;

      if (scheduleModeSelect) {
        scheduleModeSelect.value = 'Online (Google Meet)';
      }
      if (scheduleLocationInput) {
        scheduleLocationInput.value = generatedMeetUrl;
        scheduleLocationInput.focus();
      }
      showToast('Google Meet link generated!');
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadQuestionsForInterview(interviewId) {
    if (!qaListContainer) return;
    qaListContainer.innerHTML = '<div class="qa-empty-placeholder">Loading recorded questions...</div>';

    try {
      const res = await window.NLL_API.interviews.getQuestions(interviewId);
      const questions = res.data || [];

      if (qaCountBadge) {
        qaCountBadge.textContent = `${questions.length} Recorded`;
      }

      if (questions.length === 0) {
        qaListContainer.innerHTML = '<div class="qa-empty-placeholder">No questions recorded yet. Add questions asked during the interview below.</div>';
        return;
      }

      qaListContainer.innerHTML = questions.map((q, idx) => `
        <div class="qa-item" data-question-id="${q.id}">
          <div class="qa-item-header">
            <div class="qa-question-text">
              <span class="qa-q-badge">Q${idx + 1}:</span> ${escapeHtml(q.question)}
            </div>
            <button type="button" class="btn-delete-qa" data-question-id="${q.id}" title="Delete Question">&times;</button>
          </div>
          ${q.answer ? `
            <div class="qa-answer-box">
              <span class="qa-answer-label">Candidate Answer:</span>
              <div class="qa-answer-text">${escapeHtml(q.answer)}</div>
            </div>
          ` : ''}
        </div>
      `).join('');

      // Bind delete handlers
      const deleteButtons = qaListContainer.querySelectorAll('.btn-delete-qa');
      deleteButtons.forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const qId = btn.getAttribute('data-question-id');
          if (!qId) return;

          btn.disabled = true;
          try {
            await window.NLL_API.interviews.deleteQuestion(qId);
            showToast('Question deleted');
            await loadQuestionsForInterview(interviewId);
          } catch (err) {
            console.error('Failed to delete question:', err);
            showToast('Failed to delete question');
          }
        });
      });
    } catch (err) {
      console.error('Failed to load questions:', err);
      qaListContainer.innerHTML = '<div class="qa-empty-placeholder">Could not load questions.</div>';
    }
  }

  let currentApplications = [];
  let currentInterviewsMap = {};

  // 4. Load Dynamic Statistics & Applications from MySQL API
  async function loadAdminData() {
    try {
      const [statsRes, appsRes, interviewsRes] = await Promise.all([
        window.NLL_API.dashboard.getStats(),
        window.NLL_API.applications.list({ limit: 100 }),
        window.NLL_API.interviews.list({ limit: 100 }).catch(() => ({ data: [] }))
      ]);

      const stats = statsRes.data;
      const applications = appsRes.data || [];
      const interviews = interviewsRes.data || [];

      currentApplications = applications;

      // Map application ID to latest interview
      const appInterviewMap = {};
      interviews.forEach((item) => {
        appInterviewMap[item.application_id] = item;
      });
      currentInterviewsMap = appInterviewMap;

      // 4a. Update 6 Pipeline Metrics
      const countNewApps = document.getElementById('countNewApps');
      const countTaskAssigned = document.getElementById('countTaskAssigned');
      const countTask = document.getElementById('countTask');
      const countInterview = document.getElementById('countInterview');
      const countFinal = document.getElementById('countFinal');
      const countRejected = document.getElementById('countRejected');
      const dynamicAppCount = document.getElementById('dynamicAppCount');

      if (countNewApps) countNewApps.textContent = formatNum(stats.totalApplications || 0);
      if (countTaskAssigned) countTaskAssigned.textContent = formatNum(stats.taskAssigned || 0);
      if (countTask) countTask.textContent = formatNum(stats.taskSubmitted || 0);
      if (countInterview) countInterview.textContent = formatNum(stats.secondInterview || 0);
      if (countFinal) countFinal.textContent = formatNum(stats.selectedCandidates || 0);
      if (countRejected) countRejected.textContent = formatNum(stats.rejectedCandidates || 0);
      if (dynamicAppCount) dynamicAppCount.textContent = `${stats.totalApplications || 0}`;

      // 4b. Render Applications Table
      const tbody = document.getElementById('tableBody');
      if (tbody) {
        if (applications.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="7" style="padding: 48px 16px; text-align: center; color: #94a3b8; font-size: 14px;">
                No applications found in the database.<br>
                <span style="font-size: 12px; opacity: 0.75;">New candidate submissions will appear here automatically.</span>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = applications
            .map((app, idx) => {
              const sr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
              const interviewObj = appInterviewMap[app.id];

              // 1. Task Round Column
              let taskText = 'not applicable';
              let taskClass = 'status-muted';
              if (app.status === 'TASK_ASSIGNED') {
                taskText = 'assigned';
                taskClass = 'status-incomplete';
              } else if (app.status === 'TASK_SUBMITTED') {
                taskText = 'submitted';
                taskClass = 'status-selected';
              } else if (app.status === 'TASK_UNDER_REVIEW') {
                taskText = 'under review';
                taskClass = 'status-selected';
              } else if (['SECOND_INTERVIEW', 'INTERVIEW', 'INTERVIEW_COMPLETED', 'SELECTED', 'REJECTED'].includes(app.status)) {
                taskText = 'completed';
                taskClass = 'status-selected';
              }

              // 2. Second Interview Column
              let interviewText = 'not applicable';
              let interviewClass = 'status-muted';
              if (app.status === 'SECOND_INTERVIEW' || app.status === 'INTERVIEW') {
                if (interviewObj && interviewObj.status === 'SCHEDULED') {
                  interviewText = 'scheduled';
                  interviewClass = 'status-incomplete';
                } else {
                  interviewText = 'eligible';
                  interviewClass = 'status-incomplete';
                }
              } else if (app.status === 'INTERVIEW_COMPLETED') {
                interviewText = 'completed';
                interviewClass = 'status-selected';
              } else if (app.status === 'SELECTED') {
                interviewText = 'selected';
                interviewClass = 'status-selected';
              } else if (app.status === 'REJECTED') {
                interviewText = 'rejected';
                interviewClass = 'status-rejected';
              }

              // 3. Current Status Badge
              let statusPillClass = 'pill-applied';
              let statusLabel = app.status.replace(/_/g, ' ');

              if (app.status === 'SHORTLISTED') statusPillClass = 'pill-assigned';
              else if (app.status === 'TASK_ASSIGNED') statusPillClass = 'pill-assigned';
              else if (app.status === 'TASK_SUBMITTED') statusPillClass = 'pill-submitted';
              else if (app.status === 'TASK_UNDER_REVIEW') statusPillClass = 'pill-review';
              else if (app.status === 'SECOND_INTERVIEW' || app.status === 'INTERVIEW') statusPillClass = 'pill-interview';
              else if (app.status === 'INTERVIEW_COMPLETED') statusPillClass = 'pill-interview';
              else if (app.status === 'SELECTED') statusPillClass = 'pill-completed';
              else if (app.status === 'REJECTED') statusPillClass = 'pill-rejected';

              // 4. Action Cell
              let actionHtml = '—';
              const safeName = escapeHtml(app.full_name);
              const safeDomainBranch = escapeHtml(app.domain || app.branch || '');

              if (app.status === 'SECOND_INTERVIEW' || app.status === 'INTERVIEW') {
                if (interviewObj) {
                  actionHtml = `<button type="button" class="btn-table-action btn-table-evaluate" data-app-id="${app.id}" data-interview-id="${interviewObj.id}" data-name="${safeName}">Evaluate / Feedback</button>`;
                } else {
                  actionHtml = `<button type="button" class="btn-table-action btn-table-schedule" data-app-id="${app.id}" data-name="${safeName}">Schedule Interview</button>`;
                }
              } else if (app.status === 'INTERVIEW_COMPLETED') {
                actionHtml = `<button type="button" class="btn-table-action btn-table-evaluate" data-app-id="${app.id}" data-interview-id="${interviewObj ? interviewObj.id : ''}" data-name="${safeName}">Final Decision</button>`;
              } else if (app.status === 'SELECTED') {
                actionHtml = `<span style="color: #10b981; font-weight: 600; font-size: 12px;">✓ Selected</span>`;
              } else if (app.status === 'REJECTED') {
                actionHtml = `<span style="color: #f87171; font-weight: 600; font-size: 12px;">✕ Rejected</span>`;
              } else if (['TASK_SUBMITTED', 'TASK_UNDER_REVIEW'].includes(app.status)) {
                actionHtml = `<a href="task-assignment.html" class="btn-table-action btn-table-schedule">Review Task</a>`;
              } else if (['APPLIED', 'SHORTLISTED'].includes(app.status)) {
                actionHtml = `<a href="task-assignment.html" class="btn-table-action" style="background: rgba(255,255,255,0.08); color: #cbd5e1;">Assign Task</a>`;
              }

              return `
              <tr data-app-id="${app.id}" title="${safeName} (${safeDomainBranch})">
                <td class="cell-sr">${sr}</td>
                <td class="cell-name font-bold">
                  <a href="task-assignment.html" style="color: inherit; text-decoration: none;">${safeName}</a>
                </td>
                <td class="cell-domain font-regular">${safeDomainBranch}</td>
                <td class="cell-task ${taskClass}">${taskText}</td>
                <td class="cell-interview ${interviewClass}">${interviewText}</td>
                <td class="cell-status">
                  <span class="badge-status-pill ${statusPillClass}">${statusLabel}</span>
                </td>
                <td class="cell-action">${actionHtml}</td>
              </tr>
            `;
            })
            .join('');

          bindTableActions();
        }
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      showToast('Could not fetch real-time data from database', 3000);
      const tbody = document.getElementById('tableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="padding: 48px 16px; text-align: center; color: #f87171; font-size: 14px;">
              Unable to load candidate applications.<br>
              <span style="font-size: 12px; opacity: 0.85;">Please verify backend connection and try again.</span>
            </td>
          </tr>
        `;
      }
    }
  }

  // 5. Bind Table Row Action Buttons
  function bindTableActions() {
    // Schedule interview button
    const scheduleButtons = document.querySelectorAll('.btn-table-schedule');
    scheduleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-app-id');
        const candName = btn.getAttribute('data-name');
        const app = currentApplications.find((a) => String(a.id) === String(appId));

        activeApplication = app;
        if (scheduleCandidateName) scheduleCandidateName.textContent = candName || 'Candidate';
        if (scheduleInterviewForm) scheduleInterviewForm.reset();
        if (scheduleInterviewModal) scheduleInterviewModal.style.display = 'flex';
      });
    });

    // Evaluate / Record feedback button
    const evaluateButtons = document.querySelectorAll('.btn-table-evaluate');
    evaluateButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-app-id');
        const intId = btn.getAttribute('data-interview-id');
        const candName = btn.getAttribute('data-name');
        const app = currentApplications.find((a) => String(a.id) === String(appId));
        const interview = currentInterviewsMap[appId];

        activeApplication = app;
        activeInterview = interview || (intId ? { id: intId } : null);

        if (feedbackCandidateName) feedbackCandidateName.textContent = candName || 'Candidate';
        if (feedbackScoreInput) feedbackScoreInput.value = interview?.score || '';
        if (feedbackNotesInput) feedbackNotesInput.value = interview?.notes || '';

        // Check for Google Meet link in notes
        const notesText = interview?.notes || '';
        let parsedLink = null;
        if (notesText.includes('http://') || notesText.includes('https://')) {
          const urlMatch = notesText.match(/(https?:\/\/[^\s|]+)/i);
          if (urlMatch) parsedLink = urlMatch[1].trim();
        }

        if (parsedLink && feedbackMeetBar && feedbackMeetUrl && btnLaunchMeet) {
          feedbackMeetUrl.textContent = parsedLink;
          btnLaunchMeet.href = parsedLink;
          feedbackMeetBar.style.display = 'flex';
        } else if (feedbackMeetBar) {
          feedbackMeetBar.style.display = 'none';
        }

        // Reset Q&A input fields
        if (qaQuestionInput) qaQuestionInput.value = '';
        if (qaAnswerInput) qaAnswerInput.value = '';

        // Load questions if interview exists
        if (activeInterview && activeInterview.id) {
          await loadQuestionsForInterview(activeInterview.id);
        } else if (qaListContainer) {
          qaListContainer.innerHTML = '<div class="qa-empty-placeholder">Schedule an interview first to record questions.</div>';
          if (qaCountBadge) qaCountBadge.textContent = '0 Recorded';
        }

        if (interviewFeedbackModal) interviewFeedbackModal.style.display = 'flex';
      });
    });
  }

  // 6. Schedule Interview Submission
  if (scheduleInterviewForm) {
    scheduleInterviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeApplication) return;

      const scheduledAt = scheduleDateTimeInput?.value;
      const mode = scheduleModeSelect?.value || 'Online';
      const location = scheduleLocationInput?.value ? scheduleLocationInput.value.trim() : '';
      const notes = scheduleNotesInput?.value ? scheduleNotesInput.value.trim() : '';

      if (!scheduledAt) {
        showToast('Please select interview date and time');
        return;
      }

      const btnSubmit = document.getElementById('btnSubmitSchedule');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Scheduling...';
      }

      try {
        const fullNotes = [
          `Mode: ${mode}`,
          location ? `Meeting Link / Location: ${location}` : '',
          notes
        ]
          .filter(Boolean)
          .join(' | ');

        await window.NLL_API.interviews.schedule({
          applicationId: activeApplication.id,
          scheduledAt,
          round: 'SECOND_INTERVIEW',
          mode,
          notes: fullNotes
        });

        showToast(`Second interview scheduled for ${activeApplication.full_name}!`, 3500);
        if (scheduleInterviewModal) scheduleInterviewModal.style.display = 'none';
        await loadAdminData();
      } catch (err) {
        console.error('Failed to schedule interview:', err);
        showToast(err.message || 'Failed to schedule interview', 3500);
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Schedule Interview';
        }
      }
    });
  }

  // 7. Feedback & Final Selection/Rejection
  btnInterviewSelect?.addEventListener('click', () => {
    if (!activeApplication) return;
    const score = feedbackScoreInput?.value;
    const notes = feedbackNotesInput?.value.trim();

    if (!notes) {
      showToast('Please enter interview evaluation notes before making a decision.');
      feedbackNotesInput?.focus();
      return;
    }

    pendingDecision = 'SELECTED';
    if (finalConfirmEyebrow) finalConfirmEyebrow.textContent = 'FINAL ADMISSION';
    if (finalConfirmTitle) {
      finalConfirmTitle.textContent = 'Final Selection';
      finalConfirmTitle.style.color = '#10b981';
    }
    if (finalConfirmPrompt) {
      finalConfirmPrompt.textContent = 'Confirm final selection of this candidate for New Leap Labs?';
    }
    if (finalConfirmCandidateName) finalConfirmCandidateName.textContent = activeApplication.full_name;
    if (finalRejectionReasonContainer) finalRejectionReasonContainer.style.display = 'none';

    if (btnExecuteFinalDecision) {
      btnExecuteFinalDecision.textContent = 'Confirm Final Selection';
      btnExecuteFinalDecision.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }

    if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'flex';
  });

  btnInterviewReject?.addEventListener('click', () => {
    if (!activeApplication) return;
    const notes = feedbackNotesInput?.value.trim();

    if (!notes) {
      showToast('Please enter evaluation notes before rejecting.');
      feedbackNotesInput?.focus();
      return;
    }

    pendingDecision = 'REJECTED';
    if (finalConfirmEyebrow) finalConfirmEyebrow.textContent = 'APPLICATION DECISION';
    if (finalConfirmTitle) {
      finalConfirmTitle.textContent = 'Reject Candidate';
      finalConfirmTitle.style.color = '#ef4444';
    }
    if (finalConfirmPrompt) {
      finalConfirmPrompt.textContent = 'Reject this candidate after the Second Interview?';
    }
    if (finalConfirmCandidateName) finalConfirmCandidateName.textContent = activeApplication.full_name;
    if (finalRejectionReasonContainer) finalRejectionReasonContainer.style.display = 'block';
    if (finalRejectionReasonInput) finalRejectionReasonInput.value = '';

    if (btnExecuteFinalDecision) {
      btnExecuteFinalDecision.textContent = 'Confirm Rejection';
      btnExecuteFinalDecision.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    }

    if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'flex';
  });

  // Execute final confirmed decision
  btnExecuteFinalDecision?.addEventListener('click', async () => {
    if (!activeApplication || !pendingDecision) return;

    const score = parseInt(feedbackScoreInput?.value, 10) || 0;
    const notes = feedbackNotesInput?.value.trim() || '';
    const rejectionReason = finalRejectionReasonInput ? finalRejectionReasonInput.value.trim() : '';

    if (btnExecuteFinalDecision) {
      btnExecuteFinalDecision.disabled = true;
      btnExecuteFinalDecision.textContent = 'Processing...';
    }

    try {
      const targetInterviewId = activeInterview ? activeInterview.id : null;

      if (targetInterviewId) {
        // Record feedback first
        await window.NLL_API.interviews.addFeedback(targetInterviewId, score, notes).catch(() => {});

        // Update interview with result and reason
        await window.NLL_API.interviews.update(targetInterviewId, {
          status: 'COMPLETED',
          result: pendingDecision,
          score,
          notes,
          reason: pendingDecision === 'REJECTED' ? rejectionReason || notes : notes
        });
      } else {
        // Direct application status update if no formal interview record exists
        await window.NLL_API.applications.updateStatus(
          activeApplication.id,
          pendingDecision,
          pendingDecision === 'REJECTED' ? rejectionReason || notes : notes
        );
      }

      if (pendingDecision === 'SELECTED') {
        showToast(`🎉 ${activeApplication.full_name} successfully selected for New Leap Labs!`, 4500);
      } else {
        showToast(`Candidate ${activeApplication.full_name} rejected.`, 4000);
      }

      if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'none';
      if (interviewFeedbackModal) interviewFeedbackModal.style.display = 'none';

      await loadAdminData();
    } catch (err) {
      console.error('Failed to execute final decision:', err);
      showToast(err.message || 'Failed to record decision', 4000);
    } finally {
      if (btnExecuteFinalDecision) {
        btnExecuteFinalDecision.disabled = false;
        btnExecuteFinalDecision.textContent = 'Confirm';
      }
    }
  });

  // 7b. Add Interview Question & Candidate Answer Live
  if (btnAddQuestionBtn) {
    btnAddQuestionBtn.addEventListener('click', async () => {
      if (!activeInterview || !activeInterview.id) {
        showToast('Please select a valid scheduled interview first');
        return;
      }

      const question = qaQuestionInput?.value.trim();
      const answer = qaAnswerInput?.value.trim() || '';

      if (!question) {
        showToast('Please enter the question asked');
        qaQuestionInput?.focus();
        return;
      }

      btnAddQuestionBtn.disabled = true;
      btnAddQuestionBtn.textContent = 'Adding...';

      try {
        await window.NLL_API.interviews.addQuestion(activeInterview.id, question, answer);
        showToast('Question and answer recorded!');
        if (qaQuestionInput) qaQuestionInput.value = '';
        if (qaAnswerInput) qaAnswerInput.value = '';
        await loadQuestionsForInterview(activeInterview.id);
      } catch (err) {
        console.error('Failed to add question:', err);
        showToast(err.message || 'Failed to record question');
      } finally {
        btnAddQuestionBtn.disabled = false;
        btnAddQuestionBtn.textContent = '+ Add Question & Answer';
      }
    });
  }

  // 8. Close Modal Controls
  function closeAllModals() {
    if (scheduleInterviewModal) scheduleInterviewModal.style.display = 'none';
    if (interviewFeedbackModal) interviewFeedbackModal.style.display = 'none';
    if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'none';
  }

  btnCloseScheduleModal?.addEventListener('click', closeAllModals);
  btnCancelScheduleModal?.addEventListener('click', closeAllModals);
  scheduleInterviewModal?.addEventListener('click', (e) => {
    if (e.target === scheduleInterviewModal) closeAllModals();
  });

  btnCloseFeedbackModal?.addEventListener('click', closeAllModals);
  btnCancelFeedbackModal?.addEventListener('click', closeAllModals);
  interviewFeedbackModal?.addEventListener('click', (e) => {
    if (e.target === interviewFeedbackModal) closeAllModals();
  });

  btnCloseFinalConfirmModal?.addEventListener('click', () => {
    if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'none';
  });
  btnCancelFinalConfirm?.addEventListener('click', () => {
    if (confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'none';
  });
  confirmFinalDecisionModal?.addEventListener('click', (e) => {
    if (e.target === confirmFinalDecisionModal) confirmFinalDecisionModal.style.display = 'none';
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  await loadAdminData();

  // URL stage query parameter filter check
  const urlParams = new URLSearchParams(window.location.search);
  const stageParam = urlParams.get('stage');
  if (stageParam === 'SECOND_INTERVIEW') {
    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) navDashboard.classList.remove('active');
    if (navSecondInterviews) navSecondInterviews.classList.add('active');
    applyTableFilter('Second Interview');
    showToast('Filtered: Second Interview Stage');
  }

  // 9. Interactive Stat Card Clicks (Filtering)
  document.getElementById('statNewApplications')?.addEventListener('click', () => {
    applyTableFilter('All');
    showToast('Viewing All Applications');
  });
  document.getElementById('statTaskAssigned')?.addEventListener('click', () => {
    applyTableFilter('assigned');
    showToast('Filtered: Task Assigned');
  });
  document.getElementById('statTaskRound')?.addEventListener('click', () => {
    applyTableFilter('submitted');
    showToast('Filtered: Task Submitted');
  });
  document.getElementById('statInterviewRound')?.addEventListener('click', () => {
    applyTableFilter('Second Interview');
    showToast('Filtered: Second Interview Stage');
  });
  document.getElementById('statFinalSelection')?.addEventListener('click', () => {
    applyTableFilter('selected');
    showToast('Filtered: Final Selection');
  });
  document.getElementById('statRejected')?.addEventListener('click', () => {
    applyTableFilter('rejected');
    showToast('Filtered: Rejected Candidates');
  });

  // 10. Action Buttons (Filters, Export)
  const filterBtn = document.getElementById('filterBtn');
  let currentFilterIndex = 0;
  const filterOptions = ['All', 'selected', 'rejected', 'assigned', 'submitted', 'Second Interview'];

  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      currentFilterIndex = (currentFilterIndex + 1) % filterOptions.length;
      const filter = filterOptions[currentFilterIndex];
      applyTableFilter(filter);
      showToast(`Filter applied: ${filter}`);
    });
  }

  function applyTableFilter(filter) {
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach((row) => {
      if (filter === 'All') {
        row.style.display = '';
      } else {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter.toLowerCase())) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      }
    });
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportTableToCSV('NewLeapLabs_Candidates_Pipeline.csv');
      showToast('Exporting candidate pipeline to CSV...');
    });
  }

  function exportTableToCSV(filename) {
    const table = document.getElementById('statusTable');
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
      else if (sortType === 'task') colIndex = 3;
      else if (sortType === 'interview') colIndex = 4;
      else if (sortType === 'status') colIndex = 5;

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
