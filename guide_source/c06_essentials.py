"""Part 5: Developer essentials."""


def build(b):
    b.part(
        "Part 5",
        "Developer essentials",
        "The tools and ideas every developer uses, whatever language they write: the terminal, Git, the internet, APIs, databases, security and teamwork.",
        [
            "How to use the terminal (command line) confidently",
            "How to save your code's history with Git and share it on GitHub",
            "What really happens when you open a website",
            "How programs talk to each other with APIs and JSON",
            "How databases and SQL work",
            "The security basics every developer must know",
            "How software is built by teams, and what \"the cloud\" really is",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("The terminal (command line)", label="Lesson 25")
    b.p("The **terminal** is a window where you control the computer by **typing commands** instead of clicking. It looks scary at first, but you only need about 10 commands, and developers use it every single day.")
    b.bullets([
        "**Windows:** *Terminal* or *PowerShell* (search for it in the Start menu)",
        "**Mac:** *Terminal* (Cmd + Space, type Terminal)",
        "**Linux:** *Terminal* (often Ctrl + Alt + T)",
        "**VS Code:** a terminal is built in: **View > Terminal**, or Ctrl + ` (the backtick key)",
    ])
    b.h3("The commands you actually need")
    b.table(
        ["What you want", "Mac / Linux", "Windows (PowerShell)"],
        [
            ["Where am I?", "`pwd`", "`pwd`"],
            ["List files here", "`ls`", "`ls` or `dir`"],
            ["Go into a folder", "`cd projects`", "`cd projects`"],
            ["Go up one folder", "`cd ..`", "`cd ..`"],
            ["Make a folder", "`mkdir website`", "`mkdir website`"],
            ["Make an empty file", "`touch notes.txt`", "`ni notes.txt`"],
            ["Delete a file (careful: no recycle bin!)", "`rm notes.txt`", "`del notes.txt`"],
            ["Clear the screen", "`clear`", "`cls` or `clear`"],
            ["Run a Python file", "`python3 game.py`", "`python game.py`"],
            ["Open this folder in VS Code", "`code .`", "`code .`"],
        ],
        widths=[3, 2.4, 2.6],
    )
    b.h3("A typical session")
    b.code("cd Documents\nmkdir coding\ncd coding\nmkdir my-first-project\ncd my-first-project\ncode .", "bash")
    b.p("Now you have a new project folder, and VS Code is open in it. This is how developers start every new project.")
    b.tip("Three shortcuts that save hours: **Tab** auto-completes file and folder names. The **Up arrow** brings back your previous commands. **Ctrl + C** stops a running program.")
    b.note("A `.` means \"this folder\" and `..` means \"the folder above\". On a Mac, if `code .` doesn't work, open VS Code, press Cmd + Shift + P, and run *Shell Command: Install 'code' command in PATH*.")

    # ------------------------------------------------------------------
    b.lesson("Git and GitHub", label="Lesson 26")
    b.p("**Git** is a tool that saves **snapshots** of your project over time, like save points in a video game. If you break something, you can go back. **GitHub** is a website that stores your Git projects online, so you can back them up, show them to employers and work with other people.")
    b.table(
        ["", "Git", "GitHub"],
        [
            ["**What**", "A program on your computer", "A website (github.com)"],
            ["**Does**", "Tracks changes and saves the history of your code", "Hosts your code online, plus teamwork tools"],
            ["**Alternatives**", "(Git is the standard)", "GitLab, Bitbucket"],
        ],
        widths=[1.3, 3.3, 3.3],
    )
    b.h3("Install and set up (once)")
    b.steps([
        "Install Git from **git-scm.com**. On a Mac, typing `git --version` in the terminal will offer to install it.",
        "Tell Git who you are. It writes this on every save point:",
    ])
    b.code('git config --global user.name "Your Name"\ngit config --global user.email "you@example.com"', "bash")
    b.h3("The everyday workflow")
    b.code(
        "        git add                git commit                git push\n"
        "Your files  ───────►  Staging area  ─────────►  Local history  ───────►  GitHub\n"
        "(working folder)      (ready to save)           (save points)            (online)",
        "text", label="HOW GIT WORKS",
    )
    b.code('git init                          # start tracking this folder (once per project)\ngit status                        # what has changed?\ngit add .                         # stage all changes\ngit commit -m "Add guessing game" # save a snapshot with a message\ngit log --oneline                 # see the history', "bash")
    b.h3("Put your project on GitHub")
    b.steps([
        "Create a free account at **github.com**.",
        "Click **New** (the green button) to create a repository (a *repo* is a project). Give it a name, and don't add any files.",
        "GitHub shows you commands like these. Run them in your project folder:",
    ])
    b.code("git remote add origin https://github.com/YOUR-USERNAME/my-project.git\ngit branch -M main\ngit push -u origin main", "bash")
    b.p("Refresh the GitHub page and your code is there! After that, every time you make changes, it's just:")
    b.code('git add .\ngit commit -m "Describe what you changed"\ngit push', "bash")
    b.note("When you push for the first time, Git asks you to sign in. The easiest way is through the browser window that pops up. If you prefer clicking to typing, **GitHub Desktop** (desktop.github.com) and the **Source Control** panel in VS Code do all of this with buttons.")
    b.h3("Branches: work on new features safely")
    b.p("A **branch** is a separate line of work. You build a new feature on a branch, and when it works, you **merge** it into `main`.")
    b.code('git switch -c dark-mode      # create a new branch and move to it\n# ... edit files, then add and commit as usual ...\ngit switch main              # go back to main\ngit merge dark-mode          # bring the finished feature in', "bash")
    b.h3("Other commands you will use")
    b.table(
        ["Command", "What it does"],
        [
            ["`git clone URL`", "Download a copy of a repository from GitHub"],
            ["`git pull`", "Get the latest changes from GitHub"],
            ["`git diff`", "Show exactly what changed since the last commit"],
            ["`git restore file.py`", "Throw away your changes to a file (careful!)"],
            ["`git branch`", "List branches"],
        ],
        widths=[2.3, 5],
    )
    b.h3("Pull requests: how teams work")
    b.p("In a team, you don't push straight to `main`. You push your branch and open a **pull request (PR)** on GitHub. A PR says: \"here are my changes, please review them\". Teammates comment, you fix things, automated tests run, and then the PR is **merged**. This is called **code review**, and it's how almost every software company works.")
    b.warn("**Never commit passwords, API keys or secret tokens.** Once they are on GitHub, assume someone has seen them. Put secret files in a file called `.gitignore` so Git ignores them.")
    b.tip("Write commit messages that say **what and why**: *\"Fix crash when task list is empty\"* is great. *\"stuff\"* or *\"update\"* is not.")

    # ------------------------------------------------------------------
    b.lesson("How the internet and websites work", label="Lesson 27")
    b.p("When you type a website address and press Enter, a lot happens in less than a second:")
    b.steps([
        "Your browser (the **client**) asks a **DNS** server: \"What is the address of example.com?\" DNS is the internet's phone book. It turns names into **IP addresses** like `93.184.215.14`.",
        "Your browser connects to the computer at that address: a **server**. A server is just a computer that's always on, waiting for requests.",
        "Your browser sends an **HTTP request**: \"GET me the page `/`, please.\"",
        "The server sends back a **response**: a status code (like `200 OK`) plus the page's **HTML**.",
        "The browser reads the HTML, then asks for the **CSS**, **JavaScript** and **images** it mentions.",
        "The browser draws (**renders**) the page, and runs the JavaScript to make it interactive.",
    ])
    b.h3("The parts of a URL")
    b.code("https://www.example.com/products/shoes?color=red#reviews", "text", label="URL")
    b.table(
        ["Part", "Example", "Meaning"],
        [
            ["**Protocol**", "`https://`", "How to talk. The **s** means the connection is encrypted (secure)"],
            ["**Domain**", "`www.example.com`", "The website's name, which DNS turns into an IP address"],
            ["**Path**", "`/products/shoes`", "Which page on the site"],
            ["**Query string**", "`?color=red`", "Extra information sent to the server, like search filters"],
            ["**Fragment**", "`#reviews`", "Jump to a section of the page (never sent to the server)"],
        ],
        widths=[1.6, 2.3, 4.4],
    )
    b.h3("HTTP methods and status codes")
    b.table(
        ["Method", "Meaning", "Example"],
        [
            ["`GET`", "Read something", "Load a page, get a list of posts"],
            ["`POST`", "Create something", "Submit a form, publish a post"],
            ["`PUT` / `PATCH`", "Update something", "Edit your profile"],
            ["`DELETE`", "Delete something", "Remove a comment"],
        ],
        widths=[1.6, 2.2, 4.5],
    )
    b.table(
        ["Code", "Meaning"],
        [
            ["**200** OK", "Everything worked"],
            ["**201** Created", "Something new was created"],
            ["**301** / **302**", "The page has moved: go to another address (a redirect)"],
            ["**400** Bad Request", "The request was wrong (for example, missing information)"],
            ["**401** / **403**", "You are not logged in / you are not allowed"],
            ["**404** Not Found", "The page doesn't exist (the famous one!)"],
            ["**500** Server Error", "The server's code crashed. A bug on *their* side"],
        ],
        widths=[2.2, 6],
    )
    b.key("Remember the pattern: 2xx = success, 3xx = go somewhere else, 4xx = **you** (the client) made a mistake, 5xx = **the server** made a mistake.")
    b.h3("Frontend, backend and database")
    b.table(
        ["Layer", "Runs on", "Job", "Built with"],
        [
            ["**Frontend**", "The user's browser or phone", "Everything the user sees and clicks", "HTML, CSS, JavaScript, React, Swift, Kotlin"],
            ["**Backend**", "A server", "Business logic: logins, payments, rules, sending emails", "Python, JavaScript (Node.js), Java, C#, Go, PHP, Ruby"],
            ["**Database**", "A server", "Stores data permanently", "PostgreSQL, MySQL, SQLite, MongoDB"],
        ],
        widths=[1.4, 1.9, 2.8, 2.6],
    )
    b.p("**Full-stack** developers work on all three layers.")

    # ------------------------------------------------------------------
    b.lesson("APIs and JSON", label="Lesson 28")
    b.p("An **API** (Application Programming Interface) is a way for **programs to talk to other programs**. Think of a restaurant: you (your program) don't go into the kitchen (the other system). You give your order to the **waiter** (the API), who brings back your food (the data).")
    b.p("Weather apps use a weather API. Apps with a \"Sign in with Google\" button use Google's API. AI apps use AI model APIs. Most web APIs send data back as **JSON**:")
    b.code('{\n  "city": "Cairo",\n  "temperature": 31,\n  "sunny": true,\n  "forecast": ["sunny", "sunny", "cloudy"]\n}', "text", label="JSON")
    b.p("JSON looks almost exactly like Python dictionaries and lists. The differences: JSON uses `true` / `false` / `null` instead of `True` / `False` / `None`, and always uses double quotes.")
    b.h3("Calling a real API from Python")
    b.p("Install the `requests` package (`python -m pip install requests`), then:")
    b.code('import requests\n\nresponse = requests.get("https://api.github.com/users/octocat")\nprint(response.status_code)\n\ndata = response.json()       # turn the JSON into a Python dict\nprint(data["name"])\nprint(data["public_repos"], "public repositories")')
    b.out("200\nThe Octocat\n8 public repositories", label="OUTPUT (the numbers may change over time)")
    b.h3("Things to know about APIs")
    b.bullets([
        "**API keys:** many APIs need a secret key to identify you. Keep it secret. Never put it in code that you upload, or in a website's JavaScript.",
        "**Rate limits:** most APIs limit how many requests you can make per minute or per day.",
        "**Documentation:** every good API has docs that explain its URLs (called **endpoints**) and what they return. Reading API docs is a core developer skill.",
        "**Free APIs to practise with:** search for \"public APIs list\" on GitHub. There are free APIs for weather, Pokémon, jokes, space photos and more.",
    ])
    b.tip("You can test APIs without writing code with tools like **Postman** or **Bruno**, or by simply opening a GET URL in your browser.")

    # ------------------------------------------------------------------
    b.lesson("Databases and SQL", label="Lesson 29")
    b.p("Files are fine for small things. But real apps with thousands of users need a **database**: software that stores huge amounts of data safely and finds things in it fast. Most databases store data in **tables**, like spreadsheets: each **row** is one record, and each **column** is one field.")
    b.table(
        ["id", "name", "age", "score"],
        [["1", "Sara", "16", "91"], ["2", "Omar", "17", "78"], ["3", "Lina", "16", "85"]],
        widths=[1, 2, 1.5, 1.5], head_color="#475569",
    )
    b.h3("SQL: the language of databases")
    b.p("**SQL** (Structured Query Language, said \"sequel\" or \"S-Q-L\") is how you talk to most databases. It reads almost like English:")
    b.code("-- create a table\nCREATE TABLE students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    age INTEGER,\n    score INTEGER\n);\n\n-- add rows\nINSERT INTO students (name, age, score) VALUES ('Sara', 16, 91);\nINSERT INTO students (name, age, score) VALUES ('Omar', 17, 78);\n\n-- read rows\nSELECT * FROM students;\nSELECT name, score FROM students WHERE score > 80 ORDER BY score DESC;\n\n-- change rows\nUPDATE students SET score = 82 WHERE name = 'Omar';\n\n-- delete rows\nDELETE FROM students WHERE id = 1;", "sql")
    b.p("Almost everything apps do with data is one of four actions, known as **CRUD**:")
    b.table(
        ["CRUD", "SQL", "HTTP (from Lesson 27)", "Example"],
        [
            ["**C**reate", "`INSERT`", "`POST`", "Sign up, write a post"],
            ["**R**ead", "`SELECT`", "`GET`", "View your feed"],
            ["**U**pdate", "`UPDATE`", "`PUT` / `PATCH`", "Edit your profile"],
            ["**D**elete", "`DELETE`", "`DELETE`", "Delete a message"],
        ],
        widths=[1.4, 1.4, 2.2, 3],
    )
    b.h3("Using a database from Python")
    b.p("Python comes with **SQLite**, a small but real database stored in one file. No installation needed:")
    b.code('import sqlite3\n\nconnection = sqlite3.connect(":memory:")   # use "school.db" to save to a file\ncursor = connection.cursor()\n\ncursor.execute("CREATE TABLE students (name TEXT, score INTEGER)")\ncursor.executemany(\n    "INSERT INTO students VALUES (?, ?)",\n    [("Sara", 91), ("Omar", 78), ("Lina", 85)],\n)\n\nquery = "SELECT name, score FROM students WHERE score > 80 ORDER BY score DESC"\nfor row in cursor.execute(query):\n    print(row)\n\nconnection.close()')
    b.out("('Sara', 91)\n('Lina', 85)")
    b.warn("Always use `?` placeholders for values, like above. **Never** build SQL by gluing in user input with f-strings or `+`. Attackers can type SQL code into your form and steal or delete your data. This attack is called **SQL injection**, and it's one of the most common security holes on the web.")
    b.h3("Connecting tables: JOIN")
    b.p("Real databases have many tables linked by IDs. A **JOIN** combines them:")
    b.code("SELECT students.name, classes.title\nFROM students\nJOIN classes ON students.class_id = classes.id;", "sql")
    b.h3("Types of databases")
    b.table(
        ["Database", "Type", "Good for"],
        [
            ["**SQLite**", "SQL, in a single file", "Learning, small apps, phone apps"],
            ["**PostgreSQL**", "SQL server", "Most professional web apps. Powerful and free"],
            ["**MySQL** / **MariaDB**", "SQL server", "Very common, especially with PHP and WordPress"],
            ["**MongoDB**", "NoSQL (stores JSON-like documents)", "Flexible data that doesn't fit neat tables"],
            ["**Redis**", "Key-value, kept in memory", "Super-fast caching, sessions, leaderboards"],
            ["**Firebase** / **Supabase**", "Hosted backend with a database", "Mobile and web apps without writing your own server"],
        ],
        widths=[2.2, 2.8, 3.3],
    )
    b.tip("To look inside an SQLite file with a friendly interface, install **DB Browser for SQLite** (sqlitebrowser.org). It's free.")

    # ------------------------------------------------------------------
    b.lesson("Security basics every developer must know", label="Lesson 30")
    b.p("Security is not just for specialists. Most hacks happen because of simple mistakes by ordinary developers. Learn these habits from the start:")
    b.table(
        ["Rule", "Why"],
        [
            ["**Never trust user input**", "Check and clean everything users type. Treat it as possibly dangerous."],
            ["**Use parameterised queries** (`?` placeholders)", "Prevents SQL injection (Lesson 29)."],
            ["**Escape output in web pages**", "Prevents **XSS** (cross-site scripting): attackers putting JavaScript into your pages through comments or names."],
            ["**Never store plain-text passwords**", "Store a *hash* made by a password library (like bcrypt or Argon2). If the database leaks, the passwords stay safe."],
            ["**Keep secrets out of code**", "Put API keys and passwords in *environment variables* or secret managers, and add secret files to `.gitignore`."],
            ["**Always use HTTPS**", "Encrypts data between the user and the server. Free with modern hosting."],
            ["**Keep dependencies updated**", "Old library versions often have known security holes. GitHub's Dependabot can warn you."],
            ["**Give the minimum access needed**", "A program that only reads data shouldn't have permission to delete it."],
        ],
        widths=[2.8, 5.2],
    )
    b.note("The **OWASP Top 10** (owasp.org) is a famous list of the ten most important web security risks. Read it once you start building websites with logins.")
    b.warn("Learn hacking skills only on systems you own or have permission to test, like the practice labs on **TryHackMe**, **Hack The Box** or **PicoCTF**. Attacking real systems without permission is illegal.")

    # ------------------------------------------------------------------
    b.lesson("How software is built in teams", label="Lesson 31")
    b.p("Professional software is rarely built by one person. Here is how a typical team works.")
    b.h3("The software development life cycle")
    b.steps([
        "**Plan:** what problem are we solving, and for whom?",
        "**Design:** sketch screens (often in **Figma**) and plan the code's structure.",
        "**Build:** write the code, in small pieces.",
        "**Test:** automated tests plus manual checks.",
        "**Release (deploy):** put it live for users.",
        "**Maintain:** fix bugs, improve, listen to feedback, and repeat.",
    ])
    b.h3("Agile and Scrum")
    b.p("Most teams work in an **agile** way: they build in small steps and adjust often, instead of planning everything for a year. A popular style is **Scrum**:")
    b.bullets([
        "Work is split into **sprints**: 1 to 2 week cycles.",
        "Tasks are written as **tickets** in tools like Jira, Linear or GitHub Issues.",
        "A short daily **stand-up** meeting: what I did, what I'll do next, what's blocking me.",
        "At the end of each sprint: a demo, and a **retrospective** on how to work better.",
    ])
    b.h3("CI/CD: robots that check and ship code")
    b.p("**Continuous Integration (CI):** every time someone pushes code, a server automatically runs all the tests. If anything fails, the team knows immediately. **Continuous Deployment (CD):** when tests pass, the new version goes live automatically. **GitHub Actions** is a popular free tool for this.")
    b.h3("Common jobs in a software team")
    b.table(
        ["Role", "What they do"],
        [
            ["**Software engineer / developer**", "Designs, writes, tests and maintains code"],
            ["**Product manager**", "Decides *what* to build and why, based on users and business goals"],
            ["**Designer (UI/UX)**", "Designs how the product looks and feels"],
            ["**QA engineer**", "Tests the product to find bugs before users do"],
            ["**DevOps / platform engineer**", "Builds the servers, pipelines and tools that keep everything running"],
            ["**Engineering manager**", "Leads and supports the developers"],
        ],
        widths=[2.8, 5.2],
    )

    # ------------------------------------------------------------------
    b.lesson("The cloud, servers and Docker", label="Lesson 32")
    b.p("\"**The cloud**\" simply means **other people's computers that you rent over the internet**. Instead of buying servers, companies rent computing power, storage and databases, and pay for what they use.")
    b.table(
        ["Provider", "Notes"],
        [
            ["**AWS** (Amazon Web Services)", "The biggest cloud provider"],
            ["**Microsoft Azure**", "Popular with large companies and .NET developers"],
            ["**Google Cloud**", "Strong in data and AI"],
            ["**Vercel, Netlify, Render, Railway, Fly.io**", "Simpler platforms that are great for putting your first projects online"],
        ],
        widths=[3.4, 4.6],
    )
    b.h3("Docker and containers")
    b.p("Ever heard \"but it works on my computer!\"? **Docker** fixes that. It packs your app, plus everything it needs (the right Python version, libraries and settings), into a **container** that runs the same way on any computer or server. A recipe file called a `Dockerfile` describes the container:")
    b.code('FROM python:3.13-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["python", "app.py"]', "text", label="DOCKERFILE")
    b.note("You don't need the cloud or Docker as a beginner. But you will hear these words constantly, and they become important once you build backends or work in a team.")
