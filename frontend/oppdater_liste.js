const API_URL = "/rentals";

const listPage = document.getElementById("listPage");
const calendarEl = document.getElementById("calendar");
let calendarInstance;

/* ================= POPUP ================= */

const popup = document.createElement("div");
popup.id = "eventPopup";
document.body.appendChild(popup);

/* ================= NAV ================= */

function openList() {
    listPage.style.display = "block";
    calendarEl.style.display = "none";
    popup.style.display = "none";
}

function openCalendar() {
    listPage.style.display = "none";
    calendarEl.style.display = "block";
    popup.style.display = "none";

    if (!calendarInstance) {
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            height: "auto",
            expandRows: true,

            eventClick(info) {
                const e = info.event;

                popup.innerHTML = `
                    <strong>${e.extendedProps.studentName} - PC ${e.extendedProps.pcNumber}</strong><br>
                    Rented: ${formatDate(e.extendedProps.rentedDate)}<br>
                    Return: ${formatDate(e.extendedProps.returnDate)}<br><br>
                    <button class="delete-btn" id="popupDelete">Delete</button>
                `;

                popup.style.left = info.jsEvent.pageX + 10 + "px";
                popup.style.top = info.jsEvent.pageY + 10 + "px";
                popup.style.display = "block";

                document.getElementById("popupDelete").onclick = async () => {
                    if (!confirm("Delete this rental?")) return;
                    await fetch(`${API_URL}/${e.extendedProps.id}`, { method: "DELETE" });
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

/* ================= LIST ================= */

async function loadRentals() {
    const res = await fetch(API_URL);
    const rentals = await res.json();

    const listDiv = document.getElementById("listDiv");
    listDiv.innerHTML = "";

    const headers = [
        "Status", "Elev navn", "PC nummer",
        "Dato lånet", "Leverings dato", "Slett"
    ];

    headers.forEach(h => {
        const el = document.createElement("h4");
        el.textContent = h;
        listDiv.appendChild(el);
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    rentals.forEach(r => {
        const returnTime = new Date(r.return_date).getTime();
        const daysRemaining = Math.ceil((returnTime - today) / 86400000) - 1;

        const cells = [
            daysRemaining,
            r.student_name,
            r.pc_number,
            formatDate(r.rented_date),
            formatDate(r.return_date)
        ];

        cells.forEach((val, i) => {
            const cell = document.createElement("h5");

            if (i === 0) {
                if (daysRemaining < 0) { cell.textContent = "Overdue"; cell.style.background = "darkred"; }
                else if (daysRemaining === 0) { cell.textContent = "Today"; cell.style.background = "red"; }
                else if (daysRemaining <= 5) { cell.textContent = `Days: ${val}`; cell.style.background = "yellow"; }
                else { cell.textContent = `Days: ${val}`; cell.style.background = "lightgreen"; }
            } else {
                cell.textContent = val;
            }

            listDiv.appendChild(cell);
        });

        const del = document.createElement("button");
        del.className = "delete-btn";
        del.textContent = "✕";
        del.onclick = async () => {
            if (!confirm("Delete this rental?")) return;
            await fetch(`${API_URL}/${r.id}`, { method: "DELETE" });
            loadRentals();
            if (calendarInstance) loadCalendarEvents();
        };
        listDiv.appendChild(del);
    });
}

/* ================= CALENDAR ================= */

async function loadCalendarEvents() {
    const res = await fetch(API_URL);
    const rentals = await res.json();

    calendarInstance.getEvents().forEach(e => e.remove());

    const today = new Date();
    today.setHours(0,0,0,0);

    rentals.forEach(r => {
        const returnDate = new Date(r.return_date);
        const daysRemaining = Math.ceil((returnDate - today) / 86400000) - 1;

        let color = "lightgreen";
        if (daysRemaining < 0) color = "darkred";
        else if (daysRemaining === 0) color = "red";
        else if (daysRemaining <= 5) color = "yellow";

        calendarInstance.addEvent({
            start: r.return_date,
            display: "background",
            color,
            extendedProps: {
                id: r.id,
                studentName: r.student_name,
                pcNumber: r.pc_number,
                rentedDate: r.rented_date,
                returnDate: r.return_date
            }
        });
    });
}

/* ================= UTIL ================= */

function formatDate(d) {
    const date = new Date(d);
    return `${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${date.getFullYear()}`;
}

if (document.getElementById("listDiv")) {
    loadRentals();
}

document.addEventListener("click", e => {
    if (!e.target.closest(".fc-event")) popup.style.display = "none";
});