"""Part 4: Python Stage 3 - thinking like a developer."""


def build(b):
    b.part(
        "Part 4",
        "Python, Stage 3: thinking like a developer",
        "Objects, debugging, testing, clean code and algorithms. These are the skills that turn code that works into good code.",
        [
            "Object-oriented programming: classes, objects and inheritance",
            "Pythonic shortcuts: comprehensions, `zip`, `lambda`",
            "How to debug step by step with a real debugger",
            "How to test your code automatically",
            "How to write clean code that others can read",
            "Algorithms, Big-O and the data structures interviewers ask about",
            "How to build a contact book app with classes and JSON",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("Classes and objects", label="Lesson 17")
    b.p("So far, data (variables) and actions (functions) have lived separately. **Object-oriented programming (OOP)** puts them together into **objects**.")
    b.bullets([
        "A **class** is a **blueprint**, like a cookie cutter or the plan for a house.",
        "An **object** is a **thing built from the blueprint**: a cookie, or an actual house. You can make many objects from one class.",
        "Objects have **attributes** (data they know, like `name`) and **methods** (things they can do, like `bark()`).",
    ])
    b.code('class Dog:\n    def __init__(self, name, age):\n        self.name = name      # attribute\n        self.age = age        # attribute\n\n    def bark(self):           # method\n        print(f"{self.name} says Woof!")\n\n    def have_birthday(self):  # method\n        self.age += 1\n\n\nrex = Dog("Rex", 3)       # create an object\nbella = Dog("Bella", 5)   # create another one\n\nrex.bark()\nbella.bark()\nrex.have_birthday()\nprint(rex.age)')
    b.out("Rex says Woof!\nBella says Woof!\n4")
    b.h3("What do __init__ and self mean?")
    b.bullets([
        "`__init__` (two underscores on each side) runs **automatically** when you create an object. It sets up the starting attributes. It is called the **constructor**.",
        "`self` means **\"this particular object\"**. When you call `rex.bark()`, `self` is `rex`. So `self.name` is Rex's name, not Bella's.",
        "Every method needs `self` as its first parameter, but you don't pass it yourself. Python does that for you.",
    ])
    b.h3("A more useful example: a bank account")
    b.code('class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        if amount <= 0:\n            print("Deposit must be positive.")\n            return\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print("Not enough money!")\n            return\n        self.balance -= amount\n\n    def __str__(self):\n        return f"{self.owner}: ${self.balance:.2f}"\n\n\naccount = BankAccount("Sara", 100)\naccount.deposit(50)\naccount.withdraw(500)\naccount.withdraw(30)\nprint(account)')
    b.out("Not enough money!\nSara: $120.00")
    b.p("`__str__` is a special method that decides what `print(account)` shows. Without it, you would see something unhelpful like `<__main__.BankAccount object at 0x7f...>`.")
    b.key("The object **protects its own data**: the only way to change the balance is through `deposit` and `withdraw`, which check the rules. This is the main reason OOP exists: it keeps data and the rules for that data together.")
    b.tryit([
        "Write a `Rectangle` class with `width` and `height`, and methods `area()` and `perimeter()`.",
        "Write a `Student` class with a name and a list of grades, a method `add_grade(g)`, and a method `average()`.",
        "Add a `history` list to `BankAccount` that records every deposit and withdrawal, and a method that prints it.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Inheritance and the four ideas of OOP", label="Lesson 18")
    b.p("**Inheritance** lets a new class **reuse** everything from an existing class and then add or change things. The new class is the **child** (subclass). The original is the **parent** (superclass).")
    b.code('class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return "..."\n\n    def introduce(self):\n        print(f"I am {self.name} and I say {self.speak()}")\n\n\nclass Cat(Animal):          # Cat inherits from Animal\n    def speak(self):\n        return "Meow"\n\n\nclass Cow(Animal):\n    def speak(self):\n        return "Moo"\n\n\nfor animal in [Cat("Tom"), Cow("Daisy"), Animal("Mystery")]:\n    animal.introduce()')
    b.out("I am Tom and I say Meow\nI am Daisy and I say Moo\nI am Mystery and I say ...")
    b.p("`Cat` and `Cow` never define `introduce()` or `__init__`. They **inherit** them from `Animal`. They only **override** (replace) `speak()`.")
    b.h3("Adding attributes in a child class with super()")
    b.code('class Person:\n    def __init__(self, name):\n        self.name = name\n\n\nclass Student(Person):\n    def __init__(self, name, school):\n        super().__init__(name)   # let the parent set up the name\n        self.school = school     # then add the new attribute\n\n\ns = Student("Lina", "City High")\nprint(s.name, "-", s.school)')
    b.out("Lina - City High")
    b.h3("The four pillars of OOP (a favourite exam question!)")
    b.table(
        ["Pillar", "Simple meaning", "In our examples"],
        [
            ["**Encapsulation**", "Keep data and the methods that use it together, and protect the data from outside changes.", "Balance only changes through `deposit` / `withdraw`"],
            ["**Abstraction**", "Hide complicated details behind a simple interface.", "You call `account.withdraw(30)` without knowing how it works inside"],
            ["**Inheritance**", "A class can reuse another class's code.", "`Cat` gets `introduce()` from `Animal`"],
            ["**Polymorphism**", "Different objects respond to the same method call in their own way.", "`speak()` gives Meow or Moo depending on the object"],
        ],
        widths=[1.6, 3.5, 3],
    )
    b.tip("Inheritance means \"**is a**\" (a Cat *is an* Animal). If the relationship is \"**has a**\" (a Car *has an* Engine), store one object inside another instead. That is called **composition**, and it is often the better choice.")

    # ------------------------------------------------------------------
    b.lesson("Pythonic shortcuts", label="Lesson 19")
    b.p("Experienced Python developers use a few shortcuts all the time. You should be able to read them, and use them when they make code **clearer**.")
    b.h3("List comprehensions: build a list in one line")
    b.code("# the long way\nsquares = []\nfor n in range(1, 6):\n    squares.append(n * n)\n\n# the short way: a list comprehension\nsquares = [n * n for n in range(1, 6)]\nprint(squares)\n\nevens = [n for n in range(10) if n % 2 == 0]\nprint(evens)")
    b.out("[1, 4, 9, 16, 25]\n[0, 2, 4, 6, 8]")
    b.p("Read it as: \"**n times n**, **for each n** in range 1 to 5\". There is also a dictionary version:")
    b.code('names = ["sara", "omar"]\nlengths = {name: len(name) for name in names}\nprint(lengths)')
    b.out("{'sara': 4, 'omar': 4}")
    b.h3("zip: loop over two lists together")
    b.code('names = ["Sara", "Omar", "Lina"]\nscores = [91, 78, 85]\nfor name, score in zip(names, scores):\n    print(f"{name}: {score}")')
    b.out("Sara: 91\nOmar: 78\nLina: 85")
    b.h3("lambda and sorting by a key")
    b.p("A `lambda` is a tiny function without a name. It is mostly used to tell `sorted()` **what to sort by**:")
    b.code('students = [("Sara", 91), ("Omar", 78), ("Lina", 85)]\nby_score = sorted(students, key=lambda s: s[1], reverse=True)\nprint(by_score)')
    b.out("[('Sara', 91), ('Lina', 85), ('Omar', 78)]")
    b.h3("One-line if (conditional expression)")
    b.code('age = 20\nstatus = "adult" if age >= 18 else "minor"\nprint(status)')
    b.out("adult")
    b.h3("any() and all()")
    b.code("scores = [91, 78, 45]\nprint(any(s < 50 for s in scores))   # is at least one below 50?\nprint(all(s >= 40 for s in scores))  # are all at least 40?")
    b.out("True\nTrue")
    b.h3("The if __name__ == \"__main__\" line")
    b.p("You will see this at the bottom of many Python files:")
    b.code('def main():\n    print("Running the program")\n\n\nif __name__ == "__main__":\n    main()')
    b.out("Running the program")
    b.p("It means: \"only run `main()` if this file was run **directly**, not when another file **imports** it\". This lets a file be both a program and a module.")
    b.warn("Shortcuts are only good when they make code **easier** to read. If a comprehension needs more than one `if` or `for`, a normal loop is usually clearer.")

    # ------------------------------------------------------------------
    b.lesson("Debugging like a pro", label="Lesson 20")
    b.p("Debugging is not guessing. It is a **process**:")
    b.steps([
        "**Reproduce** the bug: find the exact steps that make it happen.",
        "**Read** the error message, from the bottom up.",
        "**Locate** the problem: which line, which function?",
        "**Form a guess**: \"I think `total` is wrong after the loop.\"",
        "**Test the guess** with a `print` or the debugger.",
        "**Fix** it, then **re-test**, including the cases that already worked.",
    ])
    b.h3("Example: hunt the bug")
    b.code("def average(numbers):\n    total = 0\n    for n in numbers:\n        total = n\n    return total / len(numbers)\n\nprint(average([2, 4, 6]))   # should be 4.0")
    b.out("2.0")
    b.p("No error message, just a wrong answer: a **logic error**. Let's add a debug print inside the loop:")
    b.code('def average(numbers):\n    total = 0\n    for n in numbers:\n        total = n\n        print(f"DEBUG: n={n}, total={total}")\n    return total / len(numbers)\n\nprint(average([2, 4, 6]))')
    b.out("DEBUG: n=2, total=2\nDEBUG: n=4, total=4\nDEBUG: n=6, total=6\n2.0")
    b.p("Now it's obvious: `total` is **replaced** each time instead of **added to**. The fix is `total += n`. Remove the debug print afterwards!")
    b.h3("Using a real debugger")
    b.p("A **debugger** pauses your program so you can look inside it while it runs.")
    b.bullets([
        "**In Thonny:** click the bug icon (Debug), then use **Step over** (F6) to run one line at a time. Variables appear in the Variables panel.",
        "**In VS Code:** click just left of a line number to add a red dot. This is a **breakpoint**. Press **F5** to start debugging. The program stops at the red dot. Press **F10** to step to the next line and watch the Variables panel on the left.",
    ])
    b.h3("More debugging techniques")
    b.bullets([
        "**Rubber duck debugging:** explain your code line by line, out loud, to anything (even a toy duck). You will often hear yourself say the mistake.",
        "**Simplify:** cut the problem down to the smallest piece of code that still shows the bug.",
        "**Search the error:** paste the last line of the error into a search engine. Someone has almost certainly had it before.",
        "**Take a break:** a 10-minute walk solves an amazing number of bugs.",
        "**Ask an AI assistant:** share the code and the full error, and ask it to *explain* the problem, not just fix it.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Testing your code", label="Lesson 21")
    b.p("How do you know your code works? You could test it by hand every time. But professionals write **automated tests**: code that checks your code. When you change something, the tests tell you instantly if you broke anything.")
    b.h3("The simplest test: assert")
    b.p("`assert` checks that something is true. If it isn't, the program stops with an `AssertionError`.")
    b.code('def add(a, b):\n    return a + b\n\nassert add(2, 3) == 5\nassert add(-1, 1) == 0\nassert add(0, 0) == 0\nprint("All tests passed!")')
    b.out("All tests passed!")
    b.h3("Real testing with pytest")
    b.p("**pytest** is the most popular testing tool for Python. Install it with `python -m pip install pytest`. Put your code in one file and your tests in another file whose name starts with `test_`:")
    b.code('def is_even(n):\n    return n % 2 == 0\n\n\ndef grade(score):\n    if score >= 90:\n        return "A"\n    if score >= 80:\n        return "B"\n    return "C"', label="PYTHON  ·  school.py")
    b.code('from school import is_even, grade\n\n\ndef test_is_even():\n    assert is_even(4)\n    assert not is_even(7)\n\n\ndef test_grade_boundaries():\n    assert grade(90) == "A"\n    assert grade(89) == "B"\n    assert grade(80) == "B"\n    assert grade(79) == "C"', label="PYTHON  ·  test_school.py", test=False)
    b.p("Then run `pytest` in the terminal, in that folder:")
    b.code("pytest", "bash")
    b.out("============ test session starts ============\ncollected 2 items\n\ntest_school.py ..                     [100%]\n\n============= 2 passed in 0.01s =============", label="OUTPUT")
    b.h3("What should you test?")
    b.bullets([
        "**Normal cases:** typical inputs, like `grade(85)`.",
        "**Boundaries:** the exact values where behaviour changes, like 89, 90 and 80. Bugs love boundaries!",
        "**Edge cases:** empty lists, zero, negative numbers, very big numbers, empty strings.",
        "**Bad input:** what *should* happen with `None` or the wrong type?",
    ])
    b.real("Many teams use **Test-Driven Development (TDD)**: write a failing test first (**red**), write just enough code to pass it (**green**), then tidy up the code (**refactor**). At most companies, code without tests isn't allowed to be merged.")

    # ------------------------------------------------------------------
    b.lesson("Writing clean code", label="Lesson 22")
    b.p("Code is read far more often than it is written: by teammates, by reviewers, and by you six months later. **Clean code** is code that is easy to read and change.")
    b.h3("Before and after")
    b.code("def f(l):\n    t = 0\n    for i in l:\n        t = t + i\n    return t / len(l)", label="PYTHON  ·  hard to read")
    b.code('def average(numbers):\n    """Return the average of a list of numbers (0 for an empty list)."""\n    if not numbers:\n        return 0\n    return sum(numbers) / len(numbers)', label="PYTHON  ·  clean")
    b.p("The clean version has a clear name, a docstring, handles the empty-list edge case (the first version crashes!) and uses a built-in.")
    b.h3("The rules that matter most")
    b.table(
        ["Rule", "Example"],
        [
            ["**Descriptive names**", "`days_until_exam`, not `d` or `x2`"],
            ["**Functions are verbs, variables are nouns**", "`calculate_tax()`, `tax_rate`"],
            ["**Constants in CAPITALS**", "`MAX_LIVES = 3`, `FILENAME = \"todo.txt\"`"],
            ["**Classes in CapWords**", "`BankAccount`, `ContactBook`"],
            ["**Small functions with one job**", "`load_tasks()`, `save_tasks()`, `show_tasks()`"],
            ["**Don't Repeat Yourself (DRY)**", "Copy-pasted code belongs in a function"],
            ["**Keep It Simple (KISS)**", "The simplest solution that works is usually the best"],
            ["**Comments explain why, not what**", "`# retry because the API sometimes times out`"],
        ],
        widths=[3.2, 4.5],
    )
    b.h3("PEP 8: Python's official style guide")
    b.bullets([
        "Indent with **4 spaces**",
        "Use `snake_case` for variables and functions",
        "Keep lines reasonably short (about 79 to 100 characters)",
        "Put two blank lines between top-level functions and classes",
        "Put spaces around operators: `x = a + b`, not `x=a+b`",
    ])
    b.tip("Let tools do the boring work. A **formatter** (like **Ruff** or **Black**) fixes the layout of your code automatically. A **linter** (like **Ruff** or **Pylint**) warns you about likely bugs. In VS Code, install the Ruff extension and turn on *Format on Save*.")

    # ------------------------------------------------------------------
    b.lesson("Algorithms and Big-O", label="Lesson 23")
    b.p("An **algorithm** is a step-by-step method for solving a problem: a recipe. Some recipes are much faster than others, and that difference matters when your data gets big.")
    b.h3("Searching: linear search")
    b.p("Check every item, one by one, until you find it:")
    b.code("def linear_search(items, target):\n    for index, item in enumerate(items):\n        if item == target:\n            return index\n    return -1          # -1 means \"not found\"\n\nprint(linear_search([7, 3, 9, 1], 9))")
    b.out("2")
    b.h3("Searching: binary search (only for sorted lists)")
    b.p("Remember the guessing-game strategy? Look at the **middle**. If the target is bigger, throw away the left half, otherwise the right half. Repeat.")
    b.code("def binary_search(items, target):\n    low = 0\n    high = len(items) - 1\n    while low <= high:\n        middle = (low + high) // 2\n        if items[middle] == target:\n            return middle\n        elif items[middle] < target:\n            low = middle + 1      # search the right half\n        else:\n            high = middle - 1     # search the left half\n    return -1\n\nnumbers = [3, 8, 15, 23, 42, 57, 91]\nprint(binary_search(numbers, 42))\nprint(binary_search(numbers, 5))")
    b.out("4\n-1")
    b.p("For a million sorted items, linear search may need **1,000,000** checks. Binary search needs at most **20**. Same answer, wildly different speed.")
    b.h3("Big-O notation: how does the work grow?")
    b.p("**Big-O** describes how the number of steps grows as the input (called **n**) gets bigger:")
    b.table(
        ["Big-O", "Name", "Steps for 1,000 items", "Example"],
        [
            ["**O(1)**", "Constant", "1", "Getting `items[5]`, a dictionary lookup"],
            ["**O(log n)**", "Logarithmic", "about 10", "Binary search"],
            ["**O(n)**", "Linear", "1,000", "Linear search, one loop through a list"],
            ["**O(n log n)**", "Linearithmic", "about 10,000", "Good sorting (Python's `sorted()`)"],
            ["**O(n²)**", "Quadratic", "1,000,000", "A loop inside a loop over the same list"],
        ],
        widths=[1.4, 1.6, 2.1, 3.4],
    )
    b.h3("Sorting: bubble sort")
    b.p("Bubble sort is slow, O(n²), but it's easy to understand: go through the list, swap neighbours that are in the wrong order, and repeat. The biggest values \"bubble\" to the end.")
    b.code("def bubble_sort(items):\n    items = items[:]                # work on a copy\n    n = len(items)\n    for i in range(n):\n        for j in range(n - 1 - i):\n            if items[j] > items[j + 1]:\n                items[j], items[j + 1] = items[j + 1], items[j]   # swap\n    return items\n\nprint(bubble_sort([5, 2, 9, 1, 7]))")
    b.out("[1, 2, 5, 7, 9]")
    b.note("In real code, always use `sorted()` or `.sort()`. They use an algorithm called **Timsort**, which is O(n log n) and very well tested. You learn bubble sort to understand *how* sorting works, and because it comes up in exams.")
    b.h3("Recursion: a function that calls itself")
    b.code("def factorial(n):\n    if n <= 1:          # base case: stop here\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))     # 5 * 4 * 3 * 2 * 1")
    b.out("120")
    b.warn("Every recursive function needs a **base case** that stops it. Without one, it calls itself forever and crashes with `RecursionError: maximum recursion depth exceeded`.")

    # ------------------------------------------------------------------
    b.lesson("Data structures you will hear about", label="Lesson 24")
    b.table(
        ["Structure", "Idea", "Real-life example", "In Python"],
        [
            ["**Array / list**", "Items in order, found by position", "Seats in a row", "`list`"],
            ["**Stack**", "Last In, First Out (LIFO)", "A stack of plates; the Undo button", "`list` with `append` / `pop`"],
            ["**Queue**", "First In, First Out (FIFO)", "A line at a shop; a printer queue", "`collections.deque`"],
            ["**Hash map**", "Find a value by key, instantly", "A phone book", "`dict`"],
            ["**Set**", "Unique items, fast membership checks", "A guest list", "`set`"],
            ["**Linked list**", "Each item points to the next one", "A treasure hunt with clues", "Build it with classes"],
            ["**Tree**", "Items with parents and children", "Folders on your computer; a family tree", "Build it with classes"],
            ["**Graph**", "Items (nodes) connected by links (edges)", "Road maps; friends on social media", "`dict` of lists"],
        ],
        widths=[1.6, 2.5, 2.6, 2.1],
    )
    b.h3("A stack")
    b.code('history = []\nhistory.append("page1")\nhistory.append("page2")\nhistory.append("page3")\nprint(history.pop())     # the Back button: the last page comes off first\nprint(history)')
    b.out("page3\n['page1', 'page2']")
    b.h3("A queue")
    b.code('from collections import deque\n\nline = deque()\nline.append("Ali")\nline.append("Mia")\nline.append("Sam")\nprint(line.popleft())    # first in line is served first\nprint(list(line))')
    b.out("Ali\n['Mia', 'Sam']")
    b.h3("A graph")
    b.code('friends = {\n    "Sara": ["Omar", "Lina"],\n    "Omar": ["Sara"],\n    "Lina": ["Sara", "Mia"],\n    "Mia": ["Lina"],\n}\nprint("Lina\'s friends:", friends["Lina"])')
    b.out("Lina's friends: ['Sara', 'Mia']")
    b.tip("To practise algorithms and data structures, try **Exercism**, **Codewars**, **HackerRank** and later **LeetCode**. Start with \"easy\" problems. Doing one problem a day adds up fast.")

    # ------------------------------------------------------------------
    b.lesson("Checkpoint project: contact book", label="Project 3", new_page=True)
    b.p("This project uses **classes**, **lists**, **JSON files**, **comprehensions** and **error handling**. It is a small but properly designed program: data in one class, storage in another, and the user interface in `main()`.")
    b.code(
        'import json\n\nFILENAME = "contacts.json"\n\n\n'
        'class Contact:\n'
        '    def __init__(self, name, phone, email):\n'
        '        self.name = name\n'
        '        self.phone = phone\n'
        '        self.email = email\n\n'
        '    def to_dict(self):\n'
        '        return {"name": self.name, "phone": self.phone, "email": self.email}\n\n'
        '    def __str__(self):\n'
        '        return f"{self.name:<15} {self.phone:<15} {self.email}"\n\n\n'
        'class ContactBook:\n'
        '    def __init__(self, filename):\n'
        '        self.filename = filename\n'
        '        self.contacts = []\n'
        '        self.load()\n\n'
        '    def load(self):\n'
        '        try:\n'
        '            with open(self.filename) as file:\n'
        '                for item in json.load(file):\n'
        '                    self.contacts.append(\n'
        '                        Contact(item["name"], item["phone"], item["email"])\n'
        '                    )\n'
        '        except FileNotFoundError:\n'
        '            pass\n\n'
        '    def save(self):\n'
        '        with open(self.filename, "w") as file:\n'
        '            json.dump([c.to_dict() for c in self.contacts], file, indent=2)\n\n'
        '    def add(self, contact):\n'
        '        self.contacts.append(contact)\n'
        '        self.save()\n\n'
        '    def search(self, text):\n'
        '        text = text.lower()\n'
        '        return [c for c in self.contacts if text in c.name.lower()]\n\n'
        '    def delete(self, name):\n'
        '        before = len(self.contacts)\n'
        '        self.contacts = [c for c in self.contacts\n'
        '                         if c.name.lower() != name.lower()]\n'
        '        self.save()\n'
        '        return len(self.contacts) < before\n\n\n'
        'def main():\n'
        '    book = ContactBook(FILENAME)\n'
        '    while True:\n'
        '        print("\\n1) List  2) Add  3) Search  4) Delete  5) Quit")\n'
        '        choice = input("Choose: ").strip()\n'
        '        if choice == "1":\n'
        '            if not book.contacts:\n'
        '                print("No contacts yet.")\n'
        '            for contact in book.contacts:\n'
        '                print(contact)\n'
        '        elif choice == "2":\n'
        '            name = input("Name: ").strip()\n'
        '            phone = input("Phone: ").strip()\n'
        '            email = input("Email: ").strip()\n'
        '            if name:\n'
        '                book.add(Contact(name, phone, email))\n'
        '                print("Saved!")\n'
        '            else:\n'
        '                print("Name cannot be empty.")\n'
        '        elif choice == "3":\n'
        '            results = book.search(input("Search for: "))\n'
        '            if not results:\n'
        '                print("No matches.")\n'
        '            for contact in results:\n'
        '                print(contact)\n'
        '        elif choice == "4":\n'
        '            if book.delete(input("Name to delete: ")):\n'
        '                print("Deleted.")\n'
        '            else:\n'
        '                print("Not found.")\n'
        '        elif choice == "5":\n'
        '            print("Goodbye!")\n'
        '            break\n'
        '        else:\n'
        '            print("Please choose 1-5.")\n\n\n'
        'if __name__ == "__main__":\n'
        '    main()',
        label="PYTHON  ·  contacts.py", keep=False,
    )
    b.box("try", "Level it up:", title="Challenges", items=[
        "Check that the email contains `@` and the phone contains only digits, spaces or `+`.",
        "Add **edit**: change the phone or email of an existing contact.",
        "Write **pytest tests** for `ContactBook.search` and `ContactBook.delete` (use a test file name like `test_contacts.json`).",
        "Add a **birthday** field and an option to list birthdays in the next 30 days.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Quiz 3 and Stage 3 checklist", label="Checkpoint")
    b.steps([
        "What is the difference between a class and an object?",
        "What does `self` refer to inside a method?",
        "Name the four pillars of OOP.",
        "Rewrite with a list comprehension: a list of the squares of the even numbers from 0 to 10.",
        "What is a breakpoint?",
        "What does `assert add(2, 2) == 4` do if `add` is broken?",
        "What is the Big-O of binary search, and what must be true about the list?",
        "Which data structure is Last In, First Out?",
        "What must every recursive function have?",
        "Why are boundary values (like 89 and 90 in a grading function) important to test?",
    ])
    b.h3("Can you do these on your own?")
    b.bullets([
        "Write a class with `__init__`, attributes, methods and `__str__`",
        "Use inheritance and `super()`",
        "Read and write list comprehensions",
        "Find a bug with prints and with a debugger",
        "Write tests with `assert` and pytest",
        "Explain O(1), O(n) and O(n²) with examples",
        "Implement binary search without looking",
        "Build the contact book with at least one challenge feature",
    ], check=True)
    b.key("If you finished Parts 2 to 4 and the three projects, you are **no longer a beginner**. "
          "You can now learn any area of programming. Parts 5 to 7 show you how real software "
          "(websites, apps and servers) is built.")
