const API_URL = "/rentals";

let allRentals = [];

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
  document.getElementById("pcPage").style.display = "none";
}

async function openCalendar() {
  list.style.display = "none";
  calendar.style.display = "block";
  popup.style = "display: none; border: 1px solid black; background-color: rgb(197, 197, 197); padding: 10px; margin-top: 10px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;";
  document.getElementById("pcPage").style.display = "none";
  
  const res = await fetch("/rentals", {
    credentials: "include"
  });
  const rentals = await res.json();

  if (!calendarInstance) {
    calendarInstance = new FullCalendar.Calendar(calendar, {
      initialView: "dayGridMonth",
      height: "auto",
      expandRows: true,
      events: [],

      eventClick: function (info) {
        popup.innerHTML = "";
        const event = info.event;
        const clickedDate = event.startStr;

        const sameDayRentals = rentals.filter(r =>
          r.return_date.split("T")[0] === clickedDate
        );

        sameDayRentals.forEach(r => {
          const rental = document.createElement("div");
          rental.style = "background-color: lightgray; padding: 5px; margin-bottom: 5px; border-radius: 5px;";
          rental.innerHTML = `
            <strong>
              ${r.student_name} - PC ${r.pc_number}
            </strong><br>
            Rented: ${formatDate(r.rented_date)}<br>
            Return: ${formatDate(r.return_date)}<br><br>
            <button class="popupDeleteBtn">Slett</button>
          `;

            popup.appendChild(rental);
        });

        popup.style.display = "block";

        document.getElementsByClassName("popupDeleteBtn")[0].onclick = async () => {
          if (!confirm("Slett denne leieavtalen?")) return;

          document.querySelectorAll('.Row' + currentRowID).forEach(el => el.remove());

          const PCres = await fetch("/pcs/status");
          const pcs = await PCres.json();

          pcs.forEach(async pc => {
            if (pc.pc_number === r.pc_number) {
              pcNummer = pc.pc_number;
            }
          });

          await fetch("/return", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
              id: r.id,
              pcNumber: pcNummer
            })
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
  const res = await fetch(API_URL);
  allRentals = await res.json();

  renderRentals(allRentals);
}

function renderRentals(rentals) {
  let rowID = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let pcNummer = "";

  const listDiv = document.getElementById("listDiv");
  listDiv.innerHTML = "";

  const headers = [
    "<h4 style='border-top: 1px solid black;'>Status</h4>",
    "<h4 style='border-top: 1px solid black;'>Elev navn</h4>",
    "<h4 style='border-top: 1px solid black;'>PC nummer</h4>",
    "<h4 style='border-top: 1px solid black;'>Dato lånet</h4>",
    "<h4 style='border-top: 1px solid black;'>Leverings dato</h4>",
    '<h4 style="border-right: none; border-top: 1px solid black;">Levert?</h4>'
  ];

  headers.forEach(h => {
    const row = document.createElement("div");
    row.innerHTML = h;
    listDiv.appendChild(row);
  });

  rentals.forEach(r => {
    if (r.status === "active") {
      let firstCell = true;

      const returnDate = new Date(r.return_date).getTime();
      const daysRemaining =
        Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

      const rows = [
        `Dager til levering: ${daysRemaining}`,
        r.student_name + "(" + r.student_email + ")",
        r.pc_number,
        formatDate(r.rented_date),
        formatDate(r.return_date)
      ];

      const currentRowID = rowID; // Capture current rowID for closure

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

        row.className = "Row" + currentRowID;

        listDiv.appendChild(row);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.id = "delete-btn";
      deleteBtn.className = "Row" + currentRowID;
      deleteBtn.textContent = "✓";

      deleteBtn.onclick = async () => {
        if (!confirm("Er PCen levert inn?")) return;

        // Replace 'your-class-name' with the actual class you want to delete
        document.querySelectorAll('.Row' + currentRowID).forEach(el => el.remove());

        const PCres = await fetch("/pcs/status");
        const pcs = await PCres.json();

        pcs.forEach(async pc => {
          if (pc.pc_number === r.pc_number) {
            pcNummer = pc.pc_number;
          }
        });

        await fetch("/return", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            id: r.id,
            pcNumber: pcNummer
          })
        });


        loadRentals();
        if (calendarInstance) loadCalendarEvents();
      };

      listDiv.appendChild(deleteBtn);

      rowID++;
    };
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
    if (r.status === "active") {
      const returnDate = new Date(r.return_date);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysRemaining =
        Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

      let color = "green";
      if (daysRemaining < 0) color = "darkred";
      else if (daysRemaining === 0) color = "red";
      else if (daysRemaining <= 5) color = "orange";

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
    };
  });
}

/* =========================
   Add new rental
========================= */
async function addRental() {
  const studentName = document.getElementById("navn").value.trim();
  const pcNumber = document.getElementById("pc_nummer").value;
  const rentedDate = document.getElementById("dato_lånt").value;
  const returnDate = document.getElementById("leverings_dato").value;

  if (!studentName || !pcNumber || !rentedDate || !returnDate) {
    alert("Vennligst fyll inn alle feltene");
    return;
  }

  const data = {
    student_name: studentName,
    pc_number: pcNumber,
    rented_date: rentedDate,
    return_date: returnDate
  };

  await fetch("/rentals", {
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

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();

    const filtered = allRentals.filter(r => {
      return (
        r.student_name.toLowerCase().includes(query) ||
        r.student_email.toLowerCase().includes(query) ||
        r.pc_number.toLowerCase().includes(query) ||
        formatDate(r.rented_date).includes(query) ||
        formatDate(r.return_date).includes(query)
      );
    });

    renderRentals(filtered);
  });
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".fc-event")) {
    popup.style.display = "none";
  }
});

