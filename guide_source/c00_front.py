"""Front matter: how to use the guide."""

from engine import CALLOUTS


def build(b):
    b.lesson("How to use this guide", label="Start here", level=0)
    b.p(
        "This guide is a ladder. Every step is small, and every step stands on the one "
        "before it. You start with **no knowledge at all**. By the end you will have written "
        "real programs, built and published a website, and understand how apps are made. "
        "You will also know how the professional world of software works: which languages "
        "and tools developers use, and which path fits you."
    )
    b.p("The guide has ten parts, from very easy to advanced:")
    b.table(
        ["Part", "What it covers", "Level"],
        [
            ["0  Welcome to coding", "What coding is, how computers and code work, the right mindset", "Absolute beginner"],
            ["1  Your tools", "Which apps beginners use, which developers use, and how to set them up", "Absolute beginner"],
            ["2  Python, Stage 1", "Printing, variables, maths, input, text, decisions, loops", "Beginner"],
            ["3  Python, Stage 2", "Lists, dictionaries, functions, errors, files, libraries", "Beginner+"],
            ["4  Python, Stage 3", "Classes, debugging, testing, clean code, algorithms", "Intermediate"],
            ["5  Developer essentials", "Terminal, Git and GitHub, the internet, APIs, databases, security, teamwork", "Intermediate"],
            ["6  Building websites", "HTML, CSS, JavaScript, a full portfolio site, publishing it, backends", "Intermediate"],
            ["7  Building apps", "Websites vs apps, mobile, desktop, web apps, games, app stores", "Intermediate+"],
            ["8  Tour of languages", "20 languages: what each one is for, with the same program in each", "All levels"],
            ["9  Your path forward", "Careers, a 12-month roadmap, project ideas, resources, using AI well", "All levels"],
        ],
        widths=[2.2, 5, 1.6],
    )
    b.h3("How each lesson works")
    b.steps([
        "**Explanation.** A short, plain-language explanation of one new idea.",
        "**Example code.** A small program that shows the idea. Type it yourself.",
        "**Output.** The dark box shows exactly what the program prints, so you can check your result.",
        "**Try it yourself.** Short exercises. Do them *before* looking at the answers in Appendix A.",
        "**Checkpoints.** After each Python stage there is a project and a quiz to prove you are ready to move on.",
    ])
    b.h3("The boxes you will see")
    b.table(
        ["Box", "What it means"],
        [
            [CALLOUTS["key"][0], "The single most important idea of the section. Remember this."],
            [CALLOUTS["tip"][0], "A trick or habit that makes your life easier."],
            [CALLOUTS["warn"][0], "A common mistake that almost every beginner makes."],
            [CALLOUTS["note"][0], "Extra background. Interesting, but not required."],
            [CALLOUTS["real"][0], "How professionals actually do this at work."],
            [CALLOUTS["try"][0], "Exercises. This is where the real learning happens."],
        ],
        widths=[1.3, 5],
    )
    b.h3("Six rules for learning fast")
    b.steps([
        "**Type every example yourself.** Copy-pasting teaches your eyes; typing teaches your brain and fingers.",
        "**Change the examples.** After a program works, change a number or a word and predict what will happen. Then run it.",
        "**Little and often.** 30 to 45 minutes every day beats 5 hours once a week.",
        "**Errors are normal.** Professional developers see error messages all day long. An error is a clue, not a failure.",
        "**The 20-minute rule.** Stuck for 20 minutes? Take a short break, re-read the lesson, then ask for help.",
        "**Build things.** Reading alone will not make you a programmer. The projects in this guide matter most.",
    ])
    b.h3("A suggested pace")
    b.table(
        ["Time", "Parts", "Goal"],
        [
            ["Week 1", "Parts 0 and 1", "Understand the basics and set up your tools"],
            ["Weeks 2 to 4", "Part 2", "Write small programs on your own; finish the guessing game"],
            ["Weeks 5 to 8", "Part 3", "Organise data and code; finish the to-do app"],
            ["Weeks 9 to 12", "Part 4", "Think like a developer; finish the contact book"],
            ["Month 4", "Part 5", "Use the terminal, Git, GitHub, APIs and databases"],
            ["Months 5 to 6", "Part 6", "Build and publish your own website"],
            ["Month 7", "Part 7", "Understand apps and build your first one"],
            ["Any time", "Parts 8 and 9", "Explore languages and plan your path"],
        ],
        widths=[1.4, 1.6, 4.5],
    )
    b.tip(
        "Going slower than this is completely fine. Understanding matters more than speed. "
        "If a lesson feels hard, do it twice. The second time is always easier."
    )
