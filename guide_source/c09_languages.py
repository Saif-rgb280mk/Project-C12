"""Part 8: A tour of programming languages."""

# The same tiny program in many languages: greet two people.
LANG_EXAMPLES = {
    "python": ('def greet(name):\n    return f"Hello, {name}!"\n\n\nfor name in ["Sara", "Omar"]:\n    print(greet(name))', "python3 greet.py"),
    "javascript": ('function greet(name) {\n    return `Hello, ${name}!`;\n}\n\nfor (const name of ["Sara", "Omar"]) {\n    console.log(greet(name));\n}', "node greet.js"),
    "typescript": ('function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n\nconst names: string[] = ["Sara", "Omar"];\nfor (const name of names) {\n    console.log(greet(name));\n}', "npx tsc greet.ts && node greet.js"),
    "java": ('public class Main {\n    static String greet(String name) {\n        return "Hello, " + name + "!";\n    }\n\n    public static void main(String[] args) {\n        String[] names = {"Sara", "Omar"};\n        for (String name : names) {\n            System.out.println(greet(name));\n        }\n    }\n}', "javac Main.java && java Main"),
    "csharp": ('string Greet(string name) => $"Hello, {name}!";\n\nstring[] names = { "Sara", "Omar" };\nforeach (var name in names)\n{\n    Console.WriteLine(Greet(name));\n}', "dotnet run"),
    "go": ('package main\n\nimport "fmt"\n\nfunc greet(name string) string {\n    return "Hello, " + name + "!"\n}\n\nfunc main() {\n    names := []string{"Sara", "Omar"}\n    for _, name := range names {\n        fmt.Println(greet(name))\n    }\n}', "go run greet.go"),
    "swift": ('func greet(_ name: String) -> String {\n    return "Hello, \\(name)!"\n}\n\nlet names = ["Sara", "Omar"]\nfor name in names {\n    print(greet(name))\n}', "swift greet.swift"),
    "kotlin": ('fun greet(name: String): String = "Hello, $name!"\n\nfun main() {\n    val names = listOf("Sara", "Omar")\n    for (name in names) {\n        println(greet(name))\n    }\n}', "kotlinc greet.kt -include-runtime -d greet.jar && java -jar greet.jar"),
    "dart": ("String greet(String name) => 'Hello, $name!';\n\nvoid main() {\n  final names = ['Sara', 'Omar'];\n  for (final name in names) {\n    print(greet(name));\n  }\n}", "dart run greet.dart"),
    "c": ('#include <stdio.h>\n\nvoid greet(const char *name) {\n    printf("Hello, %s!\\n", name);\n}\n\nint main(void) {\n    const char *names[] = {"Sara", "Omar"};\n    for (int i = 0; i < 2; i++) {\n        greet(names[i]);\n    }\n    return 0;\n}', "gcc greet.c -o greet && ./greet"),
    "cpp": ('#include <iostream>\n#include <string>\n#include <vector>\n\nstd::string greet(const std::string& name) {\n    return "Hello, " + name + "!";\n}\n\nint main() {\n    std::vector<std::string> names = {"Sara", "Omar"};\n    for (const auto& name : names) {\n        std::cout << greet(name) << "\\n";\n    }\n    return 0;\n}', "g++ greet.cpp -o greet && ./greet"),
    "rust": ('fn greet(name: &str) -> String {\n    format!("Hello, {}!", name)\n}\n\nfn main() {\n    let names = ["Sara", "Omar"];\n    for name in names {\n        println!("{}", greet(name));\n    }\n}', "cargo run   (or: rustc greet.rs && ./greet)"),
    "php": ('<?php\nfunction greet($name) {\n    return "Hello, $name!";\n}\n\n$names = ["Sara", "Omar"];\nforeach ($names as $name) {\n    echo greet($name) . "\\n";\n}', "php greet.php"),
    "ruby": ('def greet(name)\n  "Hello, #{name}!"\nend\n\n["Sara", "Omar"].each do |name|\n  puts greet(name)\nend', "ruby greet.rb"),
    "r": ('greet <- function(name) {\n  paste0("Hello, ", name, "!")\n}\n\nnames <- c("Sara", "Omar")\nfor (name in names) {\n  cat(greet(name), "\\n", sep = "")\n}', "Rscript greet.R"),
    "bash": ('#!/bin/bash\ngreet() {\n    echo "Hello, $1!"\n}\n\nfor name in Sara Omar; do\n    greet "$name"\ndone', "bash greet.sh"),
    "lua": ('local function greet(name)\n    return "Hello, " .. name .. "!"\nend\n\nfor _, name in ipairs({"Sara", "Omar"}) do\n    print(greet(name))\nend', "lua greet.lua"),
}


