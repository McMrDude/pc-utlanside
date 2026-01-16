const API_URL = "/rentals";

const list = document.getElementById("listPage");
const calendar = document.getElementById("calendar");

let calendarInstance;

/* =========================
   Popup for event details
========================= */
const popup = document.createElement("div");
popup.id = "eventPopup";
popup.style.position = "absolute";
popup.style.backgroundColor = "white";
popup.style.border = "1px solid black";
popup.style.padding = "10px";
popup.style.display = "none";
popup.style.zIndex = "1000";
document.body.appendChild(popup);

/* =========================
   Open / Close views
========================= */
async function openList() {
  list.style.display = "block";
  calendar.style.display = "none";
  popup.style.display = "none";
}

async function openCalendar() {
  list.style.display = "none";
  calendar.style.display = "block";
  popup.style.display = "none";

  if (!calendarInstance) {
    calendarInstance = new FullCalendar.Calendar(calendar, {
      initialView: "dayGridMonth",
      height: "auto",
      expandRows: true,
      events: [],

      eventClick: function (info) {
        const event = info.event;

        popup.innerHTML = `
          <strong>
            ${event.extendedProps.studentName} - PC ${event.extendedProps.pcNumber}
          </strong><br>
          Rented: ${formatDate(event.extendedProps.rentedDate)}<br>
          Return: ${formatDate(event.extendedProps.returnDate)}<br><br>
          <button id="popupDeleteBtn" class="delete-btn">Delete</button>
        `;

        popup.style.left = info.jsEvent.pageX + 10 + "px";
        popup.style.top = info.jsEvent.pageY + 10 + "px";
        popup.style.display = "block";

        document.getElementById("popupDeleteBtn").onclick = async () => {
          if (!confirm("Delete this rental?")) return;

          await fetch(`${API_URL}/${event.extendedProps.id}`, {
            method: "DELETE"
          });

          popup.style.display = "none";
          loadRentals();
          loadCalendarEvents();
        };
      }
    });

    calendarInstance.render();
    loadCalendarEvents();
  } else {
    calendarInstance.updateSize();
  }
}

/* =========================
   Load list view
========================= */
async function loadRentals() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const res = await fetch(API_URL);
  const rentals = await res.json();

  const listDiv = document.getElementById("listDiv");
  listDiv.innerHTML = "";

  const headers = [
    "<h4>Status</h4>",
    "<h4>Elev navn</h4>",
    "<h4>PC nummer</h4>",
    "<h4>Dato lånet</h4>",
    "<h4>Leverings dato</h4>",
    '<h4 style="border-right: none;">Slett</h4>'
  ];

  headers.forEach(h => {
    const row = document.createElement("div");
    row.innerHTML = h;
    listDiv.appendChild(row);
  });

  rentals.forEach(r => {
    let firstCell = true;

    const returnDate = new Date(r.return_date).getTime();
    const daysRemaining =
      Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

    const rows = [
      `Dager til levering: ${daysRemaining}`,
      r.student_name,
      r.pc_number,
      formatDate(r.rented_date),
      formatDate(r.return_date)
    ];

    rows.forEach(text => {
      const row = document.createElement("h5");
      row.style.width = "100%";
      row.innerHTML = text;

      if (firstCell) {
        if (daysRemaining < 0) {
          row.style.backgroundColor = "darkred";
          row.innerHTML = "Overdue";
        } else if (daysRemaining === 0) {
          row.style.backgroundColor = "red";
          row.innerHTML = "Today";
        } else if (daysRemaining <= 5) {
          row.style.backgroundColor = "yellow";
        } else {
          row.style.backgroundColor = "lightgreen";
        }
        firstCell = false;
      }

      listDiv.appendChild(row);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";

    deleteBtn.onclick = async () => {
      if (!confirm("Delete this rental?")) return;

      await fetch(`${API_URL}/${r.id}`, {
        method: "DELETE"
      });

      loadRentals();
      if (calendarInstance) loadCalendarEvents();
    };

    listDiv.appendChild(deleteBtn);
  });
}

/* =========================
   Load calendar events
========================= */
async function loadCalendarEvents() {
  const res = await fetch(API_URL);
  const rentals = await res.json();

  calendarInstance.getEvents().forEach(e => e.remove());

  rentals.forEach(r => {
    const returnDate = new Date(r.return_date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysRemaining =
      Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

    let color = "lightgreen";
    if (daysRemaining < 0) color = "darkred";
    else if (daysRemaining === 0) color = "red";
    else if (daysRemaining <= 5) color = "yellow";

    calendarInstance.addEvent({
      title: `${r.student_name} - PC ${r.pc_number}`,
      start: returnDate.toISOString().split("T")[0],
      display: "background",
      color: color,
      extendedProps: {
        id: r.id,
        rentedDate: r.rented_date,
        returnDate: r.return_date,
        studentName: r.student_name,
        pcNumber: r.pc_number
      }
    });
  });
}

/* =========================
   Add new rental
========================= */
async function addRental() {
  const data = {
    student_name: document.getElementById("navn").value,
    pc_number: document.getElementById("pc_nummer").value,
    rented_date: document.getElementById("dato_lånt").value,
    return_date: document.getElementById("leverings_dato").value
  };

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  window.location.href = "/";
}

/* =========================
   Helpers
========================= */
function formatDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/* =========================
   Auto load + popup close
========================= */
if (document.getElementById("listDiv")) {
  loadRentals();
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".fc-event")) {
    popup.style.display = "none";
  }
});