/* =========================
   PC PAGE
========================= */

function openPCs() {
  document.getElementById("listPage").style.display = "none";
  document.getElementById("calendar").style.display = "none";
  document.getElementById("pcPage").style.display = "block";
  loadPCs();
}

let currentRequestId = null;

async function loadPCs() {
  const PCres = await fetch("/pcs/status");
  const pcs = await PCres.json();

  const pcDiv = document.getElementById("pcList");
  pcDiv.innerHTML = "";

  const headers = [
    "PC nummer",
    "Modell",
    "Status",
    "Edit"
  ]

  headers.forEach(h => {
    const row = document.createElement("div");
    row.textContent = h
    pcDiv.appendChild(row)
  })

  document.getElementById("pcSelect").replaceChildren();
  pcs.forEach(pc => {
    if (pc.status === "ledig") {
      const selectOption = document.createElement("option");
      selectOption.value = pc.pc_number;
      selectOption.textContent = `PC ${pc.pc_number} - ${pc.model}`;
      document.getElementById("pcSelect").appendChild(selectOption);
    }

    const number = document.createElement("div");
    const model = document.createElement("div");
    const status = document.createElement("div");
    const editDiv = document.createElement("div");
    number.className = "pcDiv";
    model.className = "pcDiv";
    status.className = "pcDiv";
    editDiv.className = "pcDiv";

    number.textContent = `${pc.pc_number}`;

    pcDiv.appendChild(number);

    model.textContent = `${pc.model}`;

    pcDiv.appendChild(model);

    status.textContent =
      pc.status === "lånt"
        ? `🔴 Lånt til ${pc.user_name} (${pc.user_email})`
        : "🟢 Tilgjengelig";

    pcDiv.appendChild(status);

    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "⚙️";
    edit.onclick = () => {
      openEditPopup(pc);
    };

    editDiv.appendChild(edit);

    pcDiv.appendChild(edit);
  });

  // 👇 FETCH REQUESTS
  const res = await fetch("/requests", {
    credentials: "include"
  });
  const requests = await res.json();

  const reqDiv = document.getElementById("requestList");
    reqDiv.innerHTML = "";

  if (requests.length === 0) {
    const noReq = document.createElement("div");
    noReq.textContent = "Ingen ventende forespørsler";
    reqDiv.appendChild(noReq);
    return;
  }
  else {
    // headers
    ["Bruker", "Datoer", "Status", "Godkjenn?"].forEach(h => {
      const row = document.createElement("div");
      row.textContent = h;
      reqDiv.appendChild(row);
    });

    // 👇 LOOP THROUGH REQUESTS
    requests.forEach(req => {
      const bruker = document.createElement("div");
      const date = document.createElement("div");
      const status = document.createElement("div");
      const decide = document.createElement("div");

      bruker.className = "pcDiv";
      date.className = "pcDiv";
      status.className = "pcDiv";
      decide.className = "pcDiv";

      bruker.textContent = `${req.student_name} (${req.student_email})`;
      date.textContent = `${req.start_date.split("T")[0]} → ${req.return_date.split("T")[0]}`;

      status.textContent =
        req.status === "pending"
          ? "⏳ Venter på godkjenning"
          : req.status === "approved"
          ? "✅ Godkjent"
          : "❌ Avvist";

      const shit = document.createElement("div");
      shit.className = "shit";
      const buttonYes = document.createElement("button");
      buttonYes.className = "decideButton";
      buttonYes.id = "yesButton";
      buttonYes.textContent = "✓";
      buttonYes.onclick = () => {
        currentRequestId = req.id;
        document.getElementById("acceptRequest").style.display = "block";
      };
      const buttonNo = document.createElement("button");
      buttonNo.className = "decideButton";
      buttonNo.id = "noButton";
      buttonNo.textContent = "X";
      buttonNo.onclick = () => {
        currentRequestId = req.id;
        rejectRequest();
      };
      shit.appendChild(buttonYes)
      shit.appendChild(buttonNo)
      
      decide.appendChild(shit)

      reqDiv.appendChild(bruker);
      reqDiv.appendChild(date);
      reqDiv.appendChild(status);
      reqDiv.appendChild(decide);
    });
  }
}

