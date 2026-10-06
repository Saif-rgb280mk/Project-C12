"""Part 0: Welcome to coding."""


def build(b):
    b.part(
        "Part 0",
        "Welcome to coding",
        "What coding really is, how computers run your code, and how to think like a programmer.",
        [
            "What a program is, using everyday examples",
            "What is inside a computer and how it runs code",
            "The difference between compiled and interpreted languages",
            "The mindset and habits that make people good at coding",
            "Which language to learn first, and why",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("What is coding?", label="Lesson 0.1")
    b.p(
        "A computer is incredibly fast. It can do billions of calculations every second. "
        "But it has **no common sense at all**. It cannot guess what you mean. It does "
        "exactly what it is told: nothing more, nothing less."
    )
    b.p(
        "**Coding** (also called **programming**) means writing exact instructions in a "
        "language the computer understands. A list of instructions like that is called a "
        "**program**. A program can also be called **code**, **software**, an **app** or a **script**."
    )
    b.h3("A program is like a recipe")
    b.p("Here is a recipe a human can follow, next to a program a computer can follow:")
    b.table(
        ["Recipe for a human", "Program for a computer (Python)"],
        [
            ["1. Ask the guest their name", "`name = input(\"What is your name? \")`"],
            ["2. Say hello to them by name", "`print(\"Hello,\", name)`"],
            ["3. Ask how many cups of tea they want", "`cups = int(input(\"How many cups? \"))`"],
            ["4. Tell them how much sugar you need", "`print(\"Sugar needed:\", cups * 2, \"spoons\")`"],
        ],
        widths=[3, 4.2],
    )
    b.p(
        "Both are steps that run **in order, from top to bottom, one at a time**. The difference "
        "is that the computer needs every step written in a very precise way. A human "
        "understands \"make tea\". A computer needs every tiny step spelled out."
    )
    b.key(
        "A program is a list of instructions that the computer follows exactly, "
        "from top to bottom, one line at a time."
    )
    b.h3("Code is everywhere")
    b.bullets([
        "**Phone apps** like WhatsApp, TikTok and Instagram are code.",
        "**Websites** like YouTube, Google and Wikipedia are code.",
        "**Games** like Minecraft, Fortnite and Roblox are code.",
        "**Everyday machines**: cars, traffic lights, washing machines, ATMs and smart TVs all run code.",
        "**AI assistants**, like the one helping you right now, are built with code.",
    ])
    b.p(
        "Everything you will ever build, from a tiny calculator to a huge app, is made of a "
        "few simple building blocks: **storing values**, **making decisions**, **repeating things**, "
        "and **grouping steps** into reusable pieces. This guide teaches those blocks one by one."
    )

    # ------------------------------------------------------------------
    b.lesson("What is inside a computer?", label="Lesson 0.2")
    b.p(
        "You do not need to be a hardware expert to code. But knowing the four main parts "
        "will help you understand error messages and why some programs are slow."
    )
    b.table(
        ["Part", "What it does", "Everyday comparison"],
        [
            ["**CPU** (processor)", "Runs the instructions. The \"brain\".", "A chef who follows the recipe"],
            ["**RAM** (memory)", "Short-term storage for programs that are running now. Very fast. Emptied when the power goes off.", "The kitchen counter you are working on"],
            ["**Storage** (SSD or hard drive)", "Long-term storage for files and apps. Slower than RAM, but it keeps everything when turned off.", "The fridge and cupboards"],
            ["**Operating system** (Windows, macOS, Linux, Android, iOS)", "The main program that manages everything else: files, apps, screen, keyboard and internet.", "The restaurant manager"],
        ],
        widths=[2, 3.6, 2.4],
    )
    b.h3("Everything is numbers: binary")
    b.p(
        "Inside, a computer only understands two states: electricity **on** (1) and **off** (0). "
        "This is called **binary**. A single 0 or 1 is a **bit**. Eight bits make a **byte**. "
        "Letters, photos, music and videos are all stored as huge collections of 0s and 1s."
    )
    b.table(
        ["Normal number", "Binary", "How it works"],
        [
            ["0", "`0000`", "nothing switched on"],
            ["1", "`0001`", "1"],
            ["2", "`0010`", "2"],
            ["5", "`0101`", "4 + 1"],
            ["10", "`1010`", "8 + 2"],
        ],
        widths=[1.6, 1.6, 3],
    )
    b.note(
        "Sizes you will hear about: 1 kilobyte (KB) is about 1,000 bytes, a page of text. "
        "1 megabyte (MB) is about a million bytes, a photo. 1 gigabyte (GB) is about a billion "
        "bytes, a film. 1 terabyte (TB) is about 1,000 GB, a whole computer's storage."
    )

    # ------------------------------------------------------------------
    b.lesson("How your code becomes something the computer can run", label="Lesson 0.3")
    b.p(
        "Computers only understand **machine code**: binary instructions for the CPU. "
        "Humans are terrible at writing that, so we invented **programming languages**. "
        "These are human-friendly languages that get *translated* into machine code. "
        "The code you write is called **source code**. There are two main ways to translate it:"
    )
    b.table(
        ["", "Compiled languages", "Interpreted languages"],
        [
            ["**How**", "The whole program is translated *before* it runs, into a separate file that can be run directly.", "The program is translated *while* it runs, line by line, by a program called an interpreter."],
            ["**Like**", "Translating a whole book before publishing it", "A live interpreter at a meeting"],
            ["**Good**", "Very fast programs", "Easy to start, quick to test changes"],
            ["**Examples**", "C, C++, Rust, Go, Swift", "Python, JavaScript, Ruby, PHP"],
        ],
        widths=[1.2, 3.3, 3.3],
    )
    b.p(
        "Some languages, like **Java**, **Kotlin** and **C#**, sit in between. They are compiled "
        "into an in-between form called *bytecode*, which a *virtual machine* then runs. "
        "This lets the same program run on Windows, Mac and Linux."
    )
    b.note("You do not need to memorise this. Just remember that a tool always sits between your "
           "code and the computer and translates it. For Python, that tool is the **Python interpreter**.")
    b.h3("Words you will hear all the time")
    b.table(
        ["Word", "Meaning"],
        [
            ["**Source code**", "The text of a program that a human writes"],
            ["**Run / execute**", "Tell the computer to start following the program"],
            ["**Syntax**", "The grammar rules of a programming language"],
            ["**Bug**", "A mistake in a program that makes it behave wrongly"],
            ["**Debugging**", "Finding and fixing bugs"],
            ["**Editor / IDE**", "The app you write code in (IDE means Integrated Development Environment)"],
            ["**Terminal**", "A window where you type commands instead of clicking"],
            ["**Library / package**", "Code someone else wrote that you can reuse"],
            ["**Framework**", "A big library that gives your project a ready-made structure (for example React or Django)"],
            ["**Frontend / backend**", "The part users see / the part on the server that users don't see"],
        ],
        widths=[1.8, 5],
    )
    b.small("There is a full glossary of more than 90 words in Appendix B.")

    # ------------------------------------------------------------------
    b.lesson("The programmer mindset", label="Lesson 0.4")
    b.p(
        "Good programmers are not geniuses who never make mistakes. They are people who "
        "**stay calm, break problems into small pieces, and keep trying**. These habits "
        "matter more than talent."
    )
    b.h3("1. Errors are clues, not failures")
    b.p(
        "Your code will break. A lot. That is normal for everyone, including people with 20 "
        "years of experience. An error message tells you **what** went wrong and **where**. "
        "Learning to read error messages is one of the most valuable skills you can have."
    )
    b.h3("2. Break big problems into small steps")
    b.p("\"Make a game\" is too big to start. Break it down until every step is easy:")
    b.steps([
        "Show a message: \"Guess my number\"",
        "Let the player type a number",
        "Check if the number is right",
        "If it is wrong, say \"too high\" or \"too low\"",
        "Repeat until the player is right",
        "Count the attempts and show the score",
    ])
    b.p("Each step is easy on its own. Developers call this **decomposition**. You will build this exact game in Part 2.")
    b.h3("3. Practise a little every day")
    b.p("Your brain learns through repetition. Short, daily practice builds skill much faster than rare, long sessions.")
    b.h3("4. Avoid \"tutorial hell\"")
    b.p(
        "Tutorial hell is when you watch video after video but cannot build anything on your own. "
        "The cure is simple: **after every lesson, build something small without help**, even if it is ugly."
    )
    b.h3("5. Ask good questions")
    b.p("When you ask someone (a teacher, a forum or an AI assistant) for help, include:")
    b.bullets([
        "What you are trying to do",
        "Your code (the actual code, not a description of it)",
        "The **full** error message",
        "What you expected, and what actually happened",
        "What you have already tried",
    ])
    b.tip("Often, just writing a clear question makes you spot the answer yourself. "
          "Developers even explain their code out loud to a rubber duck to find bugs. "
          "This really works, and it's called *rubber duck debugging*.")
    b.h3("6. Do I need to be good at maths?")
    b.p(
        "For most programming, **no**. Basic arithmetic and logical thinking are enough for "
        "websites, apps and automation. More maths helps in specific areas: games (geometry), "
        "AI and data science (statistics, algebra) and graphics. You can learn it when you need it."
    )

    # ------------------------------------------------------------------
    b.lesson("Which language should I learn first?", label="Lesson 0.5")
    b.p("There are hundreds of programming languages. As a beginner, three names come up most often:")
    b.table(
        ["", "Python", "JavaScript", "Java"],
        [
            ["**Easy to learn?**", "Easiest. Reads almost like English.", "Medium. Has some odd quirks.", "Harder. Lots of extra code."],
            ["**Hello world**", "`print(\"Hi\")`", "`console.log(\"Hi\")`", "5 lines of setup code"],
            ["**Best for**", "Learning, automation, data, AI, back-end servers", "Websites, web apps, some mobile and desktop apps", "Android, big company systems, school courses"],
            ["**Runs in a web browser?**", "No", "Yes, it is the only language browsers run", "No"],
            ["**Speed**", "Slower", "Fast", "Fast"],
        ],
        widths=[1.7, 2.3, 2.5, 2.3],
    )
    b.p("Here is the same tiny program in all three. It counts from 1 to 3:")
    b.code('for i in range(1, 4):\n    print(i)', "python", test=True)
    b.code('for (let i = 1; i <= 3; i++) {\n    console.log(i);\n}', "javascript")
    b.code(
        'public class Main {\n    public static void main(String[] args) {\n'
        '        for (int i = 1; i <= 3; i++) {\n            System.out.println(i);\n'
        '        }\n    }\n}',
        "java",
    )
    b.p("All three print the same thing. Python just needs the least extra code, so you can "
        "focus on *thinking* instead of fighting the syntax.")
    b.key(
        "Start with **Python**. The ideas you learn (variables, decisions, loops, functions, "
        "objects) work in *every* language. After Python, JavaScript or Java takes weeks to "
        "learn instead of months."
    )
    b.warn(
        "There are two exceptions. **(1)** If your school or exam uses Java or JavaScript, learn that one "
        "first, because passing comes first. **(2)** If you *only* want to build websites, start "
        "learning JavaScript after Part 2 of this guide."
    )
    b.note(
        "Java and JavaScript are **not related**, despite the similar names. JavaScript got "
        "its name in 1995 as a marketing trick, because Java was popular at the time. "
        "Part 8 explains 20 languages and what each is used for."
    )
    b.h3("The plan for this guide")
    b.steps([
        "Learn to **think like a programmer** with Python (Parts 2 to 4)",
        "Learn the **tools every developer uses**: terminal, Git, databases (Part 5)",
        "Build **websites** with HTML, CSS and JavaScript (Part 6)",
        "Understand and build **apps**: mobile, desktop and games (Part 7)",
        "Explore **other languages** and choose your path (Parts 8 and 9)",
    ])
