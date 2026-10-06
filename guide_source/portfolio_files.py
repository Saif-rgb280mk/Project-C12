"""The portfolio website built in Part 6 (also used to make the screenshot)."""

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sara | Developer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="navbar">
        <a href="#" class="logo">Sara.dev</a>
        <nav>
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
            <button id="theme-toggle">Dark mode</button>
        </nav>
    </header>

    <main>
        <section class="hero">
            <h1>Hi, I'm Sara.</h1>
            <p>I'm learning to code, and I love building things for the web.</p>
            <a href="#projects" class="button">See my work</a>
        </section>

        <section id="about">
            <h2>About me</h2>
            <p>I started coding with Python. Now I build websites with
               HTML, CSS and JavaScript.</p>
            <ul class="skills">
                <li>Python</li>
                <li>HTML</li>
                <li>CSS</li>
                <li>JavaScript</li>
                <li>Git</li>
            </ul>
        </section>

        <section id="projects">
            <h2>Projects</h2>
            <div class="grid">
                <article class="card">
                    <h3>Guessing Game</h3>
                    <p>A Python game where you guess a secret number.</p>
                    <a href="https://github.com/">View code</a>
                </article>
                <article class="card">
                    <h3>To-Do App</h3>
                    <p>A to-do list that saves your tasks to a file.</p>
                    <a href="https://github.com/">View code</a>
                </article>
                <article class="card">
                    <h3>Contact Book</h3>
                    <p>An object-oriented app with search and JSON storage.</p>
                    <a href="https://github.com/">View code</a>
                </article>
            </div>
        </section>

        <section id="contact">
            <h2>Contact</h2>
            <form id="contact-form">
                <input type="text" id="name" placeholder="Your name" required>
                <input type="email" id="email" placeholder="Your email" required>
                <textarea id="message" rows="4" placeholder="Your message" required></textarea>
                <button type="submit" class="button">Send</button>
            </form>
            <p id="form-status"></p>
        </section>
    </main>

    <footer>
        <p>&copy; <span id="year"></span> Sara. Built from scratch.</p>
    </footer>

    <script src="script.js"></script>
</body>
</html>"""

STYLE_CSS = """/* ---------- reset and colours ---------- */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

:root {
    --bg: #ffffff;
    --text: #1f2937;
    --muted: #6b7280;
    --card: #f3f4f6;
    --accent: #2563eb;
}

body.dark {
    --bg: #0f172a;
    --text: #e5e7eb;
    --muted: #94a3b8;
    --card: #1e293b;
    --accent: #60a5fa;
}

body {
    font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    transition: background 0.3s, color 0.3s;
}

/* ---------- navigation ---------- */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 8%;
}

.logo {
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--accent);
    text-decoration: none;
}

nav a {
    margin-left: 20px;
    color: var(--text);
    text-decoration: none;
}

nav a:hover {
    color: var(--accent);
}

#theme-toggle {
    margin-left: 20px;
    padding: 6px 14px;
    border: 1px solid var(--muted);
    border-radius: 20px;
    background: none;
    color: var(--text);
    cursor: pointer;
}

/* ---------- sections ---------- */
section {
    padding: 60px 8%;
}

.hero {
    padding-top: 90px;
    padding-bottom: 90px;
}

.hero h1 {
    font-size: 3rem;
}

.hero p {
    margin: 10px 0 30px;
    font-size: 1.25rem;
    color: var(--muted);
}

h2 {
    margin-bottom: 20px;
    font-size: 2rem;
}

.button {
    display: inline-block;
    padding: 12px 28px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-size: 1rem;
    text-decoration: none;
    cursor: pointer;
}

.button:hover {
    opacity: 0.85;
}

.skills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    list-style: none;
}

.skills li {
    padding: 6px 16px;
    border-radius: 20px;
    background: var(--card);
}

/* ---------- project cards ---------- */
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.card {
    padding: 24px;
    border-radius: 12px;
    background: var(--card);
    transition: transform 0.2s;
}

.card:hover {
    transform: translateY(-5px);
}

.card p {
    margin: 8px 0 12px;
}

.card a {
    color: var(--accent);
}

/* ---------- contact form ---------- */
form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 500px;
}

input,
textarea {
    padding: 12px;
    border: 1px solid var(--muted);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
}

#form-status {
    margin-top: 12px;
    color: var(--accent);
}

footer {
    padding: 30px;
    text-align: center;
    color: var(--muted);
}

/* ---------- phones and small screens ---------- */
@media (max-width: 700px) {
    .navbar {
        flex-direction: column;
        gap: 12px;
    }

    nav {
        text-align: center;
    }

    nav a,
    #theme-toggle {
        margin: 4px 6px;
    }

    .hero {
        padding-top: 50px;
        padding-bottom: 50px;
    }

    .hero h1 {
        font-size: 2.2rem;
    }

    .grid {
        grid-template-columns: 1fr;
    }
}"""

SCRIPT_JS = """// 1. Dark mode button
const toggle = document.querySelector("#theme-toggle");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
}

toggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);   // remember the choice
});

applyTheme(localStorage.getItem("theme") || "light");

// 2. Put the current year in the footer
document.querySelector("#year").textContent = new Date().getFullYear();

// 3. Contact form (there is no server yet, so we just say thanks)
const form = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

form.addEventListener("submit", (event) => {
    event.preventDefault();   // stop the page from reloading
    const name = document.querySelector("#name").value;
    formStatus.textContent = `Thanks, ${name}! (This demo doesn't send messages yet.)`;
    form.reset();
});"""
