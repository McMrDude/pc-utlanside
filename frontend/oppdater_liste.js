const API_URL = "/rentals";

const list = document.getElementById("listPage");
const calendar = document.getElementById("calendar");
let calendarInstance;

// Popup div for event details
const popup = document.createElement("div");
popup.id = "eventPopup";
popup.style.position = "absolute";
popup.style.backgroundColor = "white";
popup.style.border = "1px solid black";
popup.style.padding = "10px";
popup.style.display = "none";
popup.style.zIndex = "1000";
document.body.appendChild(popup);

// Open/Close views
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
            initialView: 'dayGridMonth',
            height: "auto",  // fills container
            expandRows: true,
            events: [], // will populate after fetching rentals
            eventClick: function(info) {
                const event = info.event;
                const rentedDate = event.extendedProps.rentedDate;
                const returnDate = event.start;

                // Fill popup with info
                popup.innerHTML = `
                    <strong>${event.title}</strong><br>
                    Rented: ${formatDate(rentedDate)}<br>
                    Return: ${formatDate(returnDate)}
                `;
                
                // Position near mouse
                popup.style.left = info.jsEvent.pageX + 10 + "px";
                popup.style.top = info.jsEvent.pageY + 10 + "px";
                popup.style.display = "block";
            }
        });
        calendarInstance.render();

        // Load rentals into calendar
        loadCalendarEvents();
    } else {
        calendarInstance.updateSize();
    }
}

// Load list view
async function loadRentals() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const res = await fetch(API_URL);
    const rentals = await res.json();

    const listDiv = document.getElementById("listDiv");
    listDiv.innerHTML = "";

    const headers = [
        `<h4>Status</h4>`,
        `<h4>Elev navn</h4>`,
        `<h4>PC nummer</h4>`,
        `<h4>Dato lånet</h4>`,
        `<h4 style="border-right: none;">Leverings dato</h4>`
    ];
    
    headers.forEach(r => {
        const row = document.createElement("div");
        row.innerHTML = r;
        listDiv.appendChild(row);
    });

    rentals.forEach(r => {
        let e = 0;
        const return_date = new Date(r.return_date).getTime();
        const daysRemaining = Math.ceil((return_date - today) / (1000*60*60*24)) - 1;

        const rows = [
            `Dager til levering: ${daysRemaining.toString()}`,
            `${r.student_name}`,
            `${r.pc_number}`,
            `${formatDate(r.rented_date)}`,
            `${formatDate(r.return_date)}`
        ];

        rows.forEach(t => {
            const row = document.createElement("h5"); 
            row.style.width = "100%";
            row.innerHTML = t;

            if (e === 0) {
                row.style.backgroundColor = "green";
                if (daysRemaining < 0) row.style.backgroundColor = "darkred", row.innerHTML = "Overdue";
                else if (daysRemaining === 0) row.style.backgroundColor = "red", row.innerHTML = "Today";
                else if (daysRemaining <= 5) row.style.backgroundColor = "yellow";
                else row.style.backgroundColor = "lightgreen";
            }

            e = 1;
            listDiv.appendChild(row);
        });
    });
}

// Load calendar events from rentals
async function loadCalendarEvents() {
    const res = await fetch(API_URL);
    const rentals = await res.json();

    // Clear existing events
    calendarInstance.getEvents().forEach(e => e.remove());

    rentals.forEach(r => {
        const returnDate = new Date(r.return_date);
        const today = new Date();
        today.setHours(0,0,0,0);
        const daysRemaining = Math.ceil((returnDate - today) / (1000*60*60*24)) - 1;

        let color = 'green';
        if (daysRemaining < 0) color = 'darkred';
        else if (daysRemaining === 0) color = 'red';
        else if (daysRemaining <= 5) color = 'yellow';

        calendarInstance.addEvent({
            title: `${r.student_name} - PC ${r.pc_number}`,
            start: returnDate.toISOString().split('T')[0],
            display: 'background',  // <-- this makes it fill the cell
            color: color
        });
    });
}

// Add new rental
async function addRental() {
    const data = {
        student_name: document.getElementById("navn").value,
        pc_number: document.getElementById("pc_nummer").value,
        rented_date: document.getElementById("dato_lånt").value,
        return_date: document.getElementById("leverings_dato").value
    };

    await fetch(API_URL, {
        method: "POST",
        headers: { "content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    window.location.href = "/";
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Auto-load list
if (document.getElementById("listDiv")) {
    loadRentals();
}

// Hide popup if clicking outside
document.addEventListener("click", function(e) {
    if (!e.target.closest(".fc-event")) {
        popup.style.display = "none";
    }
});