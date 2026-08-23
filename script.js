

const SUPABASE_URL = "https://qzqibfgyqwrhjrgiyumg.supabase.co";
const SUPABASE_KEY = "sb_publishable_T0ydZcimtvIMUK29FuGb2g_VX5dUmpv";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Local fallback data (used if Supabase isn't reachable)
const mechanics = [
    {
        name: "Alex",
        location: "Riga, Latvia",
        car: "BMW",
        cars: ["BMW", "Mercedes-Benz", "Volkswagen"],
        rating: "4.9",
        price: "€15",
        status: "Available now",
        image: "🔧",
        phone: "+37100000001",
        experience: 5
    },
    {
        name: "Mike",
        location: "Riga, Latvia",
        car: "Toyota",
        cars: ["Toyota", "Ford", "Other"],
        rating: "4.8",
        price: "€12",
        status: "Available now",
        image: "🧰",
        phone: "+37100000002",
        experience: 3
    },
    {
        name: "Daniel",
        location: "Riga, Latvia",
        car: "BMW",
        cars: ["BMW", "Toyota", "Other"],
        rating: "4.7",
        price: "€10",
        status: "Busy",
        image: "👨‍🔧",
        phone: "+37100000003",
        experience: 8
    }
];

// Search mechanics: try Supabase first, fall back to local data if needed
async function searchMechanics() {
    const loc = document.querySelector("#location")?.value?.trim() ?? "";
    const car = document.querySelector("#car")?.value ?? "";
    const result = document.querySelector("#search-result");

    if (!result) return;

    if (loc === "" || car === "") {
        result.innerHTML = `
            <div class="error-message">
                ⚠️ Please enter your location and select your car.
            </div>
        `;
        return;
    }

    // Try Supabase table named "Bond" (this repo previously used that). Use ilike with % to match substrings.
    try {
        const { data: matches, error } = await supabaseClient
            .from("Bond")
            .select("*")
            .ilike("location", `%${loc}%`)
            .ilike("car", `%${car}%`);

        if (error) {
            console.warn("Supabase query error, falling back to local data:", error);
            renderResults(filterLocalMechanics(loc, car), car, loc);
            return;
        }

        if (!matches || matches.length === 0) {
            // no rows from supabase -> fallback to local
            renderResults(filterLocalMechanics(loc, car), car, loc);
            return;
        }

        // We have rows from Supabase — normalize them and render
        const normalized = matches.map(m => ({
            name: m.name || m.full_name || "Unknown Mechanic",
            location: m.location || "",
            car: m.car || (m.cars && m.cars[0]) || "Any car",
            cars: Array.isArray(m.cars) ? m.cars : (m.car ? [m.car] : []),
            rating: m.rating ?? 5,
            price: m.price ? (typeof m.price === 'number' ? `€${m.price}` : m.price) : "N/A",
            status: m.status || "Available now",
            phone: m.phone || "",
            experience: m.experience ?? 0,
            image: m.image || '🔧'
        }));

        renderResults(normalized, car, loc);
    } catch (err) {
        console.error("Unexpected error searching mechanics:", err);
        renderResults(filterLocalMechanics(loc, car), car, loc);
    }
}

function filterLocalMechanics(loc, car) {
    // very simple local filter: location substring and car in supported cars
    return mechanics.filter(m =>
        m.location.toLowerCase().includes(loc.toLowerCase()) && (m.car === car || m.cars.includes(car))
    );
}

function renderResults(items, car, loc) {
    const result = document.querySelector("#search-result");
    if (!result) return;

    if (!items || items.length === 0) {
        result.innerHTML = `
            <div class="error-message">
                😔 No mechanics found for ${car} in ${loc}.
            </div>
        `;
        return;
    }

    result.innerHTML = `
        <div class="results-header">
            <h3>🔧 Mechanics near you</h3>
            <p>${items.length} mechanic(s) found for ${car} in ${loc}</p>
        </div>

        <div class="mechanic-results">
            ${items.map(mechanic => {
                const safeName = String(mechanic.name || "").replace(/'/g, "\\'");
                const rating = mechanic.rating ?? 5;
                const price = mechanic.price ?? "N/A";
                const status = mechanic.status || "Available now";
                const phone = mechanic.phone || "";
                const cars = Array.isArray(mechanic.cars) ? mechanic.cars.join(", ") : (mechanic.car || "Any car");

                return `
                    <div class="mechanic-card">

                        <div class="mechanic-icon">${mechanic.image || '🔧'}</div>

                        <div class="mechanic-info">
                            <h3>${mechanic.name || "Unknown Mechanic"}</h3>
                            <p>📍 ${mechanic.location || "Location not provided"}</p>
                            <p>⭐ ${rating}/5</p>
                            <p>🚗 ${cars}</p>
                            <p>💰 ${price} / consultation</p>
                            <p>🛠️ ${mechanic.experience || 0} years experience</p>
                            <p class="status">${status === "Available now" ? "🟢 Available now" : "🟠 Currently busy"}</p>
                        </div>

                        <div class="mechanic-actions">
                            <button onclick="window.location.href='tel:${phone}'">📞 Contact</button>
                            <button onclick="showRequestForm('${safeName}')">
        🆘 Request Help
    </button>
                            <button onclick="startConsultation('${safeName}')">📹 Start Video Consultation</button>
                        </div>

                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// Registration: read form fields and insert into Supabase Bond table
async function registerMechanic() {
    const name = document.getElementById("mechanic-name")?.value?.trim();
    const location = document.getElementById("mechanic-location")?.value?.trim();
    const phone = document.getElementById("mechanic-phone")?.value?.trim();
    const priceRaw = document.getElementById("mechanic-price")?.value;
    const experienceRaw = document.getElementById("mechanic-experience")?.value;
    const car = document.getElementById("mechanic-car")?.value;

    if (!name || !location || !phone || !priceRaw || !experienceRaw || !car) {
        alert("⚠️ Please fill in all fields.");
        return;
    }

    const price = Number(priceRaw);
    const experience = Number(experienceRaw);

    // insert into Bond table
    try {
        const { data, error } = await supabaseClient
            .from("Bond")
            .insert([
                {
                    name: name,
                    location: location,
                    phone: phone,
                    price: price,
                    experience: experience,
                    car: car,
                    rating: 5,
                    status: "Available now"
                }
            ])
            .select();

        if (error) {
            console.error("Supabase insert error:", error);
            alert("❌ Registration failed: " + error.message);
            return;
        }

        alert(`🎉 Welcome to CARFIX, ${name}! Your profile has been created successfully.`);
        console.log("New mechanic created:", data);

        // After successful registration, refresh the search results (optional)
        searchMechanics();
    } catch (err) {
        console.error("Unexpected error during registration:", err);
        alert("❌ Registration failed (unexpected error). Check console for details.");
    }
}

function showRequestForm(mechanicName) {
    const result = document.querySelector("#search-result");

    if (!result) return;

    result.innerHTML = `
        <div class="registration-form">

            <button class="close-profile"
                onclick="searchMechanics()">
                ✕
            </button>

            <h2>🆘 Request Help</h2>

            <p>
                Request assistance from ${mechanicName}
            </p>

            <input
                id="request-driver-name"
                type="text"
                placeholder="👤 Your name"
            >

            <input
                id="request-driver-phone"
                type="tel"
                placeholder="📞 Phone number"
            >

            <input
                id="request-location"
                type="text"
                placeholder="📍 Your current location"
            >

            <textarea
                id="request-problem"
                placeholder="🔧 Describe your car problem..."
                rows="5">
            </textarea>

            <button onclick="submitRequest('${mechanicName}')">
                🆘 Send Request
            </button>

        </div>
    `;
}

async function submitRequest(mechanicName) {

    const driverName =
        document.querySelector("#request-driver-name")?.value.trim() ?? "";

    const driverPhone =
        document.querySelector("#request-driver-phone")?.value.trim() ?? "";

    const location =
        document.querySelector("#request-location")?.value.trim() ?? "";

    const problem =
        document.querySelector("#request-problem")?.value.trim() ?? "";

    if (!driverName || !driverPhone || !location || !problem) {

        alert("⚠️ Please fill in all fields.");

        return;
    }

    const { data, error } = await supabaseClient
        .from("Requests")
        .insert([
            {
                driver_name: driverName,
                driver_phone: driverPhone,
                location: location,
                problem: problem,
                status: "Pending"
            }
        ])
        .select();

    if (error) {

        console.error(error);

        alert(
            "❌ Request failed:\n\n" +
            error.message
        );

        return;
    }

    alert(
        `✅ Request sent successfully!\n\n` +
        `Mechanic: ${mechanicName}`
    );

    console.log("New request:", data);
}

function showRegistration() {
    const result = document.querySelector("#search-result");
    if (!result) return;

    result.innerHTML = `
        <div class="registration-form">
            <button class="close-profile" onclick="searchMechanics()">✕</button>
            <h2>🔧 Mechanic Registration</h2>
            <p>Join CARFIX and start helping drivers.</p>
            <input id="mechanic-name" type="text" placeholder="👤 Your name">
            <input id="mechanic-location" type="text" placeholder="📍 Your location">
            <input id="mechanic-phone" type="tel" placeholder="📞 Phone number">
            <select id="mechanic-car">
                <option value="">Select your car specialties</option>
                <option>BMW</option>
                <option>Mercedes-Benz</option>
                <option>Volkswagen</option>
                <option>Toyota</option>
                <option>Ford</option>
                <option>Other</option>
            </select>
            <input id="mechanic-price" type="number" placeholder="💰 Consultation price (€)">
            <input id="mechanic-experience" type="number" placeholder="🛠️ Years of experience">
            <button onclick="registerMechanic()">Create Mechanic Profile</button>
        </div>
    `;
}

function startConsultation(name) {
    alert(`Video consultation with ${name} will be available soon.`);
}

async function testSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from("Bond")
            .select("*")
            .limit(1);

        if (error) {
            console.error("Supabase error:", error);
            // don't alert the user repeatedly in production
            return false;
        }

        console.log("Supabase connected (Bond):", data);
        return true;
    } catch (err) {
        console.error('Error testing Supabase:', err);
        return false;
    }
}

// Run a quick supabase connectivity test on load
(async () => {
    const ok = await testSupabase();
    if (!ok) console.warn('Supabase not reachable — the app will use local fallback data.');
})();


});function openMechanicApp() {
    showRegistration();
}
