/* ================= CONFIG ================= */

const RENTALS_API = "/rentals";
const PCS_API = "/pcs";

const listPage = document.getElementById("listPage");
const calendarEl = document.getElementById("calendar");
const pcPage = document.getElementById("pcPage");

let calendar;

/* ================= VIEW SWITCH ================= */

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

/* ================= LIST ================= */

async function loadRentals() {
  const today = new Date();
  today.setHours(0,0,0,0);

  const res = await fetch(RENTALS_API);
  const rentals = await res.json();

  const listDiv = document.getElementById("listDiv");
  listDiv.innerHTML = "";

  const headers = [
    "Status",
    "Elev navn",
    "PC",
    "Dato lånet",
    "Leverings dato",
    "Slett"
  ];

  headers.forEach(h => {
    const el = document.createElement("h4");
    el.textContent = h;
    listDiv.appendChild(el);
  });

  rentals.forEach(r => {
    const returnDate = new Date(r.return_date);
    const days =
      Math.ceil((returnDate - today) / (1000*60*60*24)) - 1;

    const status = document.createElement("h5");
    if (days < 0) {
      status.textContent = "Overdue";
      status.style.backgroundColor = "darkred";
    } else if (days === 0) {
      status.textContent = "Today";
      status.style.backgroundColor = "red";
    } else if (days <= 5) {
      status.textContent = `${days} dager`;
      status.style.backgroundColor = "yellow";
    } else {
      status.textContent = `${days} dager`;
      status.style.backgroundColor = "lightgreen";
    }
    listDiv.appendChild(status);

    [
      r.student_name,
      `${r.pc_number} (${r.model})`,
      formatDate(r.rented_date),
      formatDate(r.return_date)
    ].forEach(t => {
      const el = document.createElement("h5");
      el.textContent = t;
      listDiv.appendChild(el);
    });

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "✕";
    del.onclick = async () => {
      if (!confirm("Delete rental?")) return;
      await fetch(`${RENTALS_API}/${r.id}`, { method: "DELETE" });
      loadRentals();
      if (calendar) loadCalendarEvents();
    };
    listDiv.appendChild(del);
  });
}

/* ================= CALENDAR ================= */

function initCalendar() {
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "100%",
    eventClick(info) {
      alert(
        `${info.event.extendedProps.student_name}\n` +
        `PC: ${info.event.extendedProps.pc_number} (${info.event.extendedProps.model})\n` +
        `Return: ${formatDate(info.event.start)}`
      );
    }
  });
  calendar.render();
  loadCalendarEvents();
}

async function loadCalendarEvents() {
  const res = await fetch(RENTALS_API);
  const rentals = await res.json();

  calendar.getEvents().forEach(e => e.remove());

  rentals.forEach(r => {
    const returnDate = new Date(r.return_date);
    const today = new Date();
    today.setHours(0,0,0,0);

    const days =
      Math.ceil((returnDate - today) / (1000*60*60*24)) - 1;

    let color = "lightgreen";
    if (days < 0) color = "darkred";
    else if (days === 0) color = "red";
    else if (days <= 5) color = "yellow";

    calendar.addEvent({
      start: returnDate.toISOString().split("T")[0],
      display: "background",
      color
    });

    calendar.addEvent({
      title: `${r.student_name} – PC ${r.pc_number}`,
      start: returnDate.toISOString().split("T")[0],
      color,
      extendedProps: r
    });
  });
}

/* ================= PCS ================= */

async function loadPCs() {
  const r = await fetch(PCS_API);
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
  await fetch(PCS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pc_number: pcNum.value,
      model: pcModel.value
    })
  });
  loadPCs();
}

/* ================= ADD RENTAL ================= */

async function addRental() {
  await fetch(RENTALS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_name: navn.value,
      pc_id: pcSelect.value,
      rented_date: dato_lånt.value,
      return_date: leverings_dato.value
    })
  });
  window.location.href = "/";
}

/* ================= HELPERS ================= */

function formatDate(d) {
  const x = new Date(d);
  return `${x.getDate()}/${x.getMonth()+1}/${x.getFullYear()}`;
}

if (document.getElementById("listDiv")) loadRentals();