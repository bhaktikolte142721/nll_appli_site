/**
 * User Dashboard Script - New Leap Labs
 * Integrated with REST API & MySQL Backend
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Enforce Candidate Authentication Guard
  if (window.NLL_API && !window.NLL_API.enforceAuthGuard('candidate')) {
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

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 3. Load Candidate Data from MySQL API
  async function loadDashboardData() {
    try {
      const res = await window.NLL_API.dashboard.getCandidateData();
      const data = res.data;

      const heroTitle = document.getElementById('heroTitle');
      const dynamicStatusText = document.getElementById('dynamicStatusText');
      const tbody = document.getElementById('tableBody');

      if (data.candidate && heroTitle) {
        heroTitle.textContent = `Welcome ${data.candidate.full_name}`;
      }

      if (dynamicStatusText) {
        if (!data.hasApplication) {
          dynamicStatusText.textContent = 'No Application Submitted Yet';
          dynamicStatusText.style.color = '#e07a5f';
        } else {
          dynamicStatusText.textContent = `Status: ${data.status}`;
          if (data.status === 'SELECTED') dynamicStatusText.style.color = '#58d87a';
          else if (data.status === 'REJECTED') dynamicStatusText.style.color = '#ff6b6b';
          else if (data.status === 'TASK_ASSIGNED' || data.status === 'INTERVIEW') dynamicStatusText.style.color = '#4ea8de';
          else dynamicStatusText.style.color = '#f2cc8f';
        }
      }

      // 3.1 Update Pipeline Stepper & Announcement Box
      const stepper = document.getElementById('pipelineStepper');
      const announcementBox = document.getElementById('announcementBox');
      const announcementIcon = document.getElementById('announcementIcon');
      const announcementTitle = document.getElementById('announcementTitle');
      const announcementDesc = document.getElementById('announcementDesc');

      function resetStepper() {
        const steps = ['stepApplied', 'stepAssigned', 'stepSubmitted', 'stepReview', 'stepInterview', 'stepDecision'];
        const lines = ['line1', 'line2', 'line3', 'line4', 'line5'];
        steps.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.className = 'step-item';
        });
        lines.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.className = 'step-line';
        });
        const decisionLabel = document.getElementById('stepDecisionLabel');
        if (decisionLabel) decisionLabel.textContent = 'Selected';
      }

      function updateStepper(status) {
        resetStepper();
        const setStep = (id, state) => {
          const el = document.getElementById(id);
          if (el) el.classList.add(state);
        };
        const setLine = (id, state) => {
          const el = document.getElementById(id);
          if (el) el.classList.add(state);
        };

        if (status === 'APPLIED' || status === 'SHORTLISTED') {
          setStep('stepApplied', 'active');
        } else if (status === 'TASK_ASSIGNED') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'active');
        } else if (status === 'TASK_SUBMITTED') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'completed');
          setLine('line2', 'completed');
          setStep('stepSubmitted', 'active');
        } else if (status === 'TASK_UNDER_REVIEW') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'completed');
          setLine('line2', 'completed');
          setStep('stepSubmitted', 'completed');
          setLine('line3', 'completed');
          setStep('stepReview', 'active');
        } else if (status === 'SECOND_INTERVIEW' || status === 'INTERVIEW') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'completed');
          setLine('line2', 'completed');
          setStep('stepSubmitted', 'completed');
          setLine('line3', 'completed');
          setStep('stepReview', 'completed');
          setLine('line4', 'completed');
          setStep('stepInterview', 'active');
        } else if (status === 'INTERVIEW_COMPLETED') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'completed');
          setLine('line2', 'completed');
          setStep('stepSubmitted', 'completed');
          setLine('line3', 'completed');
          setStep('stepReview', 'completed');
          setLine('line4', 'completed');
          setStep('stepInterview', 'completed');
          setLine('line5', 'completed');
          setStep('stepDecision', 'active');
        } else if (status === 'SELECTED') {
          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          setStep('stepAssigned', 'completed');
          setLine('line2', 'completed');
          setStep('stepSubmitted', 'completed');
          setLine('line3', 'completed');
          setStep('stepReview', 'completed');
          setLine('line4', 'completed');
          setStep('stepInterview', 'completed');
          setLine('line5', 'completed');
          setStep('stepDecision', 'completed');
          const decisionLabel = document.getElementById('stepDecisionLabel');
          if (decisionLabel) decisionLabel.textContent = 'Selected';
        } else if (status === 'REJECTED') {
          // Identify how far the candidate progressed
          const hasInterview = data.interviews && data.interviews.length > 0;
          const hasTaskSub = data.tasks && data.tasks.some(t => t.submissions && t.submissions.length > 0);
          const hasTask = data.tasks && data.tasks.length > 0;

          setStep('stepApplied', 'completed');
          setLine('line1', 'completed');
          if (hasTask) {
            setStep('stepAssigned', 'completed');
            setLine('line2', 'completed');
          }
          if (hasTaskSub) {
            setStep('stepSubmitted', 'completed');
            setLine('line3', 'completed');
            setStep('stepReview', 'completed');
            setLine('line4', 'completed');
          }
          if (hasInterview) {
            setStep('stepInterview', 'completed');
            setLine('line5', 'completed');
          }
          setStep('stepDecision', 'rejected');
          const decisionLabel = document.getElementById('stepDecisionLabel');
          if (decisionLabel) decisionLabel.textContent = 'Rejected';
        }
      }

      if (data.hasApplication && data.status) {
        updateStepper(data.status);
      }

      // 3.2 Update Announcement Banner
      if (announcementBox) {
        announcementBox.className = 'candidate-status-announcement';
        if (data.status === 'SELECTED') {
          announcementBox.style.display = 'flex';
          announcementBox.classList.add('announcement-success');
          if (announcementIcon) announcementIcon.textContent = '🎉';
          if (announcementTitle) announcementTitle.textContent = 'Congratulations! You are Selected!';
          if (announcementDesc) {
            announcementDesc.textContent = 'Congratulations! You have successfully completed the selection process and have been selected for New Leap Labs.';
          }
        } else if (data.status === 'REJECTED') {
          announcementBox.style.display = 'flex';
          announcementBox.classList.add('announcement-rejected');
          if (announcementIcon) announcementIcon.textContent = 'ℹ️';
          if (announcementTitle) announcementTitle.textContent = 'Application Status Updated';
          if (announcementDesc) {
            announcementDesc.textContent = 'Your application status has been updated. Thank you for your interest and effort in applying for New Leap Labs.';
          }
        } else if (data.status === 'SECOND_INTERVIEW') {
          announcementBox.style.display = 'flex';
          announcementBox.classList.add('announcement-info');
          if (announcementIcon) announcementIcon.textContent = '📅';
          if (announcementTitle) announcementTitle.textContent = 'Second Interview Round';
          if (announcementDesc) {
            announcementDesc.textContent = 'You have been selected for the second interview round. Please review your scheduled interview details below.';
          }
        } else if (data.status === 'TASK_SUBMITTED' || data.status === 'TASK_UNDER_REVIEW') {
          announcementBox.style.display = 'flex';
          announcementBox.classList.add('announcement-info');
          if (announcementIcon) announcementIcon.textContent = '📋';
          if (announcementTitle) announcementTitle.textContent = 'Task Under Review';
          if (announcementDesc) {
            announcementDesc.textContent = 'Your task has been submitted and is under review by the New Leap Labs recruitment team.';
          }
        } else {
          announcementBox.style.display = 'none';
        }
      }

      // 3.3 Update Scheduled Interview Details Card
      const interviewSection = document.getElementById('scheduledInterviewSection');
      const interviewObj = data.currentInterview || (data.interviews && data.interviews[0]);

      if (interviewSection) {
        if ((data.status === 'SECOND_INTERVIEW' || data.status === 'INTERVIEW' || data.status === 'INTERVIEW_COMPLETED') && interviewObj) {
          interviewSection.style.display = 'block';

          const dateVal = document.getElementById('interviewDateVal');
          const timeVal = document.getElementById('interviewTimeVal');
          const statusTag = document.getElementById('interviewStatusTag');
          const modeContainer = document.getElementById('interviewModeContainer');
          const modeVal = document.getElementById('interviewModeVal');
          const linkContainer = document.getElementById('interviewLinkContainer');
          const linkVal = document.getElementById('interviewLinkVal');

          if (dateVal && interviewObj.scheduled_at) {
            const dt = new Date(interviewObj.scheduled_at);
            dateVal.textContent = dt.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            if (timeVal) {
              timeVal.textContent = dt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }

          if (statusTag) {
            statusTag.textContent = interviewObj.status === 'COMPLETED' ? 'Completed' : 'Scheduled';
          }

          // Parse notes for mode and link if provided by admin
          const notesText = interviewObj.notes || '';
          let parsedMode = null;
          let parsedLink = null;

          if (notesText.includes('Mode:')) {
            const modeMatch = notesText.match(/Mode:\s*([^|;\n]+)/i);
            if (modeMatch) parsedMode = modeMatch[1].trim();
          }
          if (notesText.includes('http://') || notesText.includes('https://')) {
            const urlMatch = notesText.match(/(https?:\/\/[^\s]+)/i);
            if (urlMatch) parsedLink = urlMatch[1].trim();
          }

          if (parsedMode && modeContainer && modeVal) {
            modeVal.textContent = parsedMode;
            modeContainer.style.display = 'flex';
          } else if (modeContainer) {
            modeContainer.style.display = 'none';
          }

          if (parsedLink && (parsedLink.startsWith('http://') || parsedLink.startsWith('https://')) && linkContainer && linkVal) {
            linkVal.innerHTML = `<a href="${encodeURI(parsedLink)}" target="_blank" rel="noopener noreferrer" class="btn-join-meeting">Join Interview &rarr;</a>`;
            linkContainer.style.display = 'flex';
          } else if (linkContainer) {
            linkContainer.style.display = 'none';
          }
        } else {
          interviewSection.style.display = 'none';
        }
      }

      // 3.4 Populate candidate's application and task record in table
      if (tbody && !data.hasApplication) {
        // No application submitted yet — show clear empty state
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 36px 16px; color: #94a3b8; font-size: 14px;">
              You have not submitted an application yet.<br>
              <span style="font-size: 12px; opacity: 0.7;">Complete the application form to begin your journey.</span>
            </td>
          </tr>
        `;
      } else if (tbody && data.hasApplication) {
        const app = data.application;
        const task = data.currentTask;
        const interview = data.currentInterview;

        let taskDisplay = 'not applicable';
        let taskClass = 'status-muted';
        if (task) {
          if (task.status === 'ASSIGNED') {
            taskDisplay = 'assigned';
            taskClass = 'status-incomplete';
          } else if (task.status === 'SUBMITTED') {
            taskDisplay = 'submitted';
            taskClass = 'status-selected';
          } else if (task.status === 'REVIEWED' || task.status === 'COMPLETED') {
            taskDisplay = 'reviewed';
            taskClass = 'status-selected';
          }
        }

        let interviewDisplay = 'not applicable';
        let interviewClass = 'status-muted';
        if (app.status === 'SECOND_INTERVIEW' || app.status === 'INTERVIEW') {
          if (interview && interview.status === 'SCHEDULED') {
            interviewDisplay = 'scheduled';
            interviewClass = 'status-incomplete';
          } else {
            interviewDisplay = 'eligible';
            interviewClass = 'status-incomplete';
          }
        } else if (app.status === 'INTERVIEW_COMPLETED') {
          interviewDisplay = 'completed';
          interviewClass = 'status-selected';
        } else if (app.status === 'SELECTED') {
          interviewDisplay = 'selected';
          interviewClass = 'status-selected';
        } else if (app.status === 'REJECTED') {
          interviewDisplay = 'rejected';
          interviewClass = 'status-rejected';
        }

        // Render real candidate row first, followed by previous stages or samples
        const safeName = escapeHtml(app.full_name);
        const safeDomain = escapeHtml(app.domain || '');

        let rowsHtml = `
          <tr style="background: rgba(43, 90, 237, 0.15);">
            <td class="cell-sr">01</td>
            <td class="cell-name font-bold">${safeName} (You)</td>
            <td class="cell-domain font-regular">${safeDomain}</td>
            <td class="cell-task ${taskClass}">${taskDisplay}</td>
            <td class="cell-interview ${interviewClass}">${interviewDisplay}</td>
          </tr>
        `;

        // If candidate has history, render timeline rows
        if (data.history && data.history.length > 1) {
          data.history.slice(1).forEach((h, idx) => {
            const num = (idx + 2) < 10 ? `0${idx + 2}` : `${idx + 2}`;
            const safeStatus = escapeHtml(h.new_status);
            const safeRemarks = escapeHtml(h.remarks || 'Stage Progression');
            rowsHtml += `
              <tr>
                <td class="cell-sr">${num}</td>
                <td class="cell-name font-bold">Status Update: ${safeStatus}</td>
                <td class="cell-domain font-regular">${safeRemarks}</td>
                <td class="cell-task status-muted">${new Date(h.created_at).toLocaleDateString()}</td>
                <td class="cell-interview status-selected">${safeStatus}</td>
              </tr>
            `;
          });
        }

        tbody.innerHTML = rowsHtml;
      }
    } catch (err) {
      console.error('Error fetching candidate dashboard data:', err);
      showToast('Could not fetch real-time application data', 3000);
      // Replace the "Loading..." placeholder with an error state row
      const errorTbody = document.getElementById('tableBody');
      if (errorTbody) {
        errorTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 36px 16px; color: #e07a5f; font-size: 14px;">
              Could not load application data. Please refresh the page.
            </td>
          </tr>
        `;
      }
      // Set hero title fallback if API failed
      const heroTitleEl = document.getElementById('heroTitle');
      if (heroTitleEl && heroTitleEl.textContent === 'Loading...') {
        heroTitleEl.textContent = 'Welcome';
      }
    }
  }

  await loadDashboardData();

  // 4. Action Buttons (Filters, Export)
  const filterBtn = document.getElementById('filterBtn');
  let currentFilterIndex = 0;
  const filterOptions = ['All', 'selected', 'rejected', 'not applicable', 'assigned'];
  
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
    rows.forEach(row => {
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
      exportTableToCSV('NewLeapLabs_Selection_Status.csv');
      showToast('Exporting selection status to CSV...');
    });
  }

  function exportTableToCSV(filename) {
    const table = document.getElementById('statusTable');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const csvContent = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
        let text = cell.innerText.replace(/"/g, '""').trim();
        return `"${text}"`;
      }).join(',');
    }).join('\n');

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

  // 5. Column Sorting
  const sortHeaders = document.querySelectorAll('th.sortable');
  let currentSort = { col: null, asc: true };

  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const sortType = th.getAttribute('data-sort');
      let colIndex = 1;
      if (sortType === 'name') colIndex = 1;
      else if (sortType === 'domain') colIndex = 2;
      else if (sortType === 'task') colIndex = 3;
      else if (sortType === 'interview') colIndex = 4;

      const isAsc = currentSort.col === sortType ? !currentSort.asc : true;
      currentSort = { col: sortType, asc: isAsc };

      sortHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
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

    rows.forEach(row => tbody.appendChild(row));
  }

  // 6. Logout Handling
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.NLL_API) {
        window.NLL_API.clearAuth();
      }
      try {
        sessionStorage.clear();
      } catch (err) {}
      window.location.href = '../login.html';
    });
  }
});
