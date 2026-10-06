"""Part 9: Your path forward."""


def build(b):
    b.part(
        "Part 9",
        "Your path forward",
        "Careers in tech, a 12-month study plan, 30 project ideas, the best free resources, and how to use AI to learn faster.",
        [
            "The main careers in software and what each one needs",
            "A month-by-month plan for your first year",
            "30 project ideas, from beginner to advanced",
            "The best free courses, websites and communities",
            "How to use AI assistants to learn, without cheating yourself",
            "How to build a portfolio and get your first opportunity",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("Career paths in software", label="Lesson 59")
    b.table(
        ["Path", "What you build", "Languages", "Key tools and skills"],
        [
            ["**Front-end developer**", "The parts of websites and web apps that users see", "HTML, CSS, JavaScript, TypeScript", "React (or Vue/Svelte), Tailwind, accessibility, Figma"],
            ["**Back-end developer**", "Servers, APIs, databases, business logic", "Python, JavaScript, Java, C#, Go", "SQL, PostgreSQL, REST APIs, Docker, security"],
            ["**Full-stack developer**", "Both front-end and back-end", "JavaScript/TypeScript + one backend language", "React + Node.js or Django; databases; deployment"],
            ["**Mobile developer**", "iPhone and Android apps", "Swift, Kotlin, Dart, JavaScript", "SwiftUI, Jetpack Compose, Flutter, React Native"],
            ["**Game developer**", "Games for PC, console, mobile and the web", "C#, C++, GDScript, Lua", "Unity, Unreal, Godot, maths, physics"],
            ["**Data analyst**", "Reports and dashboards that answer business questions", "SQL, Python or R", "Excel, pandas, Power BI or Tableau, statistics"],
            ["**Data scientist / ML engineer**", "Models that predict, recommend and classify", "Python", "NumPy, pandas, scikit-learn, PyTorch, statistics, linear algebra"],
            ["**AI engineer**", "Products built on AI models: assistants, agents, search", "Python, TypeScript", "LLM APIs, prompt design, evaluation, vector databases"],
            ["**Cybersecurity**", "Protecting systems; finding weaknesses legally", "Python, Bash, some C", "Networking, Linux, Wireshark, Burp Suite, CTF practice"],
            ["**DevOps / cloud engineer**", "The systems that build, ship and run software", "Bash, Python, Go", "Linux, Docker, Kubernetes, AWS/Azure/GCP, CI/CD, Terraform"],
            ["**Embedded / robotics**", "Software inside devices, cars and robots", "C, C++, Rust, MicroPython", "Arduino, Raspberry Pi, electronics"],
            ["**QA / test engineer**", "Automated tests that keep products working", "Python, JavaScript, Java", "pytest, Playwright, Selenium, CI"],
        ],
        widths=[1.8, 2.3, 2.1, 2.8], font_size=8.4,
    )
    b.tip("You don't need to choose now. Finish Parts 2 to 6, build a few projects, and notice which ones you **enjoyed** most. Enjoyment is the best predictor of how far you'll go.")
    b.h3("Do I need a university degree?")
    b.p("A computer science degree helps, especially for big companies and for AI research, and it teaches valuable theory. But many developers are **self-taught** or come from short courses. What every employer wants to see is the same: **proof that you can build things**. That means projects, a GitHub profile and the ability to explain your code.")

    # ------------------------------------------------------------------
    b.lesson("Your 12-month roadmap", label="Lesson 60")
    b.table(
        ["Month", "Focus", "By the end you have"],
        [
            ["**1**", "Parts 0–2: Python basics", "The guessing game, and Quiz 1 passed"],
            ["**2**", "Part 3: lists, dicts, functions, files", "The to-do app, and Quiz 2 passed"],
            ["**3**", "Part 4 + Git (Lesson 26)", "The contact book, on GitHub, and Quiz 3 passed"],
            ["**4**", "Part 5: terminal, APIs, SQL, security", "A Python program that uses a real API and a SQLite database"],
            ["**5**", "Part 6: HTML and CSS", "2–3 small, responsive web pages"],
            ["**6**", "Part 6: JavaScript", "Your portfolio website, live online"],
            ["**7**", "Part 7: apps (choose web app, mobile or games)", "Your first app running on your phone or computer"],
            ["**8–9**", "Choose a path (Lesson 59) and go deep", "2 medium projects in that path"],
            ["**10–11**", "One bigger project, done properly", "A project with tests, a README, a live demo and real users (even 5 friends!)"],
            ["**12**", "Polish and share", "A clean GitHub, an updated portfolio, and your first contribution to open source or a hackathon"],
        ],
        widths=[0.9, 3.6, 4.2],
    )
    b.h3("A weekly routine that works")
    b.table(
        ["Day", "What to do (30–60 minutes)"],
        [
            ["Mon–Thu", "**10 min** review yesterday's topic · **25 min** a new lesson with exercises · **10 min** work on your project"],
            ["Fri", "A coding puzzle (Exercism, Codewars), and fix something in an old project"],
            ["Weekend", "**Build.** A longer session on your project. This is where skills really grow"],
            ["Every 2 weeks", "Look back: what did I learn? What confused me? Write it down"],
        ],
        widths=[1.6, 6.6],
    )
    b.key("Consistency beats intensity. **One hour every day for a year** turns a complete beginner into someone who can build real software.")

    # ------------------------------------------------------------------
    b.lesson("30 project ideas, from easy to advanced", label="Lesson 61")
    b.h3("Beginner (Parts 2–3)")
    b.table(
        ["Project", "Practises"],
        [
            ["Calculator with a menu", "input, if/elif, functions"],
            ["Rock, paper, scissors against the computer", "random, if, loops, score"],
            ["Unit converter (km/miles, °C/°F, kg/lb)", "functions, maths"],
            ["Times-table quiz with a score", "loops, random, input"],
            ["Password generator and strength checker", "strings, random, conditions"],
            ["Hangman", "strings, lists, loops"],
            ["Mad Libs story generator", "input, f-strings"],
            ["Dice-rolling statistics", "random, dictionaries, counting"],
            ["Countdown timer", "time module, loops"],
            ["Grade book (average, highest, lowest)", "lists, functions, files"],
        ],
        widths=[4.5, 3.5],
    )
    b.h3("Intermediate (Parts 4–7)")
    b.table(
        ["Project", "Practises"],
        [
            ["Expense tracker with CSV export and a chart", "files, dictionaries, matplotlib"],
            ["Weather app using a free API", "requests/fetch, JSON, error handling"],
            ["Flashcard study app", "classes, JSON, random"],
            ["Browser quiz game", "HTML, CSS, JavaScript, the DOM"],
            ["Web scraper that collects headlines", "requests, BeautifulSoup"],
            ["Snake or Breakout in Pygame", "game loop, collisions"],
            ["Discord or Telegram bot", "APIs, events"],
            ["Habit tracker as a PWA", "JavaScript, localStorage, manifest"],
            ["Notes app with Flask and SQLite", "backend, SQL, HTML forms"],
            ["Mobile to-do app with Expo", "React Native, state, AsyncStorage"],
        ],
        widths=[4.5, 3.5],
    )
    b.h3("Advanced (after this guide)")
    b.table(
        ["Project", "Practises"],
        [
            ["Blog with user accounts, comments and admin", "Django or Next.js, auth, database"],
            ["Real-time chat app", "WebSockets, backend, deployment"],
            ["Online shop with cart and test payments", "full stack, Stripe test mode, security"],
            ["Data dashboard for a public dataset", "pandas, charts, a web framework"],
            ["REST API with tests and CI", "FastAPI or Express, pytest/Jest, GitHub Actions"],
            ["Mobile app published to a store", "the full publishing process (Lesson 49)"],
            ["Machine learning model (for example, predicting house prices)", "scikit-learn, data cleaning, evaluation"],
            ["Multiplayer browser game", "JavaScript, canvas, WebSockets"],
            ["An AI assistant for one specific task", "LLM APIs, prompt design, backend"],
            ["A clone of an app you love (simplified)", "everything!"],
        ],
        widths=[4.5, 3.5],
    )
    b.tip("The best project is one **you or someone you know would actually use**. Solving a real problem keeps you motivated, and it makes a great story in interviews.")

    # ------------------------------------------------------------------
    b.lesson("The best free learning resources", label="Lesson 62")
    b.table(
        ["Resource", "What it is", "Best for"],
        [
            ["**CS50** (cs50.harvard.edu)", "Harvard's famous intro courses: CS50x, CS50P (Python), CS50W (web), CS50 AI. Free", "A university-quality foundation"],
            ["**freeCodeCamp** (freecodecamp.org)", "Free interactive courses and certifications, and a huge YouTube channel", "Web development, Python, data"],
            ["**The Odin Project** (theodinproject.com)", "A free, complete full-stack web curriculum", "Becoming a web developer"],
            ["**MDN Web Docs** (developer.mozilla.org)", "The best reference for HTML, CSS and JavaScript", "Looking things up while building"],
            ["**Official Python tutorial** (docs.python.org)", "Python's own tutorial and documentation", "Accurate Python details"],
            ["**Automate the Boring Stuff with Python** (automatetheboringstuff.com)", "A free online book about practical Python automation", "Useful scripts for real life"],
            ["**Exercism** (exercism.org)", "Free exercises in 70+ languages, with optional mentoring", "Practice and feedback"],
            ["**Codewars**, **HackerRank**, **LeetCode**", "Coding puzzles and challenges", "Problem solving, interview prep"],
            ["**Kaggle Learn** (kaggle.com/learn)", "Short, free courses on data science and machine learning", "Data and AI"],
            ["**Scratch** and **Code.org**", "Visual, block-based coding", "Very first steps"],
            ["**TryHackMe**, **PicoCTF**", "Legal, guided hacking practice", "Cybersecurity"],
            ["**Roadmap.sh**", "Visual learning roadmaps for every developer role", "Planning what to learn next"],
        ],
        widths=[3, 3.4, 2.2], font_size=8.6,
    )
    b.h3("YouTube channels developers love")
    b.p("**freeCodeCamp.org** (full free courses), **CS50** (the Harvard lectures), **Corey Schafer** (clear Python tutorials), **Kevin Powell** (CSS), **Traversy Media** (web projects), **Fireship** (fast overviews of technologies), **Bro Code** (beginner courses in many languages) and **The Coding Train** (creative, fun coding).")
    b.h3("Communities: you're not alone")
    b.bullets([
        "**Stack Overflow**: search it first, since most errors already have answers.",
        "**Reddit**: r/learnprogramming, r/learnpython, r/webdev.",
        "**Discord servers**: The Odin Project, freeCodeCamp, Python and many others.",
        "**GitHub**: read code from real projects, and later contribute to issues labelled *good first issue*.",
        "**Local and school clubs**, hackathons and coding meetups.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Using AI as a learning partner", label="Lesson 63")
    b.p("AI assistants like Claude can be amazing teachers: patient, available any time, and able to explain things in many different ways. But used wrongly, they can stop you from learning at all. The rule is simple:")
    b.key("Use AI to help you **understand**, not to do the thinking **for** you. If you can't explain every line of your code, you're not finished.")
    b.table(
        ["Great ways to use AI", "Ways that hurt your learning"],
        [
            ["\"Explain this error message like I'm a beginner.\"", "Pasting the exercise and copying the answer"],
            ["\"Give me 5 practice problems about loops. Don't give me the answers.\"", "Letting it write projects you don't understand"],
            ["\"Review my code. Tell me what to improve, but don't rewrite it.\"", "Skipping the struggle. Struggling *is* how the brain learns"],
            ["\"Explain recursion in a different way. I didn't get the book's version.\"", "Believing everything without testing it. AI can be wrong too"],
            ["\"Quiz me on Lesson 12 with 10 questions.\"", "Pasting secrets, passwords or private data"],
            ["\"What's the difference between a list and a tuple, with examples?\"", "Using it in exams or homework where it isn't allowed"],
        ],
        widths=[4.1, 4.1],
    )
    b.h3("A good way to ask for help")
    b.code(
        "I'm a beginner learning Python. I'm trying to make my to-do app remove a task.\n"
        "Here is my code:\n"
        "   [paste the code]\n"
        "When I type 0, it removes the last task instead of showing an error.\n"
        "I expected it to say 'No task with that number'.\n"
        "Please explain WHY this happens and give me a hint, not the full fix.",
        "text", label="EXAMPLE PROMPT",
    )
    b.real("Professional developers use AI coding assistants every day, for writing tests, explaining unfamiliar code, finding bugs and drafting code. But they can do it well only **because** they understand the code it writes. That understanding is what this guide builds.")

    # ------------------------------------------------------------------
    b.lesson("Your portfolio and your first opportunity", label="Lesson 64")
    b.h3("Make your GitHub profile shine")
    b.bullets([
        "Pin your **3 to 6 best projects**. Quality beats quantity.",
        "Every project gets a **README.md** with: what it does, a screenshot or GIF, how to run it, what you learnt, and a **live demo link** if possible.",
        "Make a **profile README** (a repository with the same name as your username) that introduces you.",
        "Commit regularly, with clear messages. It shows steady growth.",
    ])
    b.h3("Ways to get real experience")
    b.bullets([
        "**Build for real people:** a website for a family business, a club or a charity.",
        "**Hackathons:** build something in a weekend with a team. Many welcome beginners.",
        "**Open source:** fix typos in documentation, then small bugs. Look for *good first issue* labels.",
        "**Internships and apprenticeships:** apply early and often, even if you don't meet every requirement.",
        "**Freelancing small jobs** once your skills are solid.",
        "**Teach others:** write a blog post or make a video about what you learnt. Teaching proves understanding.",
    ])
    b.h3("What technical interviews usually include")
    b.table(
        ["Part", "How to prepare"],
        [
            ["**Coding problems**", "Data structures and algorithms (Lessons 23–24); daily practice on LeetCode or HackerRank; think out loud"],
            ["**Talking about your projects**", "Be ready to explain *why* you made each decision, and what you'd improve"],
            ["**System design** (more senior roles)", "How you'd build a larger app: databases, APIs, caching, scaling"],
            ["**Behavioural questions**", "Real stories: a bug you fixed, a team problem you solved, something you learnt quickly"],
        ],
        widths=[2.4, 5.8],
    )

    # ------------------------------------------------------------------
    b.lesson("Final words", label="You made it", toc=True)
    b.p("If you've worked through this guide, look back at where you started: you barely knew what code was. Now you can write programs, build websites, understand how apps and the internet work, and you know what to learn next.")
    b.p("Every expert programmer was once exactly where you started. The difference between people who become developers and people who give up is not talent. It's that they **kept going**, one small step at a time, through the errors and the confusing days.")
    b.steps([
        "**Build something every week**, however small.",
        "**Stay curious**: when something works, ask *why* it works.",
        "**Be kind to yourself** on hard days. Confusion means you're learning.",
        "**Help others** who are one step behind you.",
    ])
    b.key("Your next step: open your editor and type `print(\"Hello, world!\")`. The journey starts there, and it starts today. Good luck!")
