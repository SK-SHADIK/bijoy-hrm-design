/* Bijoy HRMS — sample data + registry of every Frappe HRMS DocType / report / page */
(function () {
  const B = window.B;

  B.COMPANY = 'Bijoy Technologies Ltd.';
  B.DEPTS = ['Engineering', 'Design', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Support'];
  B.BRANCHES = ['Dhaka HQ', 'Chattogram Office', 'Sylhet Office', 'Khulna Hub', 'Rajshahi Hub'];
  const NAMES = ['Rahim Uddin', 'Fatema Khatun', 'Tanvir Ahmed', 'Nusrat Jahan', 'Mahmud Hasan', 'Sadia Islam', 'Imran Hossain', 'Farhana Akter', 'Kamrul Hasan', 'Shirin Sultana', 'Arif Chowdhury', 'Mitu Rahman', 'Sabbir Ahmed', 'Nazmul Haque', 'Tasnim Rahman', 'Rafiq Islam', 'Sumaiya Begum', 'Jubayer Alam', 'Anika Tabassum', 'Shakil Mahmud', 'Lamia Karim', 'Rezaul Karim', 'Maliha Chowdhury', 'Towhid Hasan', 'Mehnaz Sultana', 'Ashraful Alam'];
  B.APPLICANTS = ['Sabrina Yasmin', 'Hasibul Islam', 'Mou Akter', 'Rashed Khan', 'Tahmina Haque', 'Ariful Islam', 'Nadia Sultana', 'Shafiq Rahman', 'Mahfuza Khatun', 'Zahid Hasan', 'Rumana Ahmed', 'Faisal Karim', 'Poly Akter', 'Shohel Rana', 'Tania Islam', 'Emon Chowdhury'];
  const HEAD = ['CTO', 'Head of Design', 'Head of Sales', 'Head of Marketing', 'CFO', 'Head of People & Culture', 'COO', 'Head of Support'];
  const DESIG = {
    Engineering: ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer'],
    Design: ['UI/UX Designer', 'Graphic Designer', 'Product Designer'],
    Sales: ['Sales Executive', 'Account Manager', 'Business Developer'],
    Marketing: ['Marketing Executive', 'Content Strategist', 'SEO Analyst'],
    Finance: ['Accountant', 'Finance Analyst', 'Payroll Officer'],
    'Human Resources': ['HR Executive', 'Talent Acquisition Specialist', 'HR Business Partner'],
    Operations: ['Operations Executive', 'Logistics Coordinator', 'Admin Officer'],
    'Customer Support': ['Support Agent', 'Customer Success Manager', 'Support Team Lead']
  };
  const GRADES = ['Grade A', 'Grade B', 'Grade C', 'Grade D'];
  B.EMPLOYEES = NAMES.map((name, i) => {
    const r = B.rng('emp' + i);
    const head = i >= 1 && i <= 8;
    const dept = i === 0 ? 'Management' : head ? B.DEPTS[i - 1] : B.DEPTS[(i - 9) % 8];
    const list = DESIG[dept] || [];
    const first = name.split(' ')[0].toLowerCase(), last = name.split(' ')[1].toLowerCase();
    const doj = B.addDays(B.today, -Math.floor(120 + r() * 2200));
    return {
      id: 'HR-EMP-' + B.pad(i + 1, 5), name, dept, first: name.split(' ')[0],
      desig: i === 0 ? 'Managing Director' : head ? HEAD[i - 1] : list[Math.floor(r() * list.length)],
      branch: i < 9 ? 'Dhaka HQ' : B.BRANCHES[Math.floor(r() * 5)],
      mgr: i === 0 ? null : head ? 'HR-EMP-00001' : 'HR-EMP-' + B.pad(B.DEPTS.indexOf(dept) + 2, 5),
      email: `${first}.${last}@bijoy.com.bd`, phone: `+880 1${[7, 8, 9, 6, 3][i % 5]}${Math.floor(10 + r() * 89)}-${Math.floor(100000 + r() * 899999)}`,
      doj: B.iso(doj), dob: B.iso(B.addDays(B.today, -Math.floor(9000 + r() * 6500))),
      type: i % 11 === 10 ? 'Contract' : i % 9 === 8 ? 'Intern' : 'Full-time',
      status: i === 15 ? 'On Leave' : i === 24 ? 'Left' : 'Active',
      grade: head || i === 0 ? 'Grade A' : GRADES[1 + (i % 3)], gender: i % 2 ? 'Female' : 'Male',
      salary: Math.round((i === 0 ? 400000 : head ? 220000 : 38000 + r() * 90000) / 500) * 500
    };
  });
  B.emp = (id) => B.EMPLOYEES.find((e) => e.id === id);

  /* ---------- Column spec parsing & value generation ---------- */
  const POOL_TXT = ['Quarterly review', 'Team offsite', 'Client visit', 'Equipment purchase', 'Annual filing', 'Project handover', 'Vendor meeting', 'Office supplies'];
  const BANKS = ['BRAC Bank', 'Dutch-Bangla Bank', 'City Bank', 'Islami Bank', 'Eastern Bank'];
  function parseCol(s) {
    const [label, kind, ...rest] = s.split(':');
    return { label, kind: kind || 'txt', arg: rest.join(':') };
  }
  function gen(c, r, ctx, i) {
    const a = c.arg, pick = (arr) => arr[Math.floor(r() * arr.length)];
    const rng = (spec) => { const [lo, hi] = spec.split('..').map(Number); return lo + Math.floor(r() * (hi - lo + 1)); };
    switch (c.kind) {
      case 'emp': return ctx.p.name;
      case 'dept': return ctx.p.dept;
      case 'desig': return ctx.p.desig;
      case 'branch': return ctx.p.branch;
      case 'applicant': return ctx.ap;
      case 'company': return B.COMPANY;
      case 'email': return (ctx.ap || ctx.p.name).toLowerCase().replace(/\s+/g, '.') + '@' + (ctx.ap ? 'gmail.com' : 'bijoy.com.bd');
      case 'phone': return ctx.p.phone;
      case 'date': { const d = B.addDays(B.today, rng('-14..16')); ctx.d = d; return B.iso(d); }
      case 'pdate': { const d = B.addDays(B.today, -rng('1..' + (a || 30))); ctx.d = d; return B.iso(d); }
      case 'fdate': { const d = ctx.d ? B.addDays(ctx.d, rng('0..' + (a && ctx.d ? Math.min(+a, 10) : 5))) : B.addDays(B.today, rng('3..' + (a || 30))); return B.iso(d); }
      case 'datetime': { const d = B.addDays(B.today, rng('-6..8')); d.setHours(8 + Math.floor(r() * 10), Math.floor(r() * 4) * 15); return B.iso(d) + 'T' + B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()); }
      case 'money': return Math.round(rng(a || '1000..90000') / 100) * 100;
      case 'gross': ctx.gross = Math.round(rng(a || '40000..220000') / 500) * 500; return ctx.gross;
      case 'ded': ctx.ded = Math.round((ctx.gross * (0.06 + r() * 0.08)) / 50) * 50; return ctx.ded;
      case 'net': return ctx.gross - ctx.ded;
      case 'n': return rng(a || '1..30');
      case 'pct': return a ? rng(a) : Math.round(r() * 100);
      case 'stars': return Math.round((2.5 + r() * 2.5) * 2) / 2;
      case 'bool': return r() > 0.35;
      case 'st': case 'pick': return pick(a.split('|'));
      case 'seq': return a.split(',')[i % a.split(',').length];
      case 'plate': return pick(['Dhaka Metro-Ga 11-2345', 'Dhaka Metro-Ha 15-8891', 'Chatta Metro-Ka 12-4410', 'Dhaka Metro-Cha 14-0072']);
      case 'acct': return String(Math.floor(1e12 + r() * 9e12)).slice(0, 13);
      default: return a || pick(POOL_TXT);
    }
  }

  /* ---------- Registry ---------- */
  B.docs = {};
  function D(id, label, mod, icon, cols, o) {
    o = o || {};
    B.docs[id] = Object.assign({ id, label, mod, icon, cols: cols.map(parseCol), n: 22, prefix: null }, o, {
      child: (o.child || []).map((c) => ({ title: c[0], cols: c[1].map(parseCol), n: c[2] }))
    });
    if (o.names) B.docs[id].n = o.names.length;
  }
  B.parseCol = parseCol;

  const LT = 'Casual Leave|Sick Leave|Earned Leave|Leave Without Pay|Compensatory Off';
  const SHIFTS = 'Normal (9:30-6:30)|Morning (6-3)|Evening (2-11)|Night (10pm-7am)|Open (8 h)';
  const FULLS = 'Full-time|Part-time|Contract|Intern|Probation';

  /* --- Employee Lifecycle --- */
  D('employee', 'Employee', 'lifecycle', 'users', ['Employee Name:emp', 'Department:dept', 'Designation:desig', 'Branch:branch', 'Employment Type:pick:' + FULLS, 'Date of Joining:pdate:1500', 'Status:st:Active|Active|Active|Active|On Leave|Left'], { cards: true, kanban: 'Status', profile: true, prefix: 'HR-EMP', noYear: true, n: 26, links: ['attendance', 'leave-application', 'salary-slip', 'expense-claim', 'appraisal', 'employee-checkin', 'shift-assignment', 'employee-advance'] });
  D('employee-onboarding', 'Employee Onboarding', 'lifecycle', 'user-plus', ['Employee:emp', 'Job Applicant:applicant', 'Department:dept', 'Boarding Begins On:date', 'Progress:pct', 'Status:st:Pending|In Process|Completed'], { sub: true, kanban: 'Status', child: [['Onboarding Activities', ['Activity:pick:Submit Documents|Issue Laptop|Create Email Account|Issue ID Card|Orientation Session|Sign Contract|Bank Account Setup', 'Assigned User:emp', 'Role:pick:HR User|IT Support|Manager|Employee', 'Required Date:fdate', 'Status:st:Pending|Completed'], 6]] });
  D('onboarding-template', 'Employee Onboarding Template', 'lifecycle', 'layers', ['Template:pick:x', 'Company:company', 'Department:dept', 'Designation:desig', 'Activities:n:4..9'], { names: ['Engineering Onboarding', 'Sales Onboarding', 'General Onboarding', 'Intern Onboarding'], child: [['Activities', ['Activity:pick:Submit Documents|Issue Laptop|Create Email|Orientation|Sign Contract', 'Role:pick:HR User|IT Support|Manager', 'Duration (days):n:1..7'], 5]] });
  D('employee-separation', 'Employee Separation', 'lifecycle', 'user-minus', ['Employee:emp', 'Department:dept', 'Resignation Letter Date:pdate:60', 'Boarding Begins On:fdate', 'Status:st:Pending|In Process|Completed'], { sub: true, kanban: 'Status', child: [['Separation Activities', ['Activity:pick:Return Laptop|Revoke Access|Clearance Form|Exit Interview|Final Settlement', 'Assigned User:emp', 'Role:pick:HR User|IT Support|Manager', 'Status:st:Pending|Completed'], 5]] });
  D('separation-template', 'Employee Separation Template', 'lifecycle', 'layers', ['Template:pick:x', 'Company:company', 'Department:dept', 'Designation:desig', 'Activities:n:3..7'], { names: ['Standard Exit', 'Executive Exit', 'Contract Closure'] });
  D('exit-interview', 'Exit Interview', 'lifecycle', 'message', ['Employee:emp', 'Department:dept', 'Date:pdate:40', 'Reason for Leaving:pick:Better Opportunity|Relocation|Higher Studies|Personal|Compensation|Career Change', 'Interviewer:pick:Farhana Akter|Mitu Rahman|Sumaiya Begum', 'Status:st:Pending|Scheduled|Completed'], { sub: true, kanban: 'Status' });
  D('employee-promotion', 'Employee Promotion', 'lifecycle', 'trend', ['Employee:emp', 'Promotion Date:date', 'Current Designation:desig', 'New Designation:pick:Senior Software Engineer|Team Lead|Manager|Senior Executive|Head of Department', 'Salary Revision:pct:5..25', 'Status:st:Draft|Submitted'], { sub: true });
  D('employee-transfer', 'Employee Transfer', 'lifecycle', 'refresh', ['Employee:emp', 'Transfer Date:date', 'From Branch:branch', 'New Branch:pick:Dhaka HQ|Chattogram Office|Sylhet Office|Khulna Hub|Rajshahi Hub', 'New Department:dept', 'Status:st:Draft|Submitted'], { sub: true });
  D('full-final-statement', 'Full and Final Statement', 'lifecycle', 'file', ['Employee:emp', 'Transaction Date:pdate:40', 'Total Payable:money:20000..250000', 'Total Receivable:money:0..20000', 'Status:st:Unpaid|Paid|Draft'], { sub: true, child: [['Payables', ['Component:pick:Salary Slip|Leave Encashment|Gratuity|Bonus', 'Reference:txt:HR-SAL-2026', 'Amount:money:10000..90000', 'Status:st:Unpaid|Paid'], 3], ['Receivables', ['Component:pick:Loan|Advance|Asset Recovery', 'Reference:txt:HR-ADV-2026', 'Amount:money:0..8000', 'Status:st:Unpaid|Paid'], 2]] });
  D('employee-grievance', 'Employee Grievance', 'lifecycle', 'alert', ['Subject:pick:Payroll discrepancy|Unfair workload|Facility issue|Manager conduct|Workplace harassment', 'Raised By:emp', 'Grievance Type:pick:Payroll|Workplace|Facilities|Conduct', 'Date:pdate:60', 'Status:st:Open|Investigated|Resolved|Invalid'], { kanban: 'Status' });
  D('employee-referral', 'Employee Referral', 'lifecycle', 'gift', ['Referrer:emp', 'Referred Person:applicant', 'Designation:desig', 'Referral Bonus:money:5000..25000', 'Status:st:Pending|In Process|Accepted|Rejected'], { kanban: 'Status' });
  D('employee-skill-map', 'Employee Skill Map', 'lifecycle', 'sparkle', ['Employee:emp', 'Designation:desig', 'Skills:n:2..8', 'Avg Proficiency:pct:40..98'], { child: [['Skills', ['Skill:pick:Python|Frappe|JavaScript|Communication|Leadership|Accounting|Recruiting', 'Proficiency:stars'], 4]] });

  /* --- Tasks & Support --- */
  D('ticket', 'Ticket', 'tasks', 'inbox', ['Subject:pick:Laptop not booting|Payslip mismatch|Need VPN access|Leave balance incorrect|Email account locked|ID card replacement|Office AC not working|Software license request', 'Raised By:emp', 'Category:pick:IT Support|Payroll|HR Query|Facilities|Access Request', 'Priority:pick:Low|Medium|High|Urgent', 'Assigned To:pick:Farhana Akter|Mitu Rahman|Sumaiya Begum|IT Helpdesk', 'Created On:pdate:30', 'Status:st:Open|In Progress|On Hold|Resolved|Closed'], { kanban: 'Status', n: 26, prefix: 'TKT', links: ['task'] });
  D('task', 'Task', 'tasks', 'check-circle', ['Task:pick:Prepare onboarding kit|Review Q3 appraisals|Update leave policy|Collect tax proofs|Reconcile payroll|Schedule interviews|Audit attendance logs|Draft offer letters|Plan training calendar', 'Project:pick:Payroll Automation|Hiring Drive Q4|Appraisal H2 2026|HR Policy Refresh|Employee Engagement', 'Assigned To:emp', 'Priority:pick:Low|Medium|High|Urgent', 'Due Date:fdate:30', 'Progress:pct', 'Status:st:Open|Working|Pending Review|Completed|Cancelled'], { kanban: 'Status', cal: 'Due Date', n: 30, prefix: 'TASK' });
  D('project', 'Project', 'tasks', 'layers', ['Project:pick:x', 'Owner:emp', 'Start Date:pdate:90', 'End Date:fdate:120', 'Tasks:n:4..30', 'Percent Complete:pct', 'Status:st:Open|Open|Completed|On Hold|Cancelled'], { names: ['Payroll Automation', 'Hiring Drive Q4', 'Appraisal H2 2026', 'HR Policy Refresh', 'Employee Engagement', 'Office Relocation'], kanban: 'Status' });

  /* --- Recruitment --- */
  const JOBS = 'Senior Backend Engineer|Product Designer|Sales Executive|Support Agent|Accountant|DevOps Engineer|Content Strategist|QA Engineer';
  D('job-requisition', 'Job Requisition', 'recruit', 'flag', ['Designation:desig', 'Department:dept', 'No. of Positions:n:1..5', 'Hiring Type:seq:New position,Replacement,New position,New position', 'Replaced Employee:seq:—,Kamrul Hasan,—,—', 'Requested By:emp', 'Expected By:fdate:60', 'Status:st:Pending|Pending|Open & Approved|On Hold|Filled|Rejected'], { sub: true, kanban: 'Status' });
  D('staffing-plan', 'Staffing Plan', 'recruit', 'org', ['Staffing Plan:pick:FY 2026 Engineering|FY 2026 Sales|FY 2026 Support|FY 2026 Marketing', 'Department:dept', 'From Date:pdate:100', 'To Date:fdate:200', 'Total Vacancies:n:2..12', 'Estimated Cost:money:500000..9000000'], { sub: true, child: [['Staffing Details', ['Designation:desig', 'Number of Positions:n:1..4', 'Current Count:n:2..15', 'Vacancies:n:1..4', 'Estimated Cost Per Position:money:40000..120000'], 4]] });
  D('job-opening', 'Job Opening', 'recruit', 'briefcase', ['Job Title:pick:' + JOBS, 'Designation:desig', 'Department:dept', 'Location:branch', 'Vacancies:n:1..5', 'Applicants:n:0..120', 'Status:st:Open|Open|Open|Closed'], { kanban: 'Status', links: ['job-applicant', 'interview', 'job-offer'] });
  D('job-applicant', 'Job Applicant', 'recruit', 'user-plus', ['Applicant Name:applicant', 'Job Opening:pick:' + JOBS, 'Source:pick:LinkedIn|Bdjobs|Employee Referral|Website|Facebook|Walk-in', 'Email:email', 'Rating:stars', 'Status:st:Open|Replied|Hold|Accepted|Rejected'], { kanban: 'Status', links: ['interview', 'job-offer'] });
  D('interview', 'Interview', 'recruit', 'users', ['Job Applicant:applicant', 'Designation:desig', 'Interview Round:pick:Screening|Technical Round 1|Technical Round 2|HR Round', 'Scheduled On:date', 'Interviewer:emp', 'Status:st:Pending|Under Review|Cleared|Rejected'], { cal: 'Scheduled On', kanban: 'Status', sub: true });
  D('interview-round', 'Interview Round', 'recruit', 'target', ['Round:pick:x', 'Designation:desig', 'Expected Skills:n:2..6', 'Interview Type:pick:Video Call|On-site|Phone Call'], { names: ['Screening', 'Technical Round 1', 'Technical Round 2', 'HR Round', 'Culture Fit'], child: [['Expected Skill Set', ['Skill:pick:Python|Communication|System Design|Problem Solving|Frappe'], 4]] });
  D('interview-type', 'Interview Type', 'recruit', 'phone', ['Interview Type:pick:x', 'Description:txt:Standard interview format'], { names: ['Video Call', 'On-site', 'Phone Call', 'Assessment'] });
  D('interview-feedback', 'Interview Feedback', 'recruit', 'star', ['Interviewer:emp', 'Applicant:applicant', 'Designation:desig', 'Result:st:Cleared|Rejected|Under Review', 'Average Rating:stars', 'Feedback Date:pdate:30'], { sub: true, child: [['Skill Assessment', ['Skill:pick:Python|Communication|System Design|Problem Solving|Frappe', 'Rating:stars'], 4]] });
  D('job-offer', 'Job Offer', 'recruit', 'send', ['Applicant:applicant', 'Designation:desig', 'Offer Date:date', 'Monthly CTC:money:35000..180000', 'Company:company', 'Status:st:Awaiting Response|Accepted|Rejected'], { sub: true, kanban: 'Status', child: [['Offer Terms', ['Offer Term:pick:Probation Period|Notice Period|Working Hours|Annual Leave|Festival Bonus', 'Value / Description:pick:3 months|60 days|9 AM – 6 PM|20 days|2 per year'], 4]] });
  D('appointment-letter', 'Appointment Letter', 'recruit', 'file', ['Applicant:applicant', 'Designation:desig', 'Appointment Date:date', 'Template:pick:Standard Appointment|Contract Appointment|Intern Appointment', 'Company:company'], {});
  D('appointment-letter-template', 'Appointment Letter Template', 'recruit', 'layers', ['Template:pick:x', 'Introduction:txt:Dear {applicant_name}, we are pleased…', 'Closing Notes:txt:Please sign and return a copy.'], { names: ['Standard Appointment', 'Contract Appointment', 'Intern Appointment'] });
  D('job-applicant-source', 'Job Applicant Source', 'recruit', 'globe', ['Source:pick:x', 'Description:txt:Candidates sourced via this channel'], { names: ['LinkedIn', 'Bdjobs', 'Employee Referral', 'Website', 'Facebook', 'Walk-in'] });

  /* --- Shift & Attendance --- */
  D('attendance', 'Attendance', 'attendance', 'user-check', ['Employee:emp', 'Department:dept', 'Attendance Date:date', 'Status:st:Present|Present|Present|Present|Absent|On Leave|Half Day|Work From Home', 'Shift:pick:' + SHIFTS, 'Arrival:st:On time|On time|On time|Late|Extreme late', 'Working Hours:n:4..10'], { sub: true, cal: 'Attendance Date', kanban: 'Status', n: 30 });
  D('employee-checkin', 'Employee Checkin', 'attendance', 'fingerprint', ['Employee:emp', 'Log Type:st:IN|OUT', 'Time:datetime', 'Source:pick:Tip Soi|ZKTeco device|Tip Soi|ZKTeco device|WFH web portal', 'Location:pick:Dhaka HQ|Chattogram Office|Remote|Sylhet Office', 'Shift:pick:' + SHIFTS], { n: 30 });
  D('attendance-request', 'Attendance Request', 'attendance', 'edit', ['Employee:emp', 'From Date:date', 'To Date:fdate:5', 'Reason:pick:Work From Home|On Duty|Forgot to Checkin|Other', 'Explanation:pick:Client site visit|Network outage|Missed punch|Field work', 'Status:st:Draft|Submitted|Approved|Rejected'], { sub: true, kanban: 'Status', cal: 'From Date' });
  D('shift-type', 'Shift Type', 'attendance', 'clock', ['Roster:pick:x', 'Roster Type:seq:Normal,Custom,Custom,Custom,Open', 'Start Time:seq:09:30,06:00,14:00,22:00,Any time', 'End Time:seq:18:30,15:00,23:00,07:00,Any time', 'Working Hours:seq:9,8,8,8,8', 'On-time allowance (min):seq:15,15,15,15,—'], { names: ['Normal', 'Morning', 'Evening', 'Night', 'Open'] });
  D('shift-request', 'Shift Request', 'attendance', 'refresh', ['Employee:emp', 'Shift Type:pick:Morning|General|Evening|Night', 'From Date:date', 'To Date:fdate:10', 'Status:st:Draft|Approved|Rejected'], { sub: true, kanban: 'Status' });
  D('shift-assignment', 'Shift Assignment', 'attendance', 'calendar', ['Employee:emp', 'Shift Type:pick:Morning|General|Evening|Night', 'Start Date:pdate:60', 'End Date:fdate:90', 'Status:st:Active|Active|Inactive'], { sub: true });
  D('shift-location', 'Shift Location', 'attendance', 'pin', ['Location:pick:x', 'Latitude:seq:23.8103,22.3569,24.8949,22.8456,24.3745', 'Longitude:seq:90.4125,91.7832,91.8687,89.5403,88.6042', 'Checkin Radius (m):n:50..500'], { names: ['Dhaka HQ', 'Chattogram Office', 'Sylhet Office', 'Khulna Hub', 'Rajshahi Hub'] });
  D('shift-schedule', 'Shift Schedule', 'attendance', 'layers', ['Schedule:pick:x', 'Frequency:pick:Every Week|Every 2 Weeks', 'Shifts:n:2..4', 'Disabled:bool'], { names: ['Weekly Rotation', 'Fortnightly Rotation', 'Night Cycle'] });
  D('shift-schedule-assignment', 'Shift Schedule Assignment', 'attendance', 'users', ['Employee:emp', 'Shift Schedule:pick:Weekly Rotation|Fortnightly Rotation|Night Cycle', 'Shift Location:pick:Dhaka HQ|Chattogram Office|Sylhet Office', 'Start Date:pdate:60', 'Status:st:Active|Inactive'], {});
  D('holiday-list', 'Holiday List', 'attendance', 'coffee', ['Holiday List:pick:x', 'From Date:pdate:250', 'To Date:fdate:120', 'Total Holidays:n:18..32', 'Weekly Off:pick:Friday|Friday & Saturday'], { names: ['Bangladesh 2026', 'Bangladesh 2025', 'Factory Weekend 2026'], child: [['Holidays', ['Date:date', 'Description:pick:Ekushey February|Independence Day|Pohela Boishakh|May Day|Eid-ul-Fitr|Eid-ul-Adha|Victory Day|Durga Puja|Buddha Purnima|Ashura', 'Weekly Off:bool'], 9]] });

  /* --- Leaves --- */
  D('leave-application', 'Leave Application', 'leaves', 'calendar', ['Employee:emp', 'Leave Type:pick:' + LT, 'From Date:date', 'To Date:fdate:5', 'Total Days:n:1..6', 'Status:st:Open|Approved|Approved|Approved|Rejected|Cancelled'], { sub: true, cal: 'From Date', kanban: 'Status', n: 30, links: ['leave-ledger-entry', 'attendance'] });
  D('leave-allocation', 'Leave Allocation', 'leaves', 'layers', ['Employee:emp', 'Leave Type:pick:' + LT, 'From Date:pdate:120', 'To Date:fdate:200', 'Total Leaves Allocated:n:5..30', 'Status:st:Submitted|Submitted|Draft'], { sub: true });
  D('leave-type', 'Leave Type', 'leaves', 'tag', ['Leave Type:pick:x', 'Max Leaves Allowed:n:5..45', 'Is Carry Forward:bool', 'Is Paid Leave:bool', 'Allow Encashment:bool', 'Applicable After (days):n:0..90'], { names: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Leave Without Pay', 'Compensatory Off', 'Maternity Leave', 'Paternity Leave', 'Festival Leave'] });
  D('leave-policy', 'Leave Policy', 'leaves', 'shield', ['Policy:pick:x', 'Company:company', 'Leave Types:n:3..6', 'Employees Assigned:n:2..26'], { names: ['Standard Policy', 'Manager Policy', 'Intern Policy', 'Contract Policy'], sub: true, child: [['Leave Policy Details', ['Leave Type:pick:Casual Leave|Sick Leave|Earned Leave|Festival Leave', 'Annual Allocation:n:5..30'], 4]] });
  D('leave-policy-assignment', 'Leave Policy Assignment', 'leaves', 'users', ['Employee:emp', 'Leave Policy:pick:Standard Policy|Manager Policy|Intern Policy|Contract Policy', 'Effective From:pdate:200', 'Effective To:fdate:200', 'Leaves Allocated:bool', 'Status:st:Submitted|Submitted|Draft'], { sub: true });
  D('leave-period', 'Leave Period', 'leaves', 'calendar', ['Period:pick:x', 'From Date:pdate:250', 'To Date:fdate:200', 'Company:company', 'Is Active:bool'], { names: ['2026', '2025', '2027 (Draft)'] });
  D('leave-block-list', 'Leave Block List', 'leaves', 'lock', ['Block List:pick:x', 'Company:company', 'Applies To All Departments:bool', 'Blocked Dates:n:2..10'], { names: ['Year-End Closing', 'Audit Week', 'Product Launch Freeze'], child: [['Leave Block List Dates', ['Block Date:fdate:120', 'Reason:txt:Business critical period'], 4]] });
  D('compensatory-leave-request', 'Compensatory Leave Request', 'leaves', 'coffee', ['Employee:emp', 'Work From Date:pdate:60', 'Work End Date:fdate:1', 'Leave Type:txt:Compensatory Off', 'Reason:pick:Worked on Friday|Eid shift cover|Weekend release|Client emergency', 'Status:st:Open|Approved|Rejected'], { sub: true, kanban: 'Status' });
  D('leave-encashment', 'Leave Encashment', 'leaves', 'moneyloan', ['Employee:emp', 'Leave Type:txt:Earned Leave', 'Encashment Date:date', 'Encashable Days:n:2..15', 'Encashment Amount:money:5000..60000', 'Status:st:Draft|Submitted|Paid'], { sub: true });
  D('leave-ledger-entry', 'Leave Ledger Entry', 'leaves', 'book', ['Employee:emp', 'Leave Type:pick:' + LT, 'Transaction Type:pick:Leave Allocation|Leave Application|Leave Encashment|Leave Expiry', 'Leaves:n:-5..20', 'From Date:pdate:120', 'To Date:fdate:40'], { n: 30 });

  /* --- Payroll --- */
  D('salary-slip', 'Salary Slip', 'payroll', 'file', ['Employee:emp', 'Department:dept', 'Posting Date:pdate:60', 'Working Days:n:22..26', 'Gross Pay:gross', 'Total Deduction:ded', 'Net Pay:net', 'Status:st:Paid|Paid|Submitted|Draft|Withheld'], { sub: true, kanban: 'Status', n: 28, slip: true, child: [['Earnings', ['Salary Component:pick:Basic|House Rent Allowance|Medical Allowance|Conveyance Allowance|Festival Bonus', 'Amount:money:5000..90000', 'Year To Date:money:50000..900000'], 4], ['Deductions', ['Salary Component:pick:Provident Fund|Income Tax|Professional Tax|Loan Repayment', 'Amount:money:500..9000', 'Year To Date:money:5000..90000'], 3]] });
  D('payroll-entry', 'Payroll Entry', 'payroll', 'zap', ['Posting Date:date', 'Payroll Frequency:pick:Monthly|Fortnightly', 'Department:pick:All Departments|Engineering|Sales|Support', 'Employees:n:12..26', 'Start Date:pdate:30', 'Status:st:Draft|Submitted|Queued|Failed'], { sub: true, kanban: 'Status', child: [['Employee Details', ['Employee:emp', 'Department:dept', 'Designation:desig'], 5]] });
  D('salary-structure', 'Salary Structure', 'payroll', 'layers', ['Structure:pick:x', 'Company:company', 'Payroll Frequency:txt:Monthly', 'Currency:txt:BDT', 'Is Active:st:Yes|No'], { names: ['Standard Monthly', 'Executive Grade', 'Intern Stipend', 'Contract Consolidated'], sub: true, child: [['Earnings', ['Salary Component:pick:Basic|House Rent Allowance|Medical Allowance|Conveyance|Festival Bonus', 'Abbr:pick:B|HRA|MA|CA|FB', 'Formula:pick:base * 0.5|base * 0.25|1500|1000|base * 0.1', 'Amount Based on Formula:bool'], 5], ['Deductions', ['Salary Component:pick:Provident Fund|Income Tax|Professional Tax', 'Abbr:pick:PF|IT|PT', 'Formula:pick:base * 0.05|tax_slab|200', 'Amount Based on Formula:bool'], 3]] });
  D('salary-structure-assignment', 'Salary Structure Assignment', 'payroll', 'users', ['Employee:emp', 'Salary Structure:pick:Standard Monthly|Executive Grade|Intern Stipend|Contract Consolidated', 'From Date:pdate:700', 'Base:money:30000..200000', 'Variable:money:0..30000', 'Status:st:Submitted|Submitted|Draft'], { sub: true });
  D('salary-component', 'Salary Component', 'payroll', 'percent', ['Component:pick:x', 'Type:seq:Earning,Earning,Earning,Earning,Earning,Earning,Deduction,Deduction,Deduction,Deduction', 'Abbreviation:seq:B,HRA,MA,CA,FB,PB,PF,IT,PT,LR', 'Depends on Payment Days:bool', 'Is Tax Applicable:bool', 'Formula:pick:base * 0.5|base * 0.25|base * 0.1|fixed|base * 0.05'], { names: ['Basic', 'House Rent Allowance', 'Medical Allowance', 'Conveyance Allowance', 'Festival Bonus', 'Performance Bonus', 'Provident Fund', 'Income Tax', 'Professional Tax', 'Loan Repayment'] });
  D('additional-salary', 'Additional Salary', 'payroll', 'plus', ['Employee:emp', 'Salary Component:pick:Performance Bonus|Festival Bonus|Overtime|Arrears|Special Allowance', 'Amount:money:3000..60000', 'Payroll Date:date', 'Status:st:Submitted|Submitted|Draft'], { sub: true });
  D('employee-incentive', 'Employee Incentive', 'payroll', 'award', ['Employee:emp', 'Incentive Amount:money:5000..80000', 'Salary Component:pick:Sales Incentive|Performance Bonus', 'Payroll Date:fdate:30', 'Status:st:Draft|Submitted'], { sub: true });
  D('retention-bonus', 'Retention Bonus', 'payroll', 'gift', ['Employee:emp', 'Bonus Amount:money:20000..200000', 'Bonus Payment Date:fdate:120', 'Status:st:Draft|Submitted'], { sub: true });
  D('salary-withholding', 'Salary Withholding', 'payroll', 'lock', ['Employee:emp', 'From Date:date', 'To Date:fdate:60', 'Withholding Cycles:n:1..3', 'Status:st:Draft|Submitted'], { sub: true });
  D('payroll-period', 'Payroll Period', 'payroll', 'calendar', ['Period:pick:x', 'Company:company', 'Start Date:pdate:250', 'End Date:fdate:120'], { names: ['FY 2025-26', 'FY 2026-27'], child: [['Periods', ['Start Date:pdate:300', 'End Date:fdate:60'], 6]] });
  D('gratuity', 'Gratuity', 'payroll', 'heart', ['Employee:emp', 'Gratuity Rule:pick:Standard Rule|Executive Rule', 'Pay Amount:money:80000..900000', 'Payroll Date:fdate:60', 'Status:st:Draft|Submitted|Paid'], { sub: true });
  D('gratuity-rule', 'Gratuity Rule', 'payroll', 'book', ['Rule:pick:x', 'Calculation Basis:pick:Current Slab|Sum of all previous slabs', 'Experience Rounding:pick:Round Off|Exact Completed Years', 'Minimum Service (yrs):n:3..5'], { names: ['Standard Rule', 'Executive Rule'], child: [['Gratuity Rule Slabs', ['From (yrs):seq:0,5,10', 'To (yrs):seq:5,10,99', 'Fraction of Applicable Earnings:seq:0.5,0.75,1'], 3]] });

  /* --- Tax & Benefits --- */
  D('income-tax-slab', 'Income Tax Slab', 'tax', 'percent', ['Slab:pick:x', 'Effective From:pdate:200', 'Company:company', 'Currency:txt:BDT', 'Standard Tax Exemption:money:350000..500000', 'Status:st:Submitted|Draft'], { names: ['Individual FY 2026-27', 'Senior Citizen FY 2026-27', 'Woman Taxpayer FY 2026-27'], sub: true, child: [['Taxable Salary Slabs', ['From Amount:seq:0,350000,450000,750000,1150000', 'To Amount:seq:350000,450000,750000,1150000,0', 'Percent Deduction:seq:0%,5%,10%,15%,20%'], 5]] });
  D('tax-exemption-category', 'Employee Tax Exemption Category', 'tax', 'layers', ['Category:pick:x', 'Is Active:bool', 'Max Amount:money:100000..500000'], { names: ['Investment', 'Life Insurance', 'Donation', 'Medical'] });
  D('tax-exemption-sub-category', 'Employee Tax Exemption Sub Category', 'tax', 'tag', ['Sub Category:pick:x', 'Category:pick:Investment|Life Insurance|Donation|Medical', 'Max Amount:money:50000..300000', 'Is Active:bool'], { names: ['Provident Fund Contribution', 'Life Insurance Premium', 'Zakat / Donation', 'Savings Certificate', 'Health Insurance'] });
  D('tax-exemption-declaration', 'Employee Tax Exemption Declaration', 'tax', 'file', ['Employee:emp', 'Payroll Period:txt:FY 2026-27', 'Total Declared Amount:money:50000..600000', 'Total Exemption Amount:money:40000..500000', 'Status:st:Draft|Submitted|Approved'], { sub: true, child: [['Declarations', ['Sub Category:pick:Provident Fund Contribution|Life Insurance Premium|Zakat / Donation|Savings Certificate', 'Max Amount:money:50000..300000', 'Declared Amount:money:20000..250000'], 3]] });
  D('tax-exemption-proof', 'Employee Tax Exemption Proof Submission', 'tax', 'paperclip', ['Employee:emp', 'Payroll Period:txt:FY 2026-27', 'Total Actual Amount:money:50000..600000', 'Attachments:n:1..5', 'Status:st:Draft|Submitted|Approved'], { sub: true });
  D('benefit-application', 'Employee Benefit Application', 'tax', 'heart', ['Employee:emp', 'Date:date', 'Payroll Period:txt:FY 2026-27', 'Remaining Benefits:money:5000..80000', 'Max Benefits:money:80000..200000', 'Status:st:Draft|Submitted'], { sub: true });
  D('benefit-claim', 'Employee Benefit Claim', 'tax', 'heart', ['Employee:emp', 'Claim Date:pdate:60', 'Earning Component:pick:Medical Allowance|Internet Allowance|Travel Allowance', 'Claimed Amount:money:2000..30000', 'Status:st:Draft|Submitted'], { sub: true });

  /* --- Expenses & Travel --- */
  D('expense-claim', 'Expense Claim', 'expense', 'card', ['Employee:emp', 'Department:dept', 'Posting Date:pdate:40', 'Total Claimed:money:500..40000', 'Total Sanctioned:money:500..40000', 'Approval Status:st:Draft|Approved|Approved|Rejected', 'Status:st:Unpaid|Paid|Submitted|Cancelled'], { sub: true, kanban: 'Status', n: 28, links: ['employee-advance'], child: [['Expenses', ['Expense Date:pdate:20', 'Expense Claim Type:pick:Travel|Food|Accommodation|Fuel|Communication|Medical|Others', 'Description:pick:Client visit cab fare|Team lunch|Hotel stay|Mobile recharge|Fuel refill', 'Amount:money:200..12000', 'Sanctioned Amount:money:200..12000'], 4]] });
  D('expense-claim-type', 'Expense Claim Type', 'expense', 'tag', ['Type:pick:x', 'Description:txt:Reimbursable expense category', 'Default Account:seq:Travel Expenses - BT,Food Expenses - BT,Accommodation - BT,Fuel - BT,Communication - BT,Medical - BT,Misc Expenses - BT'], { names: ['Travel', 'Food', 'Accommodation', 'Fuel', 'Communication', 'Medical', 'Others'] });
  D('employee-advance', 'Employee Advance', 'expense', 'moneyloan', ['Employee:emp', 'Purpose:pick:Travel|Medical|Relocation|Training|Office Purchase', 'Advance Amount:money:5000..100000', 'Paid Amount:money:0..100000', 'Posting Date:pdate:40', 'Status:st:Draft|Unpaid|Paid|Claimed|Returned'], { sub: true, kanban: 'Status' });
  D('travel-request', 'Travel Request', 'expense', 'plane', ['Employee:emp', 'Travel Type:pick:Domestic|International', 'Purpose:pick:Client Meeting|Conference|Training|Site Visit', 'Funding:pick:Company|Self', 'Date:date', 'Status:st:Draft|Submitted|Approved'], { sub: true, cal: 'Date', child: [['Itinerary', ['From:pick:Dhaka|Chattogram|Sylhet|Khulna', 'To:pick:Dhaka|Chattogram|Sylhet|Cox\'s Bazar', 'Mode:pick:Bus|Air|Train|Launch', 'Departure:date', 'Arrival:fdate:2'], 3]] });
  D('vehicle', 'Vehicle', 'expense', 'truck', ['Vehicle:plate', 'Make:pick:Toyota|Honda|Mitsubishi|Nissan', 'Model:pick:Corolla|Civic|Pajero|Sunny', 'Odometer (km):n:5000..90000', 'Fuel Type:pick:Petrol|Diesel|CNG|Octane', 'Insurance Expiry:fdate:300'], { n: 6 });
  D('vehicle-log', 'Vehicle Log', 'expense', 'truck', ['Vehicle:plate', 'Employee:emp', 'Date:pdate:30', 'Odometer Start:n:10000..80000', 'Odometer End:n:10000..80000', 'Fuel Qty (L):n:5..40', 'Fuel Price:money:120..140'], { sub: true, child: [['Service Details', ['Service Item:pick:Oil Change|Brake Pad|Tyre|Air Filter', 'Type:pick:Inspection|Repair|Service', 'Expense Amount:money:500..15000'], 2]] });

  /* --- Performance --- */
  D('appraisal-cycle', 'Appraisal Cycle', 'performance', 'target', ['Cycle:pick:x', 'Start Date:pdate:200', 'End Date:fdate:60', 'Company:company', 'Evaluation Method:pick:Manager only|Average of all', 'Status:st:Not Started|In Progress|Completed'], { names: ['H1 2026 Review', 'FY 2025 Annual', 'Q3 2026 Pulse', 'Probation Reviews'], child: [['Appraisees', ['Employee:emp', 'Designation:desig', 'Appraisal Template:pick:Engineer Template|Sales Template|Support Template', 'Status:st:Pending|In Process|Completed'], 6]] });
  D('appraisal', 'Appraisal', 'performance', 'award', ['Employee:emp', 'Designation:desig', 'Appraisal Cycle:pick:H1 2026 Review|FY 2025 Annual|Q3 2026 Pulse', 'Self Score:stars', 'Manager Score:stars', 'Final Score:stars', 'Status:st:Draft|Submitted|Completed'], { sub: true, kanban: 'Status', child: [['KRA Evaluation', ['KRA:pick:Code Quality|Delivery Timeliness|Customer Satisfaction|Team Collaboration|Innovation', 'Weightage:pct:10..30', 'Employee Rating:stars', 'Manager Rating:stars'], 5]] });
  D('appraisal-template', 'Appraisal Template', 'performance', 'layers', ['Template:pick:x', 'Rating Criteria:n:3..6', 'KRAs:n:3..7'], { names: ['Engineer Template', 'Sales Template', 'Support Template', 'Manager Template'], child: [['Goals (KRA)', ['KRA:pick:Code Quality|Delivery Timeliness|Customer Satisfaction|Team Collaboration', 'Weightage:pct:10..30'], 4], ['Rating Criteria', ['Criteria:pick:Ownership|Communication|Quality of Work|Leadership', 'Weightage:pct:10..30'], 3]] });
  D('kra', 'KRA', 'performance', 'target', ['KRA:pick:x', 'Description:txt:Key result area used in appraisal templates'], { names: ['Code Quality', 'Delivery Timeliness', 'Customer Satisfaction', 'Team Collaboration', 'Innovation', 'Revenue Target', 'Process Compliance'] });
  D('goal', 'Goal', 'performance', 'flag', ['Goal:pick:Launch v2 payments|Reduce support TAT|Hit Q3 revenue target|Ship mobile app|Improve NPS|Automate payroll', 'Employee:emp', 'KRA:pick:Delivery Timeliness|Customer Satisfaction|Innovation|Revenue Target', 'Progress:pct', 'Start Date:pdate:120', 'End Date:fdate:120', 'Status:st:Pending|In Progress|Completed|Archived'], { kanban: 'Status' });
  D('performance-feedback', 'Employee Performance Feedback', 'performance', 'message', ['Employee:emp', 'Reviewer:pick:Kamrul Hasan|Mitu Rahman|Sumaiya Begum', 'Appraisal Cycle:pick:H1 2026 Review|FY 2025 Annual', 'Total Score:stars', 'Feedback Date:pdate:30', 'Status:st:Draft|Submitted'], { sub: true, child: [['Criteria Ratings', ['Criteria:pick:Ownership|Communication|Quality of Work|Leadership|Punctuality', 'Rating:stars', 'Comment:txt:Consistently meets expectations'], 4]] });
  D('feedback-criteria', 'Employee Feedback Criteria', 'performance', 'star', ['Criteria:pick:x', 'Description:txt:Used in performance feedback forms'], { names: ['Ownership', 'Communication', 'Quality of Work', 'Leadership', 'Punctuality'] });

  /* --- Training --- */
  D('training-program', 'Training Program', 'training', 'grad', ['Program:pick:x', 'Trainer:pick:Farhana Akter|Kamrul Hasan|External Trainer', 'Company:company', 'Duration (hrs):n:4..40', 'Status:st:Planned|Ongoing|Completed'], { names: ['Leadership Fundamentals', 'Advanced Frappe Development', 'Customer Communication', 'Workplace Safety', 'Data Privacy Basics'] });
  D('training-event', 'Training Event', 'training', 'book', ['Event:pick:Leadership Workshop|Frappe Bootcamp|Customer Empathy|Safety Drill|Privacy Session', 'Training Program:pick:Leadership Fundamentals|Advanced Frappe Development|Customer Communication|Workplace Safety', 'Start Time:datetime', 'Location:pick:Dhaka HQ|Online (Zoom)|Chattogram Office', 'Attendees:n:5..40', 'Status:st:Draft|Scheduled|Completed|Cancelled'], { sub: true, cal: 'Start Time', kanban: 'Status', child: [['Employees', ['Employee:emp', 'Status:st:Open|Invited|Confirmed|Attended', 'Attendance:pick:Present|Absent'], 5]] });
  D('training-result', 'Training Result', 'training', 'award', ['Training Event:pick:Leadership Workshop|Frappe Bootcamp|Customer Empathy|Safety Drill', 'Employee:emp', 'Hours:n:2..16', 'Grade:pick:A|B|C', 'Status:st:Draft|Submitted'], { sub: true });
  D('training-feedback', 'Training Feedback', 'training', 'message', ['Training Event:pick:Leadership Workshop|Frappe Bootcamp|Customer Empathy|Safety Drill', 'Employee:emp', 'Feedback:stars', 'Status:st:Draft|Submitted'], { sub: true });

  /* --- Loans --- */
  D('loan-application', 'Loan Application', 'loans', 'moneyloan', ['Applicant:emp', 'Loan Type:pick:Salary Advance Loan|Personal Loan|Emergency Loan', 'Loan Amount:money:20000..500000', 'Repayment Period (months):n:3..36', 'Status:st:Open|Approved|Rejected'], { sub: true, kanban: 'Status' });
  D('loan', 'Loan', 'loans', 'dollar', ['Applicant:emp', 'Loan Type:pick:Salary Advance Loan|Personal Loan|Emergency Loan', 'Loan Amount:money:20000..500000', 'Monthly Repayment:money:2000..30000', 'Disbursed:pct', 'Status:st:Sanctioned|Disbursed|Partially Disbursed|Closed'], { sub: true, kanban: 'Status' });
  D('loan-repayment', 'Loan Repayment', 'loans', 'card', ['Applicant:emp', 'Posting Date:pdate:60', 'Amount Paid:money:2000..30000', 'Payment Type:pick:Salary Deduction|Cash|Bank Transfer', 'Status:st:Submitted|Draft'], { sub: true });

  /* --- Setup / masters --- */
  D('company', 'Company', 'setup', 'building', ['Company:pick:x', 'Abbr:seq:BT,BDS,BF', 'Default Currency:txt:BDT', 'Country:txt:Bangladesh', 'Domain:pick:Software|Services|Non-profit'], { names: [B.COMPANY, 'Bijoy Digital Services', 'Bijoy Foundation'] });
  D('branch', 'Branch', 'setup', 'pin', ['Branch:pick:x', 'Employees:n:5..120', 'Manager:pick:Rahim Uddin|Fatema Khatun|Tanvir Ahmed'], { names: B.BRANCHES });
  D('department', 'Department', 'setup', 'org', ['Department:pick:x', 'Department Head:emp', 'Company:company', 'Employees:n:3..40', 'Is Group:bool'], { names: ['Management'].concat(B.DEPTS) });
  D('designation', 'Designation', 'setup', 'briefcase', ['Designation:pick:x', 'Description:txt:Role definition', 'Skills:n:0..8', 'Employees:n:1..25'], { names: ['Managing Director', 'CTO', 'CFO', 'COO', 'Senior Software Engineer', 'Software Engineer', 'UI/UX Designer', 'Sales Executive', 'Accountant', 'HR Executive', 'Support Agent', 'Intern'] });
  D('employment-type', 'Employment Type', 'setup', 'tag', ['Type:pick:x', 'Employees:n:1..40'], { names: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Probation', 'Consultant'] });
  D('employee-grade', 'Employee Grade', 'setup', 'layers', ['Grade:pick:x', 'Default Salary Structure:pick:Standard Monthly|Executive Grade|Intern Stipend', 'Default Base Pay:money:25000..250000'], { names: ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'] });
  D('employee-group', 'Employee Group', 'setup', 'users', ['Group:pick:x', 'Employees:n:3..40'], { names: ['Management', 'Engineering Team', 'Field Staff', 'Interns'] });
  D('skill', 'Skill', 'setup', 'sparkle', ['Skill:pick:x', 'Description:txt:Skill used in skill maps & hiring'], { names: ['Python', 'Frappe', 'JavaScript', 'Communication', 'Leadership', 'Accounting', 'Recruiting', 'Negotiation'] });
  D('grievance-type', 'Grievance Type', 'setup', 'alert', ['Type:pick:x', 'Description:txt:Category of grievance'], { names: ['Workplace', 'Payroll', 'Facilities', 'Conduct'] });
  D('identification-document-type', 'Identification Document Type', 'setup', 'fingerprint', ['Document:pick:x', 'Required:bool'], { names: ['National ID', 'Passport', 'Birth Certificate', 'Driving License', 'TIN Certificate'] });
  D('daily-work-summary-group', 'Daily Work Summary Group', 'setup', 'inbox', ['Group:pick:x', 'Send Emails At:pick:6:00 PM|5:30 PM', 'Users:n:5..20', 'Enabled:bool'], { names: ['Engineering Standup', 'Sales Daily', 'Support Daily'] });
  D('daily-work-summary', 'Daily Work Summary', 'setup', 'file', ['Group:pick:Engineering Standup|Sales Daily|Support Daily', 'Date:pdate:14', 'Replies:n:3..18', 'Status:st:Open|Sent|Completed'], {});

  /* ---------- Reports ---------- */
  B.REPORTS = [];
  function R(id, label, type, rmod, cols, o) {
    B.REPORTS.push({ id, label, type, rmod });
    D('rpt-' + id, label, 'reports', 'bars', cols, Object.assign({ report: true, rmod, rtype: type, n: 24, chartBy: null }, o || {}));
  }
  R('employee-leave-balance', 'Employee Leave Balance', 'Script Report', 'leaves', ['Employee:emp', 'Department:dept', 'Leave Type:pick:' + LT, 'Opening:n:0..10', 'Allocated:n:5..30', 'Taken:n:0..15', 'Expired:n:0..3', 'Closing Balance:n:0..25']);
  R('employee-leave-balance-summary', 'Employee Leave Balance Summary', 'Script Report', 'leaves', ['Employee:emp', 'Department:dept', 'Casual Leave:n:0..10', 'Sick Leave:n:0..10', 'Earned Leave:n:0..20', 'Total Balance:n:5..40']);
  R('employee-analytics', 'Employee Analytics', 'Script Report', 'lifecycle', ['Employee:emp', 'Department:dept', 'Designation:desig', 'Branch:branch', 'Gender:pick:Female|Male', 'Age:n:23..55', 'Tenure (months):n:2..96']);
  R('employee-birthday', 'Employee Birthday', 'Report Builder', 'lifecycle', ['Employee:emp', 'Date of Birth:pdate:15000', 'Department:dept', 'Company:company']);
  R('employee-information', 'Employee Information', 'Report Builder', 'lifecycle', ['Employee:emp', 'Date of Joining:pdate:1500', 'Branch:branch', 'Department:dept', 'Designation:desig', 'Contact:phone', 'Email:email']);
  R('employee-exits', 'Employee Exits & Turnover', 'Script Report', 'lifecycle', ['Employee:emp', 'Department:dept', 'Exit Date:pdate:200', 'Reason:pick:Better Opportunity|Relocation|Higher Studies|Personal|Compensation', 'Tenure (years):n:0..8']);
  R('employees-working-on-holiday', 'Employees Working on a Holiday', 'Script Report', 'attendance', ['Employee:emp', 'Department:dept', 'Holiday:pick:Independence Day|May Day|Eid-ul-Fitr|Victory Day', 'Date:pdate:120', 'Working Hours:n:4..9']);
  R('monthly-attendance-sheet', 'Monthly Attendance Sheet', 'Script Report', 'attendance', ['Employee:emp', 'Department:dept', 'Present:n:15..24', 'Absent:n:0..3', 'Leaves:n:0..4', 'Late Entries:n:0..6', 'Holidays:n:4..5', 'Working Days:n:22..26']);
  R('shift-attendance', 'Shift Attendance', 'Script Report', 'attendance', ['Employee:emp', 'Shift:pick:' + SHIFTS, 'Attendance Date:pdate:20', 'Status:st:Present|Present|Absent|Half Day', 'Late Entry:bool', 'Early Exit:bool']);
  R('recruitment-analytics', 'Recruitment Analytics', 'Script Report', 'recruit', ['Job Opening:pick:' + JOBS, 'Applicants:n:5..120', 'Shortlisted:n:2..30', 'Interviewed:n:1..15', 'Offered:n:0..5', 'Hired:n:0..3', 'Avg Days to Hire:n:12..60']);
  R('job-applicant-source-report', 'Job Applicant Source', 'Script Report', 'recruit', ['Source:pick:LinkedIn|Bdjobs|Employee Referral|Website|Facebook|Walk-in', 'Applicants:n:5..80', 'Hired:n:0..8', 'Conversion:pct:2..25']);
  R('salary-register', 'Salary Register', 'Script Report', 'payroll', ['Employee:emp', 'Department:dept', 'Days Worked:n:22..26', 'Gross Pay:gross', 'Deduction:ded', 'Net Pay:net']);
  R('bank-remittance', 'Bank Remittance', 'Script Report', 'payroll', ['Employee:emp', 'Bank:pick:' + BANKS.join('|'), 'Account No:acct', 'Amount:money:35000..200000', 'Payment Date:date']);
  R('salary-payments-via-ecs', 'Salary Payments via ECS', 'Script Report', 'payroll', ['Employee:emp', 'Bank:pick:' + BANKS.join('|'), 'Account No:acct', 'Net Pay:money:35000..200000', 'Status:st:Paid|Queued']);
  R('salary-payments-by-mode', 'Salary Payments Based on Payment Mode', 'Script Report', 'payroll', ['Employee:emp', 'Mode of Payment:pick:Bank Transfer|Cash|bKash|Cheque', 'Net Pay:money:35000..200000', 'Date:pdate:30']);
  R('income-tax-computation', 'Income Tax Computation', 'Script Report', 'tax', ['Employee:emp', 'Annual Taxable Income:money:400000..3500000', 'Exemptions:money:50000..500000', 'Tax Payable:money:0..400000', 'Tax Paid:money:0..300000']);
  R('professional-tax-deductions', 'Professional Tax Deductions', 'Script Report', 'tax', ['Employee:emp', 'Department:dept', 'Gross Pay:gross', 'Professional Tax:money:200..2500']);
  R('provident-fund-deductions', 'Provident Fund Deductions', 'Script Report', 'tax', ['Employee:emp', 'PF Account:acct', 'Employee Contribution:money:2000..12000', 'Employer Contribution:money:2000..12000', 'Total:money:4000..24000']);
  R('unpaid-expense-claim', 'Unpaid Expense Claim', 'Script Report', 'expense', ['Employee:emp', 'Department:dept', 'Claim Date:pdate:60', 'Claimed:money:500..40000', 'Pending Amount:money:500..40000', 'Status:st:Unpaid']);
  R('employee-advance-summary', 'Employee Advance Summary', 'Script Report', 'expense', ['Employee:emp', 'Purpose:pick:Travel|Medical|Relocation|Training', 'Advance:money:5000..100000', 'Paid:money:0..100000', 'Claimed:money:0..50000', 'Returned:money:0..10000']);
  R('vehicle-expenses', 'Vehicle Expenses', 'Script Report', 'expense', ['Vehicle:plate', 'Make:pick:Toyota|Honda|Mitsubishi|Nissan', 'Fuel Expense:money:2000..25000', 'Service Expense:money:0..30000', 'Total:money:2000..55000']);
  R('appraisal-overview', 'Appraisal Overview', 'Script Report', 'performance', ['Employee:emp', 'Department:dept', 'Cycle:pick:H1 2026 Review|FY 2025 Annual', 'Final Score:stars', 'Status:st:Draft|Submitted|Completed']);
  R('daily-work-summary-replies', 'Daily Work Summary Replies', 'Script Report', 'setup', ['Group:pick:Engineering Standup|Sales Daily|Support Daily', 'Date:pdate:14', 'Replied:n:3..18', 'Pending:n:0..8']);
  R('training-completion', 'Training Completion', 'Report Builder', 'training', ['Employee:emp', 'Training Event:pick:Leadership Workshop|Frappe Bootcamp|Customer Empathy|Safety Drill', 'Hours:n:2..16', 'Grade:pick:A|B|C', 'Status:st:Completed|Submitted']);

  /* ---------- Custom pages metadata (rendered in pages.js) ---------- */
  B.PAGES = {
    directory: { label: 'Employee Directory', icon: 'users', route: '#/list/employee/cards' },
    orgchart: { label: 'Organization Chart', icon: 'org' },
    'recruit-dash': { label: 'Recruitment Dashboard', icon: 'pie' },
    pipeline: { label: 'Hiring Pipeline', icon: 'kanban', route: '#/list/job-applicant/kanban' },
    'attendance-dash': { label: 'Attendance Dashboard', icon: 'activity' },
    'attendance-tool': { label: 'Employee Attendance Tool', icon: 'user-check' },
    'upload-attendance': { label: 'Upload Attendance', icon: 'upload' },
    'shift-roster': { label: 'Shift Roster', icon: 'grid' },
    'leave-calendar': { label: 'Leave Calendar', icon: 'calendar' },
    'leave-balance': { label: 'Leave Balance', icon: 'pie' },
    'leave-control': { label: 'Leave Control Panel', icon: 'settings' },
    'payroll-dash': { label: 'Payroll Dashboard', icon: 'bars' },
    'payroll-process': { label: 'Process Payroll', icon: 'zap' },
    payslip: { label: 'Payslip Viewer', icon: 'file' },
    'perf-dash': { label: 'Performance Dashboard', icon: 'trend' },
    goals: { label: 'Goals & OKRs', icon: 'flag' },
    'self-service': { label: 'Employee Self Service', icon: 'phoneui' },
    reports: { label: 'All Reports', icon: 'bars' },
    'hr-settings': { label: 'HR Settings', icon: 'settings' },
    'payroll-settings': { label: 'Payroll Settings', icon: 'settings' },
    'task-board': { label: 'Task Board', icon: 'kanban', route: '#/list/task/kanban' },
    announcements: { label: 'Notice Board', icon: 'bell' },
    todo: { label: 'My Todos', icon: 'check-circle' },
    'my-dashboard': { label: 'My Dashboard', icon: 'home' },
    'asset-dash': { label: 'Asset Overview', icon: 'bars' },
    assets: { label: 'Asset Register', icon: 'briefcase' },
    'asset-assign': { label: 'Asset Assignments', icon: 'user-check' },
    'asset-maint': { label: 'Asset Maintenance', icon: 'settings' },
    'asset-masters': { label: 'Asset Masters', icon: 'layers' },
    'my-assets': { label: 'My Assets', icon: 'briefcase' },
    'my-claims': { label: 'My Expense Claims', icon: 'card' },
    'team-claims': { label: 'Team Claim Approvals', icon: 'check-circle' },
    'expense-dash': { label: 'Expense Management', icon: 'bars' },
    'loan-dash': { label: 'Loan Management', icon: 'moneyloan' },
    'my-loans': { label: 'My Loans & Advances', icon: 'moneyloan' },
    'req-board': { label: 'Job Requisitions', icon: 'flag' },
    'hiring-flow': { label: 'Hiring Process', icon: 'users' },
    'leave-approvals': { label: 'Leave Approvals', icon: 'check-circle' },
    'roster-master': { label: 'Rosters & Late Rules', icon: 'clock' },
    'office-attendance': { label: 'Office Attendance', icon: 'fingerprint' },
    'wfh-open-dates': { label: 'HR Open Dates', icon: 'calendar' },
    'approval-chains': { label: 'Approval Chains', icon: 'layers' },
    'wfh-dash': { label: 'WFH Overview', icon: 'bars' },
    'wfh-requests': { label: 'WFH Applications', icon: 'inbox' },
    'wfh-attendance': { label: 'Online Attendance', icon: 'location' },
    'wfh-policy': { label: 'WFH Policy & Tracking', icon: 'settings' },
    'team-wfh': { label: 'Team WFH Approvals', icon: 'check-circle' },
    'my-wfh': { label: 'My Work From Home', icon: 'home' },
    'dg-dash': { label: 'D&G Overview', icon: 'bars' },
    'dg-cases': { label: 'Disciplinary Cases', icon: 'alert' },
    'dg-grievances': { label: 'Grievances', icon: 'message' },
    'dg-hearings': { label: 'Hearings', icon: 'calendar' },
    'dg-notices': { label: 'Notices & Letters', icon: 'file' },
    'dg-setup': { label: 'D&G Setup', icon: 'settings' },
    'my-cases': { label: 'My Grievances & Notices', icon: 'alert' }
  };

  /* ---------- Sidebar / workspace modules ---------- */
  B.NAV = [
    { id: 'tasks', label: 'Tasks & Support', icon: 'check-circle', desc: 'Support tickets, tasks and projects with board views.', items: ['p:todo', 'p:task-board', 'l:ticket', 'l:task', 'l:project'] },
    { id: 'lifecycle', label: 'Employee Lifecycle', icon: 'users', desc: 'Hire-to-retire: onboarding, transfers, promotions, exits.', items: ['p:directory', 'l:employee', 'p:orgchart', 'l:employee-onboarding', 'l:onboarding-template', 'l:employee-promotion', 'l:employee-transfer', 'l:employee-separation', 'l:separation-template', 'l:exit-interview', 'l:full-final-statement', 'l:employee-grievance', 'l:employee-referral', 'l:employee-skill-map'] },
    { id: 'dg', label: 'Disciplinary & Grievance', icon: 'alert', desc: 'Misconduct cases, show-cause notices, hearings, decisions and employee grievances.', items: ['p:dg-dash', 'p:dg-cases', 'p:dg-grievances', 'p:dg-hearings', 'p:dg-notices', 'p:dg-setup', 'p:my-cases'] },
    { id: 'recruit', label: 'Recruitment', icon: 'user-plus', desc: 'Requisitions, openings, applicants, interviews and offers.', items: ['p:recruit-dash', 'p:req-board', 'p:hiring-flow', 'p:pipeline', 'l:job-requisition', 'l:staffing-plan', 'l:job-opening', 'l:job-applicant', 'l:interview', 'l:interview-round', 'l:interview-type', 'l:interview-feedback', 'l:job-offer', 'l:appointment-letter', 'l:appointment-letter-template', 'l:job-applicant-source'] },
    { id: 'attendance', label: 'Shift & Attendance', icon: 'clock', desc: 'Check-ins, shifts, rosters, holidays and attendance requests.', items: ['p:attendance-dash', 'p:office-attendance', 'l:attendance', 'l:employee-checkin', 'l:attendance-request', 'p:attendance-tool', 'p:upload-attendance', 'p:roster-master', 'l:shift-type', 'l:shift-request', 'l:shift-assignment', 'p:shift-roster', 'l:shift-location', 'l:shift-schedule', 'l:shift-schedule-assignment', 'l:holiday-list'] },
    { id: 'wfh', label: 'Work From Home', icon: 'home', desc: 'WFH applications, supervisor approval, online attendance and location verification.', items: ['p:wfh-dash', 'p:wfh-requests', 'p:wfh-open-dates', 'p:wfh-attendance', 'p:wfh-policy', 'p:team-wfh', 'p:my-wfh'] },
    { id: 'leaves', label: 'Leaves', icon: 'calendar', desc: 'Policies, allocations, applications, encashment and ledger.', items: ['p:leave-approvals', 'l:leave-application', 'l:leave-allocation', 'p:leave-calendar', 'p:leave-balance', 'l:leave-type', 'l:leave-policy', 'l:leave-policy-assignment', 'l:leave-period', 'l:leave-block-list', 'l:compensatory-leave-request', 'l:leave-encashment', 'l:leave-ledger-entry', 'p:leave-control'] },
    { id: 'payroll', label: 'Payroll', icon: 'dollar', desc: 'Salary structures, payroll runs, payslips, bonuses and gratuity.', items: ['p:payroll-dash', 'p:payroll-process', 'l:payroll-entry', 'l:salary-slip', 'p:payslip', 'l:salary-structure', 'l:salary-structure-assignment', 'l:salary-component', 'l:additional-salary', 'l:employee-incentive', 'l:retention-bonus', 'l:salary-withholding', 'l:payroll-period', 'l:gratuity', 'l:gratuity-rule', 'p:payroll-settings'] },
    { id: 'tax', label: 'Tax & Benefits', icon: 'percent', desc: 'Income tax slabs, exemptions and flexible benefits.', items: ['l:income-tax-slab', 'l:tax-exemption-category', 'l:tax-exemption-sub-category', 'l:tax-exemption-declaration', 'l:tax-exemption-proof', 'l:benefit-application', 'l:benefit-claim'] },
    { id: 'expense', label: 'Expenses & Travel', icon: 'card', desc: 'Expense claims, advances, travel requests and vehicle logs.', items: ['p:expense-dash', 'p:my-claims', 'p:team-claims', 'l:expense-claim', 'l:expense-claim-type', 'l:employee-advance', 'l:travel-request', 'l:vehicle', 'l:vehicle-log'] },
    { id: 'performance', label: 'Performance', icon: 'award', desc: 'Appraisal cycles, KRAs, goals and continuous feedback.', items: ['p:perf-dash', 'l:appraisal-cycle', 'l:appraisal', 'l:appraisal-template', 'l:kra', 'p:goals', 'l:goal', 'l:performance-feedback', 'l:feedback-criteria'] },
    { id: 'training', label: 'Training', icon: 'grad', desc: 'Programs, events, results and feedback.', items: ['l:training-program', 'l:training-event', 'l:training-result', 'l:training-feedback'] },
    { id: 'assets', label: 'Asset Management', icon: 'briefcase', desc: 'Register company assets, assign them to employees and track returns and repairs.', items: ['p:asset-dash', 'p:assets', 'p:asset-assign', 'p:asset-maint', 'p:asset-masters', 'p:my-assets'] },
    { id: 'loans', label: 'Loans', icon: 'moneyloan', desc: 'Employee loans and salary-deducted repayments.', items: ['p:loan-dash', 'p:my-loans', 'l:loan-application', 'l:loan', 'l:loan-repayment'] },
    { id: 'reports', label: 'Reports', icon: 'bars', desc: 'Every standard HRMS report in one place.', items: ['p:reports', 'p:announcements'] },
    { id: 'selfservice', label: 'Self Service', icon: 'phoneui', desc: 'The mobile-first employee app: check-in, requests, payslips.', items: ['p:self-service'] },
    { id: 'setup', label: 'HR Setup', icon: 'settings', desc: 'Settings and master data used across every module.', items: ['p:hr-settings', 'p:approval-chains', 'l:company', 'l:branch', 'l:department', 'l:designation', 'l:employment-type', 'l:employee-grade', 'l:employee-group', 'l:skill', 'l:grievance-type', 'l:identification-document-type', 'l:daily-work-summary-group', 'l:daily-work-summary'] }
  ];

  /* Resolve a nav token to {label, icon, href, kind, id} */
  B.navItem = (tok) => {
    const [k, id] = tok.split(':');
    if (k === 'l') { const d = B.docs[id]; return { kind: 'l', id, label: d.label, icon: d.icon, href: '#/list/' + id }; }
    const p = B.PAGES[id];
    return { kind: 'p', id, label: p.label, icon: p.icon, href: p.route || '#/page/' + id };
  };

  /* ---------- Row generation ---------- */
  const cache = {};
  const abbr = (label) => label.replace(/[^A-Za-z ]/g, '').split(' ').filter((w) => w.length > 2 || /^[A-Z]+$/.test(w)).map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  function makeRow(doc, i) {
    const r = B.rng(doc.id + i);
    const ctx = { p: B.EMPLOYEES[Math.floor(r() * B.EMPLOYEES.length)], ap: B.APPLICANTS[Math.floor(r() * B.APPLICANTS.length)] };
    if (doc.id === 'employee') ctx.p = B.EMPLOYEES[i % B.EMPLOYEES.length];
    if (doc.id === 'department' && i > 0) ctx.p = B.EMPLOYEES[i];
    const vals = doc.cols.map((c, ci) => (doc.names && ci === 0 ? doc.names[i] : gen(c, r, ctx, i)));
    const mod = Math.floor(r() * 9) + i * 1.2;
    const name = doc.names ? doc.names[i] : (doc.prefix || 'HR-' + abbr(doc.label)) + '-' + (doc.noYear ? '' : B.today.getFullYear() + '-') + B.pad(doc.id === 'employee' ? i + 1 : 1000 - i * 3 - Math.floor(r() * 3), 5);
    return { name, i, vals, p: doc.id === 'employee' ? B.EMPLOYEES[i % B.EMPLOYEES.length] : ctx.p, ap: ctx.ap, modified: Math.floor(mod), comments: Math.floor(r() * 4), docstatus: 0 };
  }
  B.getRows = (id) => {
    if (cache[id]) return cache[id];
    const doc = B.docs[id];
    const rows = Array.from({ length: doc.n }, (_, i) => makeRow(doc, i));
    if (doc.sub) rows.forEach((r) => { const stCol = B.statusColIdx(doc); const v = stCol >= 0 ? r.vals[stCol] : 'Submitted'; r.docstatus = /^(draft|open|pending|not started|scheduled|awaiting|in process|queued)/i.test(v) ? 0 : /^(cancelled|rejected)/i.test(v) ? 2 : 1; });
    return (cache[id] = rows);
  };
  B.getChildRows = (doc, ci, seed) => {
    const ch = doc.child[ci];
    const r = B.rng(seed + ch.title);
    return Array.from({ length: ch.n }, (_, i) => {
      const ctx = { p: B.EMPLOYEES[Math.floor(r() * B.EMPLOYEES.length)], ap: B.APPLICANTS[i % B.APPLICANTS.length] };
      return ch.cols.map((c) => gen(c, r, ctx, i));
    });
  };
  B.newVals = (doc) => doc.cols.map((c) => (c.kind === 'bool' ? false : c.kind === 'money' || c.kind === 'n' || c.kind === 'pct' ? 0 : c.kind === 'stars' ? 0 : c.kind === 'st' || c.kind === 'pick' ? c.arg.split('|')[0] : c.kind === 'txt' ? c.arg : ''));
  B.findDoc = (id) => B.docs[id];
  B.statusColIdx = (doc) => { let k = doc.cols.findIndex((c) => c.label === (doc.kanban || 'Status') && c.kind === 'st'); if (k < 0) k = doc.cols.findIndex((c) => c.kind === 'st'); return k; };
})();
