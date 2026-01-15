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
    const today = new Date();
    today.setHours(0,0,0,0);

    const res = await fetch(API_URL);
    const rentals = await res.json();

    const listDiv = document.getElementById("listDiv");
    listDiv.innerHTML = "";

    // HEADERS (DO NOT REMOVE)
    const headers = [
        "Status",
        "Elev navn",
        "PC nummer",
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
        const daysRemaining =
            Math.ceil((returnDate - today) / (1000*60*60*24)) - 1;

        // STATUS
        const status = document.createElement("h5");
        if (daysRemaining < 0) {
            status.textContent = "Overdue";
            status.style.backgroundColor = "darkred";
        } else if (daysRemaining === 0) {
            status.textContent = "Today";
            status.style.backgroundColor = "red";
        } else if (daysRemaining <= 5) {
            status.textContent = ` ${daysRemaining} dager`;
            status.style.backgroundColor = "yellow";
        } else {
            status.textContent = ` ${daysRemaining} dager`;
            status.style.backgroundColor = "lightgreen";
        }

        listDiv.appendChild(status);

        [
            r.student_name,
            r.pc_number,
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
            await fetch(`${API_URL}/${r.id}`, { method: "DELETE" });
            loadRentals();
            if (calendarInstance) loadCalendarEvents();
        };

        listDiv.appendChild(del);
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
    const res = await fetch(API_URL);
    const rentals = await res.json();

    calendarInstance.getEvents().forEach(e => e.remove());

    rentals.forEach(r => {
        const returnDate = new Date(r.return_date);
        const today = new Date();
        today.setHours(0,0,0,0);

        const daysRemaining =
            Math.ceil((returnDate - today) / (1000*60*60*24)) - 1;

        let color = "lightgreen";
        if (daysRemaining < 0) color = "darkred";
        else if (daysRemaining === 0) color = "red";
        else if (daysRemaining <= 5) color = "yellow";

        // BACKGROUND CELL COLOR
        calendarInstance.addEvent({
            start: returnDate.toISOString().split("T")[0],
            display: "background",
            color: color
        });

        // CLICKABLE EVENT
        calendarInstance.addEvent({
            title: `${r.student_name} – PC ${r.pc_number}`,
            start: returnDate.toISOString().split("T")[0],
            color: color,
            extendedProps: r
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