async function addPC() {
  const pcNumberInput = document.getElementById("pcNumber");
  const modelInput = document.getElementById("pcModel");

  const data = {
    pc_number: pcNumberInput.value,
    model: modelInput.value
  };

  if (!data.pc_number || !data.model) {
    alert("Vennligst fyll inn begge feltene");
    return;
  }

  await fetch("/pcs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  // ✅ CLEAR INPUTS AFTER SUCCESS
  pcNumberInput.value = "";
  modelInput.value = "";

  loadPCs();
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();

  if (!user) {
    alert("Du må være logget inn for å se denne siden");
    window.location.href = "/login.html";
    return;
  }

  // Optional: admin-only UI
  if (user.role !== "admin") {
    const pcTab = document.getElementById("pcTab");
    if (pcTab) pcTab.style.display = "none";
  }
});


async function approveRequest() {
  const pcNumber = document.getElementById("pcSelect").value;

  const res = await fetch(`/rentals`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      requestId: currentRequestId,
      pcNumber
    }),
    credentials: "include"
  });

  const data = await res.json();
  console.log(data);

  loadPCs();
}

async function rejectRequest() {
  const res = await fetch(`/request-decline`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      requestId: currentRequestId
    }),
    credentials: "include"
  });

  const data = await res.json();
  console.log(data);

  loadPCs();
}

function openEditPopup(pc) {
  document.getElementById("editPC").style.display = "block";

  document.getElementById("editPcNumber").value = pc.pc_number;
  document.getElementById("editPcModel").value = pc.model;

  // 👇 THIS is the important part
  document.getElementById("editPC").dataset.id = pc.id;
}
async function savePC(e) {
  e.preventDefault();

  const id = document.getElementById("editPC").dataset.id;
  const pc_number = document.getElementById("editPcNumber").value;
  const model = document.getElementById("editPcModel").value;

  const res = await fetch("/submit-changes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      pc_number,
      model
    })
  });

  const data = await res.json();
  console.log(data);

  document.getElementById("editPC").style.display = "none";

  loadPCs();
}