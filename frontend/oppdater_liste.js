const API = "/rentals";
const PCS = "/pcs";

const listPage = document.getElementById("listPage");
const calendarEl = document.getElementById("calendar");
const pcPage = document.getElementById("pcPage");

let calendar;

/* ---------- VIEW SWITCH ---------- */

function openList() {
  listPage.style.display = "block";
  calendarEl.style.display = "none";
  pcPage.style.display = "none";
}

function openCalendar() {
  listPage.style.display = "none";
  pcPage.style.display = "none";
  calendarEl.style.display = "block";

  if (!calendar) initCalendar();
  calendar.updateSize();
}

function openPCs() {
  listPage.style.display = "none";
  calendarEl.style.display = "none";
  pcPage.style.display = "block";
  loadPCs();
}

/* ---------- LIST ---------- */

async function loadRentals() {
  const r = await fetch(API);
  const rentals = await r.json();
  const div = document.getElementById("listDiv");
  div.innerHTML = "";

  rentals.forEach(r => {
    ["", r.student_name, r.pc_number,
     formatDate(r.rented_date),
     formatDate(r.return_date)
    ].forEach(t => {
      const c = document.createElement("div");
      c.textContent = t;
      div.appendChild(c);
    });

    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete-btn";
    del.onclick = async () => {
      await fetch(`${API}/${r.id}`, { method: "DELETE" });
      loadRentals();
      if (calendar) loadCalendarEvents();
    };
    div.appendChild(del);
  });
}

/* ---------- CALENDAR ---------- */

function initCalendar() {
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "100%",
    eventClick(info) {
      alert(
        `${info.event.extendedProps.student}\n` +
        `PC: ${info.event.extendedProps.pc}\n` +
        `Return: ${formatDate(info.event.start)}`
      );
    }
  });
  calendar.render();
  loadCalendarEvents();
}

async function loadCalendarEvents() {
  calendar.getEvents().forEach(e => e.remove());
  const r = await fetch(API);
  const rentals = await r.json();

  rentals.forEach(r => {
    calendar.addEvent({
      start: r.return_date,
      display: "background",
      color: "red"
    });

    calendar.addEvent({
      title: `${r.student_name} – ${r.pc_number}`,
      start: r.return_date,
      extendedProps: {
        student: r.student_name,
        pc: r.pc_number
      }
    });
  });
}

/* ---------- PCS ---------- */

async function loadPCs() {
  const r = await fetch(PCS);
  const pcs = await r.json();
  const div = document.getElementById("pcList");
  div.innerHTML = "";

  pcs.forEach(pc => {
    const row = document.createElement("div");
    row.textContent =
      `${pc.pc_number} – ${pc.model} – ${pc.rented ? "Rented" : "Available"}`;
    div.appendChild(row);
  });
}

async function addPC() {
  await fetch(PCS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pc_number: pcNum.value,
      model: pcModel.value
    })
  });
  loadPCs();
}

/* ---------- HELPERS ---------- */

function formatDate(d) {
  const x = new Date(d);
  return `${x.getDate()}/${x.getMonth()+1}/${x.getFullYear()}`;
}

if (document.getElementById("listDiv")) loadRentals();