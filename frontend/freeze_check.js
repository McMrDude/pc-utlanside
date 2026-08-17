async function checkServer() {

    console.log("Checking server...");

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 5000);

    try {

        const response = await fetch("/health", {
            cache: "no-store",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.log("Server returned an error.");
            location.reload();
            return;
        }

        console.log("Server is working.");

    } catch (err) {

        clearTimeout(timeout);

        console.log("Server did not respond.");

        location.reload();
    }
}


document.addEventListener("visibilitychange", () => {

    if (document.visibilityState !== "visible") {
        return;
    }

    checkServer();

});

let lastServerCheck = 0;

document.addEventListener("visibilitychange", () => {

    if (document.visibilityState !== "visible") {
        return;
    }

    const now = Date.now();

    // Don't check if we checked less than 30 seconds ago
    if (now - lastServerCheck < 30000) {
        return;
    }

    lastServerCheck = now;

    checkServer();
});