def card(b, name, lang_key, facts, desc, extra=None):
    start = len(b.story)
    b.h3(name)
    b.table(None, [[f"**{k}**", v] for k, v in facts], widths=[1.6, 6.6])
    for d in (desc if isinstance(desc, list) else [desc]):
        b.p(d)
    if lang_key in LANG_EXAMPLES:
        src, run = LANG_EXAMPLES[lang_key]
        b.code(src, lang_key, test=False)
        b.small(f"Run it with: `{run}`")
    if extra:
        extra()
    b.space(4)
    b.group(start)


def build(b):
    b.part(
        "Part 8",
        "A tour of programming languages",
        "20 languages: what each one is for, how hard it is, which tools it uses, and the same small program written in each, so you can compare.",
        [
            "How languages differ: typing, compiling and what they're designed for",
            "The web languages: HTML/CSS, JavaScript, TypeScript, PHP, Ruby",
            "General-purpose languages: Python, Java, C#, Go",
            "Mobile languages: Swift, Kotlin, Dart",
            "Systems languages: C, C++, Rust and assembly",
            "Data and scripting languages: SQL, R, Bash, Lua and more",
            "Which language to learn for which goal",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("The big picture", label="Lesson 51")
    b.p("There is no single \"best\" language. Each was designed for certain jobs. Professional developers usually know **two or three** well and can read several more. Here are the ideas that make languages different:")
    b.table(
        ["Idea", "Meaning", "Examples"],
        [
            ["**Compiled vs interpreted**", "Translated before running, or while running (Lesson 0.3)", "Compiled: C, Rust, Go. Interpreted: Python, Ruby"],
            ["**Static vs dynamic typing**", "**Static:** you (or the compiler) fix each variable's type before running, so many mistakes are caught early. **Dynamic:** types are checked while running. More flexible, but some mistakes appear later", "Static: Java, C#, TypeScript, Go, Rust. Dynamic: Python, JavaScript, Ruby"],
            ["**Memory management**", "**Garbage-collected:** the language cleans up unused memory for you. **Manual:** you manage it yourself (fast, but easy to get wrong)", "GC: Python, Java, Go. Manual: C, C++. Rust: checked by the compiler"],
            ["**Paradigm**", "The style of thinking the language encourages: step by step (procedural), objects (OOP), or functions (functional)", "Most modern languages mix all three"],
            ["**Ecosystem**", "Libraries, tools, community and jobs. Often more important than the language itself!", "npm (JavaScript), PyPI (Python), crates.io (Rust)"],
        ],
        widths=[2, 4, 2.6], font_size=8.6,
    )
    b.h3("All 20 languages at a glance")
    b.table(
        ["Language", "Main uses", "Beginner difficulty", "Typing"],
        [
            ["**Python**", "AI, data, automation, backends, education", "Easy", "Dynamic"],
            ["**JavaScript**", "Websites, web apps, servers, apps", "Easy–medium", "Dynamic"],
            ["**TypeScript**", "Large JavaScript projects", "Medium", "Static"],
            ["**HTML & CSS**", "Web page structure and style (not programming)", "Easy", "n/a"],
            ["**Java**", "Big company backends, Android, schools", "Medium", "Static"],
            ["**C#**", "Unity games, Windows apps, company backends", "Medium", "Static"],
            ["**Go**", "Cloud services, servers, tools", "Medium", "Static"],
            ["**Swift**", "iPhone, iPad and Mac apps", "Medium", "Static"],
            ["**Kotlin**", "Android apps, backends", "Medium", "Static"],
            ["**Dart**", "Flutter apps (mobile, web, desktop)", "Easy–medium", "Static"],
            ["**C**", "Operating systems, devices, microcontrollers", "Hard", "Static"],
            ["**C++**", "Games, engines, browsers, fast software", "Hard", "Static"],
            ["**Rust**", "Safe, fast systems software", "Hard", "Static"],
            ["**PHP**", "Websites, WordPress, Laravel", "Easy–medium", "Dynamic"],
            ["**Ruby**", "Web apps (Ruby on Rails)", "Easy", "Dynamic"],
            ["**SQL**", "Databases", "Easy to start", "Declarative"],
            ["**R**", "Statistics and data analysis", "Medium", "Dynamic"],
            ["**Bash / PowerShell**", "Automating the terminal and servers", "Medium", "Dynamic"],
            ["**Lua / Luau**", "Game scripting (Roblox), plugins", "Easy", "Dynamic"],
            ["**Scratch**", "Learning to think in code", "Very easy", "Blocks"],
        ],
        widths=[1.8, 4, 1.6, 1.3], font_size=8.6,
    )

    # ------------------------------------------------------------------
    b.lesson("The web languages", label="Lesson 52")
    b.p("Every example in this part does the same thing: it greets Sara and Omar. Every one of them prints:")
    b.out("Hello, Sara!\nHello, Omar!", test=False)

    b.h3("HTML and CSS")
    b.p("Covered in Part 6. They describe the structure (HTML) and style (CSS) of every web page. Every web developer needs them, whatever else they use.")

    card(b, "JavaScript", "javascript", [
        ("Used for", "Every interactive website; web apps; servers (Node.js); mobile apps (React Native); desktop apps (Electron)"),
        ("Difficulty", "Easy to start, with some confusing quirks"),
        ("Tools", "Any browser, VS Code, Node.js, npm"),
        ("Who uses it", "Practically every tech company"),
    ], "The only language that runs natively in web browsers, which makes it the most widely used language in the world. Created in 1995 in just 10 days.")

    card(b, "TypeScript", "typescript", [
        ("Used for", "The same things as JavaScript, in bigger and more serious projects"),
        ("Difficulty", "Medium (it's JavaScript plus types)"),
        ("Tools", "VS Code (which is itself written in TypeScript), Node.js, `tsc`"),
        ("Who uses it", "Microsoft (its creator), Google, Airbnb, Slack and most modern web teams"),
    ], "JavaScript with **types** added. The editor catches mistakes like passing a number where text was expected, before the code even runs. It is compiled into normal JavaScript. Most professional web projects use it today.")

    card(b, "PHP", "php", [
        ("Used for", "Server-side websites; WordPress (which runs a large share of all websites); Laravel apps"),
        ("Difficulty", "Easy to medium"),
        ("Tools", "VS Code or PhpStorm; a local server like XAMPP or Laravel Herd"),
        ("Who uses it", "WordPress, Wikipedia, Facebook (originally), Slack (parts of its backend)"),
    ], "Often joked about, but it still powers a huge part of the web, and modern PHP with **Laravel** is pleasant and productive.")

    card(b, "Ruby", "ruby", [
        ("Used for", "Web apps with **Ruby on Rails**; scripting"),
        ("Difficulty", "Easy. It was designed to make programmers happy"),
        ("Tools", "VS Code or RubyMine, the `gem` package manager"),
        ("Who uses it", "GitHub, Shopify and Airbnb were built with Rails"),
    ], "Elegant and readable, a bit like Python. Rails lets small teams build complete web products very quickly.")

    # ------------------------------------------------------------------
    b.lesson("General-purpose languages", label="Lesson 53")
    card(b, "Python", "python", [
        ("Used for", "AI and machine learning, data science, automation and scripting, web backends, science, education"),
        ("Difficulty", "Easy: the best first language"),
        ("Tools", "VS Code, PyCharm, Jupyter notebooks, pip"),
        ("Who uses it", "Google, Netflix, Instagram, NASA, nearly every AI company"),
    ], "You already know it! Its huge library ecosystem is why it dominates AI and data. Its weakness is speed, which is why heavy maths libraries are written in C underneath.")

    card(b, "Java", "java", [
        ("Used for", "Large company systems (banks, airlines, shops), Android apps, big data tools, *Minecraft: Java Edition*"),
        ("Difficulty", "Medium: wordy, but clear and strict"),
        ("Tools", "**IntelliJ IDEA**, Eclipse, VS Code; Maven or Gradle for building"),
        ("Who uses it", "Amazon, Netflix, LinkedIn, most banks, and many schools (AP Computer Science uses Java)"),
    ], "\"Write once, run anywhere\": Java code runs on the **Java Virtual Machine** (JVM) on any system. Its strict rules make huge codebases with many developers manageable.")

    card(b, "C#", "csharp", [
        ("Used for", "**Unity** games, Windows apps, company web backends (ASP.NET), cross-platform apps (.NET MAUI)"),
        ("Difficulty", "Medium: similar to Java, but a bit more modern"),
        ("Tools", "**Visual Studio**, VS Code with the C# Dev Kit, JetBrains Rider; the .NET SDK"),
        ("Who uses it", "Microsoft, Stack Overflow, countless game studios"),
    ], "Pronounced \"C sharp\". Created by Microsoft. The top choice if you want to make games with Unity.")

    card(b, "Go", "go", [
        ("Used for", "Cloud infrastructure, fast web servers, command-line tools"),
        ("Difficulty", "Medium. A deliberately small, simple language"),
        ("Tools", "VS Code with the Go extension, GoLand; `go` command"),
        ("Who uses it", "Google (its creator), Uber, Twitch; Docker and Kubernetes are written in Go"),
    ], "Also called Golang. Simple to read, very fast to compile, and great at doing many things at once (**concurrency**).")

    # ------------------------------------------------------------------
    b.lesson("Mobile languages", label="Lesson 54")
    card(b, "Swift", "swift", [
        ("Used for", "Apps for iPhone, iPad, Mac, Apple Watch and Apple TV"),
        ("Difficulty", "Medium, with a friendly modern syntax"),
        ("Tools", "**Xcode** (Mac only); Swift Playgrounds on iPad and Mac is great for learning"),
        ("Who uses it", "Apple and every company with an iPhone app"),
    ], "Created by Apple in 2014 to replace Objective-C. Combined with **SwiftUI**, it's the official way to build Apple apps (Lesson 43).")

    card(b, "Kotlin", "kotlin", [
        ("Used for", "Android apps (Google's recommended language), backends, cross-platform apps with Kotlin Multiplatform"),
        ("Difficulty", "Medium: cleaner and shorter than Java"),
        ("Tools", "**Android Studio**, IntelliJ IDEA"),
        ("Who uses it", "Google, Netflix, Pinterest and most Android developers"),
    ], "Made by JetBrains. Runs on the Java Virtual Machine and works with all Java code, but it is safer and much less wordy.")

    card(b, "Dart", "dart", [
        ("Used for", "**Flutter** apps for iOS, Android, web and desktop from one codebase"),
        ("Difficulty", "Easy to medium. Feels familiar if you know JavaScript or Java"),
        ("Tools", "VS Code or Android Studio with the Flutter plugin; DartPad (dartpad.dev) in the browser"),
        ("Who uses it", "Google (its creator), BMW, Alibaba, and many startups"),
    ], "Almost everyone who learns Dart does so to use Flutter.")

    # ------------------------------------------------------------------
    b.lesson("Systems languages: close to the machine", label="Lesson 55")
    card(b, "C", "c", [
        ("Used for", "Operating systems (Linux, the core of Windows and macOS), devices and microcontrollers, databases, other languages (Python itself is written in C)"),
        ("Difficulty", "Hard: you manage memory yourself"),
        ("Tools", "GCC or Clang compilers; VS Code, CLion; Arduino IDE for electronics"),
        ("Who uses it", "Everyone, indirectly: it's under almost everything"),
    ], "Created in 1972 and still everywhere. Learning C teaches you how computers really work: memory, pointers and the CPU. Many computer science degrees teach it for exactly that reason.")

    card(b, "C++", "cpp", [
        ("Used for", "Game engines (Unreal), high-performance games, web browsers (Chrome), trading systems, robotics"),
        ("Difficulty", "Hard: a huge and powerful language"),
        ("Tools", "Visual Studio, CLion, VS Code; GCC, Clang or MSVC compilers"),
        ("Who uses it", "Game studios, Google, Adobe, Microsoft"),
    ], "C plus classes and much more. Chosen when every millisecond counts.")

    card(b, "Rust", "rust", [
        ("Used for", "Safe, fast systems software: browsers, operating systems, command-line tools, WebAssembly"),
        ("Difficulty", "Hard at first: the compiler is very strict"),
        ("Tools", "`cargo` (excellent built-in build tool), VS Code with rust-analyzer, RustRover"),
        ("Who uses it", "Mozilla (where it started), Microsoft, Amazon, Cloudflare; parts of the Linux and Windows kernels"),
    ], "As fast as C and C++, but its compiler **prevents whole categories of memory bugs** before the program runs. For years it has been voted the most-admired language in developer surveys.")

    b.h3("Assembly")
    b.p("Assembly language is one step above machine code: each line is one CPU instruction, such as \"move this number into this register\". Today it is mostly used for tiny devices, performance tricks, reverse engineering and security research. You don't need it to start, but it's fascinating once you're curious about how CPUs work.")

    # ------------------------------------------------------------------
    b.lesson("Data and scripting languages", label="Lesson 56")
    b.h3("SQL")
    b.table(None, [
        ["**Used for**", "Asking databases questions, and changing their data (Lesson 29)"],
        ["**Difficulty**", "Easy to start, deep to master"],
        ["**Tools**", "DB Browser for SQLite, pgAdmin, DBeaver, any database"],
        ["**Who uses it**", "Developers, data analysts, scientists, product managers. Almost everyone in tech"],
    ], widths=[1.6, 6.6])
    b.p("SQL is **declarative**: you describe *what* you want, and the database works out *how* to get it. It is one of the most valuable skills in tech, whatever your job.")
    b.code("SELECT name, score\nFROM students\nWHERE score >= 80\nORDER BY score DESC;", "sql")

    card(b, "R", "r", [
        ("Used for", "Statistics, data analysis and charts, especially in science, medicine and research"),
        ("Difficulty", "Medium. A little unusual, but very powerful for data"),
        ("Tools", "**RStudio** (Posit), the tidyverse and ggplot2 libraries"),
        ("Who uses it", "Universities, researchers, health organisations, data analysts"),
    ], "Python and R are the two main languages for data. R is especially strong in classic statistics and research.")

    card(b, "Bash (and PowerShell)", "bash", [
        ("Used for", "Automating the terminal: running commands, managing servers, build scripts"),
        ("Difficulty", "Medium: the syntax is fiddly"),
        ("Tools", "Any terminal on Mac or Linux (and WSL on Windows); **PowerShell** is Windows' equivalent"),
        ("Who uses it", "DevOps engineers, back-end developers, system administrators"),
    ], "A **shell script** is a list of terminal commands saved in a file. If you find yourself typing the same commands every day, script them!")

    card(b, "Lua (and Luau)", "lua", [
        ("Used for", "Game scripting: **Roblox** (Luau), plugins and mods for games and apps"),
        ("Difficulty", "Easy: a small and simple language"),
        ("Tools", "**Roblox Studio** (Luau), VS Code, LÖVE (a 2D game framework)"),
        ("Who uses it", "Roblox creators, game studios, and app makers adding plugin systems"),
    ], "If you want to make Roblox games, this is the language you'll write, in its Luau version.")

    b.h3("Others for science and maths")
    b.p("**MATLAB** (engineering and science at universities, paid) and **Julia** (fast scientific computing, free) are common in research and engineering. Python with NumPy can do most of the same work.")

    # ------------------------------------------------------------------
    b.lesson("Block-based coding and other languages you'll hear about", label="Lesson 57")
    b.h3("Scratch and block coding")
    b.p("**Scratch** (scratch.mit.edu, from MIT) lets you build games and animations by snapping blocks together. It teaches loops, decisions, variables and events without any typing errors. **MIT App Inventor** uses the same idea for phone apps, and **Blockly** and **Code.org** for lessons. It's ideal for young learners, or for anyone who finds typed code scary at first.")
    b.h3("Other languages, in one line each")
    b.table(
        ["Language", "What it is"],
        [
            ["**Scala**", "Functional + object-oriented on the JVM; used for big data (Apache Spark)"],
            ["**Elixir**", "Very reliable systems that handle millions of connections (built on Erlang, which powers WhatsApp-style messaging)"],
            ["**Haskell**", "A purely functional language; popular in universities and research"],
            ["**Objective-C**", "The older language for Apple apps, replaced by Swift"],
            ["**Perl**", "An older scripting language for processing text; still found on servers"],
            ["**COBOL**", "From 1959! Still runs many banks and government systems"],
            ["**Fortran**", "From 1957; still used for scientific supercomputing"],
            ["**Zig**", "A modern, simple alternative to C"],
            ["**Solidity**", "Smart contracts on the Ethereum blockchain"],
            ["**GDScript**", "Godot game engine's own language, very similar to Python"],
            ["**Visual Basic / VBA**", "Automating Microsoft Excel and Office"],
        ],
        widths=[1.9, 6.3],
    )

    # ------------------------------------------------------------------
    b.lesson("Which language for which goal?", label="Lesson 58")
    b.table(
        ["I want to...", "Learn", "Then add"],
        [
            ["Learn to program (any goal)", "**Python**", "Whatever your goal below needs"],
            ["Build websites", "**HTML, CSS, JavaScript**", "TypeScript, React, then a backend"],
            ["Build web apps with accounts and data", "**JavaScript/TypeScript** or **Python**", "SQL, Node.js or Django/FastAPI"],
            ["Make iPhone apps", "**Swift**", "SwiftUI, Xcode"],
            ["Make Android apps", "**Kotlin**", "Jetpack Compose, Android Studio"],
            ["Make apps for both phones", "**Dart** (Flutter) or **JavaScript** (React Native)", "Firebase or Supabase"],
            ["Make games", "**C#** (Unity), **GDScript** (Godot), **Lua** (Roblox)", "C++ for Unreal or engine work"],
            ["Work in AI and machine learning", "**Python**", "NumPy, pandas, PyTorch, maths and statistics"],
            ["Analyse data", "**Python** or **R**, and **SQL**", "Excel, Power BI or Tableau, statistics"],
            ["Work in cybersecurity", "**Python** and **Bash**", "Networking, Linux, C for understanding exploits"],
            ["Work in cloud and DevOps", "**Bash** and **Python** or **Go**", "Linux, Docker, Kubernetes, a cloud provider"],
            ["Program robots and electronics", "**C** / **C++** (Arduino) or **MicroPython**", "Electronics basics, Raspberry Pi"],
            ["Get a job at a big company", "**Java**, **C#**, **Python** or **JavaScript**", "Data structures and algorithms, SQL, Git"],
            ["Pass a school computing exam", "**Whatever your course uses**", "Lots of practice with past papers"],
        ],
        widths=[3, 3, 2.6], font_size=8.6,
    )
    b.key("Your **first** language matters less than you think. The second one is learnt in weeks, and the third in days. What matters is **going deep** in one language first and **building real projects** with it.")
