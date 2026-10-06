"""Part 1: Your tools."""


def build(b):
    b.part(
        "Part 1",
        "Your tools",
        "Which apps beginners use, which apps professional developers use, and how to set up your computer step by step.",
        [
            "What tools a programmer needs, and why",
            "The best tools for beginners (including ones that need no install)",
            "The tools professional developers use every day",
            "How to install Python and VS Code, step by step",
            "How to write and run your very first program file",
            "What you can do on a phone or tablet",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("What tools does a programmer need?", label="Lesson 1.1")
    b.p("To write and run code you need just two things:")
    b.steps([
        "**A place to write code**: a *code editor* or an *IDE*.",
        "**Something that runs your code**: for Python, the *Python interpreter*.",
    ])
    b.p("As you grow, you will add more tools:")
    b.table(
        ["Tool", "What it is for", "When you need it"],
        [
            ["**Code editor**", "A text editor made for code. It colours your code, spots typos and runs programs.", "Day 1"],
            ["**IDE**", "A code editor with everything built in: running, debugging, testing and project management.", "Day 1 or later"],
            ["**Interpreter / compiler**", "Turns your code into something the computer runs (see Lesson 0.3).", "Day 1"],
            ["**Web browser**", "Runs websites and JavaScript. Has developer tools built in.", "Websites (Part 6)"],
            ["**Terminal**", "Type commands to run programs, install packages and use Git.", "Part 5"],
            ["**Git + GitHub**", "Saves the history of your code and lets you share it online.", "Part 5"],
            ["**Package manager**", "Installs code other people wrote (`pip` for Python, `npm` for JavaScript).", "Part 3"],
        ],
        widths=[1.9, 4.4, 1.7],
    )
    b.note(
        "**Code editor vs IDE.** A code editor (like VS Code) is light and flexible. You add "
        "features with extensions. An IDE (like PyCharm) is heavier but has everything built in. "
        "Both are fine, and many developers use both."
    )

    # ------------------------------------------------------------------
    b.lesson("Beginner tools: start here", label="Lesson 1.2")
    b.h3("Option A: Nothing to install (start in 30 seconds)")
    b.p("These run in your web browser. They are perfect for your first lessons, or for practising on a school computer.")
    b.table(
        ["Tool", "What it is", "Account?", "Good for"],
        [
            ["**Programiz Online Compiler** (programiz.com/python-programming/online-compiler)", "Write Python on the left, click Run, see the result on the right.", "No", "Quick practice, the simplest option"],
            ["**Replit** (replit.com)", "An online coding workspace for many languages. It saves your projects.", "Yes (free plan with limits)", "Small projects, sharing code"],
            ["**Google Colab** (colab.research.google.com)", "\"Notebooks\" that mix code and notes. Saves to Google Drive.", "Google account", "Python practice, data and AI later"],
            ["**Python's online shell** (python.org/shell)", "A tiny live Python prompt on the official website.", "No", "Testing a single line"],
        ],
        widths=[2.6, 3.2, 1.3, 2],
    )
    b.h3("Option B: Install on your computer (best long-term)")
    b.table(
        ["Tool", "What it is", "Why beginners like it"],
        [
            ["**Python** (python.org)", "The Python language itself. Free.", "Required to run Python on your computer."],
            ["**Thonny** (thonny.org)", "A simple Python editor made for learners. Free. Comes with Python built in.", "Big Run button. Shows your variables live. Can run your code one step at a time so you see exactly what happens."],
            ["**IDLE**", "A basic editor that comes with Python.", "Already installed with Python. Very simple."],
            ["**VS Code** (code.visualstudio.com)", "The most popular code editor in the world. Free.", "Works for every language. You will use it for years."],
        ],
        widths=[2, 3, 4],
    )
    b.key(
        "**Our recommendation:** start with **Programiz** or **Thonny** for the first 2 to 4 weeks. "
        "Then move to **VS Code**, which is what most professionals use."
    )
    b.h3("Option C: Block coding (optional warm-up)")
    b.p(
        "**Scratch** (scratch.mit.edu) lets you snap blocks together instead of typing. "
        "It is great for understanding loops and decisions in a fun, visual way. If typed code "
        "feels scary, spend a few hours in Scratch first. Then come back."
    )

    # ------------------------------------------------------------------
    b.lesson("Developer tools: what professionals use", label="Lesson 1.3")
    b.p("You do not need these on day one, but you should know they exist. You will grow into them.")
    b.table(
        ["Job", "Beginner uses", "Professional developer uses"],
        [
            ["Writing code", "Programiz, Thonny, IDLE", "**VS Code** (most popular), **PyCharm** (Python), **IntelliJ IDEA** (Java/Kotlin), **Visual Studio** (C#, C++ on Windows), **Android Studio** (Android apps), **Xcode** (iPhone and Mac apps, Mac only), **Cursor** and other AI-assisted editors"],
            ["Running code", "The Run button", "The **terminal** (command line), plus run and debug settings"],
            ["Finding bugs", "`print()`", "**Debuggers** with breakpoints, logging, error tracking services"],
            ["Saving versions", "Saving files", "**Git** for history, **GitHub** or GitLab for sharing and teamwork"],
            ["Installing libraries", "Nothing yet", "**pip** / **uv** (Python), **npm** / **pnpm** (JavaScript), and others"],
            ["Testing websites", "Opening the page", "**Browser DevTools** (F12), responsive device mode, Lighthouse"],
            ["Talking to servers", "Nothing yet", "**Postman**, **curl** for testing APIs"],
            ["Databases", "Nothing yet", "**DB Browser for SQLite**, **pgAdmin**, **DBeaver**"],
            ["Running apps anywhere", "Nothing yet", "**Docker** (packs an app with everything it needs)"],
            ["Designing screens", "Paper and pencil", "**Figma** (designing apps and websites before coding)"],
            ["Working in a team", "Nothing yet", "**Slack**/**Teams** (chat), **Jira**/**Linear**/**GitHub Issues** (task tracking)"],
            ["Help and learning", "This guide, teachers", "Official docs, Stack Overflow, AI assistants (Claude, GitHub Copilot)"],
        ],
        widths=[1.6, 1.7, 5.4],
    )
    b.h3("Minimum computer you need")
    b.bullets([
        "**Any** Windows, Mac or Linux computer from the last 8 to 10 years can learn to code.",
        "**RAM:** 8 GB is enough to learn. 16 GB is comfortable for bigger projects and mobile app development.",
        "**Storage:** an SSD makes everything feel much faster. Keep at least 20 GB free.",
        "**Chromebook:** you can use online tools (Replit, Colab), or turn on the built-in Linux option to install real tools.",
        "**Building iPhone apps** needs a Mac, because Apple's Xcode only runs on macOS (see Part 7).",
    ])

    # ------------------------------------------------------------------
    b.lesson("Setting up your computer, step by step", label="Lesson 1.4")
    b.p("Follow these steps in order. It takes about 20 minutes. Do it once, and you are set for months.")
    b.h3("Step 1: Install Python")
    b.h4("On Windows")
    b.steps([
        "Open your browser and go to **python.org/downloads**.",
        "Click the big yellow **Download Python 3.x** button. The newest version is fine.",
        "Open the downloaded file.",
        "**Important:** if you see a checkbox called **\"Add python.exe to PATH\"**, tick it. This lets you run Python from anywhere.",
        "Click **Install Now** and wait until it finishes.",
    ])
    b.h4("On Mac")
    b.steps([
        "Go to **python.org/downloads** and download the macOS installer.",
        "Open it and click **Continue** until it is installed.",
        "On a Mac, the command is usually `python3` (not `python`). Remember this!",
    ])
    b.h4("On Linux")
    b.p("Python 3 is almost always installed already. Check with `python3 --version`.")
    b.h3("Step 2: Check that Python works")
    b.p("Open the **terminal**. This is a window where you type commands:")
    b.bullets([
        "**Windows:** press the Windows key, type `cmd` or `Terminal`, press Enter.",
        "**Mac:** press Cmd + Space, type `Terminal`, press Enter.",
    ])
    b.p("Type this and press Enter (use `python3` on Mac and Linux):")
    b.code("python --version", "bash")
    b.out("Python 3.14.0", label="YOU SHOULD SEE SOMETHING LIKE")
    b.warn(
        "If you see *\"'python' is not recognized\"* on Windows, try `py --version`. If that "
        "also fails, run the installer again and make sure **\"Add python.exe to PATH\"** is ticked."
    )
    b.h3("Step 3: Install VS Code")
    b.steps([
        "Go to **code.visualstudio.com** and download VS Code for your system. Install it.",
        "Open VS Code. Click the **Extensions** icon on the left (four little squares), or press Ctrl + Shift + X (Cmd + Shift + X on Mac).",
        "Search for **Python** and install the one made by **Microsoft**.",
        "Optional: turn on **File > Auto Save** so you never lose work.",
    ])
    b.tip("Prefer something simpler for now? Install **Thonny** from thonny.org instead. It includes Python, so you can even skip Step 1.")
    b.h3("Step 4: Make a folder for all your code")
    b.p("Organisation matters. Create one folder for everything you code while learning:")
    b.code(
        "Documents/\n"
        "└── coding/\n"
        "    ├── part2-basics/\n"
        "    │   ├── lesson01_hello.py\n"
        "    │   └── lesson02_variables.py\n"
        "    ├── projects/\n"
        "    │   └── guessing_game.py\n"
        "    └── website/",
        "text", label="FOLDER LAYOUT",
    )
    b.h3("Step 5: Write and run your first program file")
    b.steps([
        "In VS Code, click **File > Open Folder** and open your `coding` folder.",
        "Click **File > New File**, and save it as `hello.py`. The `.py` ending tells the computer it is Python.",
        "Type the code below. Then save it.",
        "Click the **Run** button (a triangle in the top right), or type `python hello.py` in the terminal.",
    ])
    b.code('print("Hello, world!")\nprint("I just ran my first Python file!")', "python")
    b.out("Hello, world!\nI just ran my first Python file!")
    b.key("Every Python program is just a text file that ends in `.py`. You write it in an editor, "
          "and the Python interpreter runs it from top to bottom.")

    # ------------------------------------------------------------------
    b.lesson("Coding on a phone or tablet", label="Lesson 1.5")
    b.p(
        "You can learn the basics on a phone or tablet. It is slower to type code there, but "
        "it is great for practising on the go:"
    )
    b.table(
        ["Device", "Apps", "Notes"],
        [
            ["**Any phone or tablet**", "Programiz, Replit or Google Colab in the web browser", "Nothing to install"],
            ["**Android**", "**Pydroid 3** (Python), Termux (advanced)", "Pydroid 3 runs real Python offline"],
            ["**iPhone / iPad**", "**Pyto**, **a-Shell** (free), **Pythonista** (paid)", "Pythonista is polished. a-Shell is a free terminal"],
            ["**Learning apps**", "Sololearn, Mimo, Grasshopper (JavaScript)", "Good for daily practice; not for building real projects"],
        ],
        widths=[1.7, 3.4, 3],
    )
    b.warn(
        "A phone is fine for Parts 0 to 3. For websites, apps, Git and real projects, you will "
        "want a laptop or desktop computer. A keyboard and a bigger screen make a huge difference."
    )
    b.h3("Checklist before Part 2")
    b.bullets([
        "I can open an editor (online or installed)",
        "I can run `print(\"Hello, world!\")` and see the result",
        "I have a folder where I will save all my practice code",
    ], check=True)
