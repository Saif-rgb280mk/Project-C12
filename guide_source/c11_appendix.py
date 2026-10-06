"""Appendices: answers, glossary, cheat sheets, troubleshooting, FAQ, checklist."""


def ans(b, n, text, code=None, out=None, lang="python"):
    b.p(f"**{n}.** {text}", kwn=bool(code))
    if code:
        b.code(code, lang)
    if out is not None:
        b.out(out)


def build(b):
    b.part(
        "Appendices",
        "Answers, references and checklists",
        "Answers to every exercise and quiz, a glossary, cheat sheets, a troubleshooting guide, keyboard shortcuts, FAQs and your progress checklist.",
        [
            "Appendix A: answers to all exercises and quizzes",
            "Appendix B: glossary of 90+ terms",
            "Appendix C: Python cheat sheet",
            "Appendix D: HTML, CSS and JavaScript cheat sheet",
            "Appendix E: troubleshooting: when things don't work",
            "Appendix F: keyboard shortcuts",
            "Appendix G: frequently asked questions",
            "Appendix H: your progress checklist",
        ],
    )

    # ==================================================================
    b.lesson("Answers to exercises and quizzes", label="Appendix A")
    b.p("There is usually **more than one correct answer**. If your code works and is readable, it's right! Compare with these answers to learn other ways of doing it. For the project challenges, there's no single answer. Share your code with a teacher, a friend or an AI assistant for a review.")

    b.h3("Lesson 1: Your first program")
    ans(b, 1, "Three `print` lines:", 'print("Sara")\nprint(16)\nprint("Cairo")', "Sara\n16\nCairo")
    ans(b, 2, "", "print(12 * 7)", "84")
    ans(b, 3, "Removing a quote gives an error like `SyntaxError: unterminated string literal (detected at line 1)`. Python means: a string started, but never ended. Put the quote back to fix it.")
    ans(b, 4, "", 'print("*****")\nprint("*   *")\nprint("*****")', "*****\n*   *\n*****")

    b.h3("Lesson 2: Variables")
    ans(b, 1, "", 'city = "Cairo"\ncountry = "Egypt"\nprint("I live in " + city + ", " + country)', "I live in Cairo, Egypt")
    ans(b, 2, "", "price = 4\nquantity = 3\nprint(price * quantity)", "12")
    ans(b, 3, "", "coins = 50\ncoins -= 20\ncoins += 35\nprint(coins)", "65")
    ans(b, 4, "Use a temporary variable. Python also has a one-line trick: `a, b = b, a`.", "a = 1\nb = 2\ntemp = a\na = b\nb = temp\nprint(a, b)", "2 1")

    b.h3("Lesson 3: Data types and maths")
    ans(b, 1, "", "print(60 * 60 * 24)", "86400")
    ans(b, 2, "", "c = 100\nprint(c * 9 / 5 + 32)", "212.0")
    ans(b, 3, "", 'minutes = 135\nprint(minutes // 60, "hours and", minutes % 60, "minutes")', "2 hours and 15 minutes")
    ans(b, 4, "`2 ** 10` is `1024`, and `17 % 5` is `2` (17 = 3 × 5 + **2**).")

    b.h3("Lesson 4: Input")
    ans(b, 1, "", 'a = float(input("First number: "))\nb = float(input("Second number: "))\nprint("Sum:", a + b)\nprint("Difference:", a - b)\nprint("Product:", a * b)\nprint("Division:", a / b)')
    ans(b, 2, "", 'year = int(input("What year were you born? "))\nprint("This year you turn", 2026 - year)')
    ans(b, 3, "", 'total = int(input("Minutes: "))\nprint(total // 60, "hours and", total % 60, "minutes")')
    ans(b, 4, "", 'name = input("Your name: ")\nfood = input("Favourite food: ")\nprint(name + " would eat " + food + " for breakfast, lunch and dinner!")')

    b.h3("Lesson 5: Strings")
    ans(b, 1, "", 'name = input("Your name: ")\nprint(name.upper())\nprint(f"Your name has {len(name)} letters")')
    ans(b, 2, "", 'word = input("A word: ")\nprint("First:", word[0])\nprint("Last:", word[-1])')
    ans(b, 3, "", 'print("=" * 30)\nprint("MY AMAZING PROGRAM")\nprint("=" * 30)')
    ans(b, 4, "", 'name = "Sara"\nscore = 91\ntotal = 100\npercent = score * 100 // total\nprint(f"{name} scored {score} points out of {total} ({percent}%)")', "Sara scored 91 points out of 100 (91%)")

    b.h3("Lesson 6: Decisions")
    ans(b, 1, "", 'number = float(input("A number: "))\nif number > 0:\n    print("Positive")\nelif number < 0:\n    print("Negative")\nelse:\n    print("Zero")')
    ans(b, 2, "", 'password = input("Password: ")\nif password == "open123":\n    print("Access granted")\nelse:\n    print("Access denied")')
    ans(b, 3, "", 'a = float(input("First: "))\nb = float(input("Second: "))\nc = float(input("Third: "))\n\nbiggest = a\nif b > biggest:\n    biggest = b\nif c > biggest:\n    biggest = c\nprint("Biggest:", biggest)')
    ans(b, 4, "Change `year` to test each one: 2024 and 2000 are leap years, but 1900 is not (divisible by 100, but not by 400).", 'year = 2024\nif year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):\n    print(year, "is a leap year")\nelse:\n    print(year, "is not a leap year")', "2024 is a leap year")

    b.h3("Lesson 7: while loops")
    ans(b, 1, "", "n = 2\nwhile n <= 20:\n    print(n)\n    n += 2")
    ans(b, 2, "", 'total = 0\nnumber = int(input("Number (0 to stop): "))\nwhile number != 0:\n    total += number\n    number = int(input("Number (0 to stop): "))\nprint("Total:", total)')
    ans(b, 3, "", 'i = 1\nwhile i <= 10:\n    print(f"7 x {i} = {7 * i}")\n    i += 1')
    ans(b, 4, "", 'balance = 1000\nyears = 0\nwhile balance <= 2000:\n    balance *= 1.05\n    years += 1\nprint(years, "years")', "15 years")

    b.h3("Lesson 8: for loops")
    ans(b, 1, "", 'for i in range(10, 0, -1):\n    print(i)\nprint("Happy New Year!")')
    ans(b, 2, "`letter in \"aeiou\"` checks whether the letter appears in that string.", 'word = input("A word: ").lower()\ncount = 0\nfor letter in word:\n    if letter in "aeiou":\n        count += 1\nprint(count, "vowels")')
    ans(b, 3, "Check for 15 **first** (multiples of both 3 and 5). Otherwise, 15 would print just Fizz.", 'for n in range(1, 31):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)')
    ans(b, 4, "", 'n = int(input("Height: "))\nfor row in range(1, n + 1):\n    print("#" * row)')

    b.h3("Quiz 1")
    b.steps([
        "`3`",
        "`str` (it's in quotes, so it's text)",
        "It uses `=` (store) instead of `==` (compare). Correct: `if x == 5:`",
        "`2`, `4`, `6` (8 is not included)",
        "Always a string (`str`)",
        "`30` (10 + 5 = 15, then 15 × 2 = 30)",
        "`=` stores a value in a variable. `==` compares two values and gives `True` or `False`.",
        "`\"ababab\"`",
        "Press **Ctrl + C** in the terminal (or the editor's Stop button)",
        "`11` (the space counts as a character)",
    ])

    b.h3("Lesson 9: Lists")
    ans(b, 1, "", 'items = []\nwhile True:\n    item = input("Item (or done): ")\n    if item == "done":\n        break\n    items.append(item)\n\nfor number, item in enumerate(items, start=1):\n    print(number, item)')
    ans(b, 2, "", "numbers = [4, 19, 7, 33, 2]\nbiggest = numbers[0]\nfor n in numbers:\n    if n > biggest:\n        biggest = n\nprint(biggest)", "33")
    ans(b, 3, "", "scores = [55, 82, 71, 90, 48, 67]\ncount = 0\nfor s in scores:\n    if s >= 70:\n        count += 1\nprint(count)", "3")
    ans(b, 4, "", "numbers = [1, 2, 2, 3, 1, 4]\nunique = []\nfor n in numbers:\n    if n not in unique:\n        unique.append(n)\nprint(unique)", "[1, 2, 3, 4]")

    b.h3("Lesson 11: Dictionaries")
    ans(b, 1, "", 'phone_book = {"Sara": "0101234567", "Omar": "0119876543", "Lina": "0125556677"}\nname = input("Name: ")\nprint(phone_book.get(name, "Not found"))')
    ans(b, 2, "", 'sentence = input("A sentence: ").lower()\ncounts = {}\nfor word in sentence.split():\n    counts[word] = counts.get(word, 0) + 1\nfor word, count in counts.items():\n    print(word, count)')
    ans(b, 3, "", 'stock = {"pens": 10, "books": 4}\nprices = {"pens": 1.5, "books": 12}\ntotal = 0\nfor item, amount in stock.items():\n    total += amount * prices[item]\nprint(total)', "63.0")
    ans(b, 4, "", 'students = [\n    {"name": "Sara", "score": 91},\n    {"name": "Omar", "score": 78},\n    {"name": "Lina", "score": 85},\n]\nbest = students[0]\nfor s in students:\n    if s["score"] > best["score"]:\n        best = s\nprint(best["name"])', "Sara")

    b.h3("Lesson 12: Functions")
    ans(b, 1, "", "def is_even(n):\n    return n % 2 == 0\n\nprint(is_even(4), is_even(7))", "True False")
    ans(b, 2, "", "def rectangle_area(width, height):\n    return width * height\n\n\ndef circle_area(radius):\n    return 3.14159 * radius ** 2\n\n\nprint(rectangle_area(3, 4))\nprint(circle_area(2))", "12\n12.56636")
    ans(b, 3, "", 'def count_vowels(text):\n    count = 0\n    for letter in text.lower():\n        if letter in "aeiou":\n            count += 1\n    return count\n\nprint(count_vowels("Programming"))', "3")
    ans(b, 4, "A faster version only checks divisors up to the square root of `n`, but this one is easier to understand.", "def is_prime(n):\n    if n < 2:\n        return False\n    for divisor in range(2, n):\n        if n % divisor == 0:\n            return False\n    return True\n\n\nprimes = []\nfor n in range(50):\n    if is_prime(n):\n        primes.append(n)\nprint(primes)", "[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]")

    b.h3("Lesson 13: Strings in depth")
    ans(b, 1, "", 'sentence = input("A sentence: ")\nprint(len(sentence.split()), "words")')
    ans(b, 2, "", 'def acronym(phrase):\n    letters = ""\n    for word in phrase.split():\n        letters += word[0].upper()\n    return letters\n\nprint(acronym("portable network graphics"))', "PNG")
    ans(b, 3, "", 'def is_palindrome(text):\n    cleaned = text.replace(" ", "").lower()\n    return cleaned == cleaned[::-1]\n\nprint(is_palindrome("Never odd or even"))', "True")
    ans(b, 4, "", 'email = input("Email: ")\nprint(email.split("@")[0])')

    b.h3("Lesson 14: Errors")
    ans(b, 1, "", 'def get_number(prompt):\n    while True:\n        try:\n            return float(input(prompt))\n        except ValueError:\n            print("Please type a number.")')
    ans(b, 2, "", 'fruits = ["apple", "banana", "cherry"]\ntry:\n    position = int(input("Position: "))\n    print(fruits[position])\nexcept ValueError:\n    print("Please type a whole number.")\nexcept IndexError:\n    print(f"Please choose 0 to {len(fruits) - 1}.")')
    ans(b, 3, "`total = n` **replaces** the total each time, so after the loop it's just the last number (6), and 6 / 3 = 2.0. The fix is `total += n`. Lesson 20 shows how to find this kind of bug.")

    b.h3("Lesson 15: Files")
    ans(b, 1, "", 'from datetime import date\n\nentry = input("Today\'s entry: ")\nwith open("diary.txt", "a") as file:\n    file.write(f"{date.today()}: {entry}\\n")\nprint("Saved!")')
    ans(b, 2, "", 'count = 0\nwith open("notes.txt") as file:\n    for line in file:\n        count += 1\nprint(count, "lines")')
    ans(b, 3, "", 'def load_high_score():\n    try:\n        with open("highscore.txt") as file:\n            return int(file.read())\n    except (FileNotFoundError, ValueError):\n        return 0\n\n\ndef save_high_score(score):\n    with open("highscore.txt", "w") as file:\n        file.write(str(score))\n\n\nhigh = load_high_score()\nscore = int(input("Your score: "))\nif score > high:\n    save_high_score(score)\n    print("New high score!")\nelse:\n    print("The high score is still", high)')

    b.h3("Lesson 16: Modules")
    ans(b, 1, "", 'import random\n\ncount = int(input("How many dice? "))\ntotal = 0\nfor i in range(count):\n    roll = random.randint(1, 6)\n    print("Rolled", roll)\n    total += roll\nprint("Total:", total)')
    ans(b, 2, "For real passwords, use the `secrets` module (`secrets.choice`) instead of `random`. It is designed to be unpredictable, which matters for security.", 'import random\nimport string\n\ncharacters = string.ascii_letters + string.digits + "!@#$%"\npassword = ""\nfor i in range(12):\n    password += random.choice(characters)\nprint(password)')
    ans(b, 3, "Change 5 and 17 to your birthday's month and day.", 'from datetime import date\n\ntoday = date.today()\nbirthday = date(today.year, 5, 17)\nif birthday < today:\n    birthday = date(today.year + 1, 5, 17)\nprint((birthday - today).days, "days to go!")')
    ans(b, 4, "", "import turtle\n\npen = turtle.Turtle()\nfor i in range(5):\n    pen.forward(150)\n    pen.right(144)\nturtle.done()")

    b.h3("Quiz 2")
    b.steps([
        "`20` (index 1 is the second item)",
        "`items.sort()` changes the list itself (and returns `None`). `sorted(items)` returns a **new** sorted list and leaves the original alone.",
        "A `set`",
        "`my_dict.get(\"key\", default_value)`",
        "`print` shows a value on the screen. `return` sends a value back to the code that called the function, so it can be stored and used.",
        "`['a', 'b', 'c']`",
        "`\"nohtyP\"`",
        "`\"w\"` (write)",
        "From the bottom up: the last line gives the error type and message",
        "`python -m pip install requests` (`python3` on Mac and Linux)",
    ])

    b.h3("Lesson 17: Classes")
    ans(b, 1, "", "class Rectangle:\n    def __init__(self, width, height):\n        self.width = width\n        self.height = height\n\n    def area(self):\n        return self.width * self.height\n\n    def perimeter(self):\n        return 2 * (self.width + self.height)\n\n\nr = Rectangle(3, 4)\nprint(r.area(), r.perimeter())", "12 14")
    ans(b, 2, "", 'class Student:\n    def __init__(self, name):\n        self.name = name\n        self.grades = []\n\n    def add_grade(self, grade):\n        self.grades.append(grade)\n\n    def average(self):\n        if not self.grades:\n            return 0\n        return sum(self.grades) / len(self.grades)\n\n\ns = Student("Lina")\ns.add_grade(90)\ns.add_grade(80)\nprint(s.name, s.average())', "Lina 85.0")
    ans(b, 3, "", 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n        self.history = []\n\n    def deposit(self, amount):\n        if amount <= 0:\n            print("Deposit must be positive.")\n            return\n        self.balance += amount\n        self.history.append(f"+{amount}")\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print("Not enough money!")\n            return\n        self.balance -= amount\n        self.history.append(f"-{amount}")\n\n    def show_history(self):\n        for item in self.history:\n            print(item)\n\n\naccount = BankAccount("Sara", 100)\naccount.deposit(50)\naccount.withdraw(30)\naccount.show_history()', "+50\n-30")

    b.h3("Quiz 3")
    b.steps([
        "A class is the blueprint. An object is one thing built from it (an *instance*).",
        "The particular object the method was called on (in `rex.bark()`, `self` is `rex`).",
        "Encapsulation, abstraction, inheritance and polymorphism.",
        "`[n * n for n in range(11) if n % 2 == 0]` gives `[0, 4, 16, 36, 64, 100]`.",
        "A marker on a line where the debugger pauses the program so you can inspect the variables.",
        "It raises an `AssertionError` and stops the program, telling you the test failed.",
        "O(log n). The list must be **sorted**.",
        "A stack (Last In, First Out).",
        "A **base case** that stops the recursion.",
        "Bugs love boundaries: it's easy to write `>` when you meant `>=`. Testing the exact values where behaviour changes catches these \"off-by-one\" mistakes.",
    ])

    b.h3("Lesson 34: HTML")
    ans(b, 3, "Link the two pages to each other with relative links:", '<!-- in index.html -->\n<a href="games.html">My favourite games</a>\n\n<!-- in games.html -->\n<a href="index.html">Back to home</a>', None, "html")
    ans(b, 4, "", '<form>\n    <label for="name">Name</label>\n    <input type="text" id="name" required>\n\n    <label for="email">Email</label>\n    <input type="email" id="email" required>\n\n    <label for="password">Password</label>\n    <input type="password" id="password" minlength="8" required>\n\n    <label for="dob">Date of birth</label>\n    <input type="date" id="dob">\n\n    <label>\n        <input type="checkbox" required> I agree to the rules\n    </label>\n\n    <button type="submit">Sign up</button>\n</form>', None, "html")

    b.h3("Lesson 35: CSS")
    ans(b, 2, "", ".card {\n    padding: 24px;\n    border-radius: 12px;\n    background: white;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n    transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.card:hover {\n    transform: translateY(-6px);\n    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);\n}", None, "css")
    ans(b, 3, "", ".navbar {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    padding: 16px 32px;\n}\n\n.navbar a {\n    margin-left: 16px;\n}", None, "css")
    ans(b, 4, "", ".gallery {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 16px;\n}\n\n@media (max-width: 600px) {\n    .gallery {\n        grid-template-columns: 1fr;\n    }\n}", None, "css")

    b.h3("Lesson 36: JavaScript")
    ans(b, 1, "", '<input id="name-input" placeholder="Your name">\n<button id="greet-btn">Greet me</button>\n<p id="greeting"></p>', None, "html")
    b.code('const nameInput = document.querySelector("#name-input");\nconst greeting = document.querySelector("#greeting");\n\ndocument.querySelector("#greet-btn").addEventListener("click", () => {\n    greeting.textContent = `Hello, ${nameInput.value}!`;\n});', "javascript")
    ans(b, 2, "With a button `<button id=\"color-btn\">New colour</button>`:", 'document.querySelector("#color-btn").addEventListener("click", () => {\n    const r = Math.floor(Math.random() * 256);\n    const g = Math.floor(Math.random() * 256);\n    const b = Math.floor(Math.random() * 256);\n    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;\n});', None, "javascript")
    ans(b, 3, "Add the CSS rule `.done { text-decoration: line-through; }` too.", '<input id="task-input" placeholder="New task">\n<button id="add-btn">Add</button>\n<ul id="task-list"></ul>', None, "html")
    b.code('const taskInput = document.querySelector("#task-input");\nconst taskList = document.querySelector("#task-list");\n\ndocument.querySelector("#add-btn").addEventListener("click", () => {\n    const text = taskInput.value.trim();\n    if (text === "") {\n        return;\n    }\n    const li = document.createElement("li");\n    li.textContent = text;\n    li.addEventListener("click", () => li.classList.toggle("done"));\n    taskList.append(li);\n    taskInput.value = "";\n});', "javascript")
    ans(b, 4, "", '<input id="a" type="number"> <input id="b" type="number">\n<button data-op="+">+</button> <button data-op="-">-</button>\n<button data-op="*">x</button> <button data-op="/">/</button>\n<p id="result"></p>', None, "html")
    b.code('const result = document.querySelector("#result");\n\nfor (const button of document.querySelectorAll("button[data-op]")) {\n    button.addEventListener("click", () => {\n        const a = Number(document.querySelector("#a").value);\n        const b = Number(document.querySelector("#b").value);\n        const op = button.dataset.op;\n        let answer;\n        if (op === "+") {\n            answer = a + b;\n        } else if (op === "-") {\n            answer = a - b;\n        } else if (op === "*") {\n            answer = a * b;\n        } else {\n            answer = b === 0 ? "You can\'t divide by zero" : a / b;\n        }\n        result.textContent = answer;\n    });\n}', "javascript")

    # ==================================================================
    b.lesson("Glossary", label="Appendix B")
    terms = [
        ("Algorithm", "A step-by-step method for solving a problem"),
        ("API", "A way for programs to talk to each other, usually by sending requests and receiving JSON"),
        ("App store", "A shop for apps: Apple App Store, Google Play, Microsoft Store"),
        ("Argument", "A value you pass into a function when calling it: in `greet(\"Sara\")`, `\"Sara\"` is the argument"),
        ("Array", "An ordered list of values (called a list in Python)"),
        ("Assembly", "A low-level language where each line is one CPU instruction"),
        ("Authentication", "Checking who a user is (logging in)"),
        ("Backend", "The part of an app that runs on a server: logic, data and security"),
        ("Big-O", "A way to describe how an algorithm's work grows as its input grows"),
        ("Binary", "The number system of 0s and 1s that computers use"),
        ("Boolean", "A value that is either `True` or `False`"),
        ("Branch (Git)", "A separate line of work in a repository"),
        ("Breakpoint", "A marker where the debugger pauses your program"),
        ("Browser", "The app that shows websites: Chrome, Firefox, Safari, Edge"),
        ("Bug", "A mistake in a program"),
        ("Cache", "A store of data kept close by, so it can be reused quickly"),
        ("Class", "A blueprint for creating objects"),
        ("CLI", "Command-line interface: a program you use by typing in the terminal"),
        ("Client", "The program asking for something, usually the browser or app"),
        ("Cloud", "Computers you rent over the internet (AWS, Azure, Google Cloud)"),
        ("Commit", "A saved snapshot of your project in Git"),
        ("Compiler", "A program that translates all of your code into machine code before it runs"),
        ("Component", "A reusable piece of user interface, in frameworks like React or Flutter"),
        ("Concatenation", "Joining strings together"),
        ("Container", "A packaged app with everything it needs to run (Docker)"),
        ("CRUD", "Create, Read, Update, Delete: the four basic data operations"),
        ("CSS", "The language that styles web pages"),
        ("Database", "Software for storing and searching large amounts of data"),
        ("Debugging", "Finding and fixing bugs"),
        ("Deploy", "Put your software live, for real users"),
        ("Dictionary", "A collection of key: value pairs"),
        ("DNS", "The internet's phone book: it turns domain names into IP addresses"),
        ("DOM", "The browser's tree of objects for a web page, which JavaScript can change"),
        ("Domain name", "A website's human-friendly address, like `example.com`"),
        ("Edge case", "An unusual input at the limits, like an empty list or zero"),
        ("Event", "Something that happens, like a click or key press, that code can react to"),
        ("Exception", "An error that happens while a program runs"),
        ("Framework", "A large library that gives your project structure (React, Django, Flutter)"),
        ("Frontend", "The part of an app that users see and touch"),
        ("Full-stack", "Working on both frontend and backend"),
        ("Function", "A named, reusable block of code"),
        ("Git", "A version control system that tracks the history of your code"),
        ("GitHub", "A website for hosting Git repositories and collaborating"),
        ("Hosting", "A service that keeps your website or app running online"),
        ("HTML", "The language for the structure and content of web pages"),
        ("HTTP / HTTPS", "The protocol browsers and servers use to talk; the S means encrypted"),
        ("IDE", "Integrated Development Environment: an editor with built-in tools"),
        ("Index", "The position of an item in a sequence, starting at 0"),
        ("Infinite loop", "A loop that never stops"),
        ("Inheritance", "A class reusing the code of another class"),
        ("Interpreter", "A program that runs code line by line"),
        ("IP address", "A number that identifies a computer on a network"),
        ("JSON", "A text format for data, which looks like Python dictionaries and lists"),
        ("Keyword", "A word reserved by the language, like `if`, `for` or `def`"),
        ("Library / package", "Reusable code that someone else wrote"),
        ("Linter", "A tool that warns you about likely mistakes and style problems"),
        ("Loop", "Code that repeats"),
        ("Merge", "Combining changes from one branch into another"),
        ("Method", "A function that belongs to an object"),
        ("Module", "A file of code that can be imported"),
        ("MVP", "Minimum viable product: the smallest useful version of an app"),
        ("Native app", "An app built with a platform's own language and tools"),
        ("Node.js", "A program that runs JavaScript outside the browser"),
        ("npm / pip", "Package managers for JavaScript / Python"),
        ("Object", "A thing built from a class, with attributes and methods"),
        ("Open source", "Software whose code is public, and that anyone can study and contribute to"),
        ("Operating system", "The main software that runs a computer: Windows, macOS, Linux, Android, iOS"),
        ("Parameter", "A variable in a function definition that receives an argument"),
        ("Pull request (PR)", "A request to review and merge your changes"),
        ("PWA", "Progressive web app: a website that can be installed like an app"),
        ("Query", "A question asked to a database, usually in SQL"),
        ("RAM", "The computer's fast, short-term memory"),
        ("Recursion", "A function calling itself"),
        ("Refactor", "Improving code's structure without changing what it does"),
        ("Repository (repo)", "A project tracked by Git"),
        ("Responsive design", "Websites that adapt to any screen size"),
        ("Return value", "The value a function sends back"),
        ("Runtime", "The time while a program is running, or the system that runs it"),
        ("Scope", "Where in the code a variable exists and can be used"),
        ("SDK", "Software Development Kit: tools for building for a platform"),
        ("Server", "A computer that waits for requests and responds to them"),
        ("Snake_case", "Naming style with lowercase words joined by underscores"),
        ("Source code", "The human-written text of a program"),
        ("SQL", "The language for working with relational databases"),
        ("SQL injection", "An attack that sneaks SQL code into user input"),
        ("Stack trace / traceback", "The error report showing where a program crashed"),
        ("State", "Data that can change while an app runs, like a counter's value"),
        ("String", "Text data"),
        ("Syntax", "The grammar rules of a programming language"),
        ("Terminal", "A window for typing commands"),
        ("Test", "Code that checks that other code works"),
        ("TypeScript", "JavaScript with types"),
        ("UI / UX", "User interface (how it looks) / user experience (how it feels to use)"),
        ("URL", "A web address"),
        ("Variable", "A named place that stores a value"),
        ("Version control", "Tracking changes to code over time (Git)"),
        ("XSS", "Cross-site scripting: an attack that injects JavaScript into a web page"),
    ]
    b.table(["Term", "Meaning"], [[f"**{t}**", m] for t, m in terms], widths=[2.2, 6], font_size=8.6)

    # ==================================================================
    b.lesson("Python cheat sheet", label="Appendix C")
    b.code(
        '# ---------- basics ----------\nname = "Sara"                # str\nage = 16                     # int\nheight = 1.62                # float\nis_student = True            # bool\nnothing = None\n\nprint(f"{name} is {age}")    # f-string\nage = int(input("Age: "))    # input is always a str\n\n# ---------- maths ----------\n#  +  -  *  /   //  (floor)   %  (remainder)   **  (power)\nx += 1                       # x = x + 1\n\n# ---------- comparisons and logic ----------\n#  ==  !=  <  >  <=  >=      and  or  not      in\n\n# ---------- decisions ----------\nif age >= 18:\n    print("adult")\nelif age >= 13:\n    print("teen")\nelse:\n    print("child")\n\n# ---------- loops ----------\nfor i in range(5):           # 0 1 2 3 4\n    print(i)\nfor item in my_list:\n    print(item)\nwhile count < 10:\n    count += 1\n# break: leave the loop      continue: skip to the next round',
        "python", label="PYTHON  ·  BASICS", test=False, keep=False,
    )
    b.code(
        '# ---------- lists ----------\nnums = [3, 1, 2]\nnums.append(4); nums.insert(0, 9); nums.remove(1); nums.pop()\nnums.sort(); sorted(nums); len(nums); sum(nums); max(nums); min(nums)\nnums[0]; nums[-1]; nums[1:3]; 3 in nums\nsquares = [n * n for n in nums if n > 1]\n\n# ---------- dictionaries ----------\nperson = {"name": "Sara", "age": 16}\nperson["city"] = "Cairo"\nperson.get("phone", "none")\nfor key, value in person.items():\n    print(key, value)\n\n# ---------- tuples and sets ----------\npoint = (3, 4)\nx, y = point\nunique = set([1, 1, 2])            # {1, 2}\n\n# ---------- strings ----------\ns = "  Hello World  "\ns.strip(); s.lower(); s.upper(); s.title(); s.replace("World", "You")\ns.split(); ", ".join(["a", "b"]); s.find("o"); s.startswith("H")\ns[0]; s[-1]; s[::-1]; len(s)\nf"{3.14159:.2f}"                    # \'3.14\'',
        "python", label="PYTHON  ·  COLLECTIONS AND STRINGS", test=False, keep=False,
    )
    b.code(
        '# ---------- functions ----------\ndef add(a, b=0):\n    """Docstring: what the function does."""\n    return a + b\n\nsquare = lambda n: n * n\n\n# ---------- errors ----------\ntry:\n    number = int(text)\nexcept ValueError:\n    print("Not a number")\nfinally:\n    print("Always runs")\n\n# ---------- files ----------\nwith open("notes.txt", "w") as f:      # "r" read, "w" write, "a" append\n    f.write("Hello\\n")\nwith open("notes.txt") as f:\n    for line in f:\n        print(line.strip())\n\n# ---------- classes ----------\nclass Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def bark(self):\n        return f"{self.name} says woof"\n\nclass Puppy(Dog):                      # inheritance\n    def bark(self):\n        return super().bark() + " (quietly)"\n\n# ---------- modules ----------\nimport math, random, json\nfrom datetime import date\n# terminal:  python -m pip install requests\n\nif __name__ == "__main__":\n    main()',
        "python", label="PYTHON  ·  FUNCTIONS, ERRORS, FILES, CLASSES", test=False, keep=False,
    )

    # ==================================================================
    b.lesson("HTML, CSS and JavaScript cheat sheet", label="Appendix D")
    b.code(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Page title</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <header><nav><a href="#about">About</a></nav></header>\n    <main>\n        <section id="about">\n            <h1>Main heading</h1>   <h2>Subheading</h2>\n            <p>Text with <strong>bold</strong> and <em>italic</em>.</p>\n            <a href="https://example.com">A link</a>\n            <img src="photo.jpg" alt="Description of the photo">\n            <ul><li>Bullet item</li></ul>   <ol><li>Numbered item</li></ol>\n            <div class="box">A generic box</div> <span>inline text</span>\n            <button id="btn">Click</button>\n            <input type="text" placeholder="Type here">\n        </section>\n    </main>\n    <footer>&copy; 2026</footer>\n    <script src="script.js"></script>\n</body>\n</html>',
        "html", label="HTML", keep=False,
    )
    b.code(
        '/* selectors */\np { }   .class { }   #id { }   nav a { }   a:hover { }   h1, h2 { }\n\n/* text */\ncolor: #333;  font-family: Arial, sans-serif;  font-size: 1.2rem;\nfont-weight: bold;  text-align: center;  line-height: 1.6;\n\n/* box model */\nwidth: 300px;  max-width: 100%;  padding: 16px;  margin: 0 auto;\nborder: 1px solid #ddd;  border-radius: 8px;  box-sizing: border-box;\nbackground: #f5f5f5;  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n\n/* flexbox */\ndisplay: flex;  flex-direction: row;  justify-content: space-between;\nalign-items: center;  gap: 16px;  flex-wrap: wrap;\n\n/* grid */\ndisplay: grid;  grid-template-columns: repeat(3, 1fr);  gap: 16px;\n\n/* responsive */\n@media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }\n\n/* animation */\ntransition: transform 0.2s;   transform: scale(1.05);',
        "css", label="CSS", keep=False,
    )
    b.code(
        '// variables\nconst name = "Sara";   let score = 0;\n\n// decisions and loops\nif (score > 10 && name === "Sara") { } else if (score > 5) { } else { }\nfor (let i = 0; i < 5; i++) { }\nfor (const item of items) { }\nwhile (running) { }\n\n// functions\nfunction add(a, b) { return a + b; }\nconst multiply = (a, b) => a * b;\n\n// arrays and objects\nconst nums = [1, 2, 3];\nnums.push(4);  nums.length;  nums.map(n => n * 2);  nums.filter(n => n > 1);\nconst user = { name: "Sara", age: 16 };   user.name;\n\n// the DOM\nconst el = document.querySelector("#btn");\nel.textContent = "Hi";   el.classList.toggle("dark");   input.value;\nel.addEventListener("click", () => { console.log("clicked"); });\nconst li = document.createElement("li");   list.append(li);\n\n// fetching data\nconst response = await fetch("https://api.example.com/data");\nconst data = await response.json();\n\n// saving in the browser\nlocalStorage.setItem("theme", "dark");   localStorage.getItem("theme");',
        "javascript", label="JAVASCRIPT", keep=False,
    )

    # ==================================================================
    b.lesson("Troubleshooting: when things don't work", label="Appendix E")
    b.table(
        ["Problem", "Likely cause", "Fix"],
        [
            ["`'python' is not recognized` (Windows)", "Python isn't on the PATH", "Try `py`. Or reinstall Python with \"Add python.exe to PATH\" ticked"],
            ["`command not found: python` (Mac)", "On Macs it's called `python3`", "Use `python3` and `python3 -m pip`"],
            ["`ModuleNotFoundError: No module named 'requests'`", "The package isn't installed, or it's installed for a different Python", "`python -m pip install requests`, using the same `python` command you run programs with"],
            ["VS Code says a module is missing, but the terminal works", "VS Code is using a different Python", "Ctrl + Shift + P, then **Python: Select Interpreter**, and choose the right one"],
            ["`IndentationError`", "Spaces and tabs mixed, or wrong indentation", "Use 4 spaces. In VS Code, use *Convert Indentation to Spaces*"],
            ["`FileNotFoundError` when the file is right there", "The program runs from a different folder", "Open the project **folder** in VS Code, or run the program from that folder in the terminal"],
            ["My program doesn't wait for input / closes instantly", "It was double-clicked, so the window closes at the end", "Run it from the editor or the terminal instead"],
            ["Infinite loop, and the program won't stop", "The loop condition never becomes false", "Ctrl + C, then check that the loop changes its variable"],
            ["CSS changes don't show", "Wrong file path, a typo in the selector, or browser cache", "Check `<link href>`, check the class name, then hard refresh (Ctrl + Shift + R)"],
            ["JavaScript: `Cannot read properties of null`", "`querySelector` found nothing: wrong selector, or the script ran before the HTML loaded", "Check the id or class, and put `<script>` just before `</body>`"],
            ["The website works locally but images are missing online", "File names are case-sensitive online: `Photo.JPG` is not `photo.jpg`", "Use lowercase file names, with no spaces"],
            ["`git push` rejected", "GitHub has changes you don't have", "`git pull`, fix any conflicts, then `git push`"],
            ["Git merge conflict", "Two branches changed the same lines", "Open the file, keep the right parts, remove the `<<<<<<<` markers, then add and commit"],
            ["`npm` or `npx` not found", "Node.js isn't installed", "Install the LTS version from nodejs.org, then restart the terminal"],
            ["Expo app won't load on the phone", "Phone and computer are on different networks", "Use the same Wi-Fi, or run `npx expo start --tunnel`"],
        ],
        widths=[2.6, 2.6, 3.2], font_size=8.4,
    )
    b.tip("**The universal debugging steps:** read the whole error message, search for its last line, check spelling and capital letters, make the smallest program that shows the problem, then ask for help with the code and the full error.")

    # ==================================================================
    b.lesson("Keyboard shortcuts", label="Appendix F")
    b.p("On a Mac, use **Cmd** instead of **Ctrl** (and **Option** instead of **Alt**).")
    b.table(
        ["Shortcut", "Where", "What it does"],
        [
            ["Ctrl + S", "Everywhere", "Save"],
            ["Ctrl + Z / Ctrl + Shift + Z", "Everywhere", "Undo / redo"],
            ["Ctrl + C / Ctrl + V / Ctrl + X", "Everywhere", "Copy / paste / cut"],
            ["Ctrl + F", "Everywhere", "Find"],
            ["Ctrl + /", "VS Code", "Comment or uncomment the selected lines"],
            ["Ctrl + Shift + P", "VS Code", "Command palette: search every command"],
            ["Ctrl + P", "VS Code", "Quickly open a file by name"],
            ["Ctrl + `", "VS Code", "Open or close the terminal"],
            ["Alt + Up / Down", "VS Code", "Move the current line up or down"],
            ["Shift + Alt + Down", "VS Code", "Copy the current line below"],
            ["Ctrl + D", "VS Code", "Select the next match of the selected word (edit several at once)"],
            ["Shift + Alt + F", "VS Code", "Format the document"],
            ["F5 / F10 / F11", "VS Code", "Start debugging / step over / step into"],
            ["F12 or Ctrl + Shift + I", "Browser", "Open DevTools"],
            ["Ctrl + Shift + R", "Browser", "Hard refresh (ignore the cache)"],
            ["Ctrl + C", "Terminal", "Stop the running program"],
            ["Tab", "Terminal", "Auto-complete file and folder names"],
            ["Up arrow", "Terminal", "Previous command"],
        ],
        widths=[2.7, 1.5, 4],
    )

    # ==================================================================
    b.lesson("Frequently asked questions", label="Appendix G")
    faqs = [
        ("How long does it take to learn to code?",
         "You can write simple programs within weeks. Building real projects comfortably usually takes 6 to 12 months of regular practice. Getting job-ready often takes 1 to 2 years. You never stop learning, and that's part of the fun."),
        ("Am I too young or too old?",
         "No. People start coding as children and in their 60s. What matters is regular practice."),
        ("Do I need an expensive computer?",
         "No. Any computer from the last several years works for learning. 8 GB of RAM is fine to start. Only iPhone app development needs something specific: a Mac."),
        ("Should I learn several languages at once?",
         "No. Go deep in one first (Python), then add JavaScript for the web. Learning two at the very start mixes up the syntax and slows you down."),
        ("I understand the lessons but can't write code on my own. What's wrong?",
         "Nothing. It's the most common stage of learning! Reading and writing are different skills. Close the book and rebuild the examples from memory, do more exercises, and build small projects of your own. It gets easier."),
        ("I keep forgetting things. Is that normal?",
         "Completely. Professionals look things up all day. You don't need to memorise everything, just know that it exists and where to find it. Repetition through projects makes the important things stick."),
        ("Will AI replace programmers?",
         "AI is changing how programming is done: it writes a lot of routine code. But someone still needs to understand problems, design solutions, check that the code is correct and safe, and take responsibility for it. People who understand code *and* use AI well are more valuable than ever."),
        ("Is it OK to use AI to help me learn?",
         "Yes, if you use it to understand rather than to copy (see Lesson 63). Always follow your school's rules for homework and exams."),
        ("How do I stay motivated?",
         "Build things you care about, track your progress (Appendix H), learn with a friend or community, and celebrate small wins. Your first working program is a big deal!"),
        ("Is coding only for people who are good at maths?",
         "No. Most programming uses logic and basic arithmetic. Specific areas, like 3D games, graphics and AI, use more maths, and you can learn it when you need it."),
    ]
    for q, a in faqs:
        b.h4(q)
        b.p(a)

    # ==================================================================
    b.lesson("Your progress checklist", label="Appendix H")
    b.p("Tick each box when you have finished the lesson **and** done its exercises. Print this page or copy it into a notebook.")
    groups = [
        ("Parts 0–1: Getting started", ["0.1–0.5 Welcome lessons", "1.1–1.5 Tools set up", "Ran my first `.py` file"]),
        ("Part 2: Python Stage 1", ["Lesson 1: First program", "Lesson 2: Variables", "Lesson 3: Data types and maths", "Lesson 4: Input",
                                    "Lesson 5: Strings", "Lesson 6: Decisions", "Lesson 7: while loops", "Lesson 8: for loops",
                                    "Project 1: Guessing game", "Quiz 1 (8/10 or better)"]),
        ("Part 3: Python Stage 2", ["Lesson 9: Lists", "Lesson 10: Tuples and sets", "Lesson 11: Dictionaries", "Lesson 12: Functions",
                                    "Lesson 13: Strings in depth", "Lesson 14: Errors", "Lesson 15: Files", "Lesson 16: Modules",
                                    "Project 2: To-do app", "Quiz 2 (8/10 or better)"]),
        ("Part 4: Python Stage 3", ["Lesson 17: Classes", "Lesson 18: Inheritance", "Lesson 19: Shortcuts", "Lesson 20: Debugging",
                                    "Lesson 21: Testing", "Lesson 22: Clean code", "Lesson 23: Algorithms", "Lesson 24: Data structures",
                                    "Project 3: Contact book", "Quiz 3 (8/10 or better)"]),
        ("Part 5: Developer essentials", ["Lesson 25: Terminal", "Lesson 26: Git and GitHub (first repo pushed!)", "Lesson 27: How the internet works",
                                          "Lesson 28: APIs and JSON", "Lesson 29: Databases and SQL", "Lesson 30: Security",
                                          "Lesson 31: Teamwork", "Lesson 32: Cloud and Docker"]),
        ("Part 6: Websites", ["Lesson 33: What a website needs", "Lesson 34: HTML", "Lesson 35: CSS", "Lesson 36: JavaScript",
                              "Project 4: Portfolio website", "Lesson 38: Published online!", "Lesson 39: Backends", "Lesson 40: Next steps"]),
        ("Part 7: Apps", ["Lesson 41: Websites vs apps", "Lesson 42: Native vs cross-platform", "Lesson 43: One app, four frameworks",
                          "Lesson 44: First mobile app on my phone", "Lesson 45: Desktop app", "Lesson 46: PWAs",
                          "Lesson 47: Games", "Lessons 48–50: Requirements, publishing, AI apps"]),
        ("Parts 8–9: Languages and your path", ["Lessons 51–58: Language tour", "Chose my path (Lesson 59)",
                                                "Made my 12-month plan (Lesson 60)", "Started a project from Lesson 61"]),
    ]
    for title, items in groups:
        b.h4(title)
        b.table(["Lesson", "Date finished"], [[f"{{sym:\u2610}}  {item}", ""] for item in items],
                widths=[6, 2.2])
