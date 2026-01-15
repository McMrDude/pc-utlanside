const list = document.getElementById("listPage");
const calendar = document.getElementById("calendar");
const pcPage = document.getElementById("pcPage");

let calendarInstance;

/* ================== NAV ================== */

function openList() {
  list.style.display = "block";
  calendar.style.display = "none";
  pcPage.style.display = "none";
  loadRentals();
}

function openCalendar() {
  list.style.display = "none";
  calendar.style.display = "block";
  pcPage.style.display = "none";

  if (!calendarInstance) {
    calendarInstance = new FullCalendar.Calendar(calendar, {
      initialView: "dayGridMonth",
      height: "auto",
      eventClick(info) {
        alert(info.event.title);
      }
    });
    calendarInstance.render();
  }

  loadCalendarEvents();
}

function openPcs() {
  list.style.display = "none";
  calendar.style.display = "none";
  pcPage.style.display = "block";
  loadPcs();
}

/* ================== PCS ================== */

async function loadPcs() {
  const res = await fetch("/pcs");
  const pcs = await res.json();

  pcPage.innerHTML = `
    <button onclick="addPcPrompt()">+ Add PC</button>
    <table>
      <tr><th>PC</th><th>Model</th><th>Status</th><th>Student</th></tr>
      ${pcs.map(pc => `
        <tr>
          <td>${pc.pc_number}</td>
          <td>${pc.model}</td>
          <td>${pc.student_name ? "Rented" : "Available"}</td>
          <td>${pc.student_name || "-"}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

async function addPcPrompt() {
  const pc_number = prompt("PC number:");
  const model = prompt("Model:");
  if (!pc_number || !model) return;

  await fetch("/pcs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pc_number, model })
  });

  loadPcs();
}

/* ================== RENTALS ================== */

async function loadRentals() {
  const res = await fetch("/rentals");
  const rentals = await res.json();

  list.innerHTML = `
    <a href="utlån_side.html"><button>New Loan</button></a>
    ${rentals.map(r => `
      <div>
        ${r.student_name} – PC ${r.pc_number} (${r.model})
        <button onclick="deleteRental(${r.id})">✕</button>
      </div>
    `).join("")}
  `;
}

async function deleteRental(id) {
  if (!confirm("Delete this rental?")) return;
  await fetch(`/rentals/${id}`, { method: "DELETE" });
  loadRentals();
  if (calendarInstance) loadCalendarEvents();
}

/* ================== CALENDAR ================== */

async function loadCalendarEvents() {
  const res = await fetch("/rentals");
  const rentals = await res.json();

  calendarInstance.getEvents().forEach(e => e.remove());

  rentals.forEach(r => {
    calendarInstance.addEvent({
      title: `${r.student_name} – PC ${r.pc_number}`,
      start: r.return_date,
      display: "background",
      color: "red"
    });
  });
}

